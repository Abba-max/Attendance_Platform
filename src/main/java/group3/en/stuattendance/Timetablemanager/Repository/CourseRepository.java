package group3.en.stuattendance.Timetablemanager.Repository;

import group3.en.stuattendance.Timetablemanager.Model.Course;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Integer> {

    Optional<Course> findByCourseName(String courseName);

    Optional<Course> findByCode(String code);

    List<Course> findBySpecialitySpecialityId(Integer specialityId);

    List<Course> findBySpecialitySpecialityIdAndLevel(Integer specialityId, Integer level);

    List<Course> findByTeachersUserId(Integer teacherId);

    boolean existsByCourseNameAndSpecialitySpecialityId(String courseName, Integer specialityId);



    @Cacheable(value = "semesterCourses")
    @Query("SELECT DISTINCT c FROM Course c " +
           "JOIN TimetableEntry te ON te.course.id = c.id " +
           "JOIN Timetablecontent tc ON te.timetablecontent.id = tc.id " +
           "WHERE tc.classroom.id = :classroomId " +
           "AND tc.academicYear.id = :academicYearId " +
           "AND tc.semester = :semester " +
           "AND tc.isActive = true")
    List<Course> findActualCoursesForClassroomAndSemester(
            @Param("classroomId") Integer classroomId,
            @Param("academicYearId") Long academicYearId,
            @Param("semester") Integer semester);
}