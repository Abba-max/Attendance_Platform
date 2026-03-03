package group3.en.stuattendance.Timetablemanager.Repository;

import group3.en.stuattendance.Timetablemanager.Model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Integer> {

    Optional<Course> findByCourseName(String courseName);

    List<Course> findBySpecialitySpecialityIdAndSemester(Integer specialityId, Integer semester);

    List<Course> findBySpeciality_SpecialityId(Integer specialityId);

    List<Course> findByTeachersUserId(Integer teacherId);

    boolean existsByCourseNameAndSpecialitySpecialityId(String courseName, Integer specialityId);
}