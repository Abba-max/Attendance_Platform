package group3.en.stuattendance.repository;

import group3.en.stuattendance.model.Course;
import group3.en.stuattendance.model.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Integer> {
    List<Course> findByTeacher(Teacher teacher);
    Optional<Course> findByCourseName(String courseName);

    @Query("SELECT c FROM Course c WHERE c.teacher.userId = :teacherId")
    List<Course> findByTeacherId(@Param("teacherId") Integer teacherId);
}

