package com.example.demo.mail;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MailRepository extends JpaRepository<MailMessage, Long> {
    List<MailMessage> findByToUserIdOrderByCreatedAtDesc(Long userId);
    List<MailMessage> findByFromUserIdOrderByCreatedAtDesc(Long userId);
}