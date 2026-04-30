package com.example.demo.Dashboard;

public class DashboardSummaryResponse {
    private long totalProducts;
    private long totalBatches;
    private long totalStockQty;

    private long lowStockBatches;     // batches where qty <= reorder level
    private long expiringSoonBatches; // expiry within 7 days
    private long expiredBatches;

    private long salesTodayQty;       // total qty sold today
    private long activeDiscounts;

    public DashboardSummaryResponse(long totalProducts,
                                    long totalBatches,
                                    long totalStockQty,
                                    long lowStockBatches,
                                    long expiringSoonBatches,
                                    long expiredBatches,
                                    long salesTodayQty,
                                    long activeDiscounts) {
        this.totalProducts = totalProducts;
        this.totalBatches = totalBatches;
        this.totalStockQty = totalStockQty;
        this.lowStockBatches = lowStockBatches;
        this.expiringSoonBatches = expiringSoonBatches;
        this.expiredBatches = expiredBatches;
        this.salesTodayQty = salesTodayQty;
        this.activeDiscounts = activeDiscounts;
    }

    public long getTotalProducts() { return totalProducts; }
    public long getTotalBatches() { return totalBatches; }
    public long getTotalStockQty() { return totalStockQty; }
    public long getLowStockBatches() { return lowStockBatches; }
    public long getExpiringSoonBatches() { return expiringSoonBatches; }
    public long getExpiredBatches() { return expiredBatches; }
    public long getSalesTodayQty() { return salesTodayQty; }
    public long getActiveDiscounts() { return activeDiscounts; }
}
