package group3.en.stuattendance.Notificationmanager.Service;

import group3.en.stuattendance.Notificationmanager.DTO.NotificationDto;
import java.util.List;

public interface NotificationService {
    void sendNotification(Integer userId, String type, String message);
    void notifyRole(String role, String type, String message);
    void notifyRoleBySpeciality(String role, Integer specialityId, String type, String message);
    List<NotificationDto> getUserNotifications(Integer userId);
    void markAsRead(Integer notificationId);
}
