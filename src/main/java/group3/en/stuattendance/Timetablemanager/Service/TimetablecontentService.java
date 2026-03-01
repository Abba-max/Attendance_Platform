package group3.en.stuattendance.Timetablemanager.Service;

import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;

import java.util.List;

public interface TimetablecontentService {

    TimetablecontentDto createTimetableContent(TimetablecontentDto timetableContentDto);

    TimetablecontentDto updateTimetableContent(Integer id, TimetablecontentDto timetableContentDto);

    void deleteTimetableContent(Integer id);

    TimetablecontentDto getTimetableContentById(Integer id);

    List<TimetablecontentDto> getAllTimetableContents();

    List<TimetablecontentDto> getTimetableContentsByCourse(Integer courseId);

    List<TimetablecontentDto> getTimetableContentsBySession(Integer sessionId);

    List<TimetablecontentDto> getTimetableContentsByWeek(Integer week);

    List<TimetablecontentDto> getTimetableContentsByDay(String day);

    List<TimetablecontentDto> getTimetableContentsByWeekAndDay(Integer week, String day);

    List<TimetablecontentDto> getTimetableContentsByCourseAndWeek(Integer courseId, Integer week);
}