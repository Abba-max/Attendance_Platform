package group3.en.stuattendance.Timetablemanager.Repository;

import group3.en.stuattendance.Timetablemanager.Model.TeacherCourseAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("SELECT t FROM TeacherCourseAssignment t WHERE t.course.courseId = :courseId " +
            "AND (LOWER(t.teacher.firstName) LIKE LOWER(CONCAT('%', :name, '%')) " +
            "OR LOWER(t.teacher.lastName) LIKE LOWER(CONCAT('%', :name, '%')))")
    List<TeacherCourseAssignment> searchTeachersByCourseAndName(@Param("courseId") Integer courseId,
                                                                @Param("name") String name);
}