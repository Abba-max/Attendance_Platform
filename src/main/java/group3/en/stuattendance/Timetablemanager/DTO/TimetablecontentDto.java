package group3.en.stuattendance.Timetablemanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetablecontentDto {

    private Integer timetableId;
    private Integer classroomId;
    private String classroomName;
    private Long academicYearId;
    private String academicYearName;
    private Integer week;
    private Integer semester;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<TimetableEntryDto> entries;
}