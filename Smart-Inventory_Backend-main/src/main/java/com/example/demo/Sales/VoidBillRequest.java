package com.example.demo.Sales;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class VoidBillRequest {

    @NotBlank(message = "Void reason is required")
    @Size(min = 5, message = "Void reason must be at least 5 characters")
    private String reason;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
