package com.example.demo.Dashboard;

import com.example.demo.Discount.DiscountRepository;
import com.example.demo.Inventory.InventoryRepository;
import com.example.demo.Products.ProductRepository;
import com.example.demo.Sales.SaleRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class DashboardService {

    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final SaleRepository saleRepository;
    private final DiscountRepository discountRepository;
    private final com.example.demo.Products.ProductService productService;

    public DashboardService(ProductRepository productRepository,
                            InventoryRepository inventoryRepository,
                            SaleRepository saleRepository,
                            DiscountRepository discountRepository,
                            com.example.demo.Products.ProductService productService) {
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
        this.saleRepository = saleRepository;
        this.discountRepository = discountRepository;
        this.productService = productService;
    }

    public void syncAiRisk() {
        System.out.println("DEBUG: Manual AI Risk Sync triggered from Dashboard.");
        productService.syncAllProductsRisk();
    }

    public DashboardSummaryResponse getSummary() {

        long totalProducts = productRepository.count();
        long totalBatches = inventoryRepository.count();
        long totalStockQty = inventoryRepository.getTotalStockQty(); // add query below

        long lowStockBatches = inventoryRepository.countLowStockBatches(); // add query below

        LocalDate today = LocalDate.now();
        LocalDate soon = today.plusDays(7);

        long expiredBatches = inventoryRepository.countExpiredBatches(today);          // add query below
        long expiringSoonBatches = inventoryRepository.countExpiringSoonBatches(today, soon); // add query below

        long salesTodayQty = saleRepository.getTotalSoldByDate(today); // add query below

        long activeDiscounts = discountRepository.countActiveDiscounts(); // add query below

        return new DashboardSummaryResponse(
                totalProducts,
                totalBatches,
                totalStockQty,
                lowStockBatches,
                expiringSoonBatches,
                expiredBatches,
                salesTodayQty,
                activeDiscounts
        );
    }
}
