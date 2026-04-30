package com.example.demo.user;

import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {

    Optional<OtpToken> findTopByEmailOrderByExpiresAtDesc(String email);

    Optional<OtpToken> findTopByEmailAndUsedFalseOrderByExpiresAtDesc(String email);

    List<OtpToken> findByEmailAndUsedFalse(String email);

    @Query("SELECT COUNT(o) FROM OtpToken o WHERE o.email = :email AND o.createdAt > :since")
    long countByEmailAndCreatedAfter(@Param("email") String email, @Param("since") LocalDateTime since);

    @Transactional
    void deleteByEmail(String email);

    @Transactional
    void deleteByExpiresAtBefore(LocalDateTime before);
}