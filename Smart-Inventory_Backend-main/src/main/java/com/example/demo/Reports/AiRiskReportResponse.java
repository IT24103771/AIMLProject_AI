package com.example.demo.Reports;

import java.time.LocalDate;

public class AiRiskReportResponse {

    private String productName;
    private String category;
    private String batchNumber;
    private Integer quantity;
    private LocalDate expiryDate;
    private long daysLeft;
    private int risk;           // 0=LOW, 1=HIGH, 2=NORMAL
    private String riskLabel;   // HIGH / NORMAL / LOW
    private double suggestedDiscount;

    public AiRiskReportResponse() {}

    public AiRiskReportResponse(String productName, String category, String batchNumber,
                                Integer quantity, LocalDate expiryDate, long daysLeft,
                                int risk, String riskLabel, double suggestedDiscount) {
        this.productName = productName;
        this.category = category;
        this.batchNumber = batchNumber;
        this.quantity = quantity;
        this.expiryDate = expiryDate;
        this.daysLeft = daysLeft;
        this.risk = risk;
        this.riskLabel = riskLabel;
        this.suggestedDiscount = suggestedDiscount;
    }

    public String getProductName()          { return productName; }
    public String getCategory()             { return category; }
    public String getBatchNumber()          { return batchNumber; }
    public Integer getQuantity()            { return quantity; }
    public LocalDate getExpiryDate()        { return expiryDate; }
    public long getDaysLeft()               { return daysLeft; }
    public int getRisk()                    { return risk; }
    public String getRiskLabel()            { return riskLabel; }
    public double getSuggestedDiscount()    { return suggestedDiscount; }
}
