package group3.en.stuattendance.Usermanager.DTO;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAttendanceHistoryDto {
    private Integer attendanceId;
    private String courseName;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private AttendanceStatus status;
    private LocalDateTime checkInTime;
    private String teacherName;
}
