package com.example.demo.Products;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService service;

    @PostMapping
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody CreateProductRequest req) {
        return ResponseEntity.ok(service.saveAndReturnResponse(req));
    }

    @GetMapping
    public ResponseEntity<List<ProductResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/{id}/available-quantity")
    public ResponseEntity<Integer> getAvailableQuantity(@PathVariable Long id) {
        return ResponseEntity.ok(service.getAvailableQuantity(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> update(@PathVariable Long id, @Valid @RequestBody CreateProductRequest req) {
        return ResponseEntity.ok(service.updateAndReturnResponse(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok("Product deleted successfully");
    }

    @GetMapping("/{id}/expiry-risk")
    public ResponseEntity<ProductResponse> checkExpiryRisk(@PathVariable Long id) {
        return ResponseEntity.ok(service.checkExpiryRisk(id));
    }
}