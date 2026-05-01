package com.example.demo.Inventory;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class InventoryResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String batchNumber;
    private Integer quantity;
    private LocalDate expiryDate;
    private String status; // Safe / Expiring Soon / Expired
    private String riskLevel; // HIGH / MEDIUM / LOW
    private Double riskProbability;
    private LocalDateTime createdAt;
    private Double sellingPrice;
    private Double costPrice;
    private Double suggestedDiscount;

    public InventoryResponse() {}

    public InventoryResponse(Long id, Long productId, String productName,
                             String batchNumber, Integer quantity,
                             LocalDate expiryDate, String status,
                             LocalDateTime createdAt) {
        this.id = id;
        this.productId = productId;
        this.productName = productName;
        this.batchNumber = batchNumber;
        this.quantity = quantity;
        this.expiryDate = expiryDate;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public Long getProductId() { return productId; }
    public String getProductName() { return productName; }
    public String getBatchNumber() { return batchNumber; }
    public Integer getQuantity() { return quantity; }
    public LocalDate getExpiryDate() { return expiryDate; }
    public String getStatus() { return status; }
    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    public Double getRiskProbability() { return riskProbability; }
    public void setRiskProbability(Double riskProbability) { this.riskProbability = riskProbability; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public Double getSellingPrice() { return sellingPrice; }
    public void setSellingPrice(Double sellingPrice) { this.sellingPrice = sellingPrice; }
    public Double getCostPrice() { return costPrice; }
    public void setCostPrice(Double costPrice) { this.costPrice = costPrice; }
    public Double getSuggestedDiscount() { return suggestedDiscount; }
    public void setSuggestedDiscount(Double suggestedDiscount) { this.suggestedDiscount = suggestedDiscount; }
}
