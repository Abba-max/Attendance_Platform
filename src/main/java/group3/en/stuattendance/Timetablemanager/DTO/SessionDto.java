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
public class SessionDto {

    private Integer sessionId;
    private String day;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer week;
    private String locationGeographicalCoordinates;
    private String qrCode;
    private Integer courseId;
    private Integer teacherId;
    private Integer classroomId;
}
