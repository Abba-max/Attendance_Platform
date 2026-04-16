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

    /** Numeric day index: 0=Monday … 5=Saturday.  Used by the frontend grid. */
    private Integer dayOfWeek;

    /** Day name (MONDAY, TUESDAY, …).  Used by the PDF export / legacy code. */
    private String day;

    private LocalTime startTime;
    private LocalTime endTime;
    
    @com.fasterxml.jackson.annotation.JsonProperty("isEvent")
    private Boolean isEvent = false;
    private String eventName;
    
    private Integer courseId;
    private String courseName;
    private Integer teacherId;
    private String teacherName;

    /** Hex color code (e.g. #00B0FF) chosen by the user for the block. */
    private String color;
}
