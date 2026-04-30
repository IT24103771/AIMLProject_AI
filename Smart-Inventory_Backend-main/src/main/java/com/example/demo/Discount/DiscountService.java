package com.example.demo.Discount;

import com.example.demo.Products.Product;
import com.example.demo.Products.ProductRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DiscountService {

    private final DiscountRepository discountRepository;
    private final ProductRepository productRepository;
    private final com.example.demo.Inventory.InventoryRepository inventoryRepository;

    public DiscountService(DiscountRepository discountRepository,
                           ProductRepository productRepository,
                           com.example.demo.Inventory.InventoryRepository inventoryRepository) {
        this.discountRepository = discountRepository;
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
    }

    public DiscountResponse create(CreateDiscountRequest req) {
        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() ->
                        new RuntimeException("Product not found: " + req.getProductId())
                );

        validateDiscount(req);

        com.example.demo.Inventory.Inventory batch = null;
        if (req.getBatchId() != null) {
            batch = inventoryRepository.findById(req.getBatchId())
                    .orElseThrow(() -> new RuntimeException("Batch not found: " + req.getBatchId()));
            
            if (!batch.getProduct().getProductId().equals(product.getProductId())) {
                throw new RuntimeException("Selected batch does not belong to the selected product.");
            }
            
            if (discountRepository.existsActiveByBatchId(req.getBatchId())) {
                throw new RuntimeException("An active discount already exists for this batch. Only one active discount allowed per batch.");
            }
        }

        Discount discount = new Discount();
        discount.setProduct(product);
        discount.setInventoryBatch(batch);
        discount.setDiscountPercent(req.getDiscountPercent());
        discount.setNote(req.getNote() != null ? req.getNote().trim() : null);
        discount.setActive(req.getActive() != null ? req.getActive() : true);

        Discount saved = discountRepository.save(discount);
        return toResponse(saved);
    }

    public List<DiscountResponse> getAll() {
        return discountRepository.findAllWithProductOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<DiscountResponse> getActive() {
        return discountRepository.findActiveWithProduct()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public DiscountResponse setActive(Long discountId, boolean active) {
        Discount discount = discountRepository.findById(discountId)
                .orElseThrow(() -> new RuntimeException("Discount not found: " + discountId));

        discount.setActive(active);
        Discount saved = discountRepository.save(discount);
        return toResponse(saved);
    }

    public DiscountResponse update(Long id, CreateDiscountRequest req) {
        Discount discount = discountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Discount not found: " + id));

        validateDiscount(req);

        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() ->
                        new RuntimeException("Product not found: " + req.getProductId())
                );

        com.example.demo.Inventory.Inventory batch = null;
        if (req.getBatchId() != null) {
            batch = inventoryRepository.findById(req.getBatchId())
                    .orElseThrow(() -> new RuntimeException("Batch not found: " + req.getBatchId()));
            
            if (!batch.getProduct().getProductId().equals(product.getProductId())) {
                throw new RuntimeException("Selected batch does not belong to the selected product.");
            }
            // Check duplicate only if changing batch to a new one
            if (discount.getInventoryBatch() == null || !discount.getInventoryBatch().getId().equals(req.getBatchId())) {
                if (discountRepository.existsActiveByBatchId(req.getBatchId())) {
                    throw new RuntimeException("An active discount already exists for this batch.");
                }
            }
        }

        discount.setProduct(product);
        discount.setInventoryBatch(batch);
        discount.setDiscountPercent(req.getDiscountPercent());
        discount.setNote(req.getNote() != null ? req.getNote().trim() : null);

        if (req.getActive() != null) {
            discount.setActive(req.getActive());
        }

        Discount saved = discountRepository.save(discount);
        return toResponse(saved);
    }

    public void delete(Long id) {
        if (!discountRepository.existsById(id)) {
            throw new RuntimeException("Discount not found: " + id);
        }

        try {
            discountRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new RuntimeException("Cannot delete this discount because it is used in other records.");
        }
    }

    private void validateDiscount(CreateDiscountRequest req) {
        if (req.getDiscountPercent() == null) {
            throw new RuntimeException("Discount percent is required.");
        }
        if (req.getDiscountPercent() < 1 || req.getDiscountPercent() > 90) {
            throw new RuntimeException("Discount percent must be between 1 and 90.");
        }
    }

    public DiscountResponse lookupActive(Long productId, Long batchId) {
        return discountRepository.findActiveByProductIdAndBatchId(productId, batchId)
                .map(this::toResponse)
                .orElse(null);
    }

    private DiscountResponse toResponse(Discount d) {
        return new DiscountResponse(
                d.getId(),
                d.getProduct().getProductId(),
                d.getProduct().getProductName(),
                d.getInventoryBatch() != null ? d.getInventoryBatch().getId() : null,
                d.getInventoryBatch() != null ? d.getInventoryBatch().getBatchNumber() : null,
                d.getInventoryBatch() != null ? d.getInventoryBatch().getExpiryDate() : null,
                d.getInventoryBatch() != null ? d.getInventoryBatch().getQuantity() : null,
                d.getDiscountPercent(),
                d.getNote(),
                d.getActive(),
                d.getCreatedAt()
        );
    }
}