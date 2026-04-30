package com.example.demo.user;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class OtpService {

    private final OtpTokenRepository otpTokenRepository;

    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int MAX_VERIFY_ATTEMPTS = 5;
    private static final int MAX_OTP_REQUESTS_PER_HOUR = 3;

    public OtpService(OtpTokenRepository otpTokenRepository) {
        this.otpTokenRepository = otpTokenRepository;
    }

    public String generateOtp(String email) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email is required.");
        }

        String normalizedEmail = email.trim().toLowerCase();

        // Rate-limit: max OTP requests per hour
        long recentCount = otpTokenRepository
                .countByEmailAndCreatedAfter(normalizedEmail, LocalDateTime.now().minusHours(1));
        if (recentCount >= MAX_OTP_REQUESTS_PER_HOUR) {
            throw new RuntimeException("Too many OTP requests. Please try again later.");
        }

        // Invalidate any existing unused OTPs for this email
        otpTokenRepository.findByEmailAndUsedFalse(normalizedEmail).forEach(token -> {
            token.setUsed(true);
            otpTokenRepository.save(token);
        });

        // Generate secure random OTP
        SecureRandom random = new SecureRandom();
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < OTP_LENGTH; i++) {
            otp.append(random.nextInt(10));
        }

        OtpToken otpToken = new OtpToken(
                normalizedEmail,
                otp.toString(),
                LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES)
        );
        otpTokenRepository.save(otpToken);

        return otp.toString();
    }

    public boolean verifyOtp(String email, String otp) {
        if (email == null || otp == null) return false;

        String normalizedEmail = email.trim().toLowerCase();

        Optional<OtpToken> tokenOpt = otpTokenRepository
                .findTopByEmailAndUsedFalseOrderByExpiresAtDesc(normalizedEmail);

        if (tokenOpt.isEmpty()) {
            throw new RuntimeException("No active OTP found. Please request a new one.");
        }

        OtpToken token = tokenOpt.get();

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            token.setUsed(true);
            otpTokenRepository.save(token);
            throw new RuntimeException("OTP has expired. Please request a new one.");
        }

        if (token.getAttemptCount() >= MAX_VERIFY_ATTEMPTS) {
            token.setUsed(true);
            otpTokenRepository.save(token);
            throw new RuntimeException("Maximum verification attempts exceeded. Please request a new OTP.");
        }

        token.setAttemptCount(token.getAttemptCount() + 1);

        if (!token.getOtp().equals(otp.trim())) {
            otpTokenRepository.save(token);
            int remaining = MAX_VERIFY_ATTEMPTS - token.getAttemptCount();
            throw new RuntimeException("Invalid OTP. " + remaining + " attempt(s) remaining.");
        }

        token.setUsed(true);
        otpTokenRepository.save(token);

        return true;
    }

    public void cleanupExpiredTokens() {
        otpTokenRepository.deleteByExpiresAtBefore(LocalDateTime.now().minusHours(24));
    }
}
