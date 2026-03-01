package group3.en.stuattendance.Timetablemanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableEntryDto {
    private Integer entryId;
    private String day;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer courseId;
    private String courseName;
    private Integer teacherId;
    private String teacherName;
}
