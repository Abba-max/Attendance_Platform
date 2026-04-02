package group3.en.stuattendance.Attendancemanager.DTO;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceRecordDto {

    private Integer attendanceId;
    private Integer userId;
    private Integer studentId;
    private String studentFirstName;
    private String studentLastName;
    private String studentName;
    private String studentMatricule;
    private Integer sessionId;
    private AttendanceStatus status;
    private String comments;
    private Boolean verifiedByTeacher;
    private LocalDateTime timestamp;
    private String locationAtCheckin;
    private LocalDateTime createdAt;
}
