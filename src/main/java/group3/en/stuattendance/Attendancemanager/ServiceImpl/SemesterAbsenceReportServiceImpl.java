package group3.en.stuattendance.Attendancemanager.ServiceImpl;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SemesterAbsenceReportServiceImpl implements SemesterAbsenceReportService {

    private final ClassroomRepository     classroomRepository;
    private final UserRepository          userRepository;
    private final CourseRepository        courseRepository;
    private final SessionRepository       sessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;

    // ──────────────── COULEURS ────────────────
    private static final Color NAVY        = new Color(30,  58,  95);
    private static final Color HEADER_BLUE = new Color(41,  82, 128);
    private static final Color SUB_HDR     = new Color(189, 210, 235);
    private static final Color COL_ALT     = new Color(241, 245, 249);
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
                .orElseThrow(() -> new EntityNotFoundException("Classe introuvable : " + classroomId));

        // 2. Étudiants triés par nom de famille
        List<User> students = userRepository
                .findByClassroomClassIdAndRolesName(classroomId, "STUDENT")
                .stream()
                .sorted(Comparator.comparing(
                        u -> nvl(u.getLastName()).toUpperCase(),
                        Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.toList());

        // 3. Cours du semestre pour la spécialité + niveau de la classe
        Integer specialityId = (classroom.getSpeciality() != null)
                ? classroom.getSpeciality().getSpecialityId() : null;
        Integer level = classroom.getLevel();

        List<Course> courses;
        if (specialityId != null && level != null) {
            courses = courseRepository
                    .findBySpecialitySpecialityIdAndLevelAndSemester(specialityId, level, semester)
                    .stream()
                    .sorted(Comparator.comparing(Course::getCode,
                            Comparator.nullsLast(String::compareToIgnoreCase)))
                    .collect(Collectors.toList());
        } else {
            courses = Collections.emptyList();
        }

        // 4. Séances de cette classe appartenant à ces cours
        List<Integer> courseIds = courses.stream()
                .map(Course::getCourseId).collect(Collectors.toList());

        List<Session> allSessions = courseIds.isEmpty()
                ? Collections.emptyList()
                : sessionRepository.findByClassroomClassIdAndCourseIds(classroomId, courseIds);

        // 5. Plage de dates du semestre (pour l'en-tête)
        LocalDate periodStart = allSessions.stream()
                .map(Session::getDate).filter(Objects::nonNull).min(Comparator.naturalOrder())
                .orElse(null);
        LocalDate periodEnd   = allSessions.stream()
                .map(Session::getDate).filter(Objects::nonNull).max(Comparator.naturalOrder())
                .orElse(null);

        // 6. Map : sessionId → userId → AttendanceRecord
        List<Integer> sessionIds = allSessions.stream()
                .map(Session::getSessionId).collect(Collectors.toList());
        List<AttendanceRecord> allRecords = sessionIds.isEmpty()
                ? Collections.emptyList()
                : attendanceRecordRepository.findWithHourSlotsBySessionIds(sessionIds);

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
                        .computeIfAbsent(s.getCourse().getCourseId(), k -> new ArrayList<>())
                        .add(s);
            }
        }

        // 8. Génération PDF
        return buildPdf(classroom, semester, students, courses,
                sessionsByCourse, attendanceMap, periodStart, periodEnd);
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

        // A3 paysage pour gérer beaucoup de colonnes
        Rectangle pageSize = (courses.size() > 7)
                ? new Rectangle(1190, 842)   // A3 landscape
                : PageSize.A4.rotate();      // A4 landscape

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
                doc.add(buildMainTable(students, courses, sessionsByCourse, attendanceMap));
            }

            addSignatureFooter(doc);
            doc.close();

        } catch (Exception e) {
            throw new RuntimeException("Erreur génération récapitulatif semestriel : " + e.getMessage(), e);
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    // ══════════════════════════════════════════════════
    //  EN-TÊTE DU DOCUMENT
    // ══════════════════════════════════════════════════
    private void addDocumentHeader(Document doc, Classroom classroom, Integer semester,
                                   LocalDate periodStart, LocalDate periodEnd)
            throws DocumentException {

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        PdfPTable hdr = new PdfPTable(3);
        hdr.setWidthPercentage(100);
        hdr.setWidths(new float[]{30f, 40f, 30f});
        hdr.setSpacingAfter(5f);

        Font boldSm  = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  7.5f, Color.BLACK);
        Font tinySm  = FontFactory.getFont(FontFactory.HELVETICA,        6.5f, Color.DARK_GRAY);
        Font titleF  = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  10f,  NAVY);
        Font subF    = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   8f,  Color.BLACK);
        Font rightF  = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   8f,  NAVY);

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
                ? "Période du " + periodStart.format(fmt) + " au " + periodEnd.format(fmt)
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
        String className = nvl(classroom.getName());
        String levelStr  = (classroom.getLevel() != null) ? "Niveau " + classroom.getLevel() : "";
        PdfPCell right = new PdfPCell();
        right.setBorder(Rectangle.NO_BORDER);
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);
        right.setPaddingRight(4);
        Paragraph rp = new Paragraph();
        rp.setAlignment(Element.ALIGN_RIGHT);
        rp.add(new Chunk(className + "\n",     rightF));
        rp.add(new Chunk("REPUBLIQUE DU CAMEROUN\n", tinySm));
        rp.add(new Chunk("ARCHIDIOCESE D'OBALA",     tinySm));
        right.addElement(rp);
        hdr.addCell(right);

        doc.add(hdr);

        // Séparateur
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
        // colonnes : N° | NOMS | GENRE | MATRICULE | 4*C cours | THS | THJ
        int totalCols = 4 + 4 * C + 2;

        PdfPTable table = new PdfPTable(totalCols);
        table.setWidthPercentage(100);
        table.setKeepTogether(false);

        // ── largeurs relatives ──
        float nW   = 2.5f;
        float nmW  = 14f;
        float geW  = 4.5f;
        float maW  = 7f;
        float cW   = 3.8f;  // chaque sous-colonne de cours
        float tsW  = 4f;
        float tjW  = 4f;

        float[] widths = new float[totalCols];
        widths[0] = nW;
        widths[1] = nmW;
        widths[2] = geW;
        widths[3] = maW;
        for (int i = 0; i < C * 4; i++) widths[4 + i] = cW;
        widths[totalCols - 2] = tsW;
        widths[totalCols - 1] = tjW;
        table.setWidths(widths);

        // ── Ligne 1 des en-têtes (noms des cours + THF) ──
        addCourseHeaderRow1(table, courses, C);

        // ── Ligne 2 des en-têtes (TH / HJ / TA / DEC) ──
        addCourseHeaderRow2(table, C);

        // ── Lignes de données ──
        int rowNum = 0;
        for (User student : students) {
            rowNum++;
            addStudentRow(table, rowNum, student, courses, sessionsByCourse, attendanceMap,
                    rowNum % 2 == 0);
        }

        return table;
    }

    // ── En-tête ligne 1 : noms des cours ──────────────────────────────────
    private void addCourseHeaderRow1(PdfPTable table, List<Course> courses, int C) {

        Font fixedF  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, WHITE);
        Font courseF = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5f,   WHITE);

        // N°
        PdfPCell nCell = makeHdrCell("N°", fixedF, NAVY, 2, 1, true, 40f);
        table.addCell(nCell);

        // NOMS ET PRÉNOMS
        PdfPCell nmCell = makeHdrCell("NOMS ET PRÉNOMS", fixedF, NAVY, 2, 1, false, 40f);
        table.addCell(nmCell);

        // GENRE
        PdfPCell geCell = makeHdrCell("GENRE", fixedF, NAVY, 2, 1, true, 40f);
        table.addCell(geCell);

        // MATRICULE
        PdfPCell maCell = makeHdrCell("MATRICULE", fixedF, NAVY, 2, 1, true, 40f);
        table.addCell(maCell);

        // Un bloc par cours (colspan=4)
        for (Course c : courses) {
            String label = c.getCode() + "\nTHF " + c.getTotalHours();
            PdfPCell cc = new PdfPCell(new Phrase(label, courseF));
            cc.setColspan(4);
            cc.setRowspan(1);
            cc.setBackgroundColor(HEADER_BLUE);
            cc.setHorizontalAlignment(Element.ALIGN_CENTER);
            cc.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cc.setPadding(2f);
            cc.setFixedHeight(40f);
            cc.setBorderColor(BORDER);
            cc.setBorderWidth(0.4f);
            table.addCell(cc);
        }

        // THS
        PdfPCell thsCell = makeHdrCell("THS", fixedF, NAVY, 2, 1, true, 40f);
        table.addCell(thsCell);

        // THJ
        PdfPCell thjCell = makeHdrCell("THJ", fixedF, NAVY, 2, 1, true, 40f);
        table.addCell(thjCell);
    }

    // ── En-tête ligne 2 : TH / HJ / TA / DEC ──────────────────────────────
    private void addCourseHeaderRow2(PdfPTable table, int C) {
        Font subF = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5f, NAVY);

        for (int i = 0; i < C; i++) {
            for (String lbl : new String[]{"TH", "HJ", "TA", "DEC"}) {
                PdfPCell cell = new PdfPCell(new Phrase(lbl, subF));
                cell.setBackgroundColor(SUB_HDR);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cell.setPadding(2f);
                cell.setFixedHeight(12f);
                cell.setBorderColor(BORDER);
                cell.setBorderWidth(0.4f);
                table.addCell(cell);
            }
        }
        // THS / THJ déjà couverts par rowspan=2
    }

    // ── Ligne de données d'un étudiant ──────────────────────────────────────
    private void addStudentRow(PdfPTable table, int rowNum, User student,
                               List<Course> courses,
                               Map<Integer, List<Session>> sessionsByCourse,
                               Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap,
                               boolean alternate) {

        Color rowBg = alternate ? COL_ALT : WHITE;
        Font  dataF = FontFactory.getFont(FontFactory.HELVETICA, 5.5f, Color.BLACK);
        Font  boldF = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, Color.BLACK);
        float rowH  = 11f;

        // N°
        table.addCell(makeDataCell(String.valueOf(rowNum), dataF, rowBg, rowH, true));

        // Nom complet
        String fullName = (nvl(student.getLastName()).toUpperCase() + " "
                + nvl(student.getFirstName())).trim();
        table.addCell(makeDataCell(fullName, boldF, rowBg, rowH, false));

        // Genre
        String genre = detectGenre(student);
        table.addCell(makeDataCell(genre, dataF, rowBg, rowH, true));

        // Matricule
        table.addCell(makeDataCell(nvl(student.getMatricule()), dataF, rowBg, rowH, true));

        // Colonnes par cours
        int totalAbsent  = 0;
        int totalExcused = 0;

        for (Course course : courses) {
            List<Session> sessions = sessionsByCourse.getOrDefault(
                    course.getCourseId(), Collections.emptyList());

            int th = 0; // heures absences
            int hj = 0; // heures justifiées

            for (Session s : sessions) {
                int dur = sessionDuration(s);
                Map<Integer, AttendanceRecord> byUser =
                        attendanceMap.getOrDefault(s.getSessionId(), Collections.emptyMap());
                AttendanceRecord rec = byUser.get(student.getUserId());
                if (rec != null) {
                    if (rec.getStatus() == AttendanceStatus.ABSENT)  th += dur;
                    if (rec.getStatus() == AttendanceStatus.EXCUSED) hj += dur;
                }
            }

            int thf = (course.getTotalHours() != null && course.getTotalHours() > 0)
                    ? course.getTotalHours() : 1;
            double ta  = (th * 100.0) / thf;
            boolean sn = ta <= SN_THRESHOLD_PCT;

            totalAbsent  += th;
            totalExcused += hj;

            // TH
            table.addCell(makeNumCell(th, dataF, th > 0 ? RED_LIGHT : rowBg, rowH, RED_DARK, th > 0));

            // HJ
            table.addCell(makeNumCell(hj, dataF, hj > 0 ? YELLOW_BG : rowBg, rowH, Color.DARK_GRAY, false));

            // TA
            String taStr = String.format("%.0f%%", ta);
            Color taBg   = ta > SN_THRESHOLD_PCT ? RED_LIGHT : rowBg;
            Font  taFont = ta > SN_THRESHOLD_PCT
                    ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, RED_DARK)
                    : dataF;
            table.addCell(makeDataCell(taStr, taFont, taBg, rowH, true));

            // DEC (SN/OUI ou SN/NON)
            String dec   = sn ? "SN/OUI" : "SN/NON";
            Color  decBg = sn ? GREEN_LIGHT : RED_LIGHT;
            Font   decF  = sn
                    ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 4.5f, GREEN_DARK)
                    : FontFactory.getFont(FontFactory.HELVETICA_BOLD, 4.5f, RED_DARK);
            table.addCell(makeDataCell(dec, decF, decBg, rowH, true));
        }

        // THS
        Font totF = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6f,
                totalAbsent > 0 ? RED_DARK : GREEN_DARK);
        table.addCell(makeNumCell(totalAbsent,  totF, TOTAL_BG, rowH, RED_DARK, false));

        // THJ
        table.addCell(makeNumCell(totalExcused, dataF, TOTAL_BG, rowH, Color.DARK_GRAY, false));
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

    /** Cellule d'en-tête avec rowspan optionnel. */
    private PdfPCell makeHdrCell(String text, Font f, Color bg,
                                 int rowspan, int colspan,
                                 boolean center, float height) {
        PdfPCell cell = new PdfPCell(new Phrase(text, f));
        cell.setRowspan(rowspan);
        cell.setColspan(colspan);
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(center ? Element.ALIGN_CENTER : Element.ALIGN_LEFT);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(2f);
        cell.setFixedHeight(height);
        cell.setBorderColor(BORDER);
        cell.setBorderWidth(0.4f);
        return cell;
    }

    /** Cellule de donnée texte. */
    private PdfPCell makeDataCell(String text, Font f, Color bg,
                                  float height, boolean center) {
        PdfPCell cell = new PdfPCell(new Phrase(text, f));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(center ? Element.ALIGN_CENTER : Element.ALIGN_LEFT);
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

    /** Cellule numérique (affiche vide si 0). */
    private PdfPCell makeNumCell(int value, Font f, Color bg,
                                 float height, Color fontColorIfNonZero,
                                 boolean colorizeNonZero) {
        Font usedF = (colorizeNonZero && value > 0)
                ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, fontColorIfNonZero)
                : f;
        String txt = value > 0 ? String.valueOf(value) : "0";
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
        // On tente de lire un champ "gender" ou on renvoie vide
        try {
            java.lang.reflect.Method m = u.getClass().getMethod("getGender");
            Object v = m.invoke(u);
            return v != null ? v.toString() : "";
        } catch (Exception e) {
            return "";
        }
    }

    private String nvl(String s) { return s != null ? s : ""; }
}