package group3.en.stuattendance.Attendancemanager.ServiceImpl;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.BorderStyle;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Attendancemanager.Repository.AttendanceRecordRepository;
import group3.en.stuattendance.Attendancemanager.Service.DailyAbsenceReportService;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DailyAbsenceReportServiceImpl implements DailyAbsenceReportService {

    private final ClassroomRepository classroomRepository;
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AcademicYearRepository academicYearRepository;

    // Muted Slate & Indigo Palette
    private static final Color PRIMARY_INDIGO = new Color(67, 56, 202); // Indigo-700
    private static final Color MUTED_SLATE = new Color(241, 245, 249);  // Slate-100
    private static final Color BORDER_SLATE = new Color(203, 213, 225); // Slate-300
    private static final Color TEXT_DARK = new Color(30, 41, 59);       // Slate-800
    private static final Color TEXT_MUTED = new Color(100, 116, 139);   // Slate-500
    private static final Color TEXT_LIGHT = new Color(255, 255, 255);   // White
    
    private static final Color COLOR_PRESENT = new Color(34, 197, 94);  // Green-500
    private static final Color COLOR_ABSENT = new Color(239, 68, 68);   // Red-500
    private static final Color COLOR_EXCUSED = new Color(245, 158, 11); // Amber-500

    @Override
    public ByteArrayInputStream generateDailyReport(Integer classroomId, LocalDate date) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new EntityNotFoundException("Classe introuvable : " + classroomId));

        List<User> students = userRepository
                .findByClassroomClassIdAndRolesName(classroomId, "STUDENT")
                .stream()
                .sorted(Comparator
                        .comparing(u -> (u.getLastName() != null ? u.getLastName() : ""),
                                Comparator.nullsLast(String::compareToIgnoreCase)))
                .collect(Collectors.toList());

        List<Session> sessions = sessionRepository
                .findByClassroomClassIdAndDateBetween(classroomId, date, date)
                .stream()
                .sorted(Comparator.comparing(Session::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());

        List<Integer> sessionIds = sessions.stream()
                .map(Session::getSessionId)
                .collect(Collectors.toList());

        List<AttendanceRecord> allRecords = sessionIds.isEmpty()
                ? Collections.emptyList()
                : attendanceRecordRepository.findWithHourSlotsBySessionIds(sessionIds);

        Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap = new HashMap<>();
        for (AttendanceRecord rec : allRecords) {
            attendanceMap
                    .computeIfAbsent(rec.getSession().getSessionId(), k -> new HashMap<>())
                    .put(rec.getUser().getUserId(), rec);
        }

        return buildPdf(classroom, students, sessions, attendanceMap, date);
    }

    @Override
    public ByteArrayInputStream generateDailyReportExcel(Integer classroomId, LocalDate date) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new EntityNotFoundException("Classe introuvable : " + classroomId));

        List<User> students = userRepository
                .findByClassroomClassIdAndRolesName(classroomId, "STUDENT")
                .stream()
                .sorted(Comparator
                        .comparing(u -> (u.getLastName() != null ? u.getLastName() : ""),
                                Comparator.nullsLast(String::compareToIgnoreCase)))
                .collect(Collectors.toList());

        List<Session> sessions = sessionRepository
                .findByClassroomClassIdAndDateBetween(classroomId, date, date)
                .stream()
                .sorted(Comparator.comparing(Session::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());

        List<Integer> sessionIds = sessions.stream()
                .map(Session::getSessionId)
                .collect(Collectors.toList());

        List<AttendanceRecord> allRecords = sessionIds.isEmpty()
                ? Collections.emptyList()
                : attendanceRecordRepository.findWithHourSlotsBySessionIds(sessionIds);

        Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap = new HashMap<>();
        for (AttendanceRecord rec : allRecords) {
            attendanceMap
                    .computeIfAbsent(rec.getSession().getSessionId(), k -> new HashMap<>())
                    .put(rec.getUser().getUserId(), rec);
        }

        return buildExcel(classroom, students, sessions, attendanceMap, date);
    }

    private ByteArrayInputStream buildExcel(
            Classroom classroom,
            List<User> students,
            List<Session> sessions,
            Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap,
            LocalDate date) {

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Appel Journalière");

            org.apache.poi.ss.usermodel.Font boldFont = workbook.createFont();
            boldFont.setBold(true);

            org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);

            CellStyle titleStyle = workbook.createCellStyle();
            titleStyle.setFont(titleFont);
            
            CellStyle subtitleStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font subtitleFont = workbook.createFont();
            subtitleFont.setBold(true);
            subtitleFont.setFontHeightInPoints((short) 12);
            subtitleStyle.setFont(subtitleFont);

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(boldFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle centerStyle = workbook.createCellStyle();
            centerStyle.setAlignment(HorizontalAlignment.CENTER);
            centerStyle.setBorderBottom(BorderStyle.THIN);
            centerStyle.setBorderTop(BorderStyle.THIN);
            centerStyle.setBorderLeft(BorderStyle.THIN);
            centerStyle.setBorderRight(BorderStyle.THIN);
            
            CellStyle leftStyle = workbook.createCellStyle();
            leftStyle.setAlignment(HorizontalAlignment.LEFT);
            leftStyle.setBorderBottom(BorderStyle.THIN);
            leftStyle.setBorderTop(BorderStyle.THIN);
            leftStyle.setBorderLeft(BorderStyle.THIN);
            leftStyle.setBorderRight(BorderStyle.THIN);

            Row titleRow = sheet.createRow(0);
            titleRow.createCell(0).setCellValue("INSTITUT UNIVERSITAIRE SAINT JEAN");
            titleRow.getCell(0).setCellStyle(titleStyle);
            
            String academicYearStr = academicYearRepository.findActiveAcademicYear()
                    .map(ay -> ay.getAcademicYear())
                    .orElse((date.getYear()) + "-" + (date.getYear() + 1));

            Row subtitleRow = sheet.createRow(2);
            subtitleRow.createCell(0).setCellValue("ATTENDANCE FORM SCHOOL YEAR " + academicYearStr);
            subtitleRow.getCell(0).setCellStyle(subtitleStyle);
            
            String levelStr = classroom.getName() != null ? classroom.getName() : "";
            sheet.createRow(3).createCell(0).setCellValue("Level: " + levelStr);
            
            String optionStr = classroom.getSpeciality() != null ? classroom.getSpeciality().getName() : "";
            sheet.createRow(4).createCell(0).setCellValue("Option: " + optionStr);
            
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            sheet.createRow(5).createCell(0).setCellValue("Date: " + date.format(fmt));

            if (students.isEmpty()) {
                Row msgRow = sheet.createRow(7);
                msgRow.createCell(0).setCellValue("Aucun étudiant inscrit dans cette classe.");
                workbook.write(out);
                return new ByteArrayInputStream(out.toByteArray());
            }

            // Headers
            Row headerRow = sheet.createRow(7);
            headerRow.setHeightInPoints(30f);
            
            String[] headers = {"N°", "Matricule", "Names"};
            for (int i=0; i<headers.length; i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(headerStyle);
            }

            String[] timeSlots = {
                "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", 
                "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00"
            };

            int colIdx = 3;
            for (String slot : timeSlots) {
                Cell c = headerRow.createCell(colIdx++);
                c.setCellValue(slot);
                c.setCellStyle(headerStyle);
            }

            // Data Rows
            int rowIdx = 8;
            int index = 1;
            for (User student : students) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(20f);
                
                Cell nCell = row.createCell(0);
                nCell.setCellValue(index++);
                nCell.setCellStyle(centerStyle);
                
                Cell matCell = row.createCell(1);
                matCell.setCellValue(student.getMatricule() != null ? student.getMatricule() : "");
                matCell.setCellStyle(centerStyle);

                String fullName = (student.getLastName() != null ? student.getLastName().toUpperCase() : "") + " " + 
                                  (student.getFirstName() != null ? student.getFirstName().toUpperCase() : "");
                Cell nameCell = row.createCell(2);
                nameCell.setCellValue(fullName.trim());
                nameCell.setCellStyle(leftStyle);

                colIdx = 3;
                for (String slot : timeSlots) {
                    Cell sCell = row.createCell(colIdx++);
                    sCell.setCellStyle(centerStyle);
                    
                    String[] parts = slot.split("-");
                    java.time.LocalTime slotStart = java.time.LocalTime.parse(parts[0]);
                    java.time.LocalTime slotEnd = java.time.LocalTime.parse(parts[1]);
                    
                    String cellValue = "";
                    for (Session s : sessions) {
                        if (s.getStartTime() == null || s.getEndTime() == null) continue;
                        if (s.getStartTime().isBefore(slotEnd) && s.getEndTime().isAfter(slotStart)) {
                            Map<Integer, AttendanceRecord> byUser = attendanceMap.getOrDefault(s.getSessionId(), Collections.emptyMap());
                            AttendanceRecord rec = byUser.get(student.getUserId());
                            if (rec != null) {
                                if (rec.getStatus() == AttendanceStatus.PRESENT) cellValue = "P";
                                else if (rec.getStatus() == AttendanceStatus.ABSENT) cellValue = "A";
                                else if (rec.getStatus() == AttendanceStatus.EXCUSED) cellValue = "J";
                            }
                            break;
                        }
                    }
                    sCell.setCellValue(cellValue);
                }
            }

            // Auto-size columns
            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);
            sheet.autoSizeColumn(2);
            for (int i = 3; i < 3 + timeSlots.length; i++) {
                sheet.setColumnWidth(i, 3500); // fixed width for time slots
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());

        } catch (Exception e) {
            throw new RuntimeException("Erreur génération Excel : " + e.getMessage(), e);
        }
    }

    private ByteArrayInputStream buildPdf(
            Classroom classroom,
            List<User> students,
            List<Session> sessions,
            Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap,
            LocalDate date) {

        Document document = new Document(PageSize.A4, 20, 20, 30, 30);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            addHeader(document, classroom, date);

            if (students.isEmpty()) {
                Paragraph msg = new Paragraph("Aucun étudiant inscrit dans cette classe.", FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY));
                msg.setAlignment(Element.ALIGN_CENTER);
                msg.setSpacingBefore(20);
                document.add(msg);
            } else {
                PdfPTable table = buildCallSheetTable(students, sessions, attendanceMap);
                document.add(table);
            }

            addFooter(document);
            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Erreur génération fiche d'appel PDF : " + e.getMessage(), e);
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    private void addHeader(Document document, Classroom classroom, LocalDate date) throws DocumentException {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18f, Color.BLACK);
        Paragraph title = new Paragraph("INSTITUT UNIVERSITAIRE SAINT JEAN", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);
        
        document.add(new Paragraph("\n"));

        String academicYearStr = academicYearRepository.findActiveAcademicYear()
                .map(ay -> ay.getAcademicYear())
                .orElse((date.getYear()) + "-" + (date.getYear() + 1));

        Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12f, Color.BLACK);
        Paragraph subtitle = new Paragraph("ATTENDANCE FORM SCHOOL YEAR " + academicYearStr, subtitleFont);
        subtitle.setAlignment(Element.ALIGN_LEFT);
        document.add(subtitle);

        document.add(new Paragraph("\n"));

        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10f, Color.BLACK);
        
        String levelStr = classroom.getName() != null ? classroom.getName() : "";
        Paragraph level = new Paragraph("Level: " + levelStr, normalFont);
        document.add(level);
        
        String optionStr = classroom.getSpeciality() != null ? classroom.getSpeciality().getName() : "";
        Paragraph option = new Paragraph("Option: " + optionStr, normalFont);
        document.add(option);
        
        Paragraph dateLine = new Paragraph("Date: " + date.format(fmt), normalFont);
        dateLine.setSpacingAfter(15f);
        document.add(dateLine);
    }

    private PdfPTable buildCallSheetTable(List<User> students, List<Session> sessions, Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap) throws DocumentException {
        String[] timeSlots = {
            "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", 
            "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00"
        };
        int totalCols = 3 + timeSlots.length; // N°, Matricule, Names, 8 slots
        PdfPTable table = new PdfPTable(totalCols);
        table.setWidthPercentage(100);
        
        float[] widths = new float[totalCols];
        widths[0] = 5f; // N°
        widths[1] = 12f; // Matricule
        widths[2] = 27f; // Names
        float sessionWidth = 56f / timeSlots.length;
        for (int i = 3; i < totalCols; i++) widths[i] = sessionWidth;
        table.setWidths(widths);

        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7f, Color.BLACK);
        
        String[] headers = {"N°", "Matricule", "Names"};
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(Color.LIGHT_GRAY);
            cell.setBorderColor(Color.BLACK);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPadding(6f);
            table.addCell(cell);
        }

        for (String slot : timeSlots) {
            PdfPCell cell = new PdfPCell(new Phrase(slot, headerFont));
            cell.setBackgroundColor(Color.LIGHT_GRAY);
            cell.setBorderColor(Color.BLACK);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPadding(6f);
            table.addCell(cell);
        }

        Font nameFont = FontFactory.getFont(FontFactory.HELVETICA, 7f, Color.BLACK);
        Font presentFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, Color.BLACK);
        
        int index = 1;
        for (User student : students) {
            PdfPCell nCell = new PdfPCell(new Phrase(String.valueOf(index++), nameFont));
            nCell.setBorderColor(Color.BLACK);
            nCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            nCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            nCell.setPadding(6f);
            table.addCell(nCell);
            
            String matricule = student.getMatricule() != null ? student.getMatricule() : "";
            PdfPCell matCell = new PdfPCell(new Phrase(matricule, nameFont));
            matCell.setBorderColor(Color.BLACK);
            matCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            matCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            matCell.setPadding(6f);
            table.addCell(matCell);

            String fullName = (student.getLastName() != null ? student.getLastName().toUpperCase() : "") + " " + 
                              (student.getFirstName() != null ? student.getFirstName().toUpperCase() : "");
            PdfPCell nameCell = new PdfPCell(new Phrase(fullName.trim(), nameFont));
            nameCell.setBorderColor(Color.BLACK);
            nameCell.setHorizontalAlignment(Element.ALIGN_LEFT);
            nameCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            nameCell.setPaddingLeft(5f);
            nameCell.setPadding(6f);
            table.addCell(nameCell);

            // Time slots matching
            for (String slot : timeSlots) {
                String[] parts = slot.split("-");
                java.time.LocalTime slotStart = java.time.LocalTime.parse(parts[0]);
                java.time.LocalTime slotEnd = java.time.LocalTime.parse(parts[1]);
                
                String cellValue = "";
                for (Session s : sessions) {
                    if (s.getStartTime() == null || s.getEndTime() == null) continue;
                    // Overlap logic: session starts before slot ends AND session ends after slot starts
                    if (s.getStartTime().isBefore(slotEnd) && s.getEndTime().isAfter(slotStart)) {
                        Map<Integer, AttendanceRecord> byUser = attendanceMap.getOrDefault(s.getSessionId(), Collections.emptyMap());
                        AttendanceRecord rec = byUser.get(student.getUserId());
                        if (rec != null) {
                            if (rec.getStatus() == AttendanceStatus.PRESENT) cellValue = "P";
                            else if (rec.getStatus() == AttendanceStatus.ABSENT) cellValue = "A";
                            else if (rec.getStatus() == AttendanceStatus.EXCUSED) cellValue = "J";
                        }
                        break; // Found matching session for this slot
                    }
                }

                PdfPCell sCell = new PdfPCell(new Phrase(cellValue, presentFont));
                sCell.setBorderColor(Color.BLACK);
                sCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                sCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                sCell.setPadding(6f);
                table.addCell(sCell);
            }
        }

        return table;
    }

    private void addFooter(Document document) throws DocumentException {
        Font signTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9f, Color.BLACK);
        Font signLineFont = FontFactory.getFont(FontFactory.HELVETICA, 9f, Color.DARK_GRAY);

        PdfPTable footer = new PdfPTable(2);
        footer.setWidthPercentage(100);
        footer.setSpacingBefore(30f);

        PdfPCell cell1 = new PdfPCell();
        cell1.setBorder(Rectangle.NO_BORDER);
        cell1.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell1.addElement(new Paragraph("Signature du Professeur", signTitleFont));
        cell1.addElement(new Paragraph("\n\n_______________________", signLineFont));
        footer.addCell(cell1);

        PdfPCell cell2 = new PdfPCell();
        cell2.setBorder(Rectangle.NO_BORDER);
        cell2.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell2.addElement(new Paragraph("Signature de l'Administration", signTitleFont));
        cell2.addElement(new Paragraph("\n\n_______________________", signLineFont));
        footer.addCell(cell2);

        document.add(footer);
    }
}
