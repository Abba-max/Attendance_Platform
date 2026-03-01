package group3.en.stuattendance.Timetablemanager.Repository;

import group3.en.stuattendance.Timetablemanager.Model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SessionRepository extends JpaRepository<Session, Integer> {

    List<Session> findByCourseCourseid(Integer courseId);

    List<Session> findByTeacherUserId(Integer teacherId);

    List<Session> findByClassroomClassId(Integer classroomId);

    List<Session> findByDate(LocalDate date);

    List<Session> findByWeek(Integer week);

    List<Session> findByCourseCourseidAndWeek(Integer courseId, Integer week);

    List<Session> findByTeacherUserIdAndDate(Integer teacherId, LocalDate date);
}