package group3.en.stuattendance.Auditmanager.Controller;

import group3.en.stuattendance.Auditmanager.DTO.AuditlogDto;
import group3.en.stuattendance.Auditmanager.Service.AuditlogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AuditlogController {

    private final AuditlogService auditlogService;

    // ── GET /api/audit-logs ───────────────────────────────────────────────────
    // Returns paginated audit logs for the HTML table.
    // Supports optional keyword search and date range filtering.
    //
    // Query params:
    //   keyword – matches username, action, target
    //   start   – ISO date-time e.g. 2024-01-01T00:00:00
    //   end     – ISO date-time e.g. 2024-12-31T23:59:59
    //   page    – zero-based page index (default 0)
    //   size    – records per page (default 10)
    @GetMapping
    public ResponseEntity<Map<String, Object>> getLogs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<AuditlogDto> result = auditlogService.getLogs(keyword, severity, start, end, page, size);

        // Response structure expected by audit.js:
        // { logs, currentPage, totalPages, totalElements, pageSize }
        Map<String, Object> response = new HashMap<>();
        response.put("logs",          result.getContent());
        response.put("currentPage",   result.getNumber());
        response.put("totalPages",    result.getTotalPages());
        response.put("totalElements", result.getTotalElements());
        response.put("pageSize",      result.getSize());

        return ResponseEntity.ok(response);
    }

    // ── GET /api/audit-logs/export ────────────────────────────────────────────
    // Downloads all audit logs as a CSV file.
    // Triggered by the "Export Logs" button in the HTML.
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportLogs() {
        List<AuditlogDto> logs = auditlogService.exportAll();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(out)) {
            // Header row
            writer.println("ID,Timestamp,User,Action,Target,Category,IP Address");
            // Data rows
            for (AuditlogDto dto : logs) {
                writer.printf("%d,\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"%n",
                        dto.getAuditId(),
                        csv(dto.getTimestamp()),
                        csv(dto.getUsername()),
                        csv(dto.getAction()),
                        csv(dto.getTarget()),
                        csv(dto.getCategory()),
                        csv(dto.getIpAddress()));
            }
        }

        byte[] csvBytes = out.toByteArray();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"audit-logs.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .contentLength(csvBytes.length)
                .body(csvBytes);
    }

    // ── GET /api/audit-logs/stats ─────────────────────────────────────────────
    // Returns quick stats for the dashboard overview panel.
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("todayCount", auditlogService.countTodayLogs());
        return ResponseEntity.ok(stats);
    }

    // ── Helper: escape double-quotes inside CSV values ────────────────────────
    private String csv(String value) {
        if (value == null) return "";
        return value.replace("\"", "\"\"");
    }
}