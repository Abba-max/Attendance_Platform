package group3.en.stuattendance.Timetablemanager.Service;

import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import java.io.ByteArrayInputStream;

public interface PdfExportService {
    ByteArrayInputStream exportTimetableToPdf(TimetablecontentDto timetableDto);
    
    ByteArrayInputStream exportAttendanceToPdf(group3.en.stuattendance.Timetablemanager.DTO.SessionDto session, 
                                              java.util.List<group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto> records);
}
