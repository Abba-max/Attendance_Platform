package group3.en.stuattendance.Notificationmanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDto {

    private Integer notificationId;
    private Integer userId;
    private String message;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
