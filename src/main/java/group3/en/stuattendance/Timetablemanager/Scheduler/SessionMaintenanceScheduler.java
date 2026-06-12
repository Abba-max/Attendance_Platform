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
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Automated maintenance job to ensure session lifecycle integrity.
 *
 * Business Rules enforced:
 *  1. A SCHEDULED session that reaches (endTime - 15 min) without being started
 *     by the teacher is automatically marked MISSED.
 *  2. An IN_PROGRESS session that surpasses (endTime + 15 min) without being
 *     manually ended by the teacher is automatically force-completed (COMPLETED).
 *
 * The per-minute job handles today's live transitions.
 * The nightly 1 AM job is a safety net for any edge cases from previous days.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SessionMaintenanceScheduler {

    private final SessionRepository sessionRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // REAL-TIME CHECK — runs every minute
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Runs every 60 seconds.
     * Enforces the 15-minute grace-period rules for today's sessions only.
     */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void enforceRealtimeSessionRules() {
        LocalDate today = LocalDate.now();
        LocalTime now   = LocalTime.now();

        // --- Rule 1: SCHEDULED → MISSED ---
        // A session that the teacher never launched is marked MISSED when
        // there are 15 minutes (or fewer) remaining before its scheduled end.
        List<Session> scheduledToday = sessionRepository.findByDateAndStatus(today, SessionStatus.SCHEDULED);
        for (Session s : scheduledToday) {
            if (s.getEndTime() == null) continue;
            // Threshold: endTime - 15 min
            LocalTime missedThreshold = s.getEndTime().minusMinutes(15);
            if (!now.isBefore(missedThreshold)) {
                log.warn("[Scheduler] Session {} ({}) auto-transitioned SCHEDULED → MISSED at {} (threshold: {}).",
                        s.getSessionId(),
                        s.getCourse() != null ? s.getCourse().getCourseName() : "?",
                        now, missedThreshold);
                s.setStatus(SessionStatus.MISSED);
            }
        }
        sessionRepository.saveAll(scheduledToday);

        // --- Rule 2: IN_PROGRESS → COMPLETED ---
        // A session the teacher never manually ended is force-completed 15 minutes
        // after its scheduled end time.
        List<Session> inProgressToday = sessionRepository.findByDateAndStatus(today, SessionStatus.IN_PROGRESS);
        for (Session s : inProgressToday) {
            if (s.getEndTime() == null) continue;
            // Threshold: endTime + 15 min
            LocalTime autoEndThreshold = s.getEndTime().plusMinutes(15);
            if (!now.isBefore(autoEndThreshold)) {
                log.warn("[Scheduler] Session {} ({}) auto-transitioned IN_PROGRESS → COMPLETED at {} (threshold: {}).",
                        s.getSessionId(),
                        s.getCourse() != null ? s.getCourse().getCourseName() : "?",
                        now, autoEndThreshold);
                s.setStatus(SessionStatus.COMPLETED);
                if (s.getActualEndTime() == null) {
                    s.setActualEndTime(LocalDateTime.of(today, s.getEndTime()));
                }
            }
        }
        sessionRepository.saveAll(inProgressToday);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NIGHTLY SAFETY NET — runs at 1:00 AM daily
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Runs every night at 1:00 AM.
     * Safety net: catches any SCHEDULED or IN_PROGRESS sessions from previous days
     * that somehow slipped through the real-time job.
     */
    @Scheduled(cron = "0 0 1 * * ?")
    @Transactional
    public void cleanupPastSessions() {
        LocalDate today = LocalDate.now();
        log.info("[Scheduler Nightly] Running safety cleanup for sessions before {}.", today);

        List<Session> pastScheduled = sessionRepository.findByDateBeforeAndStatus(today, SessionStatus.SCHEDULED);
        for (Session s : pastScheduled) {
            log.warn("[Scheduler Nightly] Safety-net: SCHEDULED Session {} → MISSED.", s.getSessionId());
            s.setStatus(SessionStatus.MISSED);
        }
        sessionRepository.saveAll(pastScheduled);

        List<Session> pastInProgress = sessionRepository.findByDateBeforeAndStatus(today, SessionStatus.IN_PROGRESS);
        for (Session s : pastInProgress) {
            log.warn("[Scheduler Nightly] Safety-net: IN_PROGRESS Session {} → COMPLETED.", s.getSessionId());
            s.setStatus(SessionStatus.COMPLETED);
            if (s.getActualEndTime() == null) {
                s.setActualEndTime(LocalDateTime.of(s.getDate(), s.getEndTime()));
            }
        }
        sessionRepository.saveAll(pastInProgress);

        log.info("[Scheduler Nightly] Safety cleanup done: {} MISSED, {} COMPLETED.",
                pastScheduled.size(), pastInProgress.size());
    }
}

