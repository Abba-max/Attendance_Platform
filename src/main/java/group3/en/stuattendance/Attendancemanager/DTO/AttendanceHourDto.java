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
public class AttendanceHourDto {
    private Integer hourId;
    private Integer hourIndex;
    private AttendanceStatus status;
    private Boolean verifiedByTeacher;
    private LocalDateTime timestamp;
}
