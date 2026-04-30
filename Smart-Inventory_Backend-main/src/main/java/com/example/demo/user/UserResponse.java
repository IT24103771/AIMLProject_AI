package com.example.demo.user;

public class UserResponse {

    private Long id;
    private String username;
    private String name;
    private String role;
    private String status;

    public UserResponse() {}

    public UserResponse(User u) {
        this.id = u.getId();
        this.username = u.getUsername();   // ✅ FIXED
        this.name = u.getName();           // ✅ FIXED
        this.role = u.getRole().toString(); // ✅ FIXED (enum → string)
        this.status = u.getStatus();
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getName() { return name; }
    public String getRole() { return role; }
    public String getStatus() { return status; }
}