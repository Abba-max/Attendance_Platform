package group3.en.stuattendance.service;

import group3.en.stuattendance.Usermanager.DTO.TeacherDto;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Usermanager.Model.Teacher;

import java.util.List;

public interface TeacherService {
    Teacher registerTeacher(TeacherDto dto);
    Teacher getTeacherById(Integer teacherId);
    Teacher getTeacherByUserId(Integer userId);
    List<Teacher> getAllTeachers();
    void updateTeacher(Integer teacherId, TeacherDto dto);
    String generateJoinCode(Integer teacherId);
    List<Course> getTeacherCourses(Integer teacherId);
    List<Session> getTeacherSessions(Integer teacherId);
}
