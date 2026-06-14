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
    @Query("SELECT DISTINCT te.course FROM TimetableEntry te " +
           "WHERE te.timetablecontent.classroom.classId = :classroomId " +
           "AND te.timetablecontent.academicYear.id = :academicYearId " +
           "AND te.timetablecontent.semester = :semester " +
           "AND te.timetablecontent.isActive = true " +
           "AND te.course IS NOT NULL")
    List<Course> findActualCoursesForClassroomAndSemester(
            @Param("classroomId") Integer classroomId,
            @Param("academicYearId") Long academicYearId,
            @Param("semester") Integer semester);
}