package group3.en.stuattendance.Notificationmanager.Mapper;

import group3.en.stuattendance.Notificationmanager.DTO.NotificationDto;
import group3.en.stuattendance.Notificationmanager.Model.Notification;
import group3.en.stuattendance.Usermanager.Model.User;
import org.springframework.stereotype.Component;

@Component
public class NotificationMapper {

    public NotificationDto toDto(Notification notification) {
        if (notification == null) return null;
        return NotificationDto.builder()
                .notificationId(notification.getNotificationId())
                .userId(notification.getUser() != null ? notification.getUser().getUserId() : null)
                .message(notification.getMessage())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    public Notification toEntity(NotificationDto dto, User user) {
        if (dto == null) return null;
        return Notification.builder()
                .notificationId(dto.getNotificationId())
                .user(user)
                .message(dto.getMessage())
                .isRead(dto.getIsRead())
                .build();
    }
}
