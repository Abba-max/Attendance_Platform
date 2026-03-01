package group3.en.stuattendance.Timetablemanager.Service;

import group3.en.stuattendance.Timetablemanager.DTO.SessionDto;

import java.time.LocalDate;
import java.util.List;

public interface SessionService {

    SessionDto createSession(SessionDto sessionDto);

    SessionDto updateSession(Integer id, SessionDto sessionDto);

    void deleteSession(Integer id);

    SessionDto getSessionById(Integer id);

    List<SessionDto> getAllSessions();

    List<SessionDto> getSessionsByCourse(Integer courseId);

    List<SessionDto> getSessionsByTeacher(Integer teacherId);

    List<SessionDto> getSessionsByClassroom(Integer classroomId);

    List<SessionDto> getSessionsByDate(LocalDate date);

    List<SessionDto> getSessionsByWeek(Integer week);

    List<SessionDto> getSessionsByCourseAndWeek(Integer courseId, Integer week);

    List<SessionDto> getSessionsByTeacherAndDate(Integer teacherId, LocalDate date);
}