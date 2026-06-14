package group3.en.stuattendance.Attendancemanager.ServiceImpl;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.util.CellRangeAddress;

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
        
        // Group sessions by Course
        Map<Course, List<Session>> courseSessionsMap = new LinkedHashMap<>();
        sessions.sort(Comparator.comparing(Session::getDate).thenComparing(Session::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())));
        for (Session s : sessions) {
            Course c = s.getCourse() != null ? s.getCourse() : new Course();
            courseSessionsMap.computeIfAbsent(c, k -> new ArrayList<>()).add(s);
        }

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Absences Hebdo");

            org.apache.poi.ss.usermodel.Font boldFont = workbook.createFont();
            boldFont.setBold(true);

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(boldFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle centerStyle = workbook.createCellStyle();
            centerStyle.setAlignment(HorizontalAlignment.CENTER);
            centerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            centerStyle.setBorderTop(BorderStyle.THIN);
            centerStyle.setBorderBottom(BorderStyle.THIN);
            centerStyle.setBorderLeft(BorderStyle.THIN);
            centerStyle.setBorderRight(BorderStyle.THIN);
            
            CellStyle boldCenterStyle = workbook.createCellStyle();
            boldCenterStyle.cloneStyleFrom(centerStyle);
            boldCenterStyle.setFont(boldFont);

            // Calculate total columns
            int totalCols = 3; // N°, NOMS, MATRICULE
            for (List<Session> cSessions : courseSessionsMap.values()) {
                totalCols += cSessions.size() + 2; // sessions + Total UE + Justified UE
            }
            totalCols += 4; // Total H, Total J, Total NJ, Lates
            
            // Document Headers
            Row instRow = sheet.createRow(0);
            Cell instCell = instRow.createCell(0);
            instCell.setCellValue("UNIVERSITE SAINT JEAN\nSaint Jean Ingénieur");
            instCell.setCellStyle(boldCenterStyle);
            
            Cell titleCell = instRow.createCell(3);
            titleCell.setCellValue("FICHE D'ABSENCES HEBDOMADAIRE");
            titleCell.setCellStyle(boldCenterStyle);
            
            Cell repCell = instRow.createCell(totalCols > 6 ? totalCols - 3 : 4);
            repCell.setCellValue("REPUBLIQUE DU CAMEROUN\nArchidiocèse d'Obala");
            repCell.setCellStyle(centerStyle);
            
            // Subtitle
            Row subRow = sheet.createRow(1);
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            subRow.createCell(0).setCellValue("ANNEE ACADEMIQUE 2024-2025");
            Cell subTitleCell = subRow.createCell(3);
            subTitleCell.setCellValue("ABSENCE RETARDS " + classroom.getName() + " Semaine du " + monday.format(fmt) + " au " + saturday.format(fmt));
            subTitleCell.setCellStyle(boldCenterStyle);
            subRow.createCell(totalCols > 6 ? totalCols - 3 : 4).setCellValue("SEMESTRE 1");
            
            if (students.isEmpty() || sessions.isEmpty()) {
                sheet.createRow(4).createCell(0).setCellValue(students.isEmpty() ? "Aucun étudiant." : "Aucune séance planifiée.");
                workbook.write(out);
                return new ByteArrayInputStream(out.toByteArray());
            }

            // Headers - Row 1
            int headerRowIdx = 3;
            Row headerRow1 = sheet.createRow(headerRowIdx);
            Row headerRow2 = sheet.createRow(headerRowIdx + 1);
            
            // Frozen Panes
            sheet.createFreezePane(3, headerRowIdx + 2);

            String[] fixedHeaders = {"N°", "NOMS ET PRENOMS", "MATRICULE"};
            for (int i = 0; i < 3; i++) {
                Cell c = headerRow1.createCell(i);
                c.setCellValue(fixedHeaders[i]);
                c.setCellStyle(headerStyle);
                headerRow2.createCell(i).setCellStyle(headerStyle);
                sheet.addMergedRegion(new CellRangeAddress(headerRowIdx, headerRowIdx + 1, i, i));
            }

            int colIdx = 3;
            for (Map.Entry<Course, List<Session>> entry : courseSessionsMap.entrySet()) {
                Course course = entry.getKey();
                List<Session> cSessions = entry.getValue();
                
                String courseName = course.getCode() != null ? course.getCode() + " " + nvl(course.getCourseName()) : "N/A";
                
                Cell cHeader = headerRow1.createCell(colIdx);
                cHeader.setCellValue(courseName);
                cHeader.setCellStyle(headerStyle);
                
                // Merge course header
                int endCol = colIdx + cSessions.size() + 1;
                sheet.addMergedRegion(new CellRangeAddress(headerRowIdx, headerRowIdx, colIdx, endCol));
                
                for (Session s : cSessions) {
                    String day = s.getDate().getDayOfWeek().toString().substring(0, 3);
                    Cell dCell = headerRow2.createCell(colIdx);
                    dCell.setCellValue(day);
                    dCell.setCellStyle(headerStyle);
                    
                    // Fill row 1 cell to avoid border missing
                    headerRow1.createCell(colIdx).setCellStyle(headerStyle);
                    colIdx++;
                }
                
                Cell tUeCell = headerRow2.createCell(colIdx);
                tUeCell.setCellValue("Total Heure UE");
                tUeCell.setCellStyle(headerStyle);
                headerRow1.createCell(colIdx).setCellStyle(headerStyle);
                colIdx++;
                
                Cell jUeCell = headerRow2.createCell(colIdx);
                jUeCell.setCellValue("Heures Justifiée");
                jUeCell.setCellStyle(headerStyle);
                headerRow1.createCell(colIdx).setCellStyle(headerStyle);
                colIdx++;
            }
            
            String[] summaryHeaders = {"Total H.", "Total J.", "Total NJ.", "Nbre de RETARDS HEBDO"};
            for (String sh : summaryHeaders) {
                Cell c = headerRow1.createCell(colIdx);
                c.setCellValue(sh);
                c.setCellStyle(headerStyle);
                headerRow2.createCell(colIdx).setCellStyle(headerStyle);
                sheet.addMergedRegion(new CellRangeAddress(headerRowIdx, headerRowIdx + 1, colIdx, colIdx));
                colIdx++;
            }

            // Data Rows
            int rowIdx = headerRowIdx + 2;
            int studentIndex = 1;
            
            // For footer sums
            int[] sessionSums = new int[totalCols];
            
            for (User student : students) {
                Row row = sheet.createRow(rowIdx++);
                
                Cell cNo = row.createCell(0);
                cNo.setCellValue(studentIndex++);
                cNo.setCellStyle(centerStyle);
                
                String fullName = (student.getLastName() != null ? student.getLastName().toUpperCase() : "") + " " + 
                                  (student.getFirstName() != null ? student.getFirstName() : "");
                Cell cName = row.createCell(1);
                cName.setCellValue(fullName.trim());
                cName.setCellStyle(centerStyle);
                
                Cell cMat = row.createCell(2);
                cMat.setCellValue(nvl(student.getMatricule()));
                cMat.setCellStyle(centerStyle);

                int globalAbs = 0;
                int globalJust = 0;
                int lates = 0;
                
                colIdx = 3;
                for (Map.Entry<Course, List<Session>> entry : courseSessionsMap.entrySet()) {
                    List<Session> cSessions = entry.getValue();
                    
                    int ueAbs = 0;
                    int ueJust = 0;
                    
                    for (Session s : cSessions) {
                        Map<Integer, AttendanceRecord> byUser = attendanceMap.getOrDefault(s.getSessionId(), Collections.emptyMap());
                        AttendanceRecord rec = byUser.get(student.getUserId());
                        
                        Cell sCell = row.createCell(colIdx);
                        sCell.setCellStyle(centerStyle);
                        
                        int dur = sessionDuration(s);
                        if (rec != null) {
                            if (rec.getStatus() == AttendanceStatus.ABSENT) {
                                sCell.setCellValue(dur);
                                ueAbs += dur;
                                sessionSums[colIdx] += dur;
                            } else if (rec.getStatus() == AttendanceStatus.EXCUSED) {
                                sCell.setCellValue(dur);
                                ueAbs += dur;
                                ueJust += dur;
                                sessionSums[colIdx] += dur;
                            } else if (rec.getStatus() == AttendanceStatus.LATE) {
                                lates++;
                            }
                        }
                        colIdx++;
                    }
                    
                    globalAbs += ueAbs;
                    globalJust += ueJust;
                    
                    Cell tUeCell = row.createCell(colIdx);
                    tUeCell.setCellStyle(boldCenterStyle);
                    if (ueAbs > 0) tUeCell.setCellValue(ueAbs);
                    sessionSums[colIdx] += ueAbs;
                    colIdx++;
                    
                    Cell jUeCell = row.createCell(colIdx);
                    jUeCell.setCellStyle(boldCenterStyle);
                    if (ueJust > 0) jUeCell.setCellValue(ueJust);
                    sessionSums[colIdx] += ueJust;
                    colIdx++;
                }
                
                int globalNj = globalAbs - globalJust;
                
                Cell tHCell = row.createCell(colIdx);
                tHCell.setCellStyle(boldCenterStyle);
                if (globalAbs > 0) tHCell.setCellValue(globalAbs);
                sessionSums[colIdx] += globalAbs;
                colIdx++;
                
                Cell tJCell = row.createCell(colIdx);
                tJCell.setCellStyle(boldCenterStyle);
                if (globalJust > 0) tJCell.setCellValue(globalJust);
                sessionSums[colIdx] += globalJust;
                colIdx++;
                
                Cell tNjCell = row.createCell(colIdx);
                tNjCell.setCellStyle(boldCenterStyle);
                if (globalNj > 0) tNjCell.setCellValue(globalNj);
                sessionSums[colIdx] += globalNj;
                colIdx++;
                
                Cell lateCell = row.createCell(colIdx);
                lateCell.setCellStyle(boldCenterStyle);
                if (lates > 0) lateCell.setCellValue(lates);
                sessionSums[colIdx] += lates;
                colIdx++;
            }
            
            // Footer Row
            Row footRow = sheet.createRow(rowIdx++);
            Cell fLabel = footRow.createCell(0);
            fLabel.setCellValue("TOTAL DES HEURES DE LA SEMAINE");
            fLabel.setCellStyle(headerStyle);
            footRow.createCell(1).setCellStyle(headerStyle);
            footRow.createCell(2).setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(rowIdx-1, rowIdx-1, 0, 2));
            
            for (int i = 3; i < totalCols; i++) {
                Cell c = footRow.createCell(i);
                c.setCellStyle(boldCenterStyle);
                if (sessionSums[i] > 0) c.setCellValue(sessionSums[i]);
            }
            
            // Disclaimer & Signature
            Row discRow = sheet.createRow(rowIdx + 2);
            Cell discCell = discRow.createCell(0);
            discCell.setCellValue("NB: Vous avez 3 jours pour toutes justifications, passé ce délai aucune requête ne sera acceptée.");
            
            Row sigRow = sheet.createRow(rowIdx + 4);
            Cell sigCell = sigRow.createCell(totalCols > 3 ? totalCols - 3 : 0);
            sigCell.setCellValue("Le Responsable Pédagogique ___________________________");

            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);
            sheet.autoSizeColumn(2);

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

        // Orientation Paysage A4 with narrow margins (10px all around)
        Document document = new Document(PageSize.A4.rotate(), 10, 10, 10, 10);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // En-tête du document
            addHeader(document, classroom, weekStart, weekEnd);

            if (students.isEmpty() || sessions.isEmpty()) {
                Paragraph msg = new Paragraph("Aucun étudiant ou aucune séance planifiée.", FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY));
                document.add(msg);
            } else {
                PdfPTable mainTable = buildAttendanceTable(students, sessions, attendanceMap, weekStart);
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

    private void addHeader(Document document, Classroom classroom, LocalDate weekStart, LocalDate weekEnd) throws DocumentException {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        PdfPTable header = new PdfPTable(3);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{33f, 34f, 33f});
        header.setSpacingAfter(10f);

        Font boldSmall = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, Color.BLACK);
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12f, Color.BLACK);

        // Top Row
        PdfPCell left1 = new PdfPCell(new Phrase("UNIVERSITE SAINT JEAN\nSaint Jean Ingénieur", boldSmall));
        left1.setBorder(Rectangle.NO_BORDER);
        header.addCell(left1);

        PdfPCell center1 = new PdfPCell(new Phrase("FICHE D'ABSENCES HEBDOMADAIRE", titleFont));
        center1.setBorder(Rectangle.NO_BORDER);
        center1.setHorizontalAlignment(Element.ALIGN_CENTER);
        header.addCell(center1);

        PdfPCell right1 = new PdfPCell(new Phrase("REPUBLIQUE DU CAMEROUN\nArchidiocèse d'Obala", boldSmall));
        right1.setBorder(Rectangle.NO_BORDER);
        right1.setHorizontalAlignment(Element.ALIGN_RIGHT);
        header.addCell(right1);

        // Bottom Row
        PdfPCell left2 = new PdfPCell(new Phrase("ANNEE ACADEMIQUE 2024-2025", boldSmall));
        left2.setBorder(Rectangle.NO_BORDER);
        header.addCell(left2);

        String subtitle = "ABSENCE RETARDS " + (classroom.getName() != null ? classroom.getName() : "") + " Semaine du " + weekStart.format(fmt) + " au " + weekEnd.format(fmt);
        PdfPCell center2 = new PdfPCell(new Phrase(subtitle, boldSmall));
        center2.setBorder(Rectangle.NO_BORDER);
        center2.setHorizontalAlignment(Element.ALIGN_CENTER);
        header.addCell(center2);

        PdfPCell right2 = new PdfPCell(new Phrase("SEMESTRE 1", boldSmall));
        right2.setBorder(Rectangle.NO_BORDER);
        right2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        header.addCell(right2);

        document.add(header);
    }

    private PdfPTable buildAttendanceTable(
            List<User> students, List<Session> sessions,
            Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap, LocalDate weekStart) throws DocumentException {

        // Group sessions by Course
        Map<Course, List<Session>> courseSessionsMap = new LinkedHashMap<>();
        sessions.sort(Comparator.comparing(Session::getDate).thenComparing(Session::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())));
        for (Session s : sessions) {
            Course c = s.getCourse() != null ? s.getCourse() : new Course();
            courseSessionsMap.computeIfAbsent(c, k -> new ArrayList<>()).add(s);
        }

        int totalCols = 3;
        for (List<Session> cSessions : courseSessionsMap.values()) {
            totalCols += cSessions.size() + 2;
        }
        totalCols += 4;

        PdfPTable table = new PdfPTable(totalCols);
        table.setWidthPercentage(100);
        table.setHeaderRows(2); // Repeat headers on new pages

        // Determine column widths
        float[] widths = new float[totalCols];
        widths[0] = 3f; // N°
        widths[1] = 15f; // NOMS
        widths[2] = 8f; // MATRICULE
        float remaining = 100f - 26f;
        float dataColWidth = remaining / (totalCols - 3);
        for (int i = 3; i < totalCols; i++) widths[i] = dataColWidth;
        table.setWidths(widths);

        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6f, Color.BLACK);
        Font dataFont = FontFactory.getFont(FontFactory.HELVETICA, 6f, Color.BLACK);
        Font boldDataFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6f, Color.BLACK);

        // Header Row 1
        table.addCell(createSpannedHeaderCell("N°", 2, 1, headerFont));
        table.addCell(createSpannedHeaderCell("NOMS ET PRENOMS", 2, 1, headerFont));
        table.addCell(createSpannedHeaderCell("MATRICULE", 2, 1, headerFont));

        for (Map.Entry<Course, List<Session>> entry : courseSessionsMap.entrySet()) {
            Course course = entry.getKey();
            int span = entry.getValue().size() + 2;
            String courseName = course.getCode() != null ? course.getCode() + " " + nvl(course.getCourseName()) : "N/A";
            table.addCell(createSpannedHeaderCell(courseName, 1, span, headerFont));
        }

        table.addCell(createSpannedHeaderCell("Total H.", 2, 1, headerFont));
        table.addCell(createSpannedHeaderCell("Total J.", 2, 1, headerFont));
        table.addCell(createSpannedHeaderCell("Total NJ.", 2, 1, headerFont));
        table.addCell(createSpannedHeaderCell("Nbre de RETARDS HEBDO", 2, 1, headerFont));

        // Header Row 2
        for (Map.Entry<Course, List<Session>> entry : courseSessionsMap.entrySet()) {
            for (Session s : entry.getValue()) {
                String day = s.getDate().getDayOfWeek().toString().substring(0, 3);
                table.addCell(createHeaderCell(day, headerFont));
            }
            table.addCell(createHeaderCell("Total Heure UE", headerFont));
            table.addCell(createHeaderCell("Heures Justifiée", headerFont));
        }

        int[] sessionSums = new int[totalCols];
        int studentIndex = 1;

        for (User student : students) {
            table.addCell(createDataCell(String.valueOf(studentIndex++), dataFont));
            String fullName = nvl(student.getLastName()).toUpperCase() + " " + nvl(student.getFirstName());
            table.addCell(createDataCellLeft(fullName.trim(), dataFont));
            table.addCell(createDataCell(nvl(student.getMatricule()), dataFont));

            int globalAbs = 0;
            int globalJust = 0;
            int lates = 0;

            int colIdx = 3;
            for (Map.Entry<Course, List<Session>> entry : courseSessionsMap.entrySet()) {
                int ueAbs = 0;
                int ueJust = 0;

                for (Session s : entry.getValue()) {
                    Map<Integer, AttendanceRecord> byUser = attendanceMap.getOrDefault(s.getSessionId(), Collections.emptyMap());
                    AttendanceRecord rec = byUser.get(student.getUserId());

                    String val = "";
                    int dur = sessionDuration(s);
                    if (rec != null) {
                        if (rec.getStatus() == AttendanceStatus.ABSENT) {
                            val = String.valueOf(dur);
                            ueAbs += dur;
                            sessionSums[colIdx] += dur;
                        } else if (rec.getStatus() == AttendanceStatus.EXCUSED) {
                            val = String.valueOf(dur);
                            ueAbs += dur;
                            ueJust += dur;
                            sessionSums[colIdx] += dur;
                        } else if (rec.getStatus() == AttendanceStatus.LATE) {
                            lates++;
                        }
                    }
                    table.addCell(createDataCell(val, dataFont));
                    colIdx++;
                }

                globalAbs += ueAbs;
                globalJust += ueJust;

                table.addCell(createDataCell(ueAbs > 0 ? String.valueOf(ueAbs) : "", boldDataFont));
                sessionSums[colIdx++] += ueAbs;
                
                table.addCell(createDataCell(ueJust > 0 ? String.valueOf(ueJust) : "", boldDataFont));
                sessionSums[colIdx++] += ueJust;
            }

            int globalNj = globalAbs - globalJust;

            table.addCell(createDataCell(globalAbs > 0 ? String.valueOf(globalAbs) : "", boldDataFont));
            sessionSums[colIdx++] += globalAbs;

            table.addCell(createDataCell(globalJust > 0 ? String.valueOf(globalJust) : "", boldDataFont));
            sessionSums[colIdx++] += globalJust;

            table.addCell(createDataCell(globalNj > 0 ? String.valueOf(globalNj) : "", boldDataFont));
            sessionSums[colIdx++] += globalNj;

            table.addCell(createDataCell(lates > 0 ? String.valueOf(lates) : "", boldDataFont));
            sessionSums[colIdx++] += lates;
        }

        // Footer Row
        PdfPCell footerLabel = createSpannedHeaderCell("TOTAL DES HEURES DE LA SEMAINE", 1, 3, boldDataFont);
        footerLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(footerLabel);

        for (int i = 3; i < totalCols; i++) {
            table.addCell(createDataCell(sessionSums[i] > 0 ? String.valueOf(sessionSums[i]) : "", boldDataFont));
        }

        return table;
    }

    private void addFooter(Document document) throws DocumentException {
        Font noteFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8f, Color.BLACK);
        Paragraph note = new Paragraph("\nNB: Vous avez 3 jours pour toutes justifications, passé ce délai aucune requête ne sera acceptée.", noteFont);
        document.add(note);

        Font signFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10f, Color.BLACK);
        Paragraph sign = new Paragraph("\n\nLe Responsable Pédagogique ___________________________", signFont);
        sign.setAlignment(Element.ALIGN_RIGHT);
        document.add(sign);
    }

    private PdfPCell createSpannedHeaderCell(String text, int rowspan, int colspan, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        if (rowspan > 1) cell.setRowspan(rowspan);
        if (colspan > 1) cell.setColspan(colspan);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(3f);
        return cell;
    }

    private PdfPCell createHeaderCell(String text, Font font) {
        return createSpannedHeaderCell(text, 1, 1, font);
    }

    private PdfPCell createDataCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(3f);
        return cell;
    }

    private PdfPCell createDataCellLeft(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(3f);
        return cell;
    }

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