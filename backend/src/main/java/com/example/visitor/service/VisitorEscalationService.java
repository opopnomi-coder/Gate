package com.example.visitor.service;

import com.example.visitor.entity.Visitor;
import com.example.visitor.entity.Notification;
import com.example.visitor.repository.VisitorRepository;
import com.example.visitor.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class VisitorEscalationService {

    @Autowired
    private VisitorRepository visitorRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    // Run every minute to check for expired visitor requests
    @Scheduled(fixedRate = 60000) // 1 minute in milliseconds
    @Transactional
    public void checkAndEscalateExpiredRequests() {
        LocalDateTime fiveMinutesAgo = LocalDateTime.now().minusMinutes(5);
        
        // Find all PENDING visitors where notification was sent more than 5 minutes ago
        // and not yet escalated to security
        List<Visitor> expiredRequests = visitorRepository.findAll().stream()
            .filter(v -> "PENDING".equals(v.getStatus()))
            .filter(v -> v.getNotificationSentAt() != null)
            .filter(v -> v.getNotificationSentAt().isBefore(fiveMinutesAgo))
            .filter(v -> v.getEscalatedToSecurity() == null || !v.getEscalatedToSecurity())
            .toList();

        for (Visitor visitor : expiredRequests) {
            escalateToSecurity(visitor);
        }
    }

    @Transactional
    public void escalateToSecurity(Visitor visitor) {
        // Mark as escalated
        visitor.setEscalatedToSecurity(true);
        visitor.setEscalationTime(LocalDateTime.now());
        visitorRepository.save(visitor);

        // Create notification for all security personnel
        // Using the gate pass notification constructor
        Notification notification = new Notification(
            "ALL_SECURITY", // userId - will be broadcast to all security
            "Visitor Request Escalated",
            String.format(
                "Visitor %s wants to meet %s in %s department. Original request timed out after 10 minutes.",
                visitor.getName(),
                visitor.getPersonToMeet(),
                visitor.getDepartment()
            ),
            Notification.NotificationType.URGENT,
            Notification.NotificationPriority.URGENT,
            "/escalated-visitors"
        );
        
        notificationRepository.save(notification);
        
        System.out.println("✅ Escalated visitor request ID: " + visitor.getId() + " to security");
    }
}
