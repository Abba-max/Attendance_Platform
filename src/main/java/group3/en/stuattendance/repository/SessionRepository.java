package group3.en.stuattendance.repository;

import group3.en.stuattendance.model.Session;
import group3.en.stuattendance.model.Course;
import group3.en.stuattendance.model.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, Integer> {
    List<Session> findByCourse(Course course);
    List<Session> findByTeacher(Teacher teacher);
    List<Session> findByDateBetween(LocalDate startDate, LocalDate endDate);
    Optional<Session> findByQrCode(String qrCode);

    @Query("SELECT s FROM Session s WHERE s.date = :date AND s.course.courseId = :courseId")
    List<Session> findByDateAndCourse(@Param("date") LocalDate date,
                                      @Param("courseId") Integer courseId);
}