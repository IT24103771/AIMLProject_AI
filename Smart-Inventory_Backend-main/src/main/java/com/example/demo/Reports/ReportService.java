package com.example.demo.Reports;

import com.example.demo.Inventory.Inventory;
import com.example.demo.Inventory.InventoryRepository;
import com.example.demo.Sales.Sale;
import com.example.demo.Sales.SaleRepository;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final ReportRepository reportRepository;
    private final InventoryRepository inventoryRepository;
    private final SaleRepository saleRepository;

    public ReportService(ReportRepository reportRepository, InventoryRepository inventoryRepository, SaleRepository saleRepository) {
        this.reportRepository = reportRepository;
        this.inventoryRepository = inventoryRepository;
        this.saleRepository = saleRepository;
    }

    public ReportResponse createReport(ReportRequest request, String username) {
        Report report = new Report();
        report.setReportTitle(request.getReportTitle());
        report.setReportType(request.getReportType());
        report.setFormat("PDF"); // Always forced
        report.setStartDate(request.getStartDate());
        report.setEndDate(request.getEndDate());
        report.setVisibility(request.getVisibility() != null ? request.getVisibility() : "ADMIN");
        report.setCreatedBy(username);
        
        Report savedReport = reportRepository.save(report);
        return new ReportResponse(savedReport);
    }

    public List<ReportResponse> getAllReports() {
        return reportRepository.findAll().stream()
                .map(ReportResponse::new)
                .collect(Collectors.toList());
    }

    public byte[] generateReport(Long reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found"));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document document = new Document(pdf);

        // Define Brand Colors
        com.itextpdf.kernel.colors.Color brandSlate = new com.itextpdf.kernel.colors.DeviceRgb(15, 23, 42); // #0F172A
        com.itextpdf.kernel.colors.Color brandGreen = new com.itextpdf.kernel.colors.DeviceRgb(0, 122, 94); // #007A5E
        com.itextpdf.kernel.colors.Color white = new com.itextpdf.kernel.colors.DeviceRgb(255, 255, 255);
        com.itextpdf.kernel.colors.Color slateLight = new com.itextpdf.kernel.colors.DeviceRgb(248, 250, 252);

        // Header Block
        Table headerTable = new Table(new float[]{1, 2, 1});
        headerTable.setWidth(com.itextpdf.layout.properties.UnitValue.createPercentValue(100));
        headerTable.setBackgroundColor(brandSlate);
        
        // Col 1: INVIGO Logo
        com.itextpdf.layout.element.Cell logoCell = new com.itextpdf.layout.element.Cell()
            .add(new Paragraph("INVIGO").setFontColor(brandGreen).setBold().setFontSize(26))
            .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
            .setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE)
            .setPadding(14);
        
        // Col 2: Title
        com.itextpdf.layout.element.Cell titleCell = new com.itextpdf.layout.element.Cell()
            .add(new Paragraph("System Intelligence Report").setFontColor(white).setFontSize(16))
            .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
            .setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE)
            .setPaddingLeft(10)
            .setBorderLeft(new com.itextpdf.layout.borders.SolidBorder(white, 1f));
        
        // Col 3: Metadata
        Paragraph metaPara = new Paragraph()
            .add(new com.itextpdf.layout.element.Text("Generated: " + LocalDate.now() + "\n").setFontColor(white).setFontSize(10))
            .add(new com.itextpdf.layout.element.Text("By: " + report.getCreatedBy()).setFontColor(white).setFontSize(10));
        com.itextpdf.layout.element.Cell metaCell = new com.itextpdf.layout.element.Cell()
            .add(metaPara)
            .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
            .setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE)
            .setTextAlignment(TextAlignment.RIGHT)
            .setPadding(14);

        headerTable.addCell(logoCell);
        headerTable.addCell(titleCell);
        headerTable.addCell(metaCell);
        document.add(headerTable);
        document.add(new Paragraph("\n"));

        // Report Subtitle
        document.add(new Paragraph(report.getReportTitle() + " (" + report.getReportType() + ")")
                .setFontSize(14).setBold().setFontColor(brandSlate));
        
        if (report.getStartDate() != null && report.getEndDate() != null) {
            document.add(new Paragraph("Date Range: " + report.getStartDate() + " to " + report.getEndDate())
                    .setFontSize(10).setFontColor(brandSlate));
        }
        document.add(new Paragraph("\n"));

        switch (report.getReportType()) {
            case INVENTORY:
                generateInventoryTable(document, brandGreen, slateLight, brandSlate);
                break;
            case EXPIRED:
                generateExpiredTable(document, report, brandGreen, slateLight, brandSlate);
                break;
            case NEAR_EXPIRY:
                generateNearExpiryTable(document, brandGreen, slateLight, brandSlate);
                break;
            case SALES:
                generateSalesTable(document, report, brandGreen, slateLight, brandSlate);
                break;
        }

        document.close();
        return baos.toByteArray();
    }

    private void generateInventoryTable(Document document, com.itextpdf.kernel.colors.Color brandGreen, com.itextpdf.kernel.colors.Color slateLight, com.itextpdf.kernel.colors.Color brandSlate) {
        List<Inventory> allInventory = inventoryRepository.findAll();
        Table table = new Table(new float[]{3, 2, 1, 2, 2});
        table.setWidth(com.itextpdf.layout.properties.UnitValue.createPercentValue(100));

        addTableHeader(table, brandGreen, white, "Product", "Batch", "Qty", "Expiry", "Status");

        int totalStock = 0;
        int rowIndex = 0;

        for (Inventory inv : allInventory) {
            totalStock += inv.getQuantity();
            String status = "OK";
            if (inv.getExpiryDate() != null && inv.getExpiryDate().isBefore(LocalDate.now())) {
                status = "EXPIRED";
            } else if (inv.getExpiryDate() != null && inv.getExpiryDate().isBefore(LocalDate.now().plusDays(7))) {
                status = "NEAR_EXPIRY";
            }
            addTableRow(table, (rowIndex++ % 2 == 1) ? slateLight : null, 
                inv.getProduct().getProductName(), inv.getBatchNumber(), String.valueOf(inv.getQuantity()), inv.getExpiryDate().toString(), status);
        }
        document.add(table);
        document.add(new Paragraph("\nTotal Initialized Stock: " + totalStock).setBold().setFontColor(brandSlate));
    }

    private void generateExpiredTable(Document document, Report report, com.itextpdf.kernel.colors.Color brandGreen, com.itextpdf.kernel.colors.Color slateLight, com.itextpdf.kernel.colors.Color brandSlate) {
        List<Inventory> expired = inventoryRepository.findAll().stream()
                .filter(i -> i.getExpiryDate() != null && i.getExpiryDate().isBefore(LocalDate.now()))
                .filter(i -> isWithinRange(i.getExpiryDate().atStartOfDay(), report.getStartDate(), report.getEndDate()))
                .collect(Collectors.toList());

        Table table = new Table(new float[]{3, 2, 2, 2});
        table.setWidth(com.itextpdf.layout.properties.UnitValue.createPercentValue(100));
        addTableHeader(table, brandGreen, white, "Product", "Batch", "Expired On", "Qty Lost");

        int totalLossQty = 0;
        int rowIndex = 0;

        for (Inventory inv : expired) {
            totalLossQty += inv.getQuantity();
            addTableRow(table, (rowIndex++ % 2 == 1) ? slateLight : null,
                inv.getProduct().getProductName(), inv.getBatchNumber(), inv.getExpiryDate().toString(), String.valueOf(inv.getQuantity()));
        }
        document.add(table);
        document.add(new Paragraph("\nTotal Expired Items: " + expired.size()).setBold().setFontColor(brandSlate));
        document.add(new Paragraph("Total Quantity Lost: " + totalLossQty).setBold().setFontColor(brandSlate));
    }

    private void generateNearExpiryTable(Document document, com.itextpdf.kernel.colors.Color brandGreen, com.itextpdf.kernel.colors.Color slateLight, com.itextpdf.kernel.colors.Color brandSlate) {
        LocalDate today = LocalDate.now();
        LocalDate threshold = today.plusDays(7);

        List<Inventory> nearExpiry = inventoryRepository.findAll().stream()
                .filter(i -> i.getExpiryDate() != null && i.getExpiryDate().isAfter(today.minusDays(1)) 
                          && i.getExpiryDate().isBefore(threshold.plusDays(1)))
                .collect(Collectors.toList());

        Table table = new Table(new float[]{3, 2, 1});
        table.setWidth(com.itextpdf.layout.properties.UnitValue.createPercentValue(100));
        addTableHeader(table, brandGreen, white, "Product", "Days Left", "Qty at Risk");

        int totalNearExpiry = 0;
        int rowIndex = 0;

        for (Inventory inv : nearExpiry) {
            long daysLeft = ChronoUnit.DAYS.between(today, inv.getExpiryDate());
            totalNearExpiry += inv.getQuantity();
            addTableRow(table, (rowIndex++ % 2 == 1) ? slateLight : null,
                inv.getProduct().getProductName(), String.valueOf(daysLeft), String.valueOf(inv.getQuantity()));
        }
        document.add(table);
        document.add(new Paragraph("\nItems At Risk: " + nearExpiry.size()).setBold().setFontColor(brandSlate));
        document.add(new Paragraph("Total Quantity At Risk: " + totalNearExpiry).setBold().setFontColor(brandSlate));
    }

    private void generateSalesTable(Document document, Report report, com.itextpdf.kernel.colors.Color brandGreen, com.itextpdf.kernel.colors.Color slateLight, com.itextpdf.kernel.colors.Color brandSlate) {
        List<Sale> allSales = saleRepository.findAll().stream()
                .filter(s -> isWithinRange(s.getSaleDate().atStartOfDay(), report.getStartDate(), report.getEndDate()))
                .collect(Collectors.toList());

        Table table = new Table(new float[]{3, 1, 2, 2});
        table.setWidth(com.itextpdf.layout.properties.UnitValue.createPercentValue(100));
        addTableHeader(table, brandGreen, white, "Product", "Qty", "Date", "Revenue");

        double totalRevenue = 0.0;
        int totalSold = 0;
        int rowIndex = 0;

        for (Sale sale : allSales) {
            totalRevenue += sale.getTotalAmount();
            totalSold += sale.getQuantity();
            addTableRow(table, (rowIndex++ % 2 == 1) ? slateLight : null,
                sale.getProduct().getProductName(), String.valueOf(sale.getQuantity()), sale.getSaleDate().toString(), String.format("%.2f", sale.getTotalAmount()));
        }
        document.add(table);
        document.add(new Paragraph("\nTotal Products Sold: " + totalSold).setBold().setFontColor(brandSlate));
        document.add(new Paragraph("Total Gross Revenue: $" + String.format("%.2f", totalRevenue)).setBold().setFontColor(brandSlate));
    }
    
    private com.itextpdf.kernel.colors.Color white = new com.itextpdf.kernel.colors.DeviceRgb(255, 255, 255);

    private void addTableHeader(Table table, com.itextpdf.kernel.colors.Color bgColor, com.itextpdf.kernel.colors.Color fgColor, String... headers) {
        for (String header : headers) {
            table.addHeaderCell(new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(header).setBold().setFontColor(fgColor).setFontSize(9))
                .setBackgroundColor(bgColor)
                .setBorder(new com.itextpdf.layout.borders.SolidBorder(bgColor, 1f))
                .setPadding(6)
            );
        }
    }
    
    private void addTableRow(Table table, com.itextpdf.kernel.colors.Color bgColor, String... data) {
        for (String cellData : data) {
            com.itextpdf.layout.element.Cell cell = new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(cellData).setFontSize(9))
                .setPadding(6)
                .setBorder(new com.itextpdf.layout.borders.SolidBorder(new com.itextpdf.kernel.colors.DeviceRgb(226, 232, 240), 1f));
            if (bgColor != null) {
                cell.setBackgroundColor(bgColor);
            }
            table.addCell(cell);
        }
    }

    private boolean isWithinRange(LocalDateTime date, LocalDate start, LocalDate end) {
        if (start != null && date.toLocalDate().isBefore(start)) return false;
        if (end != null && date.toLocalDate().isAfter(end)) return false;
        return true;
    }
}