package group3.en.stuattendance.Attendancemanager.Controller;

import group3.en.stuattendance.Attendancemanager.Service.DailyAbsenceReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/attendance/daily-report")
@RequiredArgsConstructor
public class DailyAbsenceReportController {

    private final DailyAbsenceReportService dailyAbsenceReportService;

    @GetMapping("/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'PEDAGOG', 'TEACHER')")
    public ResponseEntity<byte[]> exportDailyReportPdf(
            @RequestParam Integer classroomId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        ByteArrayInputStream pdfStream = dailyAbsenceReportService.generateDailyReport(classroomId, date);
        byte[] pdfBytes = pdfStream.readAllBytes();

        String filename = "fiche_appel_journaliere_" + date + "_classe" + classroomId + ".pdf";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.add("Content-Disposition", "inline; filename=\"" + filename + "\"");
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    @GetMapping("/excel")
    @PreAuthorize("hasAnyRole('ADMIN', 'PEDAGOG', 'TEACHER')")
    public ResponseEntity<byte[]> exportDailyReportExcel(
            @RequestParam Integer classroomId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        ByteArrayInputStream excelStream = dailyAbsenceReportService.generateDailyReportExcel(classroomId, date);
        byte[] excelBytes = excelStream.readAllBytes();

        String filename = "fiche_appel_journaliere_" + date + "_classe" + classroomId + ".xlsx";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", filename);
        headers.setContentLength(excelBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(excelBytes);
    }
}
