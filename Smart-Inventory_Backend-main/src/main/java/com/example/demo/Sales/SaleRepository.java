package com.example.demo.Sales;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    @Query("SELECT COALESCE(SUM(s.quantity), 0) FROM Sale s WHERE s.saleDate = :date")
    long getTotalSoldByDate(@Param("date") LocalDate date);

    @Query("""
            SELECT s FROM Sale s
            JOIN FETCH s.product
            JOIN FETCH s.inventoryBatch
            ORDER BY s.saleDate DESC, s.id DESC
           """)
    List<Sale> findAllWithProductOrderByDateDesc();

    @Query("""
            SELECT s FROM Sale s
            JOIN FETCH s.product
            JOIN FETCH s.inventoryBatch
            WHERE s.saleBill.id = :billId
            ORDER BY s.id ASC
           """)
    List<Sale> findBySaleBillId(@Param("billId") Long billId);

    @Query("SELECT COALESCE(SUM(s.quantity), 0) FROM Sale s WHERE s.product.productId = :productId")
    Long getTotalQuantitySoldByProductId(@Param("productId") Long productId);
}