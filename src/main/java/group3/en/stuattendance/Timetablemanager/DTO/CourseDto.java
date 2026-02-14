package group3.en.stuattendance.Timetablemanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseDto {

    private Integer courseId;
    private String courseName;
    private Integer credits;
    private String description;
    private Integer teacherId;
    private Integer classroomId; // Added for UI compatibility
}
