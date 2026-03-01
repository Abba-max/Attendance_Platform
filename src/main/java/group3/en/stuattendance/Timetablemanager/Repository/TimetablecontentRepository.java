package group3.en.stuattendance.Timetablemanager.Repository;

import group3.en.stuattendance.Timetablemanager.Model.Timetablecontent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimetablecontentRepository extends JpaRepository<Timetablecontent, Integer> {

    List<Timetablecontent> findByCourseCourseId(Integer courseId);

    List<Timetablecontent> findBySessionSessionId(Integer sessionId);

    List<Timetablecontent> findByWeek(Integer week);

    List<Timetablecontent> findByDay(String day);

    List<Timetablecontent> findByWeekAndDay(Integer week, String day);

    List<Timetablecontent> findByCourseCourseIdAndWeek(Integer courseId, Integer week);
}