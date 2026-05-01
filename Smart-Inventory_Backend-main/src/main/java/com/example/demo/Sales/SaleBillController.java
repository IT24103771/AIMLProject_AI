package com.example.demo.Sales;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bills")
@CrossOrigin(origins = "*")
public class SaleBillController {

    private final SaleBillService saleBillService;
    private final ReceiptPdfService receiptPdfService;

    public SaleBillController(SaleBillService saleBillService, ReceiptPdfService receiptPdfService) {
        this.saleBillService = saleBillService;
        this.receiptPdfService = receiptPdfService;
    }

    private String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) return "System";
        return auth.getName();
    }

    @PostMapping
    public ResponseEntity<?> createBill(@Valid @RequestBody CreateBillRequest req) {
        try {
            return ResponseEntity.ok(saleBillService.createBill(req, currentUsername()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<BillResponse>> getAllBills(
            @RequestParam(value = "status", required = false) String status) {
        try {
            return ResponseEntity.ok(saleBillService.getAllBills(status));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(List.of());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getBill(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(saleBillService.getBill(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDraft(@PathVariable Long id,
                                          @Valid @RequestBody CreateBillRequest req) {
        try {
            return ResponseEntity.ok(saleBillService.updateDraft(id, req, currentUsername()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/finalize")
    public ResponseEntity<?> finalizeBill(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(saleBillService.finalizeBill(id, currentUsername()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/void")
    public ResponseEntity<?> voidBill(@PathVariable Long id,
                                       @Valid @RequestBody VoidBillRequest req) {
        try {
            return ResponseEntity.ok(saleBillService.voidBill(id, req, currentUsername()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDraft(@PathVariable Long id) {
        try {
            saleBillService.deleteDraft(id);
            return ResponseEntity.ok(Map.of("message", "Draft deleted successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/receipt")
    public ResponseEntity<?> getReceipt(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(saleBillService.getBill(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/receipt/pdf")
    public ResponseEntity<byte[]> getReceiptPdf(@PathVariable Long id) {
        try {
            BillResponse bill = saleBillService.getBill(id);
            byte[] pdf = receiptPdfService.generateReceiptPdf(bill);

            return ResponseEntity.ok()
                    .header("Content-Type", "application/pdf")
                    .header("Content-Disposition", "attachment; filename=\"receipt-" + bill.getBillNumber() + ".pdf\"")
                    .body(pdf);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @GetMapping("/check-duplicate")
    public ResponseEntity<Map<String, Boolean>> checkDuplicate(
            @RequestParam Long productId,
            @RequestParam String saleDate,
            @RequestParam Integer quantity,
            @RequestParam(required = false) String customerName) {
        boolean isDuplicate = saleBillService.isDuplicateSale(productId, java.time.LocalDate.parse(saleDate), quantity, customerName);
        return ResponseEntity.ok(Map.of("isDuplicate", isDuplicate));
    }
}
