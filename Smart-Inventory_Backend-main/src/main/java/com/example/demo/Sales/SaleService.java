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
import java.util.List;
import java.util.Optional;

@Service
public class SaleService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final DiscountRepository discountRepository;

    public SaleService(
            SaleRepository saleRepository,
            ProductRepository productRepository,
            InventoryRepository inventoryRepository,
            DiscountRepository discountRepository
    ) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
        this.discountRepository = discountRepository;
    }

    public List<SaleResponse> getAll() {
        return saleRepository.findAllWithProductOrderByDateDesc()
                .stream()
                .map(this::toResponse)
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @Transactional
    public SaleResponse update(Long id, CreateSaleRequest req) {
        validateRequest(req);

        Sale existingSale = saleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sale not found: " + id));

        Product newProduct = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found: " + req.getProductId()));

        Inventory newBatch = inventoryRepository.findById(req.getBatchId())
                .orElseThrow(() -> new RuntimeException("Batch not found: " + req.getBatchId()));

        validateBatchBelongsToProduct(newProduct, newBatch);
        validateBatchCanBeSold(newBatch, req.getSaleDate());

        Inventory oldBatch = existingSale.getInventoryBatch();
        oldBatch.setQuantity(oldBatch.getQuantity() + existingSale.getQuantity());
        inventoryRepository.save(oldBatch);

        validateStockAvailable(newBatch, req.getQuantity());

        newBatch.setQuantity(newBatch.getQuantity() - req.getQuantity());
        inventoryRepository.save(newBatch);

        existingSale.setProduct(newProduct);
        existingSale.setInventoryBatch(newBatch);
        existingSale.setQuantity(req.getQuantity());
        existingSale.setSaleDate(req.getSaleDate());

        applyPricingAndDiscount(existingSale, newProduct, newBatch, req.getQuantity());

        Sale saved = saleRepository.save(existingSale);
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Sale sale = saleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sale not found: " + id));

        Inventory batch = sale.getInventoryBatch();
        batch.setQuantity(batch.getQuantity() + sale.getQuantity());
        inventoryRepository.save(batch);

        saleRepository.deleteById(id);
    }

    private void validateRequest(CreateSaleRequest req) {
        if (req.getProductId() == null) {
            throw new RuntimeException("Product is required.");
        }
        if (req.getBatchId() == null) {
            throw new RuntimeException("Batch is required.");
        }
        if (req.getQuantity() == null || req.getQuantity() < 1) {
            throw new RuntimeException("Sale quantity must be at least 1.");
        }
        if (req.getSaleDate() == null) {
            throw new RuntimeException("Sale date is required.");
        }
        if (req.getSaleDate().isAfter(LocalDate.now())) {
            throw new RuntimeException("Sale date cannot be in the future.");
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

        // Snapshot discount note
        sale.setDiscountNote(activeDiscount.map(Discount::getNote).orElse(null));
    }

    private SaleResponse toResponse(Sale sale) {
        try {
            String discountNote = sale.getDiscountNote();

            if (discountNote == null && sale.getDiscountPercent() != null && sale.getDiscountPercent() > 0) {
                if (sale.getProduct() != null && sale.getInventoryBatch() != null) {
                    discountNote = discountRepository
                            .findActiveByProductIdAndBatchId(
                                    sale.getProduct().getProductId(),
                                    sale.getInventoryBatch().getId()
                            )
                            .map(Discount::getNote)
                            .orElse(null);
                }
            }

            Long billId = null;
            String billNumber = null;
            String status = "FINALIZED";

            if (sale.getSaleBill() != null) {
                try {
                    billId = sale.getSaleBill().getId();
                    billNumber = sale.getSaleBill().getBillNumber();
                    status = sale.getSaleBill().getStatus() != null ? sale.getSaleBill().getStatus().name() : "FINALIZED";
                } catch (Exception e) {
                    // Ignore EntityNotFoundException if bill was deleted
                }
            }

            return new SaleResponse(
                    sale.getId(),
                    sale.getProduct() != null ? sale.getProduct().getProductId() : null,
                    sale.getProduct() != null ? sale.getProduct().getProductName() : "Unknown",
                    sale.getInventoryBatch() != null ? sale.getInventoryBatch().getId() : null,
                    sale.getInventoryBatch() != null ? sale.getInventoryBatch().getBatchNumber() : "Unknown",
                    sale.getInventoryBatch() != null ? sale.getInventoryBatch().getExpiryDate() : null,
                    sale.getQuantity(),
                    sale.getOriginalUnitPrice(),
                    sale.getDiscountPercent(),
                    sale.getDiscountedUnitPrice(),
                    sale.getTotalAmount(),
                    discountNote,
                    sale.getSaleDate(),
                    sale.getCreatedAt(),
                    sale.getCreatedBy(),
                    billId,
                    billNumber,
                    status
            );
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}