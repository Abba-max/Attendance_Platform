package group3.en.stuattendance.Usermanager.DTO;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentScheduleDto {
    private Integer sessionId;
    private String courseName;
    private String teacherName;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private String classroomName;
    private String status;
}
