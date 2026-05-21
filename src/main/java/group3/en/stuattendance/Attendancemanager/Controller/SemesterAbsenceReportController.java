package group3.en.stuattendance.Attendancemanager.Controller;

import group3.en.stuattendance.Attendancemanager.Service.SemesterAbsenceReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;

@RestController
@RequestMapping("/api/attendance/semester-report")
@RequiredArgsConstructor
public class SemesterAbsenceReportController {

    private final SemesterAbsenceReportService semesterAbsenceReportService;

    /**
     * Génère et télécharge le récapitulatif semestriel des absences au format PDF.
     *
     * Exemple :
     *   GET /api/attendance/semester-report/pdf?classroomId=1&semester=1
     *
     * @param classroomId ID de la classe
     * @param semester    Numéro du semestre (1 ou 2)
     */
    @GetMapping("/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'PEDAGOG', 'TEACHER')")
    public ResponseEntity<byte[]> downloadSemesterReport(
            @RequestParam Integer classroomId,
            @RequestParam Integer semester) {

        ByteArrayInputStream stream = semesterAbsenceReportService
                .generateSemesterReport(classroomId, semester);

        byte[] bytes;
        try {
            bytes = stream.readAllBytes();
        } catch (IOException e) {
            throw new RuntimeException("Erreur lecture PDF semestriel", e);
        }

        String filename = "recapitulatif_absences_semestre"
                + semester + "_classe" + classroomId + ".pdf";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", filename);
        headers.setContentLength(bytes.length);

        return ResponseEntity.ok().headers(headers).body(bytes);
    }
}