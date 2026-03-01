package group3.en.stuattendance.Timetablemanager.Service;

import group3.en.stuattendance.Timetablemanager.DTO.AssignTeacherDTO;
import java.util.List;

public interface TeacherAssignmentService {

    AssignTeacherDTO assignTeacherToCourse(Long teacherId, Long courseId);

    void removeTeacherFromCourse(Long teacherId, Long courseId);

    List<AssignTeacherDTO> getTeachersByCourse(Long courseId);

    List<AssignTeacherDTO> getCoursesByTeacher(Long teacherId);
}