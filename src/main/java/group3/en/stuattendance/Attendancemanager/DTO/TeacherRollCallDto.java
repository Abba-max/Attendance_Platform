package group3.en.stuattendance.Attendancemanager.DTO;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherRollCallDto {
    private Integer userId;
    private String firstName;
    private String lastName;
    private String email;
    private String matricule;
    private AttendanceStatus status;
    private Integer attendanceId;
    private Integer hoursAttended;
    private Integer totalHours;
    private java.util.List<AttendanceHourDto> hourSlots;
    private String comments;
    private Boolean isLive; // Whether the student is live in school (Geo/QR validated)
}
