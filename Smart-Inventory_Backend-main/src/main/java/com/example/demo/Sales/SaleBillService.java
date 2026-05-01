package com.example.demo.Sales;

import com.example.demo.Discount.Discount;
import com.example.demo.Discount.DiscountRepository;
import com.example.demo.Inventory.Inventory;
import com.example.demo.Inventory.InventoryRepository;
import com.example.demo.Products.Product;
import com.example.demo.Products.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
public class SaleBillService {

    private final SaleBillRepository billRepository;
    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final DiscountRepository discountRepository;

    public SaleBillService(SaleBillRepository billRepository,
                           SaleRepository saleRepository,
                           ProductRepository productRepository,
                           InventoryRepository inventoryRepository,
                           DiscountRepository discountRepository) {
        this.billRepository = billRepository;
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
        this.discountRepository = discountRepository;
    }

    // ─── Create Bill (Draft or Auto-Finalize) ──────────────────────────────────

    @Transactional
    public BillResponse createBill(CreateBillRequest req, String username) {
        validateBillRequest(req);

        // Duplicate prevention via idempotency key
        if (req.getIdempotencyKey() != null && !req.getIdempotencyKey().isBlank()) {
            Optional<SaleBill> existing = billRepository.findByIdempotencyKey(req.getIdempotencyKey().trim());
            if (existing.isPresent()) {
                return toBillResponse(existing.get());
            }
        }

        SaleBill bill = new SaleBill();
        bill.setBillNumber(generateBillNumber());
        bill.setSaleDate(req.getSaleDate());
        bill.setNotes(req.getNotes());
        bill.setCreatedBy(username);
        bill.setCustomerName(req.getCustomerName());
        bill.setCustomerEmail(req.getCustomerEmail());
        bill.setStatus(BillStatus.DRAFT);

        if (req.getIdempotencyKey() != null && !req.getIdempotencyKey().isBlank()) {
            bill.setIdempotencyKey(req.getIdempotencyKey().trim());
        }

        bill = billRepository.save(bill);

        // Create line items (no stock deduction yet for drafts)
        createLineItems(bill, req.getLines(), username);

        bill = billRepository.findById(bill.getId()).orElseThrow();

        // Auto-finalize if requested
        if (req.isFinalize()) {
            return finalizeBillInternal(bill, username);
        }

        return toBillResponse(bill);
    }

    // ─── Update Draft ──────────────────────────────────────────────────────────

    @Transactional
    public BillResponse updateDraft(Long billId, CreateBillRequest req, String username) {
        SaleBill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Bill not found: " + billId));

        if (bill.getStatus() != BillStatus.DRAFT) {
            throw new RuntimeException("Only DRAFT bills can be edited.");
        }

        validateBillRequest(req);

        bill.setSaleDate(req.getSaleDate());
        bill.setNotes(req.getNotes());
        bill.setCustomerName(req.getCustomerName());
        bill.setCustomerEmail(req.getCustomerEmail());

        // Remove existing lines and replace
        List<Sale> existingLines = saleRepository.findBySaleBillId(billId);
        saleRepository.deleteAll(existingLines);

        createLineItems(bill, req.getLines(), username);

        // Recalculate total
        recalculateBillTotal(bill);
        billRepository.save(bill);

        return toBillResponse(bill);
    }

    // ─── Finalize Bill ─────────────────────────────────────────────────────────

    @Transactional
    public BillResponse finalizeBill(Long billId, String username) {
        SaleBill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Bill not found: " + billId));

        if (bill.getStatus() != BillStatus.DRAFT) {
            throw new RuntimeException("Only DRAFT bills can be finalized.");
        }

        return finalizeBillInternal(bill, username);
    }

