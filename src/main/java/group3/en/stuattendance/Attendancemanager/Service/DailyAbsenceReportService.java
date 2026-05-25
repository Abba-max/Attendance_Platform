package group3.en.stuattendance.Attendancemanager.Service;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;

public interface DailyAbsenceReportService {
    ByteArrayInputStream generateDailyReport(Integer classroomId, LocalDate date);
    ByteArrayInputStream generateDailyReportExcel(Integer classroomId, LocalDate date);
}
