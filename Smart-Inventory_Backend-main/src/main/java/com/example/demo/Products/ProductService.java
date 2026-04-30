package com.example.demo.Products;

import com.example.demo.Inventory.InventoryRepository;
import com.example.demo.Sales.SaleRepository;
import com.example.demo.Discount.DiscountRepository;
import com.example.demo.Discount.Discount;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.web.client.RestTemplate;
import java.util.Map;
import java.util.HashMap;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import com.example.demo.Inventory.Inventory;
import org.springframework.scheduling.annotation.Scheduled;

@Service
public class ProductService {

    @Autowired
    private ProductRepository repo;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private DiscountRepository discountRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final String FLASK_API_URL = "http://localhost:5000";

    /**
     * Create a new product from validated DTO.
     */
    public Product save(CreateProductRequest req) {
        validateProductRequest(req);

        Product p = new Product();
        mapDtoToEntity(req, p);
        return repo.save(p);
    }

    /**
     * Overload kept for internal use (e.g. saving existing entity).
     */
    public Product saveEntity(Product p) {
        return repo.save(p);
    }

    public List<ProductResponse> getAll() {
        return repo.findAll().stream()
                .map(this::toProductResponse)
                .collect(Collectors.toList());
    }

    public ProductResponse getById(Long id) {
        Product p = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        return toProductResponse(p);
    }

    public ProductResponse saveAndReturnResponse(CreateProductRequest req) {
        return toProductResponse(save(req));
    }

    public ProductResponse updateAndReturnResponse(Long id, CreateProductRequest req) {
        return toProductResponse(update(id, req));
    }

    public Integer getAvailableQuantity(Long productId) {
        return inventoryRepository.getTotalQuantityByProductId(productId);
    }

