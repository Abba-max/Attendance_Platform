package group3.en.stuattendance.Timetablemanager.Scheduler;

import group3.en.stuattendance.Timetablemanager.Enum.SessionStatus;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Automated maintenance job to ensure the timetable integrity.
 * Marks unstarted sessions from past days as MISSED.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SessionMaintenanceScheduler {

    private final SessionRepository sessionRepository;

    /**
     * Runs every night at 1:00 AM.
     * Scans for any SCHEDULED sessions that were supposed to happen before today.
     */
    @Scheduled(cron = "0 0 1 * * ?")
    @Transactional
    public void cleanupPastSessions() {
        LocalDate today = LocalDate.now();
        log.info("Starting automated session maintenance for date: {}", today);
        
        // 1. Mark unstarted sessions as MISSED
        List<Session> pastScheduled = sessionRepository.findByDateBeforeAndStatus(today, SessionStatus.SCHEDULED);
        for (Session s : pastScheduled) {
            log.warn("Auto-transitioning SCHEDULED Session {} to MISSED.", s.getSessionId());
            s.setStatus(SessionStatus.MISSED);
        }
        sessionRepository.saveAll(pastScheduled);

        // 2. Mark orphaned IN_PROGRESS sessions as COMPLETED
        List<Session> pastInProgress = sessionRepository.findByDateBeforeAndStatus(today, SessionStatus.IN_PROGRESS);
        for (Session s : pastInProgress) {
            log.warn("Auto-transitioning orphaned IN_PROGRESS Session {} to COMPLETED.", s.getSessionId());
            s.setStatus(SessionStatus.COMPLETED);
            // We should also set actualEndTime if it's missing
            if (s.getActualEndTime() == null) {
                s.setActualEndTime(java.time.LocalDateTime.of(s.getDate(), s.getEndTime()));
            }
        }
        sessionRepository.saveAll(pastInProgress);

        log.info("Session maintenance complete. Cleaned up {} scheduled and {} in-progress sessions.", 
            pastScheduled.size(), pastInProgress.size());
    }
}
