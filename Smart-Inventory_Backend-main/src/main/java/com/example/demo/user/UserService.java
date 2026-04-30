package com.example.demo.user;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Optional<User> authenticate(String username, String password) {
        if (username == null || username.trim().isEmpty()) return Optional.empty();
        if (password == null || password.isEmpty()) return Optional.empty();

        Optional<User> user = userRepository.findByUsername(username.trim());

        if (user.isPresent()
                && "ACTIVE".equalsIgnoreCase(user.get().getStatus())
                && !user.get().isAccountLocked()
                && passwordEncoder.matches(password, user.get().getPassword())) {
            return user;
        }

        return Optional.empty();
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getById(Long id) {
        return userRepository.findById(id);
    }

    public User saveUser(User user) {
        return userRepository.save(user);
    }

    public User createUser(User user) {
        validateUserForCreate(user);

        user.setUsername(user.getUsername().trim());
        user.setName(user.getName().trim());
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            user.setEmail(user.getEmail().trim().toLowerCase());
        }

        if (user.getStatus() == null || user.getStatus().isBlank()) {
            user.setStatus("ACTIVE");
        } else {
            validateStatus(user.getStatus());
            user.setStatus(user.getStatus().trim().toUpperCase());
        }

        if (user.getRoleName() == null || user.getRoleName().isBlank()) {
            user.setRoleName(user.getRole().name());
        }

        user.setFailedLoginAttempts(0);
        user.setAccountLocked(false);

        return userRepository.save(user);
    }

    public Optional<User> updateUser(Long id, User userDetails) {
        return userRepository.findById(id).map(user -> {
            validateUserForUpdate(userDetails, user);

            user.setName(userDetails.getName().trim());
            user.setUsername(userDetails.getUsername().trim());
            user.setDoj(userDetails.getDoj());
            user.setRole(userDetails.getRole());

            if (userDetails.getRoleName() != null) {
                user.setRoleName(userDetails.getRoleName().trim());
            }

            if (userDetails.getEmail() != null) {
                String email = userDetails.getEmail().trim().toLowerCase();
                if (!email.isBlank()) {
                    userRepository.findByEmail(email).ifPresent(existing -> {
                        if (!existing.getId().equals(user.getId())) {
                            throw new RuntimeException("Email already in use.");
                        }
                    });
                    user.setEmail(email);
                } else {
                    user.setEmail(null);
                }
            }

            if (userDetails.getStatus() != null && !userDetails.getStatus().isBlank()) {
                validateStatus(userDetails.getStatus());
                user.setStatus(userDetails.getStatus().trim().toUpperCase());
            }

            user.setAccountLocked(userDetails.isAccountLocked());
            user.setFailedLoginAttempts(userDetails.getFailedLoginAttempts());

            if (userDetails.getPassword() != null && !userDetails.getPassword().isBlank()) {
                if (userDetails.getPassword().length() < 6) {
                    throw new RuntimeException("Password must be at least 6 characters.");
                }
                user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
            }

            return userRepository.save(user);
        });
    }

    public boolean deleteUser(Long id) {
        return userRepository.findById(id).map(user -> {
            userRepository.deleteById(id);
            return true;
        }).orElse(false);
    }

    private void validateUserForCreate(User user) {
        if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
            throw new RuntimeException("Username is required.");
        }

        String username = user.getUsername().trim();

        if (username.length() < 3 || username.length() > 50) {
            throw new RuntimeException("Username must be between 3 and 50 characters.");
        }

        if (!username.matches("^[a-zA-Z0-9._@]+$")) {
            throw new RuntimeException("Username may only contain letters, digits, dots, underscores, and @.");
        }

        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists.");
        }

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            String email = user.getEmail().trim().toLowerCase();
            if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
                throw new RuntimeException("Invalid email format.");
            }
            if (userRepository.findByEmail(email).isPresent()) {
                throw new RuntimeException("Email already in use.");
            }
        }

        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new RuntimeException("Password is required.");
        }

        if (user.getPassword().length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters.");
        }

        if (user.getName() == null || user.getName().trim().isEmpty()) {
            throw new RuntimeException("Full name is required.");
        }

        if (user.getName().trim().length() < 2) {
            throw new RuntimeException("Full name must be at least 2 characters.");
        }

        if (user.getRole() == null) {
            throw new RuntimeException("Role is required.");
        }
    }

    private void validateUserForUpdate(User newData, User existing) {
        if (newData.getUsername() == null || newData.getUsername().trim().isEmpty()) {
            throw new RuntimeException("Username is required.");
        }

        String username = newData.getUsername().trim();

        if (username.length() < 3 || username.length() > 50) {
            throw new RuntimeException("Username must be between 3 and 50 characters.");
        }

        if (!username.matches("^[a-zA-Z0-9._@]+$")) {
            throw new RuntimeException("Username may only contain letters, digits, dots, underscores, and @.");
        }

        if (!existing.getUsername().equalsIgnoreCase(username)
                && userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists.");
        }

        if (newData.getName() == null || newData.getName().trim().isEmpty()) {
            throw new RuntimeException("Full name is required.");
        }

        if (newData.getRole() == null) {
            throw new RuntimeException("Role is required.");
        }
    }

    private void validateStatus(String status) {
        String normalized = status.trim().toUpperCase();
        if (!"ACTIVE".equals(normalized) && !"INACTIVE".equals(normalized)) {
            throw new RuntimeException("Status must be ACTIVE or INACTIVE.");
        }
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public void resetPassword(User user, String newPassword) {
        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setAccountLocked(false);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);
    }
}