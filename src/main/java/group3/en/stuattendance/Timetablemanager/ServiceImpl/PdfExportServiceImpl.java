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
        Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // --- Modern Header with Logo ---
            addDocumentHeader(document, "CLASSROOM TIMETABLE", timetableDto.getClassroomName());

            // --- Deriving and formatting dates ---
            java.time.LocalDate startDate = timetableDto.getStartDate();
            java.time.LocalDate endDate   = timetableDto.getEndDate();

            if ((startDate == null || endDate == null) && timetableDto.getWeek() != null) {
                int isoWeek = timetableDto.getWeek();
                int year    = java.time.LocalDate.now().getYear();
                java.time.LocalDate weekStart = java.time.LocalDate.ofYearDay(year, 1)
                        .with(java.time.temporal.WeekFields.ISO.weekOfYear(), isoWeek)
                        .with(java.time.DayOfWeek.MONDAY);
                if (startDate == null) startDate = weekStart;
                if (endDate   == null) endDate   = weekStart.plusDays(5);
            }

            java.time.format.DateTimeFormatter dateFmt = java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy");
            String dateRange = (startDate != null && endDate != null)
                    ? startDate.format(dateFmt) + " - " + endDate.format(dateFmt)
                    : "Week " + timetableDto.getWeek();

            // Metadata Bar
            PdfPTable metaTable = new PdfPTable(3);
            metaTable.setWidthPercentage(100);
            metaTable.setSpacingAfter(15);
            
            addMetaCell(metaTable, "ACADEMIC YEAR", timetableDto.getAcademicYearName(), Element.ALIGN_LEFT);
            addMetaCell(metaTable, "SEMESTER", String.valueOf(timetableDto.getSemester()), Element.ALIGN_CENTER);
            addMetaCell(metaTable, "DURATION", dateRange, Element.ALIGN_RIGHT);
            document.add(metaTable);

            List<TimetableEntryDto> allEntries = timetableDto.getEntries();
            if (allEntries == null || allEntries.isEmpty()) {
                Paragraph emptyMsg = new Paragraph("No schedule entries found for this week.", 
                    FontFactory.getFont(FontFactory.HELVETICA, 12, java.awt.Color.GRAY));
                emptyMsg.setAlignment(Element.ALIGN_CENTER);
                emptyMsg.setSpacingBefore(50);
                document.add(emptyMsg);
            } else {
                PdfPTable table = new PdfPTable(7);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{1.2f, 2f, 2f, 2f, 2f, 2f, 2f});

                // Modern Table Headers
                String[] headers = {"TIME", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"};
                for (String h : headers) {
                    PdfPCell cell = new PdfPCell(new Phrase(h, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, java.awt.Color.WHITE)));
                    cell.setPadding(8);
                    cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    cell.setBackgroundColor(java.awt.Color.decode("#1E293B")); // Slate 800
                    cell.setBorder(Rectangle.NO_BORDER);
                    table.addCell(cell);
                }

                int[] skipCells = new int[6];
                for (int hour = 8; hour <= 16; hour++) {
                    // Time Axis
                    PdfPCell timeCell = new PdfPCell(new Phrase(String.format("%02d:00\n%02d:00", hour, hour + 1), 
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, java.awt.Color.decode("#64748B"))));
                    timeCell.setPadding(8);
                    timeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    timeCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                    timeCell.setBackgroundColor(java.awt.Color.decode("#F8FAFC"));
                    timeCell.setBorder(Rectangle.BOTTOM);
                    timeCell.setBorderColor(java.awt.Color.WHITE);
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
                                int dIdx = (e.getDayOfWeek() != null) ? e.getDayOfWeek() : -1;
                                if (dIdx == -1 && e.getDay() != null) {
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
                            
                            java.awt.Color bgColor = java.awt.Color.decode("#E0F2FE");
                            java.awt.Color textColor = java.awt.Color.BLACK;
                            
                            // PRESERVE USER COLOR
                            if (entry.getColor() != null && entry.getColor().startsWith("#")) {
                                try {
                                    bgColor = java.awt.Color.decode(entry.getColor());
                                    textColor = isDarkColor(bgColor) ? java.awt.Color.WHITE : java.awt.Color.BLACK;
                                } catch (Exception ignored) {}
                            }

                            String content;
                            if (Boolean.TRUE.equals(entry.getIsEvent())) {
                                content = entry.getEventName() != null ? entry.getEventName() : "EVENT";
                            } else {
                                content = entry.getCourseName().toUpperCase() + "\n\n" + (entry.getTeacherName() != null ? entry.getTeacherName() : "");
                            }

                            PdfPCell cell = new PdfPCell(new Phrase(content, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, textColor)));
                            cell.setRowspan(duration);
                            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                            cell.setPadding(10);
                            cell.setBackgroundColor(bgColor);
                            cell.setBorder(Rectangle.BOX);
                            cell.setBorderWidth(1.5f);
                            cell.setBorderColor(java.awt.Color.WHITE);
                            table.addCell(cell);
                        } else {
                            PdfPCell emptyCell = new PdfPCell(new Phrase(""));
                            emptyCell.setBackgroundColor(java.awt.Color.decode(hour % 2 == 0 ? "#FFFFFF" : "#FDFDFD"));
                            emptyCell.setBorder(Rectangle.BOX);
                            emptyCell.setBorderWidth(0.5f);
                            emptyCell.setBorderColor(java.awt.Color.decode("#F1F5F9"));
                            table.addCell(emptyCell);
                        }
                    }
                }
                document.add(table);
            }

            // Footer
            addFooter(document);
            document.close();

        } catch (Exception ex) {
            throw new RuntimeException("Error during Timetable PDF generation", ex);
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    @Override
    public ByteArrayInputStream exportAttendanceToPdf(group3.en.stuattendance.Timetablemanager.DTO.SessionDto session, 
                                                      java.util.List<group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto> records) {
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Header
            addDocumentHeader(document, "ATTENDANCE REGISTER", session.getCourseName());

            // Summary Info
            PdfPTable summary = new PdfPTable(2);
            summary.setWidthPercentage(100);
            summary.setSpacingAfter(20);
            
            PdfPCell leftCell = new PdfPCell();
            leftCell.setBorder(Rectangle.NO_BORDER);
            leftCell.addElement(new Phrase("LECTURER: " + session.getTeacherName(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
            leftCell.addElement(new Phrase("CLASSROOM: " + session.getClassroomName(), FontFactory.getFont(FontFactory.HELVETICA, 10)));
            leftCell.addElement(new Phrase("SESSION DATE: " + session.getDate(), FontFactory.getFont(FontFactory.HELVETICA, 10)));
            summary.addCell(leftCell);

            // Statistics Card
            long present = records.stream().filter(r -> "PRESENT".equals(String.valueOf(r.getStatus()))).count();
            long absent = records.stream().filter(r -> "ABSENT".equals(String.valueOf(r.getStatus()))).count();
            long late = records.stream().filter(r -> "LATE".equals(String.valueOf(r.getStatus()))).count();
            long excused = records.stream().filter(r -> "EXCUSED".equals(String.valueOf(r.getStatus()))).count();

            PdfPCell rightCell = new PdfPCell();
            rightCell.setBorder(Rectangle.BOX);
            rightCell.setPadding(10);
            rightCell.setBackgroundColor(java.awt.Color.decode("#F8FAFC"));
            Paragraph stats = new Paragraph("SUMMARY\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, java.awt.Color.decode("#475569")));
            stats.add(new Chunk("PRESENT: " + present + "\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, java.awt.Color.decode("#10B981"))));
            stats.add(new Chunk("LATE: " + late + "\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, java.awt.Color.decode("#F59E0B"))));
            stats.add(new Chunk("EXCUSED: " + excused + "\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, java.awt.Color.decode("#6366F1"))));
            stats.add(new Chunk("ABSENT: " + absent, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, java.awt.Color.decode("#EF4444"))));
            rightCell.addElement(stats);
            summary.addCell(rightCell);
            
            document.add(summary);

            // Calculate total hours scheduled for the course/session
            int totalHours = 1;
            if (session.getStartTime() != null && session.getEndTime() != null) {
                totalHours = Math.max(1, (int) java.time.Duration.between(session.getStartTime(), session.getEndTime()).toHours());
            }

            int numColumns = 3 + totalHours;
            PdfPTable table = new PdfPTable(numColumns);
            table.setWidthPercentage(100);
            
            float[] widths = new float[numColumns];
            widths[0] = 1.5f; // MATRICULE
            widths[1] = 3.5f; // STUDENT NAME
            for (int i = 0; i < totalHours; i++) {
                widths[2 + i] = 0.8f; // H1, H2, etc.
            }
            widths[numColumns - 1] = 2.5f; // REMARKS
            table.setWidths(widths);

            // Set up dynamic headers
            java.util.List<String> headerList = new java.util.ArrayList<>();
            headerList.add("MATRICULE");
            headerList.add("STUDENT NAME");
            for (int i = 1; i <= totalHours; i++) {
                headerList.add("H" + i);
            }
            headerList.add("REMARKS");

            for (String h : headerList) {
                PdfPCell cell = new PdfPCell(new Phrase(h, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, java.awt.Color.WHITE)));
                cell.setBackgroundColor(java.awt.Color.decode("#0F172A")); // Slate 900
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(8);
                cell.setBorder(Rectangle.NO_BORDER);
                table.addCell(cell);
            }

            for (group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto r : records) {
                Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
                table.addCell(createStyledCell(r.getStudentMatricule(), cellFont, false));
                table.addCell(createStyledCell(r.getStudentFirstName() + " " + r.getStudentLastName(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9), false));
                
                for (int i = 0; i < totalHours; i++) {
                    String status = getHourSlotStatus(r.getHourSlots(), i, r.getStatus());
                    PdfPCell statusCell;
                    if ("PRESENT".equals(status)) {
                        statusCell = createStyledCell("✓", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, java.awt.Color.decode("#065F46")), true);
                        statusCell.setBackgroundColor(java.awt.Color.decode("#D1FAE5")); // Light Green
                    } else if ("EXCUSED".equals(status)) {
                        statusCell = createStyledCell("E", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, java.awt.Color.decode("#92400E")), true);
                        statusCell.setBackgroundColor(java.awt.Color.decode("#FEF3C7")); // Yellow
                    } else if ("ABSENT".equals(status)) {
                        statusCell = createStyledCell("✗", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, java.awt.Color.decode("#991B1B")), true);
                        statusCell.setBackgroundColor(java.awt.Color.decode("#FEE2E2")); // Light Red
                    } else if ("LATE".equals(status)) {
                        statusCell = createStyledCell("L", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, java.awt.Color.decode("#92400E")), true);
                        statusCell.setBackgroundColor(java.awt.Color.decode("#FFEDD5")); // Light Orange
                    } else {
                        statusCell = createStyledCell("-", cellFont, true);
                    }
                    table.addCell(statusCell);
                }
                
                table.addCell(createStyledCell(r.getComments() != null ? r.getComments() : "", cellFont, false));
            }

            document.add(table);
            
            // Signature Block
            document.add(new Paragraph("\n\n"));
            PdfPTable sign = new PdfPTable(1);
            sign.setWidthPercentage(40);
            sign.setHorizontalAlignment(Element.ALIGN_RIGHT);
            PdfPCell signCell = new PdfPCell(new Phrase("LECTURER SIGNATURE\n\n\n\n_______________________", 
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
            signCell.setBorder(Rectangle.NO_BORDER);
            signCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            sign.addCell(signCell);
            document.add(sign);

            addFooter(document);
            document.close();

        } catch (Exception ex) {
            throw new RuntimeException("Error during Attendance PDF generation", ex);
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    private String getHourSlotStatus(java.util.List<group3.en.stuattendance.Attendancemanager.DTO.AttendanceHourDto> hourSlots, int index, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus defaultStatus) {
        if (hourSlots != null) {
            for (group3.en.stuattendance.Attendancemanager.DTO.AttendanceHourDto h : hourSlots) {
                if (h.getHourIndex() != null && h.getHourIndex() == index) {
                    return h.getStatus() != null ? h.getStatus().name() : "ABSENT";
                }
            }
        }
        return defaultStatus != null ? defaultStatus.name() : "ABSENT";
    }

    private void addDocumentHeader(Document document, String mainTitle, String subTitle) throws Exception {
        PdfPTable header = new PdfPTable(2);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{1, 3});
        header.setSpacingAfter(10);

        try {
            Image img = Image.getInstance("c:\\Users\\UsER\\Documents\\Transversal project\\Student Attendance System\\stuattendance\\src\\main\\resources\\static\\image\\Logo_SJ.png");
            img.scaleToFit(70, 70);
            PdfPCell logoCell = new PdfPCell(img);
            logoCell.setBorder(Rectangle.NO_BORDER);
            header.addCell(logoCell);
        } catch (Exception e) {
            header.addCell(new PdfPCell(new Phrase("LOGO MISSING", FontFactory.getFont(FontFactory.HELVETICA, 8))));
        }

        PdfPCell textCell = new PdfPCell();
        textCell.setBorder(Rectangle.NO_BORDER);
        textCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        textCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        
        Paragraph p1 = new Paragraph("SAINT JEAN INGENIEUR\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, java.awt.Color.decode("#00B0FF")));
        p1.setAlignment(Element.ALIGN_RIGHT);
        textCell.addElement(p1);
        
        Paragraph p2 = new Paragraph(mainTitle + "\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, java.awt.Color.decode("#334155")));
        p2.setAlignment(Element.ALIGN_RIGHT);
        textCell.addElement(p2);
        
        Paragraph p3 = new Paragraph(subTitle != null ? subTitle.toUpperCase() : "", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, java.awt.Color.GRAY));
        p3.setAlignment(Element.ALIGN_RIGHT);
        textCell.addElement(p3);
        
        header.addCell(textCell);
        document.add(header);

        // Divider
        PdfPTable line = new PdfPTable(1);
        line.setWidthPercentage(100);
        PdfPCell lCell = new PdfPCell();
        lCell.setBorder(Rectangle.BOTTOM);
        lCell.setBorderWidth(2f);
        lCell.setBorderColor(java.awt.Color.decode("#00B0FF"));
        line.addCell(lCell);
        document.add(line);
        document.add(Chunk.NEWLINE);
    }

    private void addMetaCell(PdfPTable table, String label, String value, int align) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(align);
        Paragraph p = new Paragraph(label + ": ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, java.awt.Color.decode("#64748B")));
        p.add(new Chunk(value != null ? value : "N/A", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, java.awt.Color.decode("#1E293B"))));
        cell.addElement(p);
        table.addCell(cell);
    }

    private PdfPCell createStyledCell(String text, Font font, boolean center) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setPadding(8);
        cell.setBorderColor(java.awt.Color.decode("#F1F5F9"));
        if (center) cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        return cell;
    }

    private void addFooter(Document document) throws Exception {
        Paragraph footer = new Paragraph("\nGenerated on " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) + " | Attendee Management System", 
            FontFactory.getFont(FontFactory.HELVETICA, 7, java.awt.Color.LIGHT_GRAY));
        footer.setAlignment(Element.ALIGN_CENTER);
        document.add(footer);
    }

    private boolean isDarkColor(java.awt.Color color) {
        double brightness = (color.getRed() * 0.299 + color.getGreen() * 0.587 + color.getBlue() * 0.114) / 255;
        return brightness < 0.6;
    }
}
