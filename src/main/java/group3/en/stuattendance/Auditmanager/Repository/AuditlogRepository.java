package group3.en.stuattendance.Auditmanager.Repository;

import group3.en.stuattendance.Auditmanager.Model.Auditlog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditlogRepository extends JpaRepository<Auditlog, Integer> {

    // ── Paginated search + optional date range filter ─────────────────────────
    @Query("SELECT a FROM Auditlog a WHERE " +
            "(:keyword IS NULL OR :keyword = '' OR " +
            " LOWER(a.username) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            " LOWER(a.action)   LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            " LOWER(a.target)   LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            " LOWER(a.userRole) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:severity IS NULL OR :severity = '' OR a.severity = :severity) " +
            "AND (:start IS NULL OR a.timestamp >= :start) " +
            "AND (:end   IS NULL OR a.timestamp <= :end) " +
            "ORDER BY a.timestamp DESC")
    Page<Auditlog> searchWithFilters(@Param("keyword") String keyword,
                                     @Param("severity") String severity,
                                     @Param("start")   LocalDateTime start,
                                     @Param("end")     LocalDateTime end,
                                     Pageable pageable);

    // ── Export all logs (no pagination) ──────────────────────────────────────
    List<Auditlog> findAllByOrderByTimestampDesc();

    // ── Count logs created today ──────────────────────────────────────────────
    @Query("SELECT COUNT(a) FROM Auditlog a WHERE a.timestamp >= :startOfDay")
    long countTodayLogs(@Param("startOfDay") LocalDateTime startOfDay);
}