package group3.en.stuattendance.Auditmanager.Service;

import group3.en.stuattendance.Auditmanager.DTO.AuditlogDto;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditlogService {

    /**
     * Fetch a paginated, optionally filtered page of audit logs.
     *
     * @param keyword Search term matched against username, action, and target (nullable)
     * @param start   Lower bound of date range filter (nullable)
     * @param end     Upper bound of date range filter (nullable)
     * @param page    Zero-based page index
     * @param size    Number of records per page
     * @return        Page of AuditlogDto ready for the frontend table
     */
    Page<AuditlogDto> getLogs(String keyword,
                              LocalDateTime start,
                              LocalDateTime end,
                              int page,
                              int size);

    /**
     * Record a new audit log entry.
     * Call this from any service where you want to track an action.
     *
     * @param username  The user performing the action
     * @param action    The action type (e.g. CREATE, UPDATE, DELETE, LOGIN)
     * @param target    The affected resource (e.g. "User #5", "Institution #2")
     * @param category  High-level category (e.g. USER_MANAGEMENT, SECURITY, SYSTEM)
     * @param ipAddress IP address of the request
     */
    void log(String username,
             String action,
             String target,
             String category,
             String ipAddress);


    void log(String username,
             String action,
             String target,
             String category);


    List<AuditlogDto> exportAll();


    long countTodayLogs();
}