package group3.en.stuattendance.Timetablemanager.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetablecontentDto {

    private Integer timetableId;
    private Integer courseId;
    private Integer sessionId;
    private String day;
    private Integer week;
}
