package com.example.demo.Inventory;

import com.example.demo.Products.Product;
import com.example.demo.Products.ProductRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;

    public InventoryService(InventoryRepository inventoryRepository,
                            ProductRepository productRepository) {
        this.inventoryRepository = inventoryRepository;
        this.productRepository = productRepository;
    }

    public InventoryResponse create(CreateInventoryRequest req) {
        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found: " + req.getProductId()));

        String batchNo = req.getBatchNumber() == null ? "" : req.getBatchNumber().trim();
        if (batchNo.isEmpty()) {
            throw new RuntimeException("Batch number is required.");
        }

        if (req.getQuantity() == null || req.getQuantity() < 1) {
            throw new RuntimeException("Quantity must be 1 or more.");
        }

        if (req.getExpiryDate() == null) {
            throw new RuntimeException("Expiry date is required.");
        }

        if (req.getExpiryDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Expiry date must be today or in the future.");
        }

        if (inventoryRepository.existsByProductIdAndBatchNumber(req.getProductId(), batchNo)) {
            throw new RuntimeException("This batch number already exists for the selected product.");
        }

        Inventory inv = new Inventory();
        inv.setProduct(product);
        inv.setBatchNumber(batchNo);
        inv.setQuantity(req.getQuantity());
        inv.setExpiryDate(req.getExpiryDate());

        Inventory saved = inventoryRepository.save(inv);
        return toResponse(saved);
    }

    public List<InventoryResponse> getAll() {
        return inventoryRepository.findAllWithProductOrderByExpiryAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<InventoryResponse> getAvailableBatches(Long productId) {
        return inventoryRepository.findAvailableBatchesByProductId(productId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public InventoryResponse update(Long id, CreateInventoryRequest req) {
        Inventory inv = inventoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inventory not found: " + id));

        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found: " + req.getProductId()));

        String newBatchNo = req.getBatchNumber() == null ? "" : req.getBatchNumber().trim();
        if (newBatchNo.isEmpty()) {
            throw new RuntimeException("Batch number is required.");
        }

        if (req.getQuantity() == null || req.getQuantity() < 1) {
            throw new RuntimeException("Quantity must be 1 or more.");
        }

        if (req.getExpiryDate() == null) {
            throw new RuntimeException("Expiry date is required.");
        }

        if (req.getExpiryDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Expiry date must be today or in the future.");
        }

        Long newProductId = product.getProductId();
        boolean changedProduct = !inv.getProduct().getProductId().equals(newProductId);
        boolean changedBatch = !inv.getBatchNumber().equalsIgnoreCase(newBatchNo);

        if ((changedProduct || changedBatch)
                && inventoryRepository.existsByProductIdAndBatchNumber(newProductId, newBatchNo)) {
            throw new RuntimeException("This batch number already exists for the selected product.");
        }

        inv.setProduct(product);
        inv.setBatchNumber(newBatchNo);
        inv.setQuantity(req.getQuantity());
        inv.setExpiryDate(req.getExpiryDate());

        Inventory saved = inventoryRepository.save(inv);
        return toResponse(saved);
    }

    public void delete(Long id) {
        if (!inventoryRepository.existsById(id)) {
            throw new RuntimeException("Inventory not found: " + id);
        }

        try {
            inventoryRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new RuntimeException("Cannot delete this inventory batch because it is used in other records.");
        }
    }

    @Transactional
    public void consumeStock(Long productId, int saleQty) {
        if (saleQty <= 0) {
            throw new RuntimeException("Sale quantity must be greater than 0.");
        }

        List<Inventory> batches = inventoryRepository.findByProductIdOrderByExpiryAsc(productId);
        LocalDate today = LocalDate.now();

        List<Inventory> usable = batches.stream()
                .filter(b -> b.getQuantity() != null && b.getQuantity() > 0)
                .filter(b -> b.getExpiryDate() != null && !b.getExpiryDate().isBefore(today))
                .toList();

        int totalAvailable = usable.stream().mapToInt(Inventory::getQuantity).sum();

        if (totalAvailable < saleQty) {
            throw new RuntimeException("Not enough stock. Available: " + totalAvailable + ", Requested: " + saleQty);
        }

        int remaining = saleQty;

        for (Inventory b : usable) {
            if (remaining == 0) break;

            int available = b.getQuantity();
            int used = Math.min(available, remaining);

            b.setQuantity(available - used);
            remaining -= used;

            inventoryRepository.save(b);
        }
    }

    private String status(LocalDate expiry) {
        LocalDate today = LocalDate.now();

        if (expiry.isBefore(today)) return "Expired";
        if (!expiry.isAfter(today.plusDays(7))) return "Expiring Soon";
        return "Safe";
    }

    private InventoryResponse toResponse(Inventory inv) {
        InventoryResponse res = new InventoryResponse(
                inv.getId(),
                inv.getProduct().getProductId(),
                inv.getProduct().getProductName(),
                inv.getBatchNumber(),
                inv.getQuantity(),
                inv.getExpiryDate(),
                status(inv.getExpiryDate()),
                inv.getCreatedAt()
        );
        res.setRiskLevel(inv.getProduct().getRiskLevel());
        res.setRiskProbability(inv.getProduct().getRiskProbability());
        return res;
    }
}