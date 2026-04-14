package group3.en.stuattendance.Notificationmanager.Scheduler;

import group3.en.stuattendance.Notificationmanager.Service.NotificationService;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SessionNotificationScheduler {

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Runs every minute to check for sessions starting in 5 minutes.
     */
    @Scheduled(cron = "0 * * * * *")
    public void notifyStudentsOfUpcomingSessions() {
        LocalDate today = LocalDate.now();
        LocalTime targetTime = LocalTime.now().plusMinutes(5).truncatedTo(ChronoUnit.MINUTES);
        
        log.info("Checking for sessions starting at {} on {}", targetTime, today);

        List<Session> upcomingSessions = sessionRepository.findByDateAndStartTime(today, targetTime);

        for (Session session : upcomingSessions) {
            if (session.getClassroom() != null) {
                Integer classroomId = session.getClassroom().getClassId();
                List<User> students = userRepository.findByClassroomClassIdAndRolesName(classroomId, "STUDENT");
                
                String message = String.format("Upcoming Class: %s starts in 5 minutes at %s.", 
                        session.getCourse() != null ? session.getCourse().getCourseName() : "Course",
                        session.getClassroom().getName());

                for (User student : students) {
                    notificationService.sendNotification(student.getUserId(), "SESSION_REMINDER", message);
                }
            }
        }
    }
}
