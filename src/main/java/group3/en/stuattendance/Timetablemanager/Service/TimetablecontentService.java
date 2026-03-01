package group3.en.stuattendance.Timetablemanager.Service;

import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import java.util.List;

public interface TimetablecontentService {

    TimetablecontentDto saveWeeklyTimetable(TimetablecontentDto dto);

    TimetablecontentDto getWeeklyTimetable(Integer classroomId, Long academicYearId, Integer week, Integer semester);

    void deleteWeeklyTimetable(Integer classroomId, Long academicYearId, Integer week, Integer semester);

    List<TimetablecontentDto> getAllTimetablecontents();
}