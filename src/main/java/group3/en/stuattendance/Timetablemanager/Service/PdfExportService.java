package group3.en.stuattendance.Timetablemanager.Service;

import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import java.io.ByteArrayInputStream;

public interface PdfExportService {
    ByteArrayInputStream exportTimetableToPdf(TimetablecontentDto timetableDto);
}
