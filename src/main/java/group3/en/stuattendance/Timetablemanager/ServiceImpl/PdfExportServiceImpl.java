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
        Document document = new Document(PageSize.A4.rotate());
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
            
            String dateRange = (timetableDto.getStartDate() != null && timetableDto.getEndDate() != null) 
                    ? " from " + timetableDto.getStartDate() + " to " + timetableDto.getEndDate() 
                    : "";
                    
            String versionText = timetableDto.getVersion() != null ? " (v" + timetableDto.getVersion() + ")" : "";
            
            Paragraph subInfo = new Paragraph("Academic Year: " + (timetableDto.getAcademicYearName() != null ? timetableDto.getAcademicYearName() : "N/A") + 
                    " | Semester: " + (timetableDto.getSemester() != null ? timetableDto.getSemester() : "N/A") +
                    " | Week: " + timetableDto.getWeek() + versionText + dateRange);
            subInfo.setAlignment(Element.ALIGN_CENTER);
            document.add(subInfo);
            document.add(Chunk.NEWLINE);

            List<TimetableEntryDto> allEntries = timetableDto.getEntries();
            if (allEntries == null || allEntries.isEmpty()) {
                Paragraph emptyMsg = new Paragraph("No schedule entries found for this week.", bodyFont);
                emptyMsg.setAlignment(Element.ALIGN_CENTER);
                document.add(emptyMsg);
            } else {
                PdfPTable table = new PdfPTable(7);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{1.5f, 2f, 2f, 2f, 2f, 2f, 2f});

                // Add Header Row
                String[] headers = {"Time", "MON", "TUE", "WED", "THU", "FRI", "SAT"};
                for (String h : headers) {
                    PdfPCell cell = new PdfPCell(new Phrase(h, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, java.awt.Color.WHITE)));
                    cell.setPadding(5);
                    cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    cell.setBackgroundColor(java.awt.Color.decode("#00B0FF")); // Logo Blue
                    cell.setBorderWidth(1.1f);
                    cell.setBorderColor(java.awt.Color.decode("#0081C6")); // Darker Logo Blue
                    table.addCell(cell);
                }

                int[] skipCells = new int[6]; // Tracker for multi-hour blocks
                for (int hour = 8; hour <= 16; hour++) {
                    // Add Time Column Cell
                    PdfPCell timeCell = new PdfPCell(new Phrase(String.format("%02d:00-%02d:00", hour, hour + 1), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, java.awt.Color.DARK_GRAY)));
                    timeCell.setPadding(5);
                    timeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    timeCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                    timeCell.setBackgroundColor(java.awt.Color.decode("#F8FAFC"));
                    timeCell.setBorderWidth(1.5f);
                    timeCell.setBorderColor(java.awt.Color.decode("#E2E8F0"));
                    table.addCell(timeCell);

                    for (int dayIndex = 0; dayIndex <= 5; dayIndex++) {
                        if (skipCells[dayIndex] > 0) {
                            skipCells[dayIndex]--;
                            continue;
                        }

                        final int currentHour = hour;
                        final int currentDay = dayIndex;
                        
                        TimetableEntryDto entry = allEntries.stream()
                            .filter(e -> {
                                int dIdx = -1;
                                if (e.getDayOfWeek() != null) {
                                    dIdx = e.getDayOfWeek();
                                } else if (e.getDay() != null) {
                                    switch (e.getDay().toUpperCase()) {
                                        case "MONDAY": dIdx = 0; break;
                                        case "TUESDAY": dIdx = 1; break;
                                        case "WEDNESDAY": dIdx = 2; break;
                                        case "THURSDAY": dIdx = 3; break;
                                        case "FRIDAY": dIdx = 4; break;
                                        case "SATURDAY": dIdx = 5; break;
                                    }
                                }
                                return dIdx == currentDay && e.getStartTime() != null && e.getStartTime().getHour() == currentHour;
                            })
                            .findFirst()
                            .orElse(null);

                        if (entry != null) {
                            int duration = entry.getEndTime().getHour() - entry.getStartTime().getHour();
                            if (duration < 1) duration = 1;
                            
                            skipCells[dayIndex] = duration - 1;
                            
                            String text;
                            if (Boolean.TRUE.equals(entry.getIsEvent())) {
                                text = entry.getEventName() != null ? entry.getEventName() : "Custom Event";
                            } else {
                                text = entry.getCourseName() + "\n\n" + (entry.getTeacherName() != null ? entry.getTeacherName() : "");
                            }
                            
                            java.awt.Color bgColor = java.awt.Color.decode("#E0F2FE"); // Light Blue fallback
                            java.awt.Color textColor = java.awt.Color.BLACK;
                            
                            if (entry.getColor() != null && entry.getColor().startsWith("#")) {
                                try {
                                    bgColor = java.awt.Color.decode(entry.getColor());
                                    // Make text white for colored blocks
                                    textColor = java.awt.Color.WHITE;
                                } catch (Exception ignored) {}
                            }

                            PdfPCell cell = new PdfPCell(new Phrase(text, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, textColor)));
                            cell.setRowspan(duration);
                            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                            cell.setPadding(5);
                            cell.setBackgroundColor(bgColor);
                            
                            // For visual pop, we give it a thicker border
                            cell.setBorderWidth(2.0f);
                            cell.setBorderColor(java.awt.Color.decode("#0284C7"));
                            
                            table.addCell(cell);
                        } else {
                            // Empty Drop Zone Cell
                            PdfPCell emptyCell = new PdfPCell(new Phrase(""));
                            emptyCell.setBorderWidth(1.0f);
                            emptyCell.setBorderColor(java.awt.Color.decode("#E2E8F0"));
                            table.addCell(emptyCell);
                        }
                    }
                }
                document.add(table);
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
