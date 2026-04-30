package com.example.demo.Sales;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class BillResponse {

    private Long id;
    private String billNumber;
    private String status;
    private LocalDate saleDate;
    private String notes;
    private Double billTotal;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime finalizedAt;
    private String finalizedBy;
    private LocalDateTime voidedAt;
    private String voidedBy;
    private String voidReason;
    private List<LineResponse> lines;

    public BillResponse() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBillNumber() { return billNumber; }
    public void setBillNumber(String billNumber) { this.billNumber = billNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getSaleDate() { return saleDate; }
    public void setSaleDate(LocalDate saleDate) { this.saleDate = saleDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Double getBillTotal() { return billTotal; }
    public void setBillTotal(Double billTotal) { this.billTotal = billTotal; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getFinalizedAt() { return finalizedAt; }
    public void setFinalizedAt(LocalDateTime finalizedAt) { this.finalizedAt = finalizedAt; }

    public String getFinalizedBy() { return finalizedBy; }
    public void setFinalizedBy(String finalizedBy) { this.finalizedBy = finalizedBy; }

    public LocalDateTime getVoidedAt() { return voidedAt; }
    public void setVoidedAt(LocalDateTime voidedAt) { this.voidedAt = voidedAt; }

    public String getVoidedBy() { return voidedBy; }
    public void setVoidedBy(String voidedBy) { this.voidedBy = voidedBy; }

    public String getVoidReason() { return voidReason; }
    public void setVoidReason(String voidReason) { this.voidReason = voidReason; }

    public List<LineResponse> getLines() { return lines; }
    public void setLines(List<LineResponse> lines) { this.lines = lines; }

    public static class LineResponse {
        private Long id;
        private Long productId;
        private String productName;
        private Long batchId;
        private String batchNumber;
        private LocalDate expiryDate;
        private Integer quantity;
        private Double originalUnitPrice;
        private Double discountPercent;
        private Double discountedUnitPrice;
        private Double totalAmount;
        private String discountNote;
        private String createdBy;

        public LineResponse() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }

        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }

        public Long getBatchId() { return batchId; }
        public void setBatchId(Long batchId) { this.batchId = batchId; }

        public String getBatchNumber() { return batchNumber; }
        public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

        public LocalDate getExpiryDate() { return expiryDate; }
        public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }

        public Double getOriginalUnitPrice() { return originalUnitPrice; }
        public void setOriginalUnitPrice(Double originalUnitPrice) { this.originalUnitPrice = originalUnitPrice; }

        public Double getDiscountPercent() { return discountPercent; }
        public void setDiscountPercent(Double discountPercent) { this.discountPercent = discountPercent; }

        public Double getDiscountedUnitPrice() { return discountedUnitPrice; }
        public void setDiscountedUnitPrice(Double discountedUnitPrice) { this.discountedUnitPrice = discountedUnitPrice; }

        public Double getTotalAmount() { return totalAmount; }
        public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

        public String getDiscountNote() { return discountNote; }
        public void setDiscountNote(String discountNote) { this.discountNote = discountNote; }

        public String getCreatedBy() { return createdBy; }
        public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    }
}
