package com.example.demo.Products;

import jakarta.validation.constraints.*;

public class CreateProductRequest {

    @NotBlank(message = "Product name is required")
    @Size(min = 3, max = 100, message = "Product name must be between 3 and 100 characters")
    private String productName;

    @NotBlank(message = "Main category is required")
    @Size(min = 2, max = 100, message = "Main category must be between 2 and 100 characters")
    private String mainCategory;

    @NotBlank(message = "Sub category is required")
    @Size(min = 2, max = 100, message = "Sub category must be between 2 and 100 characters")
    private String subCategory;

    @NotBlank(message = "Supplier is required")
    @Size(min = 2, max = 100, message = "Supplier must be between 2 and 100 characters")
    private String supplier;

    @DecimalMin(value = "0.0", message = "Cost price must be 0 or more")
    private double costPrice;

    @DecimalMin(value = "0.01", message = "Selling price must be greater than 0")
    private double sellingPrice;

    private String imageUrl;

    @Min(value = 0, message = "Reorder level must be 0 or more")
    private int reorderLevel;

    // Getters and Setters
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getMainCategory() { return mainCategory; }
    public void setMainCategory(String mainCategory) { this.mainCategory = mainCategory; }

    public String getSubCategory() { return subCategory; }
    public void setSubCategory(String subCategory) { this.subCategory = subCategory; }


    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }

    public double getCostPrice() { return costPrice; }
    public void setCostPrice(double costPrice) { this.costPrice = costPrice; }

    public double getSellingPrice() { return sellingPrice; }
    public void setSellingPrice(double sellingPrice) { this.sellingPrice = sellingPrice; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public int getReorderLevel() { return reorderLevel; }
    public void setReorderLevel(int reorderLevel) { this.reorderLevel = reorderLevel; }
}
