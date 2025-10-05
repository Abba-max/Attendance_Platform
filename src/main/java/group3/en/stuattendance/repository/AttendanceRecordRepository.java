package group3.en.stuattendance.repository;

import group3.en.stuattendance.model.AttendanceRecord;
import group3.en.stuattendance.model.Student;
import group3.en.stuattendance.model.Session;
import group3.en.stuattendance.model.enums.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Integer> {
    List<AttendanceRecord> findByStudent(Student student);
    List<AttendanceRecord> findBySession(Session session);

    @Query("SELECT ar FROM AttendanceRecord ar WHERE ar.student.userId = :studentId " +
            "AND ar.session.date BETWEEN :startDate AND :endDate")
    List<AttendanceRecord> findByStudentIdAndDateRange(
            @Param("studentId") Integer studentId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT ar FROM AttendanceRecord ar WHERE ar.session.course.courseId = :courseId")
    List<AttendanceRecord> findByCourseId(@Param("courseId") Integer courseId);

    @Query("SELECT COUNT(ar) FROM AttendanceRecord ar WHERE ar.student.userId = :studentId " +
            "AND ar.status = :status")
    Long countByStudentIdAndStatus(@Param("studentId") Integer studentId,
                                   @Param("status") AttendanceStatus status);
}
