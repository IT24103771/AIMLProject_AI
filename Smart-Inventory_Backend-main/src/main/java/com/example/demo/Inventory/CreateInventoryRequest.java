package com.example.demo.Inventory;


import jakarta.validation.constraints.*;

import java.time.LocalDate;

public class CreateInventoryRequest {

    @NotNull
    private Long productId;

    @NotBlank
    private String batchNumber;

    @NotNull
    @Min(1)
    private Integer quantity;

    @NotNull
    private LocalDate expiryDate;

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }
}
