package com.example.demo.mail;

import java.time.LocalDateTime;

public class MailResponse {
    private Long id;
    private Long fromUserId;
    private String fromName;
    private Long toUserId;
    private String toName;
    private String subject;
    private String body;
    private String status;
    private LocalDateTime createdAt;

    public MailResponse(MailMessage m) {
        this.id = m.getId();
        this.fromUserId = m.getFromUser().getId();
        this.fromName = m.getFromUser().getName();
        this.toUserId = m.getToUser().getId();
        this.toName = m.getToUser().getName();
        this.subject = m.getSubject();
        this.body = m.getBody();
        this.status = m.getStatus();
        this.createdAt = m.getCreatedAt();
    }

    public Long getId() { return id; }
    public Long getFromUserId() { return fromUserId; }
    public String getFromName() { return fromName; }
    public Long getToUserId() { return toUserId; }
    public String getToName() { return toName; }
    public String getSubject() { return subject; }
    public String getBody() { return body; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}