    private void createLineItems(SaleBill bill, List<CreateBillRequest.BillLineRequest> lineRequests, String username) {
        for (CreateBillRequest.BillLineRequest lineReq : lineRequests) {
            Product product = productRepository.findById(lineReq.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + lineReq.getProductId()));
            
            if (lineReq.getBatchId() == null) {
                // FEFO Selection
                List<Inventory> availableBatches = inventoryRepository.findAvailableBatchesByProductId(product.getProductId());
                int remaining = lineReq.getQuantity();
                
                int totalAvailable = availableBatches.stream().mapToInt(Inventory::getQuantity).sum();
                if (remaining > totalAvailable) {
                    throw new RuntimeException("Insufficient stock for product " + product.getProductName() + 
                        ". Requested: " + remaining + ", Available: " + totalAvailable);
                }
                
                for (Inventory batch : availableBatches) {
                    if (remaining <= 0) break;
                    
                    int qtyFromBatch = Math.min(batch.getQuantity(), remaining);
                    remaining -= qtyFromBatch;
                    
                    Sale line = new Sale();
                    line.setSaleBill(bill);
                    line.setProduct(product);
                    line.setInventoryBatch(batch);
                    line.setQuantity(qtyFromBatch);
                    line.setSaleDate(bill.getSaleDate());
                    line.setCreatedBy(username);
                    
                    applyPricingAndDiscount(line, product, batch, qtyFromBatch);
                    saleRepository.save(line);
                }
            } else {
                // Explicit Batch Selection
                Inventory batch = inventoryRepository.findById(lineReq.getBatchId())
                        .orElseThrow(() -> new RuntimeException("Batch not found: " + lineReq.getBatchId()));
    
                validateBatchBelongsToProduct(product, batch);
    
                Sale line = new Sale();
                line.setSaleBill(bill);
                line.setProduct(product);
                line.setInventoryBatch(batch);
                line.setQuantity(lineReq.getQuantity());
                line.setSaleDate(bill.getSaleDate());
                line.setCreatedBy(username);
    
                applyPricingAndDiscount(line, product, batch, lineReq.getQuantity());
                saleRepository.save(line);
            }
        }
    }

    private BillResponse finalizeBillInternal(SaleBill bill, String username) {
        List<Sale> lines = saleRepository.findBySaleBillId(bill.getId());

        if (lines.isEmpty()) {
            throw new RuntimeException("Cannot finalize a bill with no line items.");
        }

        double billTotal = 0.0;

        for (Sale line : lines) {
            Product product = line.getProduct();
            Inventory batch = line.getInventoryBatch();

            // Re-validate at finalization time
            validateBatchBelongsToProduct(product, batch);
            validateBatchCanBeSold(batch, bill.getSaleDate());
            validateStockAvailable(batch, line.getQuantity());

            // Re-apply pricing with current discounts and snapshot the values
            applyPricingAndDiscount(line, product, batch, line.getQuantity());

            // Snapshot discount note
            Optional<Discount> activeDiscount = discountRepository
                    .findActiveByProductIdAndBatchId(product.getProductId(), batch.getId());
            line.setDiscountNote(activeDiscount.map(Discount::getNote).orElse(null));

            // Deduct stock
            batch.setQuantity(batch.getQuantity() - line.getQuantity());
            inventoryRepository.save(batch);

            saleRepository.save(line);
            billTotal += line.getTotalAmount();
        }

        bill.setStatus(BillStatus.FINALIZED);
        bill.setBillTotal(billTotal);
        bill.setFinalizedAt(LocalDateTime.now());
        bill.setFinalizedBy(username);

        billRepository.save(bill);

        return toBillResponse(bill);
    }

    // ─── Void Bill ─────────────────────────────────────────────────────────────

    @Transactional
    public BillResponse voidBill(Long billId, VoidBillRequest req, String username) {
        SaleBill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Bill not found: " + billId));

        if (bill.getStatus() != BillStatus.FINALIZED) {
            throw new RuntimeException("Only FINALIZED bills can be voided.");
        }

        // Restore stock for each line
        List<Sale> lines = saleRepository.findBySaleBillId(billId);
        for (Sale line : lines) {
            Inventory batch = line.getInventoryBatch();
            batch.setQuantity(batch.getQuantity() + line.getQuantity());
            inventoryRepository.save(batch);
        }

        bill.setStatus(BillStatus.VOIDED);
        bill.setVoidedAt(LocalDateTime.now());
        bill.setVoidedBy(username);
        bill.setVoidReason(req.getReason().trim());

        billRepository.save(bill);

        return toBillResponse(bill);
    }

    // ─── Delete Draft ──────────────────────────────────────────────────────────

    @Transactional
    public void deleteDraft(Long billId) {
        SaleBill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Bill not found: " + billId));

        if (bill.getStatus() != BillStatus.DRAFT) {
            throw new RuntimeException("Only DRAFT bills can be deleted.");
        }

        // Delete lines first, then bill
        List<Sale> lines = saleRepository.findBySaleBillId(billId);
        saleRepository.deleteAll(lines);
        billRepository.delete(bill);
    }

    public boolean isDuplicateSale(Long productId, java.time.LocalDate saleDate, Integer quantity, String customerName) {
        return saleRepository.isDuplicateSale(productId, saleDate, quantity, customerName);
    }

    // ─── Get Single Bill ───────────────────────────────────────────────────────

    public BillResponse getBill(Long billId) {
        SaleBill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Bill not found: " + billId));
        return toBillResponse(bill);
    }

    // ─── Get All Bills (with optional status filter) ───────────────────────────

    public List<BillResponse> getAllBills(String statusFilter) {
        List<SaleBill> bills;

        if (statusFilter != null && !statusFilter.isBlank()) {
            try {
                BillStatus status = BillStatus.valueOf(statusFilter.trim().toUpperCase());
                bills = billRepository.findByStatusOrderByCreatedAtDesc(status);
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Invalid status filter: " + statusFilter);
            }
        } else {
            bills = billRepository.findAllOrderByCreatedAtDesc();
        }

        return bills.stream().map(this::toBillResponse).toList();
    }

    // ─── Backward-Compatible Single Sale (auto-finalize) ───────────────────────

    @Transactional
    public BillResponse createSingleSale(CreateSaleRequest req, String username) {
        CreateBillRequest billReq = new CreateBillRequest();
        billReq.setSaleDate(req.getSaleDate());
        billReq.setFinalize(true);

        CreateBillRequest.BillLineRequest lineReq = new CreateBillRequest.BillLineRequest();
        lineReq.setProductId(req.getProductId());
        lineReq.setBatchId(req.getBatchId());
        lineReq.setQuantity(req.getQuantity());

        billReq.setLines(List.of(lineReq));

        return createBill(billReq, username);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private String generateBillNumber() {
        String datePrefix = "INV-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-";
        long count = billRepository.count();
        return datePrefix + String.format("%03d", count + 1);
    }

    private void validateBillRequest(CreateBillRequest req) {
        if (req.getSaleDate() == null) {
            throw new RuntimeException("Sale date is required.");
        }
        if (req.getSaleDate().isAfter(LocalDate.now())) {
            throw new RuntimeException("Sale date cannot be in the future.");
        }
        if (req.getLines() == null || req.getLines().isEmpty()) {
            throw new RuntimeException("At least one line item is required.");
        }
        for (CreateBillRequest.BillLineRequest line : req.getLines()) {
            if (line.getProductId() == null) throw new RuntimeException("Product is required for every line.");
            if (line.getQuantity() == null || line.getQuantity() < 1)
                throw new RuntimeException("Quantity must be at least 1 for every line.");
        }
    }

    private void validateBatchBelongsToProduct(Product product, Inventory batch) {
        if (!batch.getProduct().getProductId().equals(product.getProductId())) {
            throw new RuntimeException("Selected batch does not belong to selected product.");
        }
    }

    private void validateBatchCanBeSold(Inventory batch, LocalDate saleDate) {
        if (batch.getExpiryDate() == null) {
            throw new RuntimeException("Selected batch does not have an expiry date.");
        }
        if (batch.getExpiryDate().isBefore(saleDate)) {
            throw new RuntimeException("Cannot sell from an expired batch.");
        }
    }

    private void validateStockAvailable(Inventory batch, Integer requestedQty) {
        Integer available = batch.getQuantity() == null ? 0 : batch.getQuantity();
        if (available < requestedQty) {
            throw new RuntimeException(
                    "Not enough stock in selected batch. Available: " + available + ", Requested: " + requestedQty
            );
        }
    }

    private void applyPricingAndDiscount(Sale sale, Product product, Inventory batch, Integer qty) {
        double originalPrice = product.getSellingPrice() == 0 ? 0.0 : product.getSellingPrice();

        Optional<Discount> activeDiscount =
                discountRepository.findActiveByProductIdAndBatchId(product.getProductId(), batch.getId());

        double discountPct = activeDiscount.map(Discount::getDiscountPercent).orElse(0.0);
        double discountedPrice = originalPrice * (1.0 - (discountPct / 100.0));
        double totalAmount = discountedPrice * qty;

        sale.setOriginalUnitPrice(originalPrice);
        sale.setDiscountPercent(discountPct);
        sale.setDiscountedUnitPrice(discountedPrice);
        sale.setTotalAmount(totalAmount);
    }

    private void recalculateBillTotal(SaleBill bill) {
        List<Sale> lines = saleRepository.findBySaleBillId(bill.getId());
        double total = lines.stream().mapToDouble(s -> s.getTotalAmount() == null ? 0.0 : s.getTotalAmount()).sum();
        bill.setBillTotal(total);
    }

    private BillResponse toBillResponse(SaleBill bill) {
        BillResponse resp = new BillResponse();
        resp.setId(bill.getId());
        resp.setBillNumber(bill.getBillNumber());
        resp.setStatus(bill.getStatus().name());
        resp.setSaleDate(bill.getSaleDate());
        resp.setNotes(bill.getNotes());
        resp.setBillTotal(bill.getBillTotal());
        resp.setCreatedBy(bill.getCreatedBy());
        resp.setCreatedAt(bill.getCreatedAt());
        resp.setFinalizedAt(bill.getFinalizedAt());
        resp.setFinalizedBy(bill.getFinalizedBy());
        resp.setVoidedAt(bill.getVoidedAt());
        resp.setVoidedBy(bill.getVoidedBy());
        resp.setVoidReason(bill.getVoidReason());
        resp.setCustomerName(bill.getCustomerName());
        resp.setCustomerEmail(bill.getCustomerEmail());

        List<Sale> lines = saleRepository.findBySaleBillId(bill.getId());
        resp.setLines(lines.stream().map(this::toLineResponse).toList());

        // Recalculate total from lines
        if (!lines.isEmpty()) {
            double total = lines.stream().mapToDouble(s -> s.getTotalAmount() == null ? 0.0 : s.getTotalAmount()).sum();
            resp.setBillTotal(total);
        }

        return resp;
    }

    private BillResponse.LineResponse toLineResponse(Sale sale) {
        BillResponse.LineResponse lr = new BillResponse.LineResponse();
        lr.setId(sale.getId());
        lr.setProductId(sale.getProduct().getProductId());
        lr.setProductName(sale.getProduct().getProductName());
        lr.setBatchId(sale.getInventoryBatch().getId());
        lr.setBatchNumber(sale.getInventoryBatch().getBatchNumber());
        lr.setExpiryDate(sale.getInventoryBatch().getExpiryDate());
        lr.setQuantity(sale.getQuantity());
        lr.setOriginalUnitPrice(sale.getOriginalUnitPrice());
        lr.setDiscountPercent(sale.getDiscountPercent());
        lr.setDiscountedUnitPrice(sale.getDiscountedUnitPrice());
        lr.setTotalAmount(sale.getTotalAmount());
        lr.setDiscountNote(sale.getDiscountNote());
        lr.setCreatedBy(sale.getCreatedBy());
        return lr;
    }
}
