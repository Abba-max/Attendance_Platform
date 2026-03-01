package group3.en.stuattendance.Timetablemanager.Repository;

import group3.en.stuattendance.Timetablemanager.Model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Integer> {

    Optional<Course> findByCourseName(String courseName);

    List<Course> findBySpecialitySpecialityId(Integer specialityId);

    List<Course> findByTeacherUserId(Integer teacherId);

    boolean existsByCourseNameAndSpecialitySpecialityId(String courseName, Integer specialityId);
}