package group3.en.stuattendance.Usermanager.Service;

import group3.en.stuattendance.Usermanager.DTO.TeacherClassCourseDto;
import group3.en.stuattendance.Usermanager.DTO.TeacherStudentStatDto;
import group3.en.stuattendance.Usermanager.DTO.TeacherFullStudentDto;

import java.util.List;

public interface TeacherStatsService {
    List<TeacherClassCourseDto> getTeacherClassesAndCourses(Integer teacherId);
    List<TeacherStudentStatDto> getStudentAttendanceForCourse(Integer classroomId, Integer courseId);
    List<TeacherFullStudentDto> getTeacherFullStudentList(Integer teacherId);
}
