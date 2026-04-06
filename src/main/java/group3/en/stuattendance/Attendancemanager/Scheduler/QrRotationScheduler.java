package group3.en.stuattendance.Attendancemanager.Scheduler;

import group3.en.stuattendance.Timetablemanager.Enum.SessionStatus;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class QrRotationScheduler {

    private final SessionRepository sessionRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Rotates QR codes for all active sessions every 30 seconds.
     * Broadcasts the new token to the session's QR topic.
     */
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void rotateQrCodes() {
        List<Session> activeSessions = sessionRepository.findByStatus(SessionStatus.IN_PROGRESS);
        
        if (activeSessions.isEmpty()) {
            return;
        }

        log.debug("Rotating QR codes for {} active sessions", activeSessions.size());

        for (Session session : activeSessions) {
            String newQr = UUID.randomUUID().toString();
            
            // Move current to previous for grace period
            session.setPreviousQrCode(session.getQrCode());
            session.setQrCode(newQr);
            
            sessionRepository.save(session);

            // Broadcast to the specific session topic
            messagingTemplate.convertAndSend("/topic/session/" + session.getSessionId() + "/qr", newQr);
        }
    }
}
