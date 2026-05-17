package group3.en.stuattendance.Justificationmanager.DTO;

import group3.en.stuattendance.Justificationmanager.Enum.JustificationStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JustificationResponseDto {
    private Integer justificationId;
    private Integer attendanceId;
    private String courseName;
    private java.time.LocalDate sessionDate;
    private String reason;
    private Integer hourIndex;
    private JustificationStatus status;
    private String reasonForRejection;
    private LocalDateTime createdAt;
}
