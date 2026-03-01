package group3.en.stuattendance.Timetablemanager.ServiceImpl;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import group3.en.stuattendance.Timetablemanager.DTO.TimetableEntryDto;
import group3.en.stuattendance.Timetablemanager.Service.PdfExportService;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PdfExportServiceImpl implements PdfExportService {

    @Override
    public ByteArrayInputStream exportTimetableToPdf(TimetablecontentDto timetableDto) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Font settings
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font dayHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Font tableHeadFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            // Title
            Paragraph title = new Paragraph("Classroom Timetable: " + (timetableDto.getClassroomName() != null ? timetableDto.getClassroomName() : "N/A"), titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            
            Paragraph subInfo = new Paragraph("Academic Year: " + (timetableDto.getAcademicYearName() != null ? timetableDto.getAcademicYearName() : "N/A") + " | Week: " + timetableDto.getWeek());
            subInfo.setAlignment(Element.ALIGN_CENTER);
            document.add(subInfo);
            document.add(Chunk.NEWLINE);

            List<TimetableEntryDto> allEntries = timetableDto.getEntries();
            String[] daysOrdered = {"MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"};

            if (allEntries == null || allEntries.isEmpty()) {
                Paragraph emptyMsg = new Paragraph("No schedule entries found for this week.", bodyFont);
                emptyMsg.setAlignment(Element.ALIGN_CENTER);
                document.add(emptyMsg);
            } else {
                Map<String, List<TimetableEntryDto>> entriesByDay = allEntries.stream()
                        .collect(Collectors.groupingBy(e -> e.getDay().toUpperCase()));

                for (String day : daysOrdered) {
                    List<TimetableEntryDto> dayEntries = entriesByDay.get(day);
                    if (dayEntries != null && !dayEntries.isEmpty()) {
                        // Day Header
                        Paragraph dayPara = new Paragraph(day, dayHeaderFont);
                        dayPara.setSpacingBefore(10f);
                        dayPara.setSpacingAfter(5f);
                        document.add(dayPara);

                        // Table for the day's entries
                        PdfPTable table = new PdfPTable(3);
                        table.setWidthPercentage(100);
                        table.setWidths(new float[]{2f, 4f, 4f});

                        // Table Header
                        addTableCell(table, "Time Slot", tableHeadFont, java.awt.Color.LIGHT_GRAY);
                        addTableCell(table, "Course", tableHeadFont, java.awt.Color.LIGHT_GRAY);
                        addTableCell(table, "Teacher", tableHeadFont, java.awt.Color.LIGHT_GRAY);

                        // Sort entries by start time
                        dayEntries.sort(Comparator.comparing(TimetableEntryDto::getStartTime));

                        for (TimetableEntryDto entry : dayEntries) {
                            addTableCell(table, entry.getStartTime() + " - " + entry.getEndTime(), bodyFont, null);
                            addTableCell(table, entry.getCourseName(), bodyFont, null);
                            addTableCell(table, entry.getTeacherName() != null ? entry.getTeacherName() : "N/A", bodyFont, null);
                        }
                        document.add(table);
                    }
                }
            }

            document.close();

        } catch (DocumentException ex) {
            throw new RuntimeException("Error during PDF generation", ex);
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    private void addTableCell(PdfPTable table, String text, Font font, java.awt.Color bgColor) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        if (bgColor != null) {
            cell.setBackgroundColor(bgColor);
        }
        table.addCell(cell);
    }
}
