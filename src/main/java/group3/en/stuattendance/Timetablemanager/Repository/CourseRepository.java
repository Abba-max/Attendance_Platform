package group3.en.stuattendance.Timetablemanager.Repository;

import group3.en.stuattendance.Timetablemanager.Model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
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

    List<Course> findBySpecialitySpecialityIdAndLevelAndSemester(
            Integer specialityId, Integer level, Integer semester);
}