package com.example.demo.user;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final OtpService otpService;
    private final LoginHistoryService loginHistoryService;
    private final RoleRepository roleRepository;

    @Value("${app.max-login-attempts:3}")
    private int maxLoginAttempts;

    public AuthController(UserService userService, JwtService jwtService, OtpService otpService,
                          LoginHistoryService loginHistoryService, RoleRepository roleRepository) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.otpService = otpService;
        this.loginHistoryService = loginHistoryService;
        this.roleRepository = roleRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials,
                                   HttpServletRequest request) {

        String username = credentials.get("username");
        String password = credentials.get("password");

        String ipAddress = request.getRemoteAddr();
        String deviceBrowser = request.getHeader("User-Agent");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username and password required"));
        }

        Optional<User> userOpt = userService.findByUsername(username.trim());

        if (userOpt.isEmpty()) {
            loginHistoryService.recordLogin(username, "Unknown", ipAddress, deviceBrowser, "Failed");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid credentials"));
        }

        User matchingUser = userOpt.get();

        if (matchingUser.isAccountLocked()) {
            loginHistoryService.recordLogin(username, matchingUser.getName(), ipAddress, deviceBrowser, "Failed (Locked)");
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Account locked. Please contact admin."));
        }

        if (!"ACTIVE".equalsIgnoreCase(matchingUser.getStatus())) {
            loginHistoryService.recordLogin(username, matchingUser.getName(), ipAddress, deviceBrowser, "Failed (Deactivated)");
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Account is deactivated. Please contact admin."));
        }

        Optional<User> authenticatedUser = userService.authenticate(username, password);

        if (authenticatedUser.isPresent()) {
            User loggedInUser = authenticatedUser.get();

            String submittedRole = credentials.get("role");
            String actualRoleName = loggedInUser.getRoleName();
            if (submittedRole != null && !submittedRole.isBlank()
                    && actualRoleName != null && !actualRoleName.isBlank()) {
                boolean roleMatches = submittedRole.trim().equalsIgnoreCase(actualRoleName.trim());
                if (!roleMatches && submittedRole.trim().equalsIgnoreCase("Admin")) {
                    Optional<Role> userRole = roleRepository.findAll().stream()
                        .filter(r -> r.getRoleName().equalsIgnoreCase(actualRoleName))
                        .findFirst();
                    roleMatches = userRole.isPresent()
                        && ("ADMIN".equalsIgnoreCase(userRole.get().getRoleType())
                            || "SUB_ADMIN".equalsIgnoreCase(userRole.get().getRoleType()));
                }
                if (!roleMatches) {
                    loginHistoryService.recordLogin(username, loggedInUser.getName(), ipAddress, deviceBrowser, "Failed (Role Mismatch)");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("message", "Role does not match your account. Access denied."));
                }
            }

            loggedInUser.setFailedLoginAttempts(0);
            userService.saveUser(loggedInUser);

            String token = jwtService.generateToken(
                    loggedInUser.getId(),
                    loggedInUser.getUsername(),
                    loggedInUser.getRole().name()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("id", loggedInUser.getId());
            response.put("username", loggedInUser.getUsername());
            response.put("name", loggedInUser.getName());
            response.put("role", loggedInUser.getRole());
            response.put("roleName", loggedInUser.getRoleName());
            response.put("status", loggedInUser.getStatus());
            response.put("email", loggedInUser.getEmail());
            response.put("token", token);
            response.put("message", "Login successful");

            java.util.List<Role> allRoles = roleRepository.findAll();
            String userRoleEnum = loggedInUser.getRole().name();
            String specificRoleName = loggedInUser.getRoleName();

            Optional<Role> matchedRole = (specificRoleName != null && !specificRoleName.isEmpty())
                ? allRoles.stream().filter(r -> r.getRoleName().equalsIgnoreCase(specificRoleName)).findFirst()
                : allRoles.stream()
                    .filter(r -> r.getRoleName().toUpperCase().contains(userRoleEnum)
                              || userRoleEnum.contains(r.getRoleName().toUpperCase()))
                    .findFirst();

            Map<String, Boolean> permissions = new HashMap<>();
            if (matchedRole.isPresent()) {
                Role r = matchedRole.get();
                permissions.put("inventoryTracking", r.isInventoryTracking());
                permissions.put("productManagement", r.isProductManagement());
                permissions.put("salesManagement",   r.isSalesManagement());
                permissions.put("discountsAlerts",   r.isDiscountsAlerts());
                permissions.put("reportAnalytics",   r.isReportAnalytics());
                permissions.put("userControl",       r.isUserControl());
                permissions.put("addUpdateStock",    r.isAddUpdateStock());
            } else if ("ADMIN".equals(userRoleEnum) || "OWNER".equals(userRoleEnum)) {
                permissions.put("inventoryTracking", true);
                permissions.put("productManagement", true);
                permissions.put("salesManagement",   true);
                permissions.put("discountsAlerts",   true);
                permissions.put("reportAnalytics",   true);
                permissions.put("userControl",       true);
                permissions.put("addUpdateStock",    true);
            } else {
                permissions.put("inventoryTracking", false);
                permissions.put("productManagement", false);
                permissions.put("salesManagement",   false);
                permissions.put("discountsAlerts",   false);
                permissions.put("reportAnalytics",   false);
                permissions.put("userControl",       false);
                permissions.put("addUpdateStock",    false);
            }
            response.put("permissions", permissions);

            loginHistoryService.recordLogin(username, loggedInUser.getName(), ipAddress, deviceBrowser, "Success");
            return ResponseEntity.ok(response);
        }

        matchingUser.setFailedLoginAttempts(matchingUser.getFailedLoginAttempts() + 1);

        boolean lockedNow = false;
        if (matchingUser.getFailedLoginAttempts() >= maxLoginAttempts
                && matchingUser.getRole() != UserRole.OWNER) {
            matchingUser.setAccountLocked(true);
            lockedNow = true;
        }

        userService.saveUser(matchingUser);
        loginHistoryService.recordLogin(username, matchingUser.getName(), ipAddress, deviceBrowser, "Failed");

        if (lockedNow) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "Account locked after " + maxLoginAttempts + " failed attempts. Contact admin."));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Invalid credentials"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required."));
        }

        String normalizedEmail = email.trim().toLowerCase();

        // Check if user with this email exists
        Optional<User> userOpt = userService.findByEmail(normalizedEmail);
        if (userOpt.isEmpty()) {
            // Return success even if not found to prevent email enumeration
            return ResponseEntity.ok(Map.of("message", "If an account with that email exists, an OTP has been generated."));
        }

        try {
            String otp = otpService.generateOtp(normalizedEmail);
            // In production, send this via email. For now, log it.
            System.out.println("OTP for " + normalizedEmail + ": " + otp);

            return ResponseEntity.ok(Map.of(
                    "message", "OTP generated successfully. Check your email.",
                    "otp", otp // Remove this in production — only for development/testing
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");

        if (email == null || email.isBlank() || otp == null || otp.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and OTP are required."));
        }

        try {
            boolean valid = otpService.verifyOtp(email.trim().toLowerCase(), otp.trim());
            if (valid) {
                return ResponseEntity.ok(Map.of("message", "OTP verified successfully.", "verified", true));
            }
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid OTP."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");
        String newPassword = body.get("newPassword");

        if (email == null || otp == null || newPassword == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Email, OTP, and new password are required."));
        }

        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Password must be at least 6 characters."));
        }

        String normalizedEmail = email.trim().toLowerCase();

        try {
            boolean otpValid = otpService.verifyOtp(normalizedEmail, otp.trim());
            if (!otpValid) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid OTP."));
            }
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        Optional<User> userOpt = userService.findByEmail(normalizedEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found."));
        }

        User user = userOpt.get();
        userService.resetPassword(user, newPassword);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now log in."));
    }
}