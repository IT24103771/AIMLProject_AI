package com.example.demo.Reports;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import com.example.demo.user.UserRepository;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;
    private final ReportRepository reportRepository;
    private final UserRepository userRepository;

    public ReportController(ReportService reportService, ReportRepository reportRepository, UserRepository userRepository) {
        this.reportService = reportService;
        this.reportRepository = reportRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<ReportResponse> createReport(@RequestBody ReportRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String generatedBy = "System";
        
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            try {
                Long userId = Long.parseLong(auth.getName());
                generatedBy = userRepository.findById(userId)
                    .map(u -> u.getUsername())
                    .orElse("System");
            } catch (NumberFormatException e) {
                generatedBy = auth.getName();
            }
        }
                
        ReportResponse response = reportService.createReport(request, generatedBy);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<ReportResponse>> getAllReports() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_OWNER"));
        
        List<ReportResponse> reports = reportService.getAllReports();
        
        if (!isAdmin) {
            reports = reports.stream()
                .filter(r -> "STAFF".equalsIgnoreCase(r.getVisibility()) || "ALL".equalsIgnoreCase(r.getVisibility()))
                .collect(Collectors.toList());
        }
        
        return ResponseEntity.ok(reports);
    }

    @GetMapping(value = "/{id}/download", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadReport(@PathVariable Long id) {
        Report report = reportRepository.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
        byte[] pdfBytes = reportService.generateReport(id);

        String filename = "Report_" + report.getReportType() + "_" + report.getId() + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReport(@PathVariable Long id) {
        if (!reportRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        reportRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/visibility")
    public ResponseEntity<ReportResponse> changeVisibility(@PathVariable Long id, @RequestParam String visibility) {
        Report report = reportRepository.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
        report.setVisibility(visibility);
        reportRepository.save(report);
        
        return ResponseEntity.ok(new ReportResponse(report));
    }
}