package group3.en.stuattendance.Attendancemanager.Repository;

import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Usermanager.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Integer> {
    List<AttendanceRecord> findBySession_SessionId(Integer sessionId);
    Optional<AttendanceRecord> findByUserAndSession(User user, Session session);
    boolean existsByUserAndSession(User user, Session session);
    List<AttendanceRecord> findByUser_UserId(Integer userId);

    org.springframework.data.domain.Page<AttendanceRecord> findByUserUserIdAndStatus(Integer userId, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus status, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<AttendanceRecord> findByUserUserId(Integer userId, org.springframework.data.domain.Pageable pageable);

    List<AttendanceRecord> findByUserUserId(Integer userId);
}