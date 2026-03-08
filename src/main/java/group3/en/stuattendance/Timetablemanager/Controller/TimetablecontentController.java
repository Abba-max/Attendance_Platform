package group3.en.stuattendance.Timetablemanager.Controller;

import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import group3.en.stuattendance.Timetablemanager.Service.TimetablecontentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/timetablecontent")
@RequiredArgsConstructor
public class TimetablecontentController {

    private final TimetablecontentService timetablecontentService;
    private final group3.en.stuattendance.Timetablemanager.Service.PdfExportService pdfExportService;

    /**
     * Save (or update) a weekly timetable.
     * Frontend calls: POST /api/timetablecontent
     */
    @PostMapping
    public ResponseEntity<TimetablecontentDto> saveWeeklyTimetable(@RequestBody TimetablecontentDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(timetablecontentService.saveWeeklyTimetable(dto));
    }

    /**
     * Legacy alias kept for backward compatibility.
     */
    @PostMapping("/weekly")
    public ResponseEntity<TimetablecontentDto> saveWeeklyTimetableLegacy(@RequestBody TimetablecontentDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(timetablecontentService.saveWeeklyTimetable(dto));
    }

    /**
     * Fetch a timetable by query parameters.
     * Frontend calls: GET /api/timetablecontent/search?classroomId=&week=&semester=&academicYearId=
     * Returns 200 with empty entries list if no timetable exists yet (not a 404).
     */
    @GetMapping("/search")
    public ResponseEntity<TimetablecontentDto> searchTimetable(
            @RequestParam Integer classroomId,
            @RequestParam Integer week,
            @RequestParam Integer semester,
            @RequestParam(required = false) Long academicYearId) {
        try {
            TimetablecontentDto dto = timetablecontentService.getWeeklyTimetable(classroomId, academicYearId, week, semester);
            return ResponseEntity.ok(dto);
        } catch (jakarta.persistence.EntityNotFoundException e) {
            // No timetable saved yet — return an empty shell so the frontend grid clears cleanly
            TimetablecontentDto empty = TimetablecontentDto.builder()
                    .classroomId(classroomId)
                    .week(week)
                    .semester(semester)
                    .academicYearId(academicYearId)
                    .entries(java.util.Collections.emptyList())
                    .build();
            return ResponseEntity.ok(empty);
        }
    }

    /**
     * Fetch the complete version history for a given classroom week.
     * Frontend calls: GET /api/timetablecontent/history?classroomId=&week=&semester=&academicYearId=
     */
    @GetMapping("/history")
    public ResponseEntity<List<TimetablecontentDto>> getTimetableHistory(
            @RequestParam Integer classroomId,
            @RequestParam Integer week,
            @RequestParam Integer semester,
            @RequestParam(required = false) Long academicYearId) {
        return ResponseEntity.ok(timetablecontentService.getTimetableHistory(classroomId, academicYearId, week, semester));
    }

    /**
     * Legacy path-variable endpoint.
     */
    @GetMapping("/weekly/{classroomId}/{academicYearId}/{week}/{semester}")
    public ResponseEntity<TimetablecontentDto> getWeeklyTimetable(
            @PathVariable Integer classroomId,
            @PathVariable Long academicYearId,
            @PathVariable Integer week,
            @PathVariable Integer semester) {
        return ResponseEntity.ok(timetablecontentService.getWeeklyTimetable(classroomId, academicYearId, week, semester));
    }

    /**
     * Export PDF via query parameters.
     * Frontend calls: GET /api/timetablecontent/export/pdf?classroomId=&academicYearId=&week=&semester=
     */
    @GetMapping("/export/pdf")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> exportTimetableToPdf(
            @RequestParam Integer classroomId,
            @RequestParam(required = false) Long academicYearId,
            @RequestParam Integer week,
            @RequestParam Integer semester) {

        TimetablecontentDto dto;
        try {
            dto = timetablecontentService.getWeeklyTimetable(classroomId, academicYearId, week, semester);
        } catch (jakarta.persistence.EntityNotFoundException e) {
            dto = TimetablecontentDto.builder()
                    .classroomId(classroomId).week(week).semester(semester)
                    .entries(java.util.Collections.emptyList())
                    .build();
        }

        java.io.ByteArrayInputStream bis = pdfExportService.exportTimetableToPdf(dto);

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.add("Content-Disposition", "inline; filename=timetable_week" + week + ".pdf");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .body(new org.springframework.core.io.InputStreamResource(bis));
    }

    /**
     * Legacy path-variable PDF endpoint.
     */
    @GetMapping("/export/pdf/{classroomId}/{academicYearId}/{week}/{semester}")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> exportTimetableToPdfLegacy(
            @PathVariable Integer classroomId,
            @PathVariable Long academicYearId,
            @PathVariable Integer week,
            @PathVariable Integer semester) {

        TimetablecontentDto dto = timetablecontentService.getWeeklyTimetable(classroomId, academicYearId, week, semester);
        java.io.ByteArrayInputStream bis = pdfExportService.exportTimetableToPdf(dto);

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.add("Content-Disposition", "inline; filename=timetable_week" + week + ".pdf");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .body(new org.springframework.core.io.InputStreamResource(bis));
    }

    @DeleteMapping("/weekly/{classroomId}/{academicYearId}/{week}/{semester}")
    public ResponseEntity<Void> deleteWeeklyTimetable(
            @PathVariable Integer classroomId,
            @PathVariable Long academicYearId,
            @PathVariable Integer week,
            @PathVariable Integer semester) {
        timetablecontentService.deleteWeeklyTimetable(classroomId, academicYearId, week, semester);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<TimetablecontentDto>> getAllTimetablecontents() {
        return ResponseEntity.ok(timetablecontentService.getAllTimetablecontents());
    }
}
