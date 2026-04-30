package com.example.demo.Inventory;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @PostMapping
    public ResponseEntity<InventoryResponse> create(@Valid @RequestBody CreateInventoryRequest req) {
        return ResponseEntity.ok(inventoryService.create(req));
    }

    @GetMapping
    public ResponseEntity<List<InventoryResponse>> getAll() {
        return ResponseEntity.ok(inventoryService.getAll());
    }

    @GetMapping("/by-product/{productId}")
    public ResponseEntity<List<InventoryResponse>> getAvailableBatches(@PathVariable Long productId) {
        return ResponseEntity.ok(inventoryService.getAvailableBatches(productId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InventoryResponse> update(@PathVariable Long id,
                                                    @Valid @RequestBody CreateInventoryRequest req) {
        return ResponseEntity.ok(inventoryService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        inventoryService.delete(id);
        return ResponseEntity.ok("Inventory batch deleted successfully");
    }
}