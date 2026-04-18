package group3.en.stuattendance.Usermanager.DTO;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PedagogStudentAttendanceStatsDto {
    private Integer userId;
    private String firstName;
    private String lastName;
    private String matricule;
    private Double attendanceRate;
    private Integer attendedHours;
    private Integer plannedHours;
}
