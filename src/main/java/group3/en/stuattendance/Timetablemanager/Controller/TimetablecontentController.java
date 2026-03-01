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

    @PostMapping("/weekly")
    public ResponseEntity<TimetablecontentDto> saveWeeklyTimetable(@RequestBody TimetablecontentDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(timetablecontentService.saveWeeklyTimetable(dto));
    }

    @GetMapping("/weekly/{classroomId}/{academicYearId}/{week}")
    public ResponseEntity<TimetablecontentDto> getWeeklyTimetable(
            @PathVariable Integer classroomId,
            @PathVariable Long academicYearId,
            @PathVariable Integer week) {
        return ResponseEntity.ok(timetablecontentService.getWeeklyTimetable(classroomId, academicYearId, week));
    }

    @GetMapping("/export/pdf/{classroomId}/{academicYearId}/{week}")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> exportTimetableToPdf(
            @PathVariable Integer classroomId,
            @PathVariable Long academicYearId,
            @PathVariable Integer week) {
        
        TimetablecontentDto dto = timetablecontentService.getWeeklyTimetable(classroomId, academicYearId, week);
        java.io.ByteArrayInputStream bis = pdfExportService.exportTimetableToPdf(dto);

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.add("Content-Disposition", "inline; filename=timetable_week" + week + ".pdf");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .body(new org.springframework.core.io.InputStreamResource(bis));
    }

    @DeleteMapping("/weekly/{classroomId}/{academicYearId}/{week}")
    public ResponseEntity<Void> deleteWeeklyTimetable(
            @PathVariable Integer classroomId,
            @PathVariable Long academicYearId,
            @PathVariable Integer week) {
        timetablecontentService.deleteWeeklyTimetable(classroomId, academicYearId, week);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<TimetablecontentDto>> getAllTimetablecontents() {
        return ResponseEntity.ok(timetablecontentService.getAllTimetablecontents());
    }
}
