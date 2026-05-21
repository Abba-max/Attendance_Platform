package group3.en.stuattendance.Attendancemanager.Repository;

import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Usermanager.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Integer> {
    List<AttendanceRecord> findBySession_SessionId(Integer sessionId);
    List<AttendanceRecord> findByUserAndSession(User user, Session session);
    boolean existsByUserAndSession(User user, Session session);
    List<AttendanceRecord> findByUser_UserId(Integer userId);

    org.springframework.data.domain.Page<AttendanceRecord> findByUserUserIdAndStatus(Integer userId, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus status, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<AttendanceRecord> findByUserUserId(Integer userId, org.springframework.data.domain.Pageable pageable);

    List<AttendanceRecord> findByUserUserId(Integer userId);

    org.springframework.data.domain.Page<AttendanceRecord> findByUserUserIdAndSessionClassroomClassId(Integer userId, Integer classId, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<AttendanceRecord> findByUserUserIdAndStatusAndSessionClassroomClassId(Integer userId, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus status, Integer classId, org.springframework.data.domain.Pageable pageable);

// ...

    /**
     * Récupère les enregistrements d'assiduité avec leurs créneaux horaires en une seule requête
     * (évite le problème N+1 queries).
     */
    @Query("SELECT ar FROM AttendanceRecord ar " +
            "LEFT JOIN FETCH ar.hourSlots " +
            "WHERE ar.session.sessionId IN :sessionIds")
    List<AttendanceRecord> findWithHourSlotsBySessionIds(@Param("sessionIds") List<Integer> sessionIds);
}