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
import group3.en.stuattendance.Attendancemanager.Service.SemesterAbsenceReportService;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
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
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SemesterAbsenceReportServiceImpl implements SemesterAbsenceReportService {

    private final ClassroomRepository        classroomRepository;
    private final UserRepository             userRepository;
    private final CourseRepository           courseRepository;
    private final SessionRepository          sessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository academicYearRepository;

    // ──────────────── COULEURS ────────────────
    private static final Color NAVY        = new Color(44,  62,  80);   // Soft dark gray-blue
    private static final Color HEADER_BLUE = new Color(63,  81, 181);  // Muted Indigo
    private static final Color SUB_HDR     = new Color(226, 232, 240); // Slate-200
    private static final Color COL_ALT     = new Color(248, 250, 252); // Slate-50
    private static final Color RED_DARK    = new Color(198,  40,  40);
    private static final Color RED_LIGHT   = new Color(255, 205, 210);
    private static final Color GREEN_DARK  = new Color( 27,  94,  32);
    private static final Color GREEN_LIGHT = new Color(200, 230, 201);
    private static final Color YELLOW_BG   = new Color(255, 249, 196);
    private static final Color TOTAL_BG    = new Color(207, 216, 220);
    private static final Color BORDER      = new Color(160, 174, 192);
    private static final Color WHITE       = Color.WHITE;

    private static final double SN_THRESHOLD_PCT = 10.0; // 10 %

    // ══════════════════════════════════════════════════
    //  POINT D'ENTRÉE
    // ══════════════════════════════════════════════════
    @Override
    public ByteArrayInputStream generateSemesterReport(Integer classroomId, Integer semester) {

        // 1. Classe
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Classe introuvable : " + classroomId));

        // 2. Étudiants triés par nom de famille
        List<User> students = userRepository
                .findByClassroomClassIdAndRolesName(classroomId, "STUDENT")
                .stream()
                .sorted(Comparator.comparing(
                        u -> nvl(u.getLastName()).toUpperCase(),
                        Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.toList());

        // 3. Dynamic cached fetch based on Timetable
        Long academicYearId = academicYearRepository.findActiveAcademicYear()
                .map(group3.en.stuattendance.Institutionmanager.Model.AcademicYear::getId).orElse(null);
        List<Course> courses = new ArrayList<>(courseRepository.findActualCoursesForClassroomAndSemester(classroomId, academicYearId, semester));
        courses.sort(Comparator.comparing(Course::getCode, Comparator.nullsLast(String::compareToIgnoreCase)));

        // 4. Séances de cette classe appartenant à ces cours
        List<Integer> courseIds = courses.stream()
                .map(Course::getCourseId)
                .collect(Collectors.toList());

        List<Session> allSessions = courseIds.isEmpty()
                ? Collections.emptyList()
                : sessionRepository.findByClassroomClassIdAndCourseIds(
                classroomId, courseIds);

        // 5. Plage de dates du semestre (pour l'en-tête)
        LocalDate periodStart = allSessions.stream()
                .map(Session::getDate).filter(Objects::nonNull)
                .min(Comparator.naturalOrder()).orElse(null);
        LocalDate periodEnd = allSessions.stream()
                .map(Session::getDate).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(null);

        // 6. Map : sessionId → userId → AttendanceRecord
        List<Integer> sessionIds = allSessions.stream()
                .map(Session::getSessionId)
                .collect(Collectors.toList());

        List<AttendanceRecord> allRecords = sessionIds.isEmpty()
                ? Collections.emptyList()
                : attendanceRecordRepository
                .findWithHourSlotsBySessionIds(sessionIds);

        Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap = new HashMap<>();
        for (AttendanceRecord rec : allRecords) {
            attendanceMap
                    .computeIfAbsent(rec.getSession().getSessionId(), k -> new HashMap<>())
                    .put(rec.getUser().getUserId(), rec);
        }

        // 7. Map : courseId → liste des séances
        Map<Integer, List<Session>> sessionsByCourse = new HashMap<>();
        for (Session s : allSessions) {
            if (s.getCourse() != null) {
                sessionsByCourse
                        .computeIfAbsent(s.getCourse().getCourseId(),
                                k -> new ArrayList<>())
                        .add(s);
            }
        }

        // 8. Génération PDF
        return buildPdf(classroom, semester, students, courses,
                sessionsByCourse, attendanceMap, periodStart, periodEnd);
    }

    @Override
    public ByteArrayInputStream generateSemesterReportExcel(Integer classroomId, Integer semester) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new EntityNotFoundException("Classe introuvable : " + classroomId));

        List<User> students = userRepository
                .findByClassroomClassIdAndRolesName(classroomId, "STUDENT")
                .stream()
                .sorted(Comparator.comparing(u -> nvl(u.getLastName()).toUpperCase(), Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.toList());

        Long academicYearId = academicYearRepository.findActiveAcademicYear()
                .map(group3.en.stuattendance.Institutionmanager.Model.AcademicYear::getId).orElse(null);
        List<Course> courses = new ArrayList<>(courseRepository.findActualCoursesForClassroomAndSemester(classroomId, academicYearId, semester));
        courses.sort(Comparator.comparing(Course::getCode, Comparator.nullsLast(String::compareToIgnoreCase)));

        List<Integer> courseIds = courses.stream().map(Course::getCourseId).collect(Collectors.toList());
        List<Session> allSessions = courseIds.isEmpty() ? Collections.emptyList() : sessionRepository.findByClassroomClassIdAndCourseIds(classroomId, courseIds);

        List<Integer> sessionIds = allSessions.stream().map(Session::getSessionId).collect(Collectors.toList());
        List<AttendanceRecord> allRecords = sessionIds.isEmpty() ? Collections.emptyList() : attendanceRecordRepository.findWithHourSlotsBySessionIds(sessionIds);

        Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap = new HashMap<>();
        for (AttendanceRecord rec : allRecords) {
            attendanceMap.computeIfAbsent(rec.getSession().getSessionId(), k -> new HashMap<>()).put(rec.getUser().getUserId(), rec);
        }

        Map<Integer, List<Session>> sessionsByCourse = new HashMap<>();
        for (Session s : allSessions) {
            if (s.getCourse() != null) {
                sessionsByCourse.computeIfAbsent(s.getCourse().getCourseId(), k -> new ArrayList<>()).add(s);
            }
        }

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Absences Semestre");

            org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);

            CellStyle titleStyle = workbook.createCellStyle();
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);

            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle subHeaderStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font subFont = workbook.createFont();
            subFont.setBold(true);
            subHeaderStyle.setFont(subFont);
            subHeaderStyle.setAlignment(HorizontalAlignment.CENTER);
            subHeaderStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
            subHeaderStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            subHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("RÉCAPITULATIF SEMESTRE " + semester + " - " + classroom.getName());
            titleCell.setCellStyle(titleStyle);

            if (students.isEmpty() || courses.isEmpty()) {
                sheet.createRow(2).createCell(0).setCellValue("Aucune donnée disponible.");
                workbook.write(out);
                return new ByteArrayInputStream(out.toByteArray());
            }

            // Headers - Row 2 (noms de cours)
            Row headerRow1 = sheet.createRow(2);
            headerRow1.createCell(0).setCellValue("NOMS ET PRÉNOMS");
            headerRow1.getCell(0).setCellStyle(headerStyle);
            headerRow1.createCell(1).setCellValue("GENRE");
            headerRow1.getCell(1).setCellStyle(headerStyle);
            headerRow1.createCell(2).setCellValue("MATRICULE");
            headerRow1.getCell(2).setCellStyle(headerStyle);

            int colIdx = 3;
            for (Course c : courses) {
                Cell cell = headerRow1.createCell(colIdx);
                cell.setCellValue(c.getCode() + " - " + c.getCourseName());
                cell.setCellStyle(headerStyle);
                colIdx += 7;
            }
            Cell totHeaderCell = headerRow1.createCell(colIdx);
            totHeaderCell.setCellValue("TOTAUX SEMESTRE");
            totHeaderCell.setCellStyle(headerStyle);

            // Headers - Row 3 (sous-colonnes)
            Row headerRow2 = sheet.createRow(3);
            headerRow2.createCell(0).setCellValue("");
            headerRow2.createCell(1).setCellValue("");
            headerRow2.createCell(2).setCellValue("");

            colIdx = 3;
            for (Course c : courses) {
                String[] subHeaders = {"TH", "HC", "%H", "SN", "JH", "NJ", "M"};
                for (String h : subHeaders) {
                    Cell subCell = headerRow2.createCell(colIdx++);
                    subCell.setCellValue(h);
                    subCell.setCellStyle(subHeaderStyle);
                }
            }
            String[] globalHeaders = {"T.TH", "T.HC", "T.%H", "T.JH", "T.NJ", "T.M"};
            for (String h : globalHeaders) {
                Cell subCell = headerRow2.createCell(colIdx++);
                subCell.setCellValue(h);
                subCell.setCellStyle(subHeaderStyle);
            }

            // Data Rows
            int rowIdx = 4;
            for (User student : students) {
                Row row = sheet.createRow(rowIdx++);
                String fullName = nvl(student.getLastName()).toUpperCase() + " " + nvl(student.getFirstName());
                row.createCell(0).setCellValue(fullName.trim());
                row.createCell(1).setCellValue(detectGenre(student));
                row.createCell(2).setCellValue(nvl(student.getMatricule()));

                colIdx = 3;
                int globalTH = 0;
                int globalHC = 0;
                int globalJH = 0;
                int globalNJ = 0;
                int globalM = 0;

                for (Course course : courses) {
                    List<Session> sessions = sessionsByCourse.getOrDefault(course.getCourseId(), Collections.emptyList());
                    int th = 0;
                    int jh = 0;
                    int nj = 0;

                    for (Session s : sessions) {
                        int dur = sessionDuration(s);
                        th += dur;

                        Map<Integer, AttendanceRecord> byUser = attendanceMap.getOrDefault(s.getSessionId(), Collections.emptyMap());
                        AttendanceRecord rec = byUser.get(student.getUserId());
                        if (rec != null) {
                            if (rec.getStatus() == AttendanceStatus.ABSENT) {
                                nj += dur;
                            } else if (rec.getStatus() == AttendanceStatus.EXCUSED) {
                                jh += dur;
                            }
                        }
                    }

                    int hc = th - jh - nj;
                    double pctH = th > 0 ? (hc * 100.0) / th : 100.0;
                    double absenceRate = th > 0 ? (nj * 100.0) / th : 0.0;
                    boolean sn = absenceRate > SN_THRESHOLD_PCT;

                    int seuil = (int) Math.floor(th * SN_THRESHOLD_PCT / 100.0);
                    int malus = nj > seuil ? -(nj - seuil) : 0;

                    globalTH += th;
                    globalHC += hc;
                    globalJH += jh;
                    globalNJ += nj;
                    globalM += malus;

                    row.createCell(colIdx++).setCellValue(th);
                    row.createCell(colIdx++).setCellValue(hc);
                    row.createCell(colIdx++).setCellValue(th > 0 ? String.format("%.0f%%", pctH) : "-");
                    row.createCell(colIdx++).setCellValue(sn ? "OUI" : "NON");
                    row.createCell(colIdx++).setCellValue(jh);
                    row.createCell(colIdx++).setCellValue(nj);
                    row.createCell(colIdx++).setCellValue(malus);
                }

                // Global totals cells
                row.createCell(colIdx++).setCellValue(globalTH);
                row.createCell(colIdx++).setCellValue(globalHC);
                double globalPctH = globalTH > 0 ? (globalHC * 100.0) / globalTH : 100.0;
                row.createCell(colIdx++).setCellValue(globalTH > 0 ? String.format("%.0f%%", globalPctH) : "-");
                row.createCell(colIdx++).setCellValue(globalJH);
                row.createCell(colIdx++).setCellValue(globalNJ);
                row.createCell(colIdx++).setCellValue(globalM);
            }

            // Autosize columns
            for (int i = 0; i < colIdx; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Erreur génération Excel : " + e.getMessage(), e);
        }
    }

    private String nvl(String s) {
        return s == null ? "" : s;
    }

    // ══════════════════════════════════════════════════
    //  CONSTRUCTION DU PDF
    // ══════════════════════════════════════════════════
    private ByteArrayInputStream buildPdf(
            Classroom classroom,
            Integer semester,
            List<User> students,
            List<Course> courses,
            Map<Integer, List<Session>> sessionsByCourse,
            Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap,
            LocalDate periodStart,
            LocalDate periodEnd) {

        // A3 paysage si beaucoup de cours
        Rectangle pageSize = (courses.size() > 6)
                ? new Rectangle(1190, 842)  // A3 landscape
                : PageSize.A4.rotate();     // A4 landscape

        Document doc = new Document(pageSize, 10, 10, 20, 15);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(doc, out);
            doc.open();

            addDocumentHeader(doc, classroom, semester, periodStart, periodEnd);

            if (students.isEmpty() || courses.isEmpty()) {
                Paragraph msg = new Paragraph(
                        "Aucune donnée disponible pour ce semestre.",
                        FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY));
                msg.setAlignment(Element.ALIGN_CENTER);
                msg.setSpacingBefore(30);
                doc.add(msg);
            } else {
                doc.add(buildMainTable(students, courses,
                        sessionsByCourse, attendanceMap));
            }

            addSignatureFooter(doc);
            doc.close();

        } catch (Exception e) {
            throw new RuntimeException(
                    "Erreur génération récapitulatif semestriel : "
                            + e.getMessage(), e);
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    // ══════════════════════════════════════════════════
    //  EN-TÊTE DU DOCUMENT
    // ══════════════════════════════════════════════════
    private void addDocumentHeader(Document doc, Classroom classroom,
                                   Integer semester,
                                   LocalDate periodStart,
                                   LocalDate periodEnd)
            throws DocumentException {

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        PdfPTable hdr = new PdfPTable(3);
        hdr.setWidthPercentage(100);
        hdr.setWidths(new float[]{30f, 40f, 30f});
        hdr.setSpacingAfter(5f);

        Font boldSm = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  7.5f, Color.BLACK);
        Font tinySm = FontFactory.getFont(FontFactory.HELVETICA,        6.5f, Color.DARK_GRAY);
        Font titleF = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  10f,  NAVY);
        Font subF   = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   8f,  Color.BLACK);
        Font rightF = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   8f,  NAVY);

        // Gauche
        PdfPCell left = new PdfPCell();
        left.setBorder(Rectangle.NO_BORDER);
        left.setPaddingLeft(4);
        Paragraph lp = new Paragraph();
        lp.add(new Chunk("UNIVERSITE SAINT JEAN\n", boldSm));
        lp.add(new Chunk("Saint Jean Ingénieur\n", tinySm));
        left.addElement(lp);
        hdr.addCell(left);

        // Centre
        String period = (periodStart != null && periodEnd != null)
                ? "Période du " + periodStart.format(fmt)
                + " au " + periodEnd.format(fmt)
                : "Semestre " + semester;
        PdfPCell center = new PdfPCell();
        center.setBorder(Rectangle.NO_BORDER);
        center.setHorizontalAlignment(Element.ALIGN_CENTER);
        Paragraph cp = new Paragraph();
        cp.setAlignment(Element.ALIGN_CENTER);
        cp.add(new Chunk("RECAPITULATIF DES ABSENCES\n", titleF));
        cp.add(new Chunk(period, subF));
        center.addElement(cp);
        hdr.addCell(center);

        // Droite
        PdfPCell right = new PdfPCell();
        right.setBorder(Rectangle.NO_BORDER);
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);
        right.setPaddingRight(4);
        Paragraph rp = new Paragraph();
        rp.setAlignment(Element.ALIGN_RIGHT);
        rp.add(new Chunk(nvl(classroom.getName()) + "\n", rightF));
        rp.add(new Chunk("REPUBLIQUE DU CAMEROUN\n", tinySm));
        rp.add(new Chunk("ARCHIDIOCESE D'OBALA",     tinySm));
        right.addElement(rp);
        hdr.addCell(right);

        doc.add(hdr);

        // Séparateur bleu marine
        PdfPTable sep = new PdfPTable(1);
        sep.setWidthPercentage(100);
        sep.setSpacingAfter(4f);
        PdfPCell sepCell = new PdfPCell();
        sepCell.setFixedHeight(2.5f);
        sepCell.setBackgroundColor(NAVY);
        sepCell.setBorder(Rectangle.NO_BORDER);
        sep.addCell(sepCell);
        doc.add(sep);
    }

    // ══════════════════════════════════════════════════
    //  TABLEAU PRINCIPAL
    // ══════════════════════════════════════════════════
    private PdfPTable buildMainTable(
            List<User> students,
            List<Course> courses,
            Map<Integer, List<Session>> sessionsByCourse,
            Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap)
            throws DocumentException {

        int C = courses.size();
        // colonnes : N° | NOMS | GENRE | MATRICULE | 7*C (TH|HC|%H|SN|JH|NJ|M) | T.TH | T.HC | T.%H | T.JH | T.NJ | T.M
        int totalCols = 4 + 7 * C + 6;

        PdfPTable table = new PdfPTable(totalCols);
        table.setWidthPercentage(100);
        table.setKeepTogether(false);

        // ── Largeurs relatives ──
        float nW   = 2.2f;
        float nmW  = 13f;
        float geW  = 3.5f;
        float maW  = 5.5f;
        float cW   = 2.2f;  // 7 sous-colonnes par cours
        float tW   = 2.5f;  // 6 colonnes de totaux

        float[] widths = new float[totalCols];
        widths[0] = nW;
        widths[1] = nmW;
        widths[2] = geW;
        widths[3] = maW;
        for (int i = 0; i < C * 7; i++) widths[4 + i] = cW;
        for (int i = 0; i < 6; i++) widths[4 + C * 7 + i] = tW;
        table.setWidths(widths);

        // ── Ligne 1 des en-têtes (noms des cours + TOTAUX SEMESTRE) ──
        addCourseHeaderRow1(table, courses, C);

        // ── Ligne 2 des en-têtes (TH | HC | %H | SN | JH | NJ | M) ──
        addCourseHeaderRow2(table, C);

        // ── Lignes de données ──
        int rowNum = 0;
        for (User student : students) {
            rowNum++;
            addStudentRow(table, rowNum, student, courses,
                    sessionsByCourse, attendanceMap, rowNum % 2 == 0);
        }

        return table;
    }

    // ── En-tête ligne 1 : noms des cours ──────────────────────────
    private void addCourseHeaderRow1(PdfPTable table,
                                     List<Course> courses, int C) {
        Font fixedF  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, Color.WHITE);
        Font courseF = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5f,   Color.WHITE);

        // Colonnes fixes (rowspan=2)
        table.addCell(makeHdrCell("N°",              fixedF, NAVY, 2, 1, true,  40f));
        table.addCell(makeHdrCell("NOMS ET PRÉNOMS", fixedF, NAVY, 2, 1, false, 40f));
        table.addCell(makeHdrCell("GENRE",           fixedF, NAVY, 2, 1, true,  40f));
        table.addCell(makeHdrCell("MATRICULE",       fixedF, NAVY, 2, 1, true,  40f));

        // Un bloc par cours (colspan=7)
        for (Course c : courses) {
            String label = c.getCode() + "\n" + shorten(c.getCourseName(), 20);
            PdfPCell cc = new PdfPCell(new Phrase(label, courseF));
            cc.setColspan(7);
            cc.setRowspan(1);
            cc.setBackgroundColor(HEADER_BLUE);
            cc.setHorizontalAlignment(Element.ALIGN_CENTER);
            cc.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cc.setPadding(4f);
            cc.setFixedHeight(45f);
            cc.setBorderColor(BORDER);
            cc.setBorderWidth(0.4f);
            table.addCell(cc);
        }

        // Totaux Semestre (colspan=6)
        PdfPCell totCell = new PdfPCell(new Phrase("TOTAUX SEMESTRE", fixedF));
        totCell.setColspan(6);
        totCell.setRowspan(1);
        totCell.setBackgroundColor(NAVY);
        totCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        totCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        totCell.setPadding(4f);
        totCell.setFixedHeight(45f);
        totCell.setBorderColor(BORDER);
        totCell.setBorderWidth(0.4f);
        table.addCell(totCell);
    }

    // Helper to shorten course name
    private String shorten(String s, int maxLen) {
        if (s == null) return "";
        return s.length() > maxLen ? s.substring(0, maxLen - 2) + ".." : s;
    }

    // ── En-tête ligne 2 : TH | HC | %H | SN | JH | NJ | M ──────────────
    private void addCourseHeaderRow2(PdfPTable table, int C) {
        Font subF = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5f, NAVY);

        for (int i = 0; i < C; i++) {
            for (String lbl : new String[]{"TH", "HC", "%H", "SN", "JH", "NJ", "M"}) {
                PdfPCell cell = new PdfPCell(new Phrase(lbl, subF));
                cell.setBackgroundColor(SUB_HDR);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cell.setPadding(3f);
                cell.setFixedHeight(18f);
                cell.setBorderColor(BORDER);
                cell.setBorderWidth(0.4f);
                table.addCell(cell);
            }
        }

        // Totaux sub-headers
        for (String lbl : new String[]{"T.TH", "T.HC", "T.%H", "T.JH", "T.NJ", "T.M"}) {
            PdfPCell cell = new PdfPCell(new Phrase(lbl, subF));
            cell.setBackgroundColor(SUB_HDR);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPadding(3f);
            cell.setFixedHeight(18f);
            cell.setBorderColor(BORDER);
            cell.setBorderWidth(0.4f);
            table.addCell(cell);
        }
    }

    // ── Ligne de données d'un étudiant ──────────────────────────────
    private void addStudentRow(PdfPTable table, int rowNum, User student,
                               List<Course> courses,
                               Map<Integer, List<Session>> sessionsByCourse,
                               Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap,
                               boolean alternate) {

        Color rowBg = alternate ? COL_ALT : WHITE;
        Font  dataF = FontFactory.getFont(FontFactory.HELVETICA,      5.5f, Color.BLACK);
        Font  boldF = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, Color.BLACK);
        float rowH  = 11f;

        // N°
        table.addCell(makeDataCell(String.valueOf(rowNum), dataF, rowBg, rowH, true));

        // Nom complet
        String fullName = (nvl(student.getLastName()).toUpperCase()
                + " " + nvl(student.getFirstName())).trim();
        table.addCell(makeDataCell(fullName, boldF, rowBg, rowH, false));

        // Genre
        table.addCell(makeDataCell(detectGenre(student), dataF, rowBg, rowH, true));

        // Matricule
        table.addCell(makeDataCell(nvl(student.getMatricule()), dataF, rowBg, rowH, true));

        // Totaux Semester Accumulators
        int globalTH = 0;
        int globalHC = 0;
        int globalJH = 0;
        int globalNJ = 0;
        int globalM = 0;

        for (Course course : courses) {
            List<Session> sessions = sessionsByCourse.getOrDefault(
                    course.getCourseId(), Collections.emptyList());

            int th = 0;
            int jh = 0;
            int nj = 0;

            for (Session s : sessions) {
                int dur = sessionDuration(s);
                th += dur;

                Map<Integer, AttendanceRecord> byUser = attendanceMap.getOrDefault(s.getSessionId(), Collections.emptyMap());
                AttendanceRecord rec = byUser.get(student.getUserId());
                if (rec != null) {
                    if (rec.getStatus() == AttendanceStatus.ABSENT) {
                        nj += dur;
                    } else if (rec.getStatus() == AttendanceStatus.EXCUSED) {
                        jh += dur;
                    }
                }
            }

            int hc = th - jh - nj;
            double pctH = th > 0 ? (hc * 100.0) / th : 100.0;
            double absenceRate = th > 0 ? (nj * 100.0) / th : 0.0;
            boolean sn = absenceRate > SN_THRESHOLD_PCT;

            int seuil = (int) Math.floor(th * SN_THRESHOLD_PCT / 100.0);
            int malus = nj > seuil ? -(nj - seuil) : 0;

            globalTH += th;
            globalHC += hc;
            globalJH += jh;
            globalNJ += nj;
            globalM += malus;

            // ── TH ──
            table.addCell(makeDataCell(String.valueOf(th), dataF, rowBg, rowH, true));

            // ── HC ──
            table.addCell(makeDataCell(String.valueOf(hc), dataF, rowBg, rowH, true));

            // ── %H ──
            String pctHStr = th > 0 ? String.format("%.0f%%", pctH) : "-";
            table.addCell(makeDataCell(pctHStr, dataF, rowBg, rowH, true));

            // ── SN ──
            String snStr = sn ? "OUI" : "NON";
            Color snBg = sn ? RED_LIGHT : GREEN_LIGHT;
            Font snF = sn
                    ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5f, RED_DARK)
                    : FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5f, GREEN_DARK);
            table.addCell(makeDataCell(snStr, snF, snBg, rowH, true));

            // ── JH ──
            table.addCell(makeDataCell(String.valueOf(jh), dataF, jh > 0 ? YELLOW_BG : rowBg, rowH, true));

            // ── NJ ──
            table.addCell(makeDataCell(String.valueOf(nj), dataF, nj > 0 ? RED_LIGHT : rowBg, rowH, true));

            // ── M ──
            String malusStr = malus < 0 ? String.valueOf(malus) : "0";
            Color malusBg = malus < 0 ? RED_LIGHT : rowBg;
            Font malusF = malus < 0
                    ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, RED_DARK)
                    : FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, GREEN_DARK);
            table.addCell(makeDataCell(malusStr, malusF, malusBg, rowH, true));
        }

        // ── T.TH ──
        table.addCell(makeDataCell(String.valueOf(globalTH), boldF, TOTAL_BG, rowH, true));

        // ── T.HC ──
        table.addCell(makeDataCell(String.valueOf(globalHC), boldF, TOTAL_BG, rowH, true));

        // ── T.%H ──
        double globalPctH = globalTH > 0 ? (globalHC * 100.0) / globalTH : 100.0;
        String globalPctHStr = globalTH > 0 ? String.format("%.0f%%", globalPctH) : "-";
        table.addCell(makeDataCell(globalPctHStr, boldF, TOTAL_BG, rowH, true));

        // ── T.JH ──
        table.addCell(makeDataCell(String.valueOf(globalJH), boldF, TOTAL_BG, rowH, true));

        // ── T.NJ ──
        table.addCell(makeDataCell(String.valueOf(globalNJ), boldF, TOTAL_BG, rowH, true));

        // ── T.M ──
        String globalMStr = globalM < 0 ? String.valueOf(globalM) : "0";
        Font globalMF = globalM < 0
                ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, RED_DARK)
                : FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, GREEN_DARK);
        table.addCell(makeDataCell(globalMStr, globalMF, TOTAL_BG, rowH, true));
    }

    // ══════════════════════════════════════════════════
    //  PIED DE PAGE — SIGNATURES
    // ══════════════════════════════════════════════════
    private void addSignatureFooter(Document doc) throws DocumentException {
        Font titleF = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, Color.BLACK);
        Font lineF  = FontFactory.getFont(FontFactory.HELVETICA,       8f, Color.DARK_GRAY);

        PdfPTable footer = new PdfPTable(2);
        footer.setWidthPercentage(50);
        footer.setHorizontalAlignment(Element.ALIGN_RIGHT);
        footer.setSpacingBefore(10f);
        footer.setWidths(new float[]{50f, 50f});

        PdfPCell c1 = new PdfPCell();
        c1.setBorder(Rectangle.NO_BORDER);
        c1.addElement(new Paragraph("Le Responsable Pédagogique", titleF));
        c1.addElement(new Paragraph("\n\n_______________________", lineF));
        footer.addCell(c1);

        PdfPCell c2 = new PdfPCell();
        c2.setBorder(Rectangle.NO_BORDER);
        c2.addElement(new Paragraph("Le Directeur", titleF));
        c2.addElement(new Paragraph("\n\n_______________________", lineF));
        footer.addCell(c2);

        doc.add(footer);
    }

    // ══════════════════════════════════════════════════
    //  CELLULES UTILITAIRES
    // ══════════════════════════════════════════════════

    private PdfPCell makeHdrCell(String text, Font f, Color bg,
                                 int rowspan, int colspan,
                                 boolean center, float height) {
        PdfPCell cell = new PdfPCell(new Phrase(text, f));
        cell.setRowspan(rowspan);
        cell.setColspan(colspan);
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(
                center ? Element.ALIGN_CENTER : Element.ALIGN_LEFT);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(2f);
        cell.setFixedHeight(height);
        cell.setBorderColor(BORDER);
        cell.setBorderWidth(0.4f);
        return cell;
    }

    private PdfPCell makeDataCell(String text, Font f, Color bg,
                                  float height, boolean center) {
        PdfPCell cell = new PdfPCell(
                new Phrase(text != null ? text : "", f));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(
                center ? Element.ALIGN_CENTER : Element.ALIGN_LEFT);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPaddingLeft(2f);
        cell.setPaddingRight(1f);
        cell.setPaddingTop(1.5f);
        cell.setPaddingBottom(1.5f);
        cell.setFixedHeight(height);
        cell.setBorderColor(BORDER);
        cell.setBorderWidth(0.3f);
        return cell;
    }

    private PdfPCell makeNumCell(int value, Font f, Color bg,
                                 float height, Color fontColorIfNonZero,
                                 boolean colorizeNonZero) {
        Font usedF = (colorizeNonZero && value > 0)
                ? FontFactory.getFont(FontFactory.HELVETICA_BOLD,
                5.5f, fontColorIfNonZero)
                : f;
        String txt = String.valueOf(value);
        PdfPCell cell = new PdfPCell(new Phrase(txt, usedF));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(1.5f);
        cell.setFixedHeight(height);
        cell.setBorderColor(BORDER);
        cell.setBorderWidth(0.3f);
        return cell;
    }

    // ══════════════════════════════════════════════════
    //  MÉTHODES UTILITAIRES
    // ══════════════════════════════════════════════════

    private int sessionDuration(Session s) {
        if (s.getStartTime() != null && s.getEndTime() != null) {
            long h = ChronoUnit.HOURS.between(s.getStartTime(), s.getEndTime());
            return h > 0 ? (int) h : 1;
        }
        return 1;
    }

    private String detectGenre(User u) {
        try {
            java.lang.reflect.Method m = u.getClass().getMethod("getGender");
            Object v = m.invoke(u);
            return v != null ? v.toString() : "";
        } catch (Exception e) {
            return "";
        }
    }
}