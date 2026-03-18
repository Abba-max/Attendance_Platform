package group3.en.stuattendance.Timetablemanager.Repository;

import group3.en.stuattendance.Timetablemanager.Model.TeacherCourseAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherCourseAssignmentRepository extends JpaRepository<TeacherCourseAssignment, Integer> {

    List<TeacherCourseAssignment> findByCourseCourseId(Integer courseId);

    List<TeacherCourseAssignment> findByTeacherUserId(Integer teacherId);

    Optional<TeacherCourseAssignment> findByTeacherUserIdAndCourseCourseId(Integer teacherId, Integer courseId);

    boolean existsByTeacherUserIdAndCourseCourseId(Integer teacherId, Integer courseId);

    void deleteByTeacherUserIdAndCourseCourseId(Integer teacherId, Integer courseId);
}