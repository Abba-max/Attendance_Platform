package group3.en.stuattendance.Attendancemanager.Controller;

import group3.en.stuattendance.Attendancemanager.Service.WeeklyAbsenceReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/attendance/weekly-report")
@RequiredArgsConstructor
public class WeeklyAbsenceReportController {

    private final WeeklyAbsenceReportService weeklyAbsenceReportService;

    /**
     * Génère et télécharge la fiche d'absences hebdomadaire au format PDF.
     *
     * Exemple d'appel :
     *   GET /api/attendance/weekly-report/pdf?classroomId=1&weekStart=2026-05-04
     *
     * @param classroomId ID de la classe
     * @param weekStart   Date du Lundi de la semaine (format yyyy-MM-dd)
     */
    @GetMapping("/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'PEDAGOG', 'TEACHER')")
    public ResponseEntity<byte[]> downloadWeeklyReport(
            @RequestParam Integer classroomId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {

        ByteArrayInputStream pdfStream = weeklyAbsenceReportService
                .generateWeeklyReport(classroomId, weekStart);

        byte[] pdfBytes = pdfStream.readAllBytes();

        // Nom du fichier : fiche_absences_semaine_YYYY-MM-DD_classeID.pdf
        String filename = "fiche_absences_semaine_"
                + weekStart.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                + "_classe" + classroomId + ".pdf";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", filename);
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }
}