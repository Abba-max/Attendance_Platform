package group3.en.stuattendance.Usermanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherFullStudentDto {
    private String name;
    private String initials;
    private String classLabel;
    private String subject;
    private Double pct; // Attendance percentage
    private Integer attendedHours;
    private Integer totalHours;
}
