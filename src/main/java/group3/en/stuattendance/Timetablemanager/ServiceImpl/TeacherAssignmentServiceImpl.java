package group3.en.stuattendance.Timetablemanager.ServiceImpl;

import group3.en.stuattendance.Timetablemanager.Service.TeacherAssignmentService;
import org.springframework.stereotype.Service;

/**
 * @deprecated Teacher assignment is now handled via CourseService.assignTeacherToCourse().
 * This is an empty stub kept to avoid Spring context errors.
 */
@Deprecated
@Service
public class TeacherAssignmentServiceImpl implements TeacherAssignmentService {
    // Superseded by CourseService many-to-many teacher assignment
}