package group3.en.stuattendance.Timetablemanager.Scheduler;

import group3.en.stuattendance.Timetablemanager.Model.Timetablecontent;
import group3.en.stuattendance.Timetablemanager.Repository.TimetablecontentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class TimetableCleanupScheduler {

    private final TimetablecontentRepository timetablecontentRepository;

    @Scheduled(cron = "0 0 0 * * SUN") // Every Sunday midnight
    @Transactional
    public void cleanupExpiredTimetables() {
        log.info("Starting cleanup of expired timetables...");
        LocalDate today = LocalDate.now();
        List<Timetablecontent> expiredTimetables = timetablecontentRepository.findByEndDateBefore(today);
        if (!expiredTimetables.isEmpty()) {
            log.info("Found {} expired timetables. Deleting...", expiredTimetables.size());
            timetablecontentRepository.deleteAll(expiredTimetables);
            log.info("Expired timetables deleted successfully.");
        } else {
            log.info("No expired timetables found.");
        }
    }
}
