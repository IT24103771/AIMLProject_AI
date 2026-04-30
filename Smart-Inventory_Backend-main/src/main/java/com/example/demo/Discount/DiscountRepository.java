package com.example.demo.Discount;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DiscountRepository extends JpaRepository<Discount, Long> {

    @Query("SELECT d FROM Discount d JOIN FETCH d.product p LEFT JOIN FETCH d.inventoryBatch i ORDER BY d.createdAt DESC")
    List<Discount> findAllWithProductOrderByCreatedAtDesc();

    @Query("SELECT d FROM Discount d JOIN FETCH d.product p LEFT JOIN FETCH d.inventoryBatch i WHERE d.active = true ORDER BY d.createdAt DESC")
    List<Discount> findActiveWithProduct();

    @Query("SELECT COUNT(d) FROM Discount d WHERE d.active = true")
    Long countActiveDiscounts();

    @Query("SELECT d FROM Discount d JOIN FETCH d.product p LEFT JOIN FETCH d.inventoryBatch i WHERE d.product.productId = :productId AND d.inventoryBatch.id = :batchId AND d.active = true")
    java.util.Optional<Discount> findActiveByProductIdAndBatchId(@org.springframework.data.repository.query.Param("productId") Long productId, @org.springframework.data.repository.query.Param("batchId") Long batchId);

    @Query("SELECT COUNT(d) > 0 FROM Discount d WHERE d.inventoryBatch.id = :batchId AND d.active = true")
    boolean existsActiveByBatchId(@org.springframework.data.repository.query.Param("batchId") Long batchId);

    java.util.Optional<Discount> findFirstByProductProductIdAndActiveTrueOrderByCreatedAtDesc(Long productId);
}