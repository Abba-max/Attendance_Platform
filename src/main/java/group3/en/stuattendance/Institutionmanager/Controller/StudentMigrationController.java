package group3.en.stuattendance.Institutionmanager.Controller;

import group3.en.stuattendance.Institutionmanager.DTO.*;
import group3.en.stuattendance.Institutionmanager.Service.StudentMigrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/migration")
@PreAuthorize("hasRole('PEDAGOG')")
public class StudentMigrationController {

    private final StudentMigrationService migrationService;

    public StudentMigrationController(StudentMigrationService migrationService) {
        this.migrationService = migrationService;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 1. Contexte des années académiques N et N+1
    //
    //    GET /api/migration/academic-year-context
    //
    //    Retourne :
    //      activeYearName                    → "2024/2025"  (année N)
    //      nextYearName                      → "2025/2026"  (année N+1)
    //      nextYearExists                    → true/false
    //      nextYearReadyForMigration         → true si PLANNED
    //      migrationTargetYearForPromotion   → label affiché sur les boutons
    //      migrationTargetYearForSpeciality  → label affiché sur le bouton Spécialité
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/academic-year-context")
    public ResponseEntity<MigrationAcademicYearContextdto> getAcademicYearContext() {
        return ResponseEntity.ok(migrationService.getAcademicYearContext());
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. Contexte du pédagogue
    //
    //    GET /api/migration/pedagog-context
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/pedagog-context")
    public ResponseEntity<Map<String, Object>> getPedagogContext() {
        AvailableMigrationTargetsdto ctx =
                migrationService.getAvailableMigrationTargets(MigrationTypedto.LEVEL_PROMOTION, null);
        return ResponseEntity.ok(Map.of(
                "hasTroncCommun", ctx.isPedagHasTroncCommun(),
                "managedClassrooms", ctx.getSourceClassrooms()
        ));
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. Classes disponibles selon le type de migration
    //
    //    GET /api/migration/available-targets?type=TRONC_COMMUN&sourceClassroomId=5
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/available-targets")
    public ResponseEntity<AvailableMigrationTargetsdto> getAvailableTargets(
            @RequestParam(defaultValue = "LEVEL_PROMOTION") MigrationTypedto type,
            @RequestParam(required = false) Integer sourceClassroomId) {

        return ResponseEntity.ok(
                migrationService.getAvailableMigrationTargets(type, sourceClassroomId));
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. Étudiants d'une classe
    //
    //    GET /api/migration/classroom/{id}/students?academicYearId=2
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/classroom/{classroomId}/students")
    public ResponseEntity<List<StudentSelectionDto>> getStudentsInClassroom(
            @PathVariable Integer classroomId,
            @RequestParam(required = false) Long academicYearId) {

        return ResponseEntity.ok(
                migrationService.getStudentsInClassroom(classroomId, academicYearId));
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. Migration d'un étudiant unique
    //
    //    POST /api/migration/single
    //    Body : { studentId, toClassroomId, migrationType, reason }
    // ─────────────────────────────────────────────────────────────────────
    @PostMapping("/single")
    public ResponseEntity<MigrationResponse> migrateStudent(
            @RequestBody MigrateStudentRequest request) {

        return ResponseEntity.ok(migrationService.migrateStudent(request));
    }

    // ─────────────────────────────────────────────────────────────────────
    // 6. Migration en masse
    //
    //    POST /api/migration/bulk
    //    Body : {
    //      studentIds, fromClassroomId, toClassroomId,
    //      migrationType, autoNextLevel, reason
    //    }
    // ─────────────────────────────────────────────────────────────────────
    @PostMapping("/bulk")
    public ResponseEntity<List<MigrationResponse>> migrateBulkStudents(
            @RequestBody MigrateBulkStudentsRequest request) {

        return ResponseEntity.ok(migrationService.migrateBulkStudents(request));
    }

    // ─────────────────────────────────────────────────────────────────────
    // 7. Historique d'un étudiant
    //
    //    GET /api/migration/history/{studentId}
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/history/{studentId}")
    public ResponseEntity<List<ClassHistoryResponse>> getStudentHistory(
            @PathVariable Integer studentId) {

        return ResponseEntity.ok(migrationService.getStudentHistory(studentId));
    }
}