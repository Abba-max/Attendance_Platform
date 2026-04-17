package group3.en.stuattendance.Institutionmanager.Controller;

import group3.en.stuattendance.Institutionmanager.DTO.*;
import group3.en.stuattendance.Institutionmanager.Service.StudentMigrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/migration")
public class StudentMigrationController {

    private final StudentMigrationService migrationService;

    public StudentMigrationController(StudentMigrationService migrationService) {
        this.migrationService = migrationService;
    }

    // ─────────────────────────────────────────────
    // 1. Migrate a single student to any classroom
    // ─────────────────────────────────────────────
    @PostMapping("/single")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<MigrationResponse> migrateStudent(
            @RequestBody MigrateStudentRequest request) {

        MigrationResponse response = migrationService.migrateStudent(request);
        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────
    // 2. Migrate a selection of students (bulk)
    // ─────────────────────────────────────────────
    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<MigrationResponse>> migrateBulkStudents(
            @RequestBody MigrateBulkStudentsRequest request) {

        List<MigrationResponse> responses = migrationService.migrateBulkStudents(request);
        return ResponseEntity.ok(responses);
    }

    // ─────────────────────────────────────────────
    // 3. Get full migration history of a student
    // ─────────────────────────────────────────────
    @GetMapping("/history/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<ClassHistoryResponse>> getStudentHistory(
            @PathVariable Integer studentId) {

        List<ClassHistoryResponse> history = migrationService.getStudentHistory(studentId);
        return ResponseEntity.ok(history);
    }
}