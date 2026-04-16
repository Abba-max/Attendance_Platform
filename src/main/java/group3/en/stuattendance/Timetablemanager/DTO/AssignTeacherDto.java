package group3.en.stuattendance.Timetablemanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignTeacherDto {

    private Integer assignmentId;
    private Integer teacherId;
    private String teacherName;
    private String teacherEmail;
    private Integer courseId;
    private String courseName;
    private String courseCode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}