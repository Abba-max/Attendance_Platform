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

            // Fonts & Styles
            org.apache.poi.ss.usermodel.Font boldFont = workbook.createFont();
            boldFont.setBold(true);

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

            // Title Row
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.FRENCH);
            titleCell.setCellValue("FICHE D'APPEL - " + classroom.getName() + " - " + date.format(fmt).toUpperCase());
            titleCell.setCellStyle(headerStyle);

            if (students.isEmpty() || sessions.isEmpty()) {
                Row msgRow = sheet.createRow(2);
                msgRow.createCell(0).setCellValue(students.isEmpty() ? "Aucun étudiant." : "Aucune séance planifiée.");
                workbook.write(out);
                return new ByteArrayInputStream(out.toByteArray());
            }

            // Headers
            Row headerRow = sheet.createRow(2);
            headerRow.setHeightInPoints(40f);
            headerRow.createCell(0).setCellValue("N°");
            headerRow.getCell(0).setCellStyle(headerStyle);
            headerRow.createCell(1).setCellValue("NOMS ET PRÉNOMS");
            headerRow.getCell(1).setCellStyle(headerStyle);

            DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
            int colIdx = 2;
            for (Session s : sessions) {
                String courseName = s.getCourse() != null ? s.getCourse().getCode() : "N/A";
                String time = (s.getStartTime() != null ? s.getStartTime().format(timeFmt) : "") + " - " + 
                              (s.getEndTime() != null ? s.getEndTime().format(timeFmt) : "");
                Cell c = headerRow.createCell(colIdx++);
                c.setCellValue(courseName + "\n" + time);
                c.setCellStyle(headerStyle);
            }

            // Data Rows
            int rowIdx = 3;
            int index = 1;
            for (User student : students) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(30f);
                
                Cell nCell = row.createCell(0);
                nCell.setCellValue(index++);
                nCell.setCellStyle(centerStyle);

                String fullName = (student.getLastName() != null ? student.getLastName().toUpperCase() : "") + " " + 
                                  (student.getFirstName() != null ? student.getFirstName() : "");
                Cell nameCell = row.createCell(1);
                nameCell.setCellValue(fullName.trim());
                nameCell.setCellStyle(leftStyle);

                colIdx = 2;
                for (Session s : sessions) {
                    Map<Integer, AttendanceRecord> byUser = attendanceMap.getOrDefault(s.getSessionId(), Collections.emptyMap());
                    AttendanceRecord rec = byUser.get(student.getUserId());
                    
                    Cell sCell = row.createCell(colIdx++);
                    sCell.setCellStyle(centerStyle);
                    
                    if (rec == null) {
                        sCell.setCellValue("-");
                    } else if (rec.getStatus() == AttendanceStatus.PRESENT) {
                        sCell.setCellValue("P");
                    } else if (rec.getStatus() == AttendanceStatus.ABSENT) {
                        sCell.setCellValue("A");
                    } else if (rec.getStatus() == AttendanceStatus.EXCUSED) {
                        sCell.setCellValue("J");
                    }
                }
            }

            // Auto-size columns
            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);
            for (int i = 2; i < 2 + sessions.size(); i++) {
                sheet.autoSizeColumn(i);
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
            } else if (sessions.isEmpty()) {
                Paragraph msg = new Paragraph("Aucune séance planifiée pour cette date.", FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY));
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
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.FRENCH);

        PdfPTable header = new PdfPTable(3);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{30f, 40f, 30f});
        header.setSpacingAfter(15f);

        Font boldSmall = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, Color.BLACK);
        Font tinyGray = FontFactory.getFont(FontFactory.HELVETICA, 7f, Color.DARK_GRAY);
        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        Paragraph leftContent = new Paragraph();
        leftContent.add(new Chunk("UNIVERSITE SAINT JEAN\n", boldSmall));
        leftContent.add(new Chunk("Saint Jean Ingénieur\n", tinyGray));
        leftContent.add(new Chunk("REPUBLIQUE DU CAMEROUN", tinyGray));
        leftCell.addElement(leftContent);
        header.addCell(leftCell);

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12f, TEXT_DARK);
        Font dateFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10f, Color.BLACK);
        PdfPCell centerCell = new PdfPCell();
        centerCell.setBorder(Rectangle.NO_BORDER);
        centerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        Paragraph centerContent = new Paragraph();
        centerContent.setAlignment(Element.ALIGN_CENTER);
        centerContent.add(new Chunk("FICHE D'APPEL JOURNALIÈRE\n", titleFont));
        centerContent.add(new Chunk(date.format(fmt).toUpperCase(), dateFont));
        centerCell.addElement(centerContent);
        header.addCell(centerCell);

        Font classFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10f, TEXT_DARK);
        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        rightCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        Paragraph classContent = new Paragraph(classroom.getName() != null ? classroom.getName() : "", classFont);
        classContent.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(classContent);
        header.addCell(rightCell);

        document.add(header);
    }

    private PdfPTable buildCallSheetTable(List<User> students, List<Session> sessions, Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap) throws DocumentException {
        int totalCols = 2 + sessions.size();
        PdfPTable table = new PdfPTable(totalCols);
        table.setWidthPercentage(100);
        
        float[] widths = new float[totalCols];
        widths[0] = 5f; // N°
        widths[1] = 35f; // Nom
        float sessionWidth = 60f / sessions.size();
        for (int i = 2; i < totalCols; i++) widths[i] = sessionWidth;
        table.setWidths(widths);

        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, TEXT_LIGHT);
        
        PdfPCell nLabel = new PdfPCell(new Phrase("N°", headerFont));
        nLabel.setBackgroundColor(PRIMARY_INDIGO);
        nLabel.setBorderColor(BORDER_SLATE);
        nLabel.setHorizontalAlignment(Element.ALIGN_CENTER);
        nLabel.setVerticalAlignment(Element.ALIGN_MIDDLE);
        nLabel.setPadding(8f);
        table.addCell(nLabel);

        PdfPCell nameLabel = new PdfPCell(new Phrase("NOMS ET PRÉNOMS", headerFont));
        nameLabel.setBackgroundColor(PRIMARY_INDIGO);
        nameLabel.setBorderColor(BORDER_SLATE);
        nameLabel.setHorizontalAlignment(Element.ALIGN_CENTER);
        nameLabel.setVerticalAlignment(Element.ALIGN_MIDDLE);
        nameLabel.setPadding(8f);
        table.addCell(nameLabel);

        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        for (Session s : sessions) {
            String courseName = s.getCourse() != null ? s.getCourse().getCode() : "N/A";
            String time = (s.getStartTime() != null ? s.getStartTime().format(timeFmt) : "") + " - " + 
                          (s.getEndTime() != null ? s.getEndTime().format(timeFmt) : "");
            PdfPCell sLabel = new PdfPCell(new Phrase(courseName + "\n" + time, headerFont));
            sLabel.setBackgroundColor(PRIMARY_INDIGO);
            sLabel.setBorderColor(BORDER_SLATE);
            sLabel.setHorizontalAlignment(Element.ALIGN_CENTER);
            sLabel.setVerticalAlignment(Element.ALIGN_MIDDLE);
            sLabel.setPadding(8f);
            table.addCell(sLabel);
        }

        Font nameFont = FontFactory.getFont(FontFactory.HELVETICA, 8f, TEXT_DARK);
        Font noDataFont = FontFactory.getFont(FontFactory.HELVETICA, 8f, TEXT_MUTED);
        Font presentFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, COLOR_PRESENT);
        Font absentFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, COLOR_ABSENT);
        Font excusedFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, COLOR_EXCUSED);

        int index = 1;
        for (User student : students) {
            Color rowBg = (index % 2 == 0) ? MUTED_SLATE : TEXT_LIGHT;

            PdfPCell nCell = new PdfPCell(new Phrase(String.valueOf(index++), nameFont));
            nCell.setBackgroundColor(rowBg);
            nCell.setBorderColor(BORDER_SLATE);
            nCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            nCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            nCell.setPadding(8f);
            table.addCell(nCell);

            String fullName = (student.getLastName() != null ? student.getLastName().toUpperCase() : "") + " " + 
                              (student.getFirstName() != null ? student.getFirstName() : "");
            PdfPCell nameCell = new PdfPCell(new Phrase(fullName.trim(), nameFont));
            nameCell.setBackgroundColor(rowBg);
            nameCell.setBorderColor(BORDER_SLATE);
            nameCell.setHorizontalAlignment(Element.ALIGN_LEFT);
            nameCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            nameCell.setPaddingLeft(5f);
            nameCell.setPadding(8f);
            table.addCell(nameCell);

            for (Session s : sessions) {
                Map<Integer, AttendanceRecord> byUser = attendanceMap.getOrDefault(s.getSessionId(), Collections.emptyMap());
                AttendanceRecord rec = byUser.get(student.getUserId());
                
                PdfPCell sCell = new PdfPCell();
                sCell.setBackgroundColor(rowBg);
                sCell.setBorderColor(BORDER_SLATE);
                sCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                sCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                sCell.setPadding(8f);
                
                if (rec == null) {
                    sCell.setPhrase(new Phrase("-", noDataFont));
                } else if (rec.getStatus() == AttendanceStatus.PRESENT) {
                    sCell.setPhrase(new Phrase("P", presentFont));
                } else if (rec.getStatus() == AttendanceStatus.ABSENT) {
                    sCell.setPhrase(new Phrase("A", absentFont));
                } else if (rec.getStatus() == AttendanceStatus.EXCUSED) {
                    sCell.setPhrase(new Phrase("J", excusedFont));
                }
                
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
