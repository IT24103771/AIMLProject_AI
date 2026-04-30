package com.example.demo.Discount;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/discounts")
public class DiscountController {

    private final DiscountService discountService;

    public DiscountController(DiscountService discountService) {
        this.discountService = discountService;
    }

    @PostMapping
    public ResponseEntity<DiscountResponse> create(@Valid @RequestBody CreateDiscountRequest req) {
        return ResponseEntity.ok(discountService.create(req));
    }

    @GetMapping
    public ResponseEntity<List<DiscountResponse>> getAll() {
        return ResponseEntity.ok(discountService.getAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<DiscountResponse>> getActive() {
        return ResponseEntity.ok(discountService.getActive());
    }

    @GetMapping("/lookup")
    public ResponseEntity<DiscountResponse> lookupActive(@RequestParam Long productId, @RequestParam Long batchId) {
        DiscountResponse res = discountService.lookupActive(productId, batchId);
        if (res == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(res);
    }

    @PatchMapping("/{id}/active")
    public ResponseEntity<DiscountResponse> setActive(@PathVariable Long id, @RequestParam boolean value) {
        return ResponseEntity.ok(discountService.setActive(id, value));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DiscountResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CreateDiscountRequest req
    ) {
        return ResponseEntity.ok(discountService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        discountService.delete(id);
        return ResponseEntity.ok("Discount deleted successfully");
    }
}