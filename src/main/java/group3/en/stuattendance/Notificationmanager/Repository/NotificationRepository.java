package group3.en.stuattendance.Notificationmanager.Repository;

import group3.en.stuattendance.Notificationmanager.Model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Integer> {
}