package com.example.demo.Dashboard;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public DashboardSummaryResponse summary() {
        return dashboardService.getSummary();
    }

    @PostMapping("/sync-ai-risk")
    public ResponseEntity<String> syncAiRisk() {
        dashboardService.syncAiRisk();
        return ResponseEntity.ok("AI Risk Sync started/completed.");
    }
}
