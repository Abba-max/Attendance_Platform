package group3.en.stuattendance.Usermanager.DTO;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAttendanceStatsDto {
    private Integer courseId;
    private String courseName;
    private long totalSessions;
    private long presentCount;
    private double attendanceRate;
}
