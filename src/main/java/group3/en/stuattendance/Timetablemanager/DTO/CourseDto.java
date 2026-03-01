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
    private String code;
    private String description;
    private Integer credits;
    private Integer hoursPerWeek;
    private Integer semester;
    private Integer level;
    private Integer specialityId;
    private String specialityName;
    private Integer teacherId;
    private String teacherName;
}