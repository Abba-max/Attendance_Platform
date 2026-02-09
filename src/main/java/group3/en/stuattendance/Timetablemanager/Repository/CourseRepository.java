package group3.en.stuattendance.Timetablemanager.Repository;

import group3.en.stuattendance.Timetablemanager.Model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseRepository extends JpaRepository<Course, Integer> {
}