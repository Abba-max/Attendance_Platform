package group3.en.stuattendance.Timetablemanager.Repository;

import group3.en.stuattendance.Timetablemanager.Model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SessionRepository extends JpaRepository<Session, Integer> {

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT s.week FROM Session s WHERE s.status = group3.en.stuattendance.Timetablemanager.Enum.SessionStatus.COMPLETED ORDER BY s.week DESC")
    List<Integer> findDistinctWeeksWithCompletedSessions();

    List<Session> findByCourseCourseId(Integer courseId);

    List<Session> findByStatus(group3.en.stuattendance.Timetablemanager.Enum.SessionStatus status);

    List<Session> findByTeacherUserId(Integer teacherId);

    List<Session> findByClassroomClassId(Integer classroomId);

    List<Session> findByDate(LocalDate date);

    List<Session> findByWeek(Integer week);

    List<Session> findByCourseCourseIdAndWeek(Integer courseId, Integer week);

    List<Session> findByTeacherUserIdAndDate(Integer teacherId, java.time.LocalDate date);

    List<Session> findByClassroomClassIdAndDate(Integer classroomId, java.time.LocalDate date);

    List<Session> findByDateAndStartTime(java.time.LocalDate date, java.time.LocalTime startTime);

    List<Session> findByTeacherUserIdOrderByDateAscStartTimeAsc(Integer teacherId);

    List<Session> findByClassroomClassIdInAndStatus(java.util.Collection<Integer> classroomIds, group3.en.stuattendance.Timetablemanager.Enum.SessionStatus status);

    List<Session> findByClassroomClassIdAndWeek(Integer classroomId, Integer week);

    void deleteByClassroomClassIdAndWeekAndStatus(Integer classroomId, Integer week, group3.en.stuattendance.Timetablemanager.Enum.SessionStatus status);
    
    List<Session> findByDateBeforeAndStatus(LocalDate date, group3.en.stuattendance.Timetablemanager.Enum.SessionStatus status);

    List<Session> findByClassroomClassIdAndDateBetween(
            Integer classroomId,
            java.time.LocalDate startDate,
            java.time.LocalDate endDate);

    @Query("SELECT s FROM Session s WHERE s.classroom.classId = :classroomId " +
            "AND s.course.courseId IN :courseIds")
    List<Session> findByClassroomClassIdAndCourseIds(
            @Param("classroomId") Integer classroomId,
            @Param("courseIds")   Collection<Integer> courseIds);
}