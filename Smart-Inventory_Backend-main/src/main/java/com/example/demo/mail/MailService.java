package com.example.demo.mail;

import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MailService {

    private final MailRepository mailRepository;
    private final UserRepository userRepository;

    public MailService(MailRepository mailRepository, UserRepository userRepository) {
        this.mailRepository = mailRepository;
        this.userRepository = userRepository;
    }

    public MailResponse send(SendMailRequest req) {
        if (req == null) {
            throw new RuntimeException("Request body is missing");
        }

        String fromUsername = req.getFromUsername() == null ? "" : req.getFromUsername().trim();
        if (fromUsername.isEmpty()) {
            throw new RuntimeException("fromUsername is required");
        }

        if (req.getToUserId() == null) {
            throw new RuntimeException("toUserId is required");
        }

        String subject = req.getSubject() == null ? "" : req.getSubject().trim();
        String body = req.getBody() == null ? "" : req.getBody().trim();

        if (subject.isEmpty()) {
            throw new RuntimeException("Subject is required");
        }
        if (body.isEmpty()) {
            throw new RuntimeException("Message is required");
        }

        User from = userRepository.findByUsername(fromUsername)
                .orElseThrow(() -> new RuntimeException("From user not found: " + fromUsername));

        User to = userRepository.findById(req.getToUserId())
                .orElseThrow(() -> new RuntimeException("To user not found: " + req.getToUserId()));

        MailMessage m = new MailMessage();
        m.setFromUser(from);
        m.setToUser(to);
        m.setSubject(subject);
        m.setBody(body);
        m.setStatus("SENT");

        return new MailResponse(mailRepository.save(m));
    }

    public List<MailResponse> inbox(Long userId) {
        return mailRepository.findByToUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(MailResponse::new)
                .toList();
    }

    public List<MailResponse> sent(Long userId) {
        return mailRepository.findByFromUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(MailResponse::new)
                .toList();
    }

    public MailResponse markRead(Long mailId) {
        MailMessage m = mailRepository.findById(mailId)
                .orElseThrow(() -> new RuntimeException("Mail not found: " + mailId));

        m.setStatus("READ");
        return new MailResponse(mailRepository.save(m));
    }

    public void delete(Long mailId) {
        if (!mailRepository.existsById(mailId)) {
            throw new RuntimeException("Mail not found: " + mailId);
        }
        mailRepository.deleteById(mailId);
    }
}