package group3.en.stuattendance.Timetablemanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetablecontentDto {

    private Integer timetableId;
    private Integer courseId;
    private String courseName;
    private Integer sessionId;
    private LocalDate sessionDate;
    private LocalTime sessionStartTime;
    private LocalTime sessionEndTime;
    private String day;
    private Integer week;
}