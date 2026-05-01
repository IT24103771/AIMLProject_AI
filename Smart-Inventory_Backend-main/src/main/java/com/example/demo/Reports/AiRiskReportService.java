package com.example.demo.Reports;

import com.example.demo.Inventory.Inventory;
import com.example.demo.Inventory.InventoryRepository;
import com.example.demo.Sales.SaleRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AiRiskReportService {

    private final InventoryRepository inventoryRepository;
    private final SaleRepository saleRepository;

    public AiRiskReportService(InventoryRepository inventoryRepository,
                               SaleRepository saleRepository) {
        this.inventoryRepository = inventoryRepository;
        this.saleRepository = saleRepository;
    }

    public List<AiRiskReportResponse> generateReport() {
        LocalDate today = LocalDate.now();
        List<Inventory> allBatches = inventoryRepository.findAllWithProductOrderByExpiryAsc();

        return allBatches.stream().map(inv -> {
            LocalDate expiry = inv.getExpiryDate();
            long daysLeft = ChronoUnit.DAYS.between(today, expiry);

            // Use AI risk stored on product if available; else compute fallback
            String storedRisk = inv.getProduct().getRiskLevel();
            int riskCode;
            String riskLabel;

            if ("HIGH".equalsIgnoreCase(storedRisk)) {
                riskCode = 1;
                riskLabel = "HIGH";
            } else if ("NORMAL".equalsIgnoreCase(storedRisk) || "MEDIUM".equalsIgnoreCase(storedRisk)) {
                riskCode = 2;
                riskLabel = "NORMAL";
            } else {
                // Logic: ratio = remainingQty / expectedSales
                // expectedSales = velocity * daysLeft
                Long productId = inv.getProduct().getProductId();
                LocalDate sevenDaysAgo = today.minusDays(7);
                Long soldLast7 = saleRepository.getTotalQuantitySoldByProductIdAfter(productId, sevenDaysAgo);
                
                double velocity = (soldLast7 != null) ? (soldLast7 / 7.0) : 0.0;
                if (velocity <= 0) velocity = 1.0; // avoid zero as per user requirement

                int qty = inv.getQuantity() != null ? inv.getQuantity() : 0;
                long safeDays = Math.max(daysLeft, 1); // avoid division by zero
                double expectedSales = velocity * safeDays;
                
                double ratio = qty / expectedSales;

                if (qty == 0) {
                    riskCode = 0; riskLabel = "LOW";
                } else if (daysLeft < 0) {
                    riskCode = 1; riskLabel = "HIGH"; // already expired
                } else if (ratio > 1.0) {
                    riskCode = 1; riskLabel = "HIGH";
                } else {
                    riskCode = 0; riskLabel = "LOW";
                }
            }

            // Calculate safe discount for HIGH risk
            double discount = 0.0;
            if (riskCode == 1) {
                double sellingPrice = inv.getProduct().getSellingPrice();
                double costPrice = inv.getProduct().getCostPrice();
                double margin = sellingPrice - costPrice;
                if (margin > 0) {
                    double maxDiscount = (margin / sellingPrice) * 100;
                    double suggested = daysLeft <= 1 ? 50.0 : daysLeft <= 3 ? 30.0 : 15.0;
                    discount = Math.min(suggested, maxDiscount);
                }
            }

            return new AiRiskReportResponse(
                    inv.getProduct().getProductName(),
                    inv.getProduct().getMainCategory(),
                    inv.getBatchNumber(),
                    inv.getQuantity(),
                    expiry,
                    Math.max(0, daysLeft),   // never show negative – expired = 0
                    riskCode,
                    riskLabel,
                    discount
            );
        }).collect(Collectors.toList());
    }
}
