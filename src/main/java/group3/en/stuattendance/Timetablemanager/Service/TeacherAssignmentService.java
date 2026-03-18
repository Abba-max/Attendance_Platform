package group3.en.stuattendance.Timetablemanager.Service;

import group3.en.stuattendance.Timetablemanager.DTO.AssignTeacherDto;
import java.util.List;

public interface TeacherAssignmentService {

    AssignTeacherDto assignTeacherToCourse(Integer teacherId, Integer courseId);

    void removeTeacherFromCourse(Integer teacherId, Integer courseId);

    List<AssignTeacherDto> getTeachersByCourse(Integer courseId);

    List<AssignTeacherDto> getCoursesByTeacher(Integer teacherId);

    boolean isTeacherAssignedToCourse(Integer teacherId, Integer courseId);

    List<AssignTeacherDto> searchTeachersByCourseAndName(Integer courseId, String name);
}