package com.example.demo.Inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    @Query("SELECT i FROM Inventory i JOIN FETCH i.product ORDER BY i.expiryDate ASC")
    List<Inventory> findAllWithProductOrderByExpiryAsc();

    @Query("""
            SELECT i FROM Inventory i
            JOIN FETCH i.product
            WHERE i.product.productId = :productId
            ORDER BY i.expiryDate ASC
           """)
    List<Inventory> findByProductIdOrderByExpiryAsc(@Param("productId") Long productId);

    @Query("""
            SELECT i FROM Inventory i
            JOIN FETCH i.product
            WHERE i.product.productId = :productId
              AND i.quantity > 0
            ORDER BY i.expiryDate ASC
           """)
    List<Inventory> findAvailableBatchesByProductId(@Param("productId") Long productId);

    @Query("""
            SELECT COUNT(i) > 0
            FROM Inventory i
            WHERE i.product.productId = :productId
              AND LOWER(i.batchNumber) = LOWER(:batchNumber)
           """)
    boolean existsByProductIdAndBatchNumber(@Param("productId") Long productId,
                                            @Param("batchNumber") String batchNumber);

    @Query("SELECT COALESCE(SUM(i.quantity),0) FROM Inventory i WHERE i.product.productId = :productId")
    Integer getTotalQuantityByProductId(@Param("productId") Long productId);

    @Query("SELECT COALESCE(SUM(i.quantity),0) FROM Inventory i")
    Long getTotalStockQty();

    @Query("""
       SELECT COUNT(i)
       FROM Inventory i
       WHERE i.quantity <= i.product.reorderLevel
       """)
    Long countLowStockBatches();

    @Query("""
       SELECT COUNT(i)
       FROM Inventory i
       WHERE i.expiryDate < :today
       """)
    Long countExpiredBatches(@Param("today") java.time.LocalDate today);

    @Query("""
       SELECT COUNT(i)
       FROM Inventory i
       WHERE i.expiryDate >= :today AND i.expiryDate <= :soon
       """)
    Long countExpiringSoonBatches(@Param("today") java.time.LocalDate today,
                                  @Param("soon") java.time.LocalDate soon);
}