package com.example.demo.user;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/staff/profile")
@CrossOrigin(origins = "*")
public class StaffProfileController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    public StaffProfileController(UserService userService, PasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    private ResponseEntity<?> forbidIfNotOwner(Long pathId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required."));
        }
        try {
            Long authenticatedId = Long.parseLong(auth.getName());
            if (!authenticatedId.equals(pathId)) {
                return ResponseEntity.status(403).body(Map.of("message", "You can only access your own profile."));
            }
        } catch (NumberFormatException e) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid authentication token."));
        }
        return null;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProfile(@PathVariable Long id) {
        ResponseEntity<?> denied = forbidIfNotOwner(id);
        if (denied != null) return denied;

        Optional<User> userOpt = userService.getById(id);
        if (userOpt.isEmpty()) return ResponseEntity.notFound().build();

        User user = userOpt.get();

        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("username", user.getUsername());
        profile.put("name", user.getName());
        profile.put("doj", user.getDoj());
        profile.put("role", user.getRole());
        profile.put("roleName", user.getRoleName());
        profile.put("email", user.getEmail());

        return ResponseEntity.ok(profile);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProfile(@PathVariable Long id,
                                           @RequestBody Map<String, String> body) {
        ResponseEntity<?> denied = forbidIfNotOwner(id);
        if (denied != null) return denied;

        Optional<User> userOpt = userService.getById(id);
        if (userOpt.isEmpty()) return ResponseEntity.notFound().build();

        User user = userOpt.get();

        String newName = body.get("name");
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (newName != null && !newName.isBlank()) {
            user.setName(newName.trim());
        }

        if (newPassword != null && !newPassword.isBlank()) {
            if (currentPassword == null || currentPassword.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Current password is required."));
            }

            if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                return ResponseEntity.status(401).body(Map.of("message", "Current password is incorrect."));
            }

            if (newPassword.length() < 6) {
                return ResponseEntity.badRequest().body(Map.of("message", "New password must be at least 6 characters."));
            }

            user.setPassword(passwordEncoder.encode(newPassword));
        }

        User saved = userService.saveUser(user);

        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "username", saved.getUsername(),
                "name", saved.getName(),
                "doj", saved.getDoj(),
                "role", saved.getRole(),
                "roleName", saved.getRoleName(),
                "email", saved.getEmail()
        ));
    }
}