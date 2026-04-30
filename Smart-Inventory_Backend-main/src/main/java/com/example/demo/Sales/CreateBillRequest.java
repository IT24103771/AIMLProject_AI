package com.example.demo.Sales;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;

import java.time.LocalDate;
import java.util.List;

public class CreateBillRequest {

    @NotNull(message = "Sale date is required")
    private LocalDate saleDate;

    private String notes;

    private String idempotencyKey;

    private boolean finalize = false;

    @NotEmpty(message = "At least one line item is required")
    @Valid
    private List<BillLineRequest> lines;

    public LocalDate getSaleDate() { return saleDate; }
    public void setSaleDate(LocalDate saleDate) { this.saleDate = saleDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public boolean isFinalize() { return finalize; }
    public void setFinalize(boolean finalize) { this.finalize = finalize; }

    public List<BillLineRequest> getLines() { return lines; }
    public void setLines(List<BillLineRequest> lines) { this.lines = lines; }

    public static class BillLineRequest {
        @NotNull(message = "Product is required")
        private Long productId;

        @NotNull(message = "Batch is required")
        private Long batchId;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }

        public Long getBatchId() { return batchId; }
        public void setBatchId(Long batchId) { this.batchId = batchId; }

        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }
}
