package group3.en.stuattendance.Attendancemanager.Service;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;

public interface WeeklyAbsenceReportService {
    /**
     * Génère la fiche d'absences hebdomadaire PDF pour une classe donnée.
     *
     * @param classroomId ID de la classe
     * @param weekStart   Date du Lundi de la semaine (ajustement automatique si besoin)
     * @return ByteArrayInputStream contenant le PDF
     */
    ByteArrayInputStream generateWeeklyReport(Integer classroomId, LocalDate weekStart);
}
