package group3.en.stuattendance.Justificationmanager.DTO;

import group3.en.stuattendance.Justificationmanager.Enum.JustificationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JustificationDto {

    private Integer justificationId;
    private Integer studentId;
    private Integer attendanceId;
    private String documentPath;
    private String reason;
    private JustificationStatus status;
    private String reasonForRejection;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
