package com.example.demo.Sales;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SaleBillRepository extends JpaRepository<SaleBill, Long> {

    Optional<SaleBill> findByBillNumber(String billNumber);

    Optional<SaleBill> findByIdempotencyKey(String idempotencyKey);

    List<SaleBill> findByStatusOrderByCreatedAtDesc(BillStatus status);

    @Query("SELECT b FROM SaleBill b ORDER BY b.createdAt DESC")
    List<SaleBill> findAllOrderByCreatedAtDesc();
}
