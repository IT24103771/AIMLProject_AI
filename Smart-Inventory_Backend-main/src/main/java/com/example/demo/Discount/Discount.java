package com.example.demo.Discount;

import com.example.demo.Products.Product;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "discounts")
public class Discount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(optional = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_id", nullable = true)
    private com.example.demo.Inventory.Inventory inventoryBatch;

    @Column(name = "discount_percent", nullable = false)
    private Double discountPercent;

    @Column(name = "note")
    private String note;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Discount() {}

    public Long getId() { return id; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public com.example.demo.Inventory.Inventory getInventoryBatch() { return inventoryBatch; }
    public void setInventoryBatch(com.example.demo.Inventory.Inventory inventoryBatch) { this.inventoryBatch = inventoryBatch; }

    public Double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(Double discountPercent) { this.discountPercent = discountPercent; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}