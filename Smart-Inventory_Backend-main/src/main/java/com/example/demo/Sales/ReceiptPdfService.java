package com.example.demo.Sales;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;

@Service
public class ReceiptPdfService {

    public byte[] generateReceiptPdf(BillResponse bill) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc);

            // Header
            document.add(new Paragraph("INVIGO FRESHGUARD")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(18)
                    .setBold());

            document.add(new Paragraph("Sales Receipt")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(14));

            document.add(new Paragraph(" "));

            // Bill Info
            document.add(new Paragraph("Bill Number: " + bill.getBillNumber())
                    .setFontSize(10));
            document.add(new Paragraph("Date: " + bill.getSaleDate())
                    .setFontSize(10));
            document.add(new Paragraph("Status: " + bill.getStatus())
                    .setFontSize(10));
            if (bill.getCreatedBy() != null) {
                document.add(new Paragraph("Cashier: " + bill.getCreatedBy())
                        .setFontSize(10));
            }

            document.add(new Paragraph(" "));

            // Items Table
            float[] columnWidths = {4, 1, 2, 2, 2};
            Table table = new Table(UnitValue.createPercentArray(columnWidths))
                    .useAllAvailableWidth();

            // Header row
            table.addHeaderCell(new Cell().add(new Paragraph("Product").setBold().setFontSize(9)));
            table.addHeaderCell(new Cell().add(new Paragraph("Qty").setBold().setFontSize(9)));
            table.addHeaderCell(new Cell().add(new Paragraph("Unit Price").setBold().setFontSize(9)));
            table.addHeaderCell(new Cell().add(new Paragraph("Discount").setBold().setFontSize(9)));
            table.addHeaderCell(new Cell().add(new Paragraph("Total").setBold().setFontSize(9)));

            if (bill.getLines() != null) {
                for (BillResponse.LineResponse line : bill.getLines()) {
                    table.addCell(new Cell().add(new Paragraph(
                            line.getProductName() + "\n" + "Batch: " + line.getBatchNumber()
                    ).setFontSize(9)));

                    table.addCell(new Cell().add(new Paragraph(
                            String.valueOf(line.getQuantity())
                    ).setFontSize(9)));

                    table.addCell(new Cell().add(new Paragraph(
                            formatMoney(line.getOriginalUnitPrice())
                    ).setFontSize(9)));

                    String discountText = line.getDiscountPercent() != null && line.getDiscountPercent() > 0
                            ? String.format("%.0f%%", line.getDiscountPercent())
                            : "-";
                    table.addCell(new Cell().add(new Paragraph(discountText).setFontSize(9)));

                    table.addCell(new Cell().add(new Paragraph(
                            formatMoney(line.getTotalAmount())
                    ).setFontSize(9)));
                }
            }

            document.add(table);

            document.add(new Paragraph(" "));

            // Total
            document.add(new Paragraph("TOTAL: " + formatMoney(bill.getBillTotal()))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setFontSize(14)
                    .setBold());

            if (bill.getVoidReason() != null) {
                document.add(new Paragraph(" "));
                document.add(new Paragraph("*** VOIDED ***")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setBold());
                document.add(new Paragraph("Reason: " + bill.getVoidReason())
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(10));
            }

            document.add(new Paragraph(" "));
            document.add(new Paragraph("Thank you for your purchase!")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(10));

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate receipt PDF: " + e.getMessage(), e);
        }
    }

    private String formatMoney(Double value) {
        return String.format("Rs %.2f", value == null ? 0.0 : value);
    }
}
