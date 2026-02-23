package group3.en.stuattendance.Institutionmanager.Controller;

import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearDto;
import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearScheduleDto;
import group3.en.stuattendance.Institutionmanager.Service.AcademicYearService;
import group3.en.stuattendance.Institutionmanager.Service.AcademicYearScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/academic-years")
@RequiredArgsConstructor
public class AcademicYearController {

    private final AcademicYearService academicYearService;
    private final AcademicYearScheduleService scheduleService;

    // ── Academic Year CRUD ─────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<AcademicYearDto> createAcademicYear(@RequestBody AcademicYearDto dto) {
        return ResponseEntity.ok(academicYearService.createAcademicYear(dto));
    }

    @GetMapping("/active")
    public ResponseEntity<AcademicYearDto> getActiveAcademicYear() {
        AcademicYearDto active = academicYearService.getActiveAcademicYear();
        return active != null ? ResponseEntity.ok(active) : ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<AcademicYearDto>> getAllAcademicYears() {
        return ResponseEntity.ok(academicYearService.getAllAcademicYears());
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<AcademicYearDto> activateAcademicYear(@PathVariable Long id) {
        return ResponseEntity.ok(academicYearService.activateAcademicYear(id));
    }

    @PutMapping("/{id}/suspend")
    public ResponseEntity<AcademicYearDto> suspendAcademicYear(@PathVariable Long id) {
        return ResponseEntity.ok(academicYearService.suspendAcademicYear(id));
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<AcademicYearDto> closeAcademicYear(@PathVariable Long id) {
        return ResponseEntity.ok(academicYearService.closeAcademicYear(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAcademicYear(@PathVariable Long id) {
        academicYearService.deleteAcademicYear(id);
        return ResponseEntity.noContent().build();
    }

    // ── Scoped Schedules ──────────────────────────────────────────────────

    /** Create a new scoped schedule (Institution-wide, Cycle, or Department). */
    @PostMapping("/{yearId}/schedules")
    public ResponseEntity<AcademicYearScheduleDto> createSchedule(
            @PathVariable Long yearId,
            @RequestBody AcademicYearScheduleDto dto) {
        dto.setAcademicYearId(yearId);
        return ResponseEntity.ok(scheduleService.createSchedule(dto));
    }

    /** Batch create or create with manual year entry. */
    @PostMapping("/batch")
    public ResponseEntity<AcademicYearScheduleDto> createBatchSchedule(@RequestBody AcademicYearScheduleDto dto) {
        return ResponseEntity.ok(scheduleService.createSchedule(dto));
    }

    /** List all schedules under a specific Academic Year. */
    @GetMapping("/{yearId}/schedules")
    public ResponseEntity<List<AcademicYearScheduleDto>> getSchedulesByYear(@PathVariable Long yearId) {
        return ResponseEntity.ok(scheduleService.getSchedulesByAcademicYear(yearId));
    }

    /** Activate a specific schedule (closes any conflicting active scope). */
    @PutMapping("/schedules/{scheduleId}/activate")
    public ResponseEntity<AcademicYearScheduleDto> activateSchedule(@PathVariable Long scheduleId) {
        return ResponseEntity.ok(scheduleService.activateSchedule(scheduleId));
    }

    /** Suspend a schedule (temporarily pauses it). */
    @PutMapping("/schedules/{scheduleId}/suspend")
    public ResponseEntity<AcademicYearScheduleDto> suspendSchedule(@PathVariable Long scheduleId) {
        return ResponseEntity.ok(scheduleService.suspendSchedule(scheduleId));
    }

    /** Close a schedule permanently. */
    @PutMapping("/schedules/{scheduleId}/close")
    public ResponseEntity<AcademicYearScheduleDto> closeSchedule(@PathVariable Long scheduleId) {
        return ResponseEntity.ok(scheduleService.closeSchedule(scheduleId));
    }

    /** Delete a schedule (only if not ACTIVE). */
    @DeleteMapping("/schedules/{scheduleId}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable Long scheduleId) {
        scheduleService.deleteSchedule(scheduleId);
        return ResponseEntity.noContent().build();
    }

    /** Resolve the active schedule for a given department (hierarchical lookup). */
    @GetMapping("/resolve/department/{deptId}")
    public ResponseEntity<AcademicYearScheduleDto> resolveForDepartment(@PathVariable Integer deptId) {
        AcademicYearScheduleDto resolved = scheduleService.resolveActiveScheduleForDepartment(deptId);
        return resolved != null ? ResponseEntity.ok(resolved) : ResponseEntity.noContent().build();
    }

    /** Resolve the active schedule for a given classroom (hierarchical lookup). */
    @GetMapping("/resolve/classroom/{classroomId}")
    public ResponseEntity<AcademicYearScheduleDto> resolveForClassroom(@PathVariable Integer classroomId) {
        AcademicYearScheduleDto resolved = scheduleService.resolveActiveScheduleForClassroom(classroomId);
        return resolved != null ? ResponseEntity.ok(resolved) : ResponseEntity.noContent().build();
    }
}
