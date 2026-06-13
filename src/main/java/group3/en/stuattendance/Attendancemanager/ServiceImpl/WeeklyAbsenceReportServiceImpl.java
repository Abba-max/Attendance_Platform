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
import group3.en.stuattendance.Attendancemanager.Service.WeeklyAbsenceReportService;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Timetablemanager.Model.Course;
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
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WeeklyAbsenceReportServiceImpl implements WeeklyAbsenceReportService {

    private final ClassroomRepository classroomRepository;
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;

    // ===================== COULEURS =====================
    private static final Color COLOR_PRESENT        = new Color(76, 175, 80);      // Vert
    private static final Color COLOR_ABSENT         = new Color(229, 57, 53);       // Rouge
    private static final Color COLOR_EXCUSED        = new Color(255, 193, 7);       // Jaune
    private static final Color COLOR_HEADER_BG      = new Color(44,  62,  80);      // Navy (Soft dark gray-blue)
    private static final Color COLOR_DAY_LABEL_BG   = new Color(226, 232, 240);     // Slate-200
    private static final Color COLOR_TOTAL_ROW_BG   = new Color(241, 245, 249);     // Slate-100
    private static final Color COLOR_COURSE_BG      = new Color(63,  81, 181);      // Muted Indigo
    private static final Color COLOR_SUMMARY_BG     = new Color(248, 250, 252);     // Slate-50
    private static final Color COLOR_BORDER         = new Color(203, 213, 225);     // Slate-300
    private static final Color COLOR_ABSENT_LIGHT   = new Color(254, 226, 226);     // Red-100
    private static final Color COLOR_PRESENT_LIGHT  = new Color(220, 252, 231);     // Green-100
    private static final Color COLOR_GRANDTOTAL_BG  = new Color(224, 242, 254);     // Sky-100

    // Jours en français
    private static final String[] FRENCH_DAYS = {"Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"};

    @Override
    public ByteArrayInputStream generateWeeklyReport(Integer classroomId, LocalDate weekStart) {
        // S'assurer que weekStart est bien un Lundi
        LocalDate monday  = weekStart.with(DayOfWeek.MONDAY);
        LocalDate saturday = monday.plusDays(5);

        // 1. Récupérer la classe
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new EntityNotFoundException("Classe introuvable : " + classroomId));

        // 2. Récupérer les étudiants triés par nom
        List<User> students = userRepository
                .findByClassroomClassIdAndRolesName(classroomId, "STUDENT")
                .stream()
                .sorted(Comparator
                        .comparing(u -> (u.getLastName() != null ? u.getLastName() : ""),
                                Comparator.nullsLast(String::compareToIgnoreCase)))
                .collect(Collectors.toList());

        // 3. Récupérer les séances de la semaine pour cette classe
        List<Session> sessions = sessionRepository
                .findByClassroomClassIdAndDateBetween(classroomId, monday, saturday);

        // 4. Récupérer les enregistrements d'assiduité avec les créneaux horaires
        List<Integer> sessionIds = sessions.stream()
                .map(Session::getSessionId)
                .collect(Collectors.toList());

        List<AttendanceRecord> allRecords = sessionIds.isEmpty()
                ? Collections.emptyList()
                : attendanceRecordRepository.findWithHourSlotsBySessionIds(sessionIds);

        // 5. Construire la map : sessionId -> userId -> AttendanceRecord
        Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap = new HashMap<>();
        for (AttendanceRecord rec : allRecords) {
            attendanceMap
                    .computeIfAbsent(rec.getSession().getSessionId(), k -> new HashMap<>())
                    .put(rec.getUser().getUserId(), rec);
        }

        // 6. Générer le PDF
        return buildPdf(classroom, students, sessions, attendanceMap, monday, saturday);
    }

    @Override
    public ByteArrayInputStream generateWeeklyReportExcel(Integer classroomId, LocalDate weekStart) {
        LocalDate monday  = weekStart.with(DayOfWeek.MONDAY);
        LocalDate saturday = monday.plusDays(5);

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
                .findByClassroomClassIdAndDateBetween(classroomId, monday, saturday);

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

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Absences Hebdo");

            org.apache.poi.ss.usermodel.Font boldFont = workbook.createFont();
            boldFont.setBold(true);

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(boldFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setFillForegroundColor(IndexedColors.PALE_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle centerStyle = workbook.createCellStyle();
            centerStyle.setAlignment(HorizontalAlignment.CENTER);

            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            titleCell.setCellValue("FICHE HEBDOMADAIRE - " + classroom.getName() + " - Du " + monday.format(fmt) + " au " + saturday.format(fmt));
            titleCell.setCellStyle(headerStyle);

            if (students.isEmpty() || sessions.isEmpty()) {
                sheet.createRow(2).createCell(0).setCellValue(students.isEmpty() ? "Aucun étudiant." : "Aucune séance planifiée.");
                workbook.write(out);
                return new ByteArrayInputStream(out.toByteArray());
            }

            // Headers
            Row headerRow = sheet.createRow(2);
            headerRow.createCell(0).setCellValue("NOMS ET PRÉNOMS");
            headerRow.getCell(0).setCellStyle(headerStyle);

            sessions.sort(Comparator.comparing(Session::getDate).thenComparing(Session::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())));

            DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
            int colIdx = 1;
            for (Session s : sessions) {
                String courseName = s.getCourse() != null ? s.getCourse().getCode() : "N/A";
                String time = (s.getStartTime() != null ? s.getStartTime().format(timeFmt) : "");
                String day = s.getDate().getDayOfWeek().toString().substring(0, 3);
                Cell c = headerRow.createCell(colIdx++);
                c.setCellValue(day + " " + s.getDate().format(DateTimeFormatter.ofPattern("dd/MM")) + "\n" + courseName + " " + time);
                c.setCellStyle(headerStyle);
            }

            // Data Rows
            int rowIdx = 3;
            for (User student : students) {
                Row row = sheet.createRow(rowIdx++);
                
                String fullName = (student.getLastName() != null ? student.getLastName().toUpperCase() : "") + " " + 
                                  (student.getFirstName() != null ? student.getFirstName() : "");
                row.createCell(0).setCellValue(fullName.trim());

                colIdx = 1;
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

            sheet.autoSizeColumn(0);
            for (int i = 1; i <= sessions.size(); i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Erreur génération Excel : " + e.getMessage(), e);
        }
    }

    // =====================================================================
    //  GÉNÉRATION PDF
    // =====================================================================

    private ByteArrayInputStream buildPdf(
            Classroom classroom,
            List<User> students,
            List<Session> sessions,
            Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap,
            LocalDate weekStart,
            LocalDate weekEnd) {

        // Orientation Paysage A4 avec petites marges
        Document document = new Document(PageSize.A4.rotate(), 12, 12, 22, 18);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // En-tête du document
            addHeader(document, classroom, weekStart, weekEnd);

            // Tableau principal
            if (students.isEmpty() || sessions.isEmpty()) {
                Paragraph msg = new Paragraph(
                        "Aucun étudiant ou aucune séance planifiée pour cette semaine.",
                        FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY));
                msg.setAlignment(Element.ALIGN_CENTER);
                msg.setSpacingBefore(20);
                document.add(msg);
            } else {
                PdfPTable mainTable = buildAttendanceTable(
                        students, sessions, attendanceMap, weekStart);
                document.add(mainTable);
            }

            // Pied de page
            addFooter(document);

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Erreur génération fiche hebdomadaire PDF : " + e.getMessage(), e);
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    // =====================================================================
    //  EN-TÊTE DU DOCUMENT
    // =====================================================================

    private void addHeader(Document document, Classroom classroom,
                           LocalDate weekStart, LocalDate weekEnd) throws DocumentException {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.FRENCH);

        PdfPTable header = new PdfPTable(3);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{28f, 44f, 28f});
        header.setSpacingAfter(6f);

        // --- Colonne gauche : Université ---
        Font boldSmall  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, Color.BLACK);
        Font tinyGray   = FontFactory.getFont(FontFactory.HELVETICA, 6.5f, Color.DARK_GRAY);
        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.setPaddingLeft(4);
        Paragraph leftContent = new Paragraph();
        leftContent.add(new Chunk("UNIVERSITE SAINT JEAN\n", boldSmall));
        leftContent.add(new Chunk("Saint Jean Ingénieur\n", tinyGray));
        leftContent.add(new Chunk("REPUBLIQUE DU CAMEROUN\n", tinyGray));
        leftContent.add(new Chunk("Archidiocèse d'Obala", tinyGray));
        leftCell.addElement(leftContent);
        header.addCell(leftCell);

        // --- Colonne centrale : Titre ---
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11f, COLOR_HEADER_BG);
        Font weekFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, Color.BLACK);
        PdfPCell centerCell = new PdfPCell();
        centerCell.setBorder(Rectangle.NO_BORDER);
        centerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        Paragraph centerContent = new Paragraph();
        centerContent.setAlignment(Element.ALIGN_CENTER);
        centerContent.add(new Chunk("FICHE D'ABSENCES HEBDOMADAIRE\n", titleFont));
        centerContent.add(new Chunk("SEMAINE DU " + weekStart.format(fmt).toUpperCase()
                + " AU " + weekEnd.format(fmt).toUpperCase(), weekFont));
        centerCell.addElement(centerContent);
        header.addCell(centerCell);

        // --- Colonne droite : Classe ---
        Font classFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9f, COLOR_HEADER_BG);
        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        rightCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        rightCell.setPaddingRight(4);
        Paragraph classContent = new Paragraph(
                classroom.getName() != null ? classroom.getName() : "", classFont);
        classContent.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(classContent);
        header.addCell(rightCell);

        document.add(header);

        // Ligne de séparation bleue marine
        PdfPTable sep = new PdfPTable(1);
        sep.setWidthPercentage(100);
        sep.setSpacingAfter(4f);
        PdfPCell sepCell = new PdfPCell();
        sepCell.setFixedHeight(2.5f);
        sepCell.setBackgroundColor(COLOR_HEADER_BG);
        sepCell.setBorder(Rectangle.NO_BORDER);
        sep.addCell(sepCell);
        document.add(sep);
    }

    // =====================================================================
    //  TABLEAU PRINCIPAL D'ASSIDUITÉ
    // =====================================================================

    private PdfPTable buildAttendanceTable(
            List<User> students,
            List<Session> sessions,
            Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap,
            LocalDate weekStart) throws DocumentException {

        sessions.sort(Comparator.comparing(Session::getDate).thenComparing(Session::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())));

        int totalCols = 2 + sessions.size();
        PdfPTable table = new PdfPTable(totalCols);
        table.setWidthPercentage(100);
        table.setKeepTogether(false);

        float[] widths = new float[totalCols];
        widths[0] = 3f; // N°
        widths[1] = 23f; // NOMS ET PRÉNOMS
        float sessionWidth = sessions.isEmpty() ? 74f : (74f / sessions.size());
        for (int i = 2; i < totalCols; i++) widths[i] = sessionWidth;
        table.setWidths(widths);

        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM");
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6f, Color.WHITE);

        // N°
        PdfPCell cellNo = new PdfPCell(new Phrase("N°", headerFont));
        cellNo.setBackgroundColor(COLOR_HEADER_BG);
        cellNo.setHorizontalAlignment(Element.ALIGN_CENTER);
        cellNo.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cellNo.setFixedHeight(26f);
        applyBorder(cellNo);
        table.addCell(cellNo);

        // NOMS ET PRÉNOMS
        PdfPCell cellName = new PdfPCell(new Phrase("NOMS ET PRÉNOMS", headerFont));
        cellName.setBackgroundColor(COLOR_HEADER_BG);
        cellName.setHorizontalAlignment(Element.ALIGN_CENTER);
        cellName.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cellName.setFixedHeight(26f);
        applyBorder(cellName);
        table.addCell(cellName);

        // Session Headers
        for (Session s : sessions) {
            String courseName = s.getCourse() != null ? shorten(s.getCourse().getCode(), 12) : "N/A";
            String time = (s.getStartTime() != null ? s.getStartTime().format(timeFmt) : "");
            int dayIndex = s.getDate().getDayOfWeek().getValue() - 1;
            String dayLabel = (dayIndex >= 0 && dayIndex < 6) ? FRENCH_DAYS[dayIndex] : s.getDate().getDayOfWeek().toString().substring(0, 3);
            String label = courseName + "\n" + dayLabel + " " + s.getDate().format(dateFmt) + "\n" + time;
            
            PdfPCell cellDay = new PdfPCell(new Phrase(label, headerFont));
            cellDay.setBackgroundColor(COLOR_HEADER_BG);
            cellDay.setHorizontalAlignment(Element.ALIGN_CENTER);
            cellDay.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cellDay.setFixedHeight(26f);
            applyBorder(cellDay);
            table.addCell(cellDay);
        }

        Font nameFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6f, Color.BLACK);
        Font dataFont = FontFactory.getFont(FontFactory.HELVETICA, 6f, Color.DARK_GRAY);
        Font presentFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6f, Color.WHITE);

        int studentIndex = 1;
        for (User student : students) {
            // N°
            PdfPCell cellIdx = new PdfPCell(new Phrase(String.valueOf(studentIndex++), dataFont));
            cellIdx.setBackgroundColor(Color.WHITE);
            cellIdx.setHorizontalAlignment(Element.ALIGN_CENTER);
            cellIdx.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cellIdx.setFixedHeight(16f);
            applyBorder(cellIdx);
            table.addCell(cellIdx);

            // NOMS ET PRÉNOMS
            String fullName = nvl(student.getLastName()).toUpperCase() + " " + nvl(student.getFirstName());
            PdfPCell cellFullName = new PdfPCell(new Phrase(fullName.trim(), nameFont));
            cellFullName.setBackgroundColor(Color.WHITE);
            cellFullName.setHorizontalAlignment(Element.ALIGN_LEFT);
            cellFullName.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cellFullName.setFixedHeight(16f);
            applyBorder(cellFullName);
            table.addCell(cellFullName);

            // Sessions
            for (Session s : sessions) {
                Map<Integer, AttendanceRecord> byUser = attendanceMap.getOrDefault(s.getSessionId(), Collections.emptyMap());
                AttendanceRecord rec = byUser.get(student.getUserId());
                
                String text = "-";
                Color bg = Color.WHITE;
                Font f = dataFont;

                if (rec != null) {
                    if (rec.getStatus() == AttendanceStatus.PRESENT) {
                        text = "P";
                        bg = COLOR_PRESENT;
                        f = presentFont;
                    } else if (rec.getStatus() == AttendanceStatus.ABSENT) {
                        text = "A";
                        bg = COLOR_ABSENT;
                        f = presentFont;
                    } else if (rec.getStatus() == AttendanceStatus.EXCUSED) {
                        text = "J";
                        bg = COLOR_EXCUSED;
                        f = presentFont;
                    }
                }

                PdfPCell cell = new PdfPCell(new Phrase(text, f));
                cell.setBackgroundColor(bg);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cell.setFixedHeight(16f);
                applyBorder(cell);
                table.addCell(cell);
            }
        }

        return table;
    }

    // =====================================================================
    //  PIED DE PAGE
    // =====================================================================

    private void addFooter(Document document) throws DocumentException {
        Font signTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, Color.BLACK);
        Font signLineFont  = FontFactory.getFont(FontFactory.HELVETICA, 8f, Color.DARK_GRAY);

        PdfPTable footer = new PdfPTable(2);
        footer.setWidthPercentage(55);
        footer.setHorizontalAlignment(Element.ALIGN_RIGHT);
        footer.setSpacingBefore(8f);
        footer.setWidths(new float[]{50f, 50f});

        PdfPCell cell1 = new PdfPCell();
        cell1.setBorder(Rectangle.NO_BORDER);
        cell1.addElement(new Paragraph("Le Responsable Pédagogique", signTitleFont));
        cell1.addElement(new Paragraph("\n\n_______________________", signLineFont));
        footer.addCell(cell1);

        PdfPCell cell2 = new PdfPCell();
        cell2.setBorder(Rectangle.NO_BORDER);
        cell2.addElement(new Paragraph("Le Directeur", signTitleFont));
        cell2.addElement(new Paragraph("\n\n_______________________", signLineFont));
        footer.addCell(cell2);

        document.add(footer);
    }

    // =====================================================================
    //  MÉTHODES UTILITAIRES
    // =====================================================================

    /** Calcul de la durée d'une séance en heures entières. */
    private int sessionDuration(Session s) {
        if (s.getStartTime() != null && s.getEndTime() != null) {
            long h = ChronoUnit.HOURS.between(s.getStartTime(), s.getEndTime());
            return h > 0 ? (int) h : 1;
        }
        return 1;
    }

    // =====================================================================
    private void applyBorder(PdfPCell cell) {
        cell.setBorderColor(COLOR_BORDER);
        cell.setBorderWidth(0.3f);
    }

    /** Raccourcit un texte si trop long. */
    private String shorten(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max - 2) + "..";
    }

    /** Remplace null par une chaîne vide. */
    private String nvl(String s) {
        return s != null ? s : "";
    }
}