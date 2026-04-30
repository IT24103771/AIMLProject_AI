package com.example.demo.Discount;

import jakarta.validation.constraints.*;

public class CreateDiscountRequest {

    @NotNull(message = "productId is required")
    private Long productId;

    private Long batchId;

    @NotNull(message = "discountPercent is required")
    @DecimalMin(value = "1.0", message = "discountPercent must be at least 1")
    @DecimalMax(value = "90.0", message = "discountPercent must be at most 90")
    private Double discountPercent;

    private String note;

    private Boolean active = true;

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Long getBatchId() { return batchId; }
    public void setBatchId(Long batchId) { this.batchId = batchId; }

    public Double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(Double discountPercent) { this.discountPercent = discountPercent; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
