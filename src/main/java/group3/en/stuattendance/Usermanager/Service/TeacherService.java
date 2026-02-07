package group3.en.stuattendance.service;

import group3.en.stuattendance.dto.TeacherDto;
import group3.en.stuattendance.model.Course;
import group3.en.stuattendance.model.Session;
import group3.en.stuattendance.model.Teacher;

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
