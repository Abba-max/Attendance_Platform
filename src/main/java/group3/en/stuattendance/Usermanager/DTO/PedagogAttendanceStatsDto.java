package group3.en.stuattendance.Usermanager.DTO;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PedagogAttendanceStatsDto {
    private Integer specialityId;
    private String specialityName;
    private Integer classroomId;
    private String classroomName;
    private Integer courseId;
    private String courseName;
    private Double attendanceRate;
    private Integer attendedHours;
    private Integer plannedHours;
}
