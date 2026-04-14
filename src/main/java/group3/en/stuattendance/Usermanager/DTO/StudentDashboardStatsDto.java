package group3.en.stuattendance.Usermanager.DTO;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentDashboardStatsDto {
    private long totalAbsences;
    private long pendingJustifications;
    private double overallAttendanceRate;
}
