package com.example.demo.Sales;

import com.example.demo.Inventory.Inventory;
import com.example.demo.Products.Product;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "sales")
public class Sale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id")
    private SaleBill saleBill;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "inventory_id", nullable = false)
    private Inventory inventoryBatch;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "original_unit_price", nullable = false)
    private Double originalUnitPrice = 0.0;

    @Column(name = "discount_percent", nullable = false)
    private Double discountPercent = 0.0;

    @Column(name = "discounted_unit_price", nullable = false)
    private Double discountedUnitPrice = 0.0;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount = 0.0;

    @Column(name = "discount_note")
    private String discountNote;

    @Column(name = "sale_date", nullable = false)
    private LocalDate saleDate;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Sale() {
    }

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }

    public SaleBill getSaleBill() { return saleBill; }
    public void setSaleBill(SaleBill saleBill) { this.saleBill = saleBill; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public Inventory getInventoryBatch() { return inventoryBatch; }
    public void setInventoryBatch(Inventory inventoryBatch) { this.inventoryBatch = inventoryBatch; }

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

    public LocalDate getSaleDate() { return saleDate; }
    public void setSaleDate(LocalDate saleDate) { this.saleDate = saleDate; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}