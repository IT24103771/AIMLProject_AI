package com.example.demo.Reports;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ReportResponse {
    private Long id;
    private String reportTitle;
    private ReportType reportType;
    private String format;
    private LocalDate startDate;
    private LocalDate endDate;
    private String visibility;
    private String createdBy;
    private LocalDateTime createdAt;

    public ReportResponse(Report report) {
        this.id = report.getId();
        this.reportTitle = report.getReportTitle();
        this.reportType = report.getReportType();
        this.format = report.getFormat();
        this.startDate = report.getStartDate();
        this.endDate = report.getEndDate();
        this.visibility = report.getVisibility();
        this.createdBy = report.getCreatedBy();
        this.createdAt = report.getCreatedAt();
    }

    // Getters and setters
    
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReportTitle() {
        return reportTitle;
    }

    public void setReportTitle(String reportTitle) {
        this.reportTitle = reportTitle;
    }

    public ReportType getReportType() {
        return reportType;
    }

    public void setReportType(ReportType reportType) {
        this.reportType = reportType;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public String getVisibility() {
        return visibility;
    }

    public void setVisibility(String visibility) {
        this.visibility = visibility;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