    /**
     * Update an existing product from validated DTO.
     */
    public Product update(Long id, CreateProductRequest req) {
        Product existing = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        validateProductRequest(req);
        mapDtoToEntity(req, existing);
        return repo.save(existing);
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new RuntimeException("Product not found");
        }
        repo.deleteById(id);
    }

    public ProductResponse checkExpiryRisk(Long id) {
        Product p = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        Integer stock = inventoryRepository.getTotalQuantityByProductId(id);
        if (stock == null) stock = 0;

        List<Inventory> batches = inventoryRepository.findAvailableBatchesByProductId(id);
        long daysToExpiry = 999;
        if (batches != null && !batches.isEmpty()) {
            LocalDate earliestExpiry = batches.get(0).getExpiryDate();
            daysToExpiry = ChronoUnit.DAYS.between(LocalDate.now(), earliestExpiry);
        }

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("product_id", p.getProductId().toString());
        requestBody.put("product_name", p.getProductName());
        requestBody.put("selling_price", p.getSellingPrice());
        requestBody.put("remaining_quantity", stock);
        requestBody.put("days_to_expiry", daysToExpiry);
        
        Long sold = saleRepository.getTotalQuantitySoldByProductId(id);
        if (sold != null && sold > 0) {
            requestBody.put("avg_daily_sales", sold / 30.0); // simple approximation
        }

        String url = FLASK_API_URL + "/predict";
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                p.setRiskLevel((String) body.get("risk_level"));
                
                Object prob = body.get("risk_probability");
                if (prob instanceof Double) {
                    p.setRiskProbability((Double) prob);
                } else if (prob instanceof Integer) {
                    p.setRiskProbability(((Integer) prob).doubleValue());
                }
                
                p.setRiskAction((String) body.get("action"));
                
                repo.save(p);
                
                if ("HIGH".equals(p.getRiskLevel())) {
                    System.out.println("ALERT: High risk product detected - " + p.getProductName());
                }
            }
        } catch (Exception e) {
            System.err.println("Error calling Flask API: " + e.getMessage());
        }

        return toProductResponse(p);
    }

    /**
     * Automated job to sync AI Expiry Risk for all products every hour.
     * 3600000 ms = 1 hour.
     */
    @Scheduled(fixedRate = 3600000)
    public void syncAllProductsRisk() {
        System.out.println("Starting automated AI Expiry Risk sync for all products...");
        List<Product> products = repo.findAll();
        int successCount = 0;
        int failCount = 0;
        
        for (Product p : products) {
            try {
                checkExpiryRisk(p.getProductId());
                successCount++;
            } catch (Exception e) {
                System.err.println("Failed to sync risk for product ID " + p.getProductId() + ": " + e.getMessage());
                failCount++;
            }
        }
        System.out.println("Automated AI sync complete. Success: " + successCount + ", Failed: " + failCount);
    }

    /**
     * Maps DTO fields to entity, trimming all string values.
     */
    private void mapDtoToEntity(CreateProductRequest req, Product p) {
        p.setProductName(req.getProductName().trim());
        p.setMainCategory(req.getMainCategory().trim());
        p.setSubCategory(req.getSubCategory().trim());
        p.setSupplier(req.getSupplier().trim());
        p.setCostPrice(req.getCostPrice());
        p.setSellingPrice(req.getSellingPrice());
        p.setImageUrl(req.getImageUrl() != null ? req.getImageUrl().trim() : null);
        p.setReorderLevel(req.getReorderLevel());
    }

    private ProductResponse toProductResponse(Product p) {
        ProductResponse res = new ProductResponse();
        res.setProductId(p.getProductId());
        res.setProductName(p.getProductName());
        res.setMainCategory(p.getMainCategory());
        res.setSubCategory(p.getSubCategory());
        res.setSupplier(p.getSupplier());
        res.setCostPrice(p.getCostPrice());
        res.setSellingPrice(p.getSellingPrice());
        res.setImageUrl(p.getImageUrl());
        res.setReorderLevel(p.getReorderLevel());
        res.setRiskLevel(p.getRiskLevel());
        res.setRiskProbability(p.getRiskProbability());
        res.setRiskAction(p.getRiskAction());

        Integer stock = inventoryRepository.getTotalQuantityByProductId(p.getProductId());
        res.setStock(stock != null ? stock : 0);

        Long sold = saleRepository.getTotalQuantitySoldByProductId(p.getProductId());
        res.setSold(sold != null ? sold : 0L);

        java.util.Optional<Discount> discountOpt = discountRepository.findFirstByProductProductIdAndActiveTrueOrderByCreatedAtDesc(p.getProductId());
        if (discountOpt.isPresent()) {
            Discount d = discountOpt.get();
            if (d.getDiscountPercent() != null) {
                res.setDiscount(d.getDiscountPercent() + "% off");
            } else {
                res.setDiscount("Active discount");
            }
        } else {
            res.setDiscount("No active discount");
        }

        return res;
    }

    /**
     * Service-level validation as defense-in-depth (in addition to DTO annotations).
     */
    private void validateProductRequest(CreateProductRequest req) {
        if (req.getProductName() == null || req.getProductName().trim().isEmpty()) {
            throw new RuntimeException("Product name is required");
        }
        if (req.getProductName().trim().length() < 3) {
            throw new RuntimeException("Product name must be at least 3 characters");
        }
        if (req.getMainCategory() == null || req.getMainCategory().trim().isEmpty()) {
            throw new RuntimeException("Main category is required");
        }
        if (req.getSubCategory() == null || req.getSubCategory().trim().isEmpty()) {
            throw new RuntimeException("Sub category is required");
        }
        if (req.getSupplier() == null || req.getSupplier().trim().isEmpty()) {
            throw new RuntimeException("Supplier is required");
        }
        if (req.getCostPrice() < 0) {
            throw new RuntimeException("Cost price must be 0 or more");
        }
        if (req.getSellingPrice() <= 0) {
            throw new RuntimeException("Selling price must be greater than 0");
        }
        if (req.getCostPrice() > req.getSellingPrice()) {
            throw new RuntimeException("Cost price cannot be greater than selling price");
        }
        if (req.getReorderLevel() < 0) {
            throw new RuntimeException("Reorder level must be 0 or more");
        }
    }
}