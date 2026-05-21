package group3.en.stuattendance.Attendancemanager.Service;

import java.io.ByteArrayInputStream;

public interface SemesterAbsenceReportService {
    /**
     * Génère le récapitulatif PDF des absences du semestre pour une classe.
     *
     * @param classroomId ID de la classe
     * @param semester    Numéro du semestre (1 ou 2)
     * @return ByteArrayInputStream du PDF généré
     */
    ByteArrayInputStream generateSemesterReport(Integer classroomId, Integer semester);
}