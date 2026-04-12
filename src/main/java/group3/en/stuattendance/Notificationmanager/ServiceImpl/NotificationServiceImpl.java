package group3.en.stuattendance.Notificationmanager.ServiceImpl;

import group3.en.stuattendance.Notificationmanager.DTO.NotificationDto;
import group3.en.stuattendance.Notificationmanager.Mapper.NotificationMapper;
import group3.en.stuattendance.Notificationmanager.Model.Notification;
import group3.en.stuattendance.Notificationmanager.Repository.NotificationRepository;
import group3.en.stuattendance.Notificationmanager.Service.NotificationService;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationMapper notificationMapper;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @Override
    public void sendNotification(Integer userId, String type, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .message(message)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        Notification saved = notificationRepository.save(notification);
        
        // Dispatch via WebSocket
        messagingTemplate.convertAndSendToUser(
                user.getUsername(), 
                "/queue/notifications", 
                notificationMapper.toDto(saved)
        );
    }

    @Override
    public void notifyRole(String role, String type, String message) {
        List<User> users = userRepository.findByRolesName(role);
        for (User user : users) {
            Notification notification = Notification.builder()
                    .user(user)
                    .type(type)
                    .message(message)
                    .isRead(false)
                    .createdAt(LocalDateTime.now())
                    .build();
            Notification saved = notificationRepository.save(notification);
            
            // Dispatch via WebSocket
            messagingTemplate.convertAndSendToUser(
                    user.getUsername(), 
                    "/queue/notifications", 
                    notificationMapper.toDto(saved)
            );
        }
    }

    @Override
    public void notifyRoleBySpeciality(String role, Integer specialityId, String type, String message) {
        List<User> users = userRepository.findByRolesName(role);
        for (User user : users) {
            // A user matches if they handle at least one classroom in the session's speciality
            boolean handlesSpeciality = user.getStaffClassrooms().stream()
                    .anyMatch(c -> c.getSpeciality() != null && c.getSpeciality().getSpecialityId().equals(specialityId));

            if (handlesSpeciality) {
                sendNotification(user.getUserId(), type, message);
            }
        }
    }

    @Override
    public List<NotificationDto> getUserNotifications(Integer userId) {
        // Assuming the repository gets updated to include user-specific finders
        return notificationRepository.findAll().stream()
                .filter(n -> n.getUser().getUserId().equals(userId))
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(notificationMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public void markAsRead(Integer notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new EntityNotFoundException("Notification not found: " + notificationId));
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }
}
