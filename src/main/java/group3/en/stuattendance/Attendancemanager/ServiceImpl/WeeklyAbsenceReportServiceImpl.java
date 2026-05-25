package group3.en.stuattendance.Attendancemanager.ServiceImpl;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
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
    private static final Color COLOR_HEADER_BG      = new Color(30, 58, 95);        // Bleu marine
    private static final Color COLOR_DAY_LABEL_BG   = new Color(236, 239, 241);     // Gris clair
    private static final Color COLOR_TOTAL_ROW_BG   = new Color(207, 216, 220);     // Gris moyen
    private static final Color COLOR_COURSE_BG      = new Color(52, 73, 94);        // Bleu-gris foncé
    private static final Color COLOR_SUMMARY_BG     = new Color(245, 245, 245);     // Blanc cassé
    private static final Color COLOR_BORDER         = new Color(189, 189, 189);     // Gris bordure
    private static final Color COLOR_ABSENT_LIGHT   = new Color(255, 205, 210);     // Rouge clair
    private static final Color COLOR_PRESENT_LIGHT  = new Color(200, 230, 201);     // Vert clair
    private static final Color COLOR_GRANDTOTAL_BG  = new Color(178, 235, 242);     // Cyan clair

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

        // 6. Grouper les séances : courseId -> date -> list<Session>
        Map<Integer, Course> courseById = new LinkedHashMap<>();
        Map<Integer, Map<LocalDate, List<Session>>> courseSessionsByDate = new LinkedHashMap<>();

        for (Session s : sessions) {
            if (s.getCourse() == null) continue;
            Course c = s.getCourse();
            courseById.put(c.getCourseId(), c);
            courseSessionsByDate
                    .computeIfAbsent(c.getCourseId(), k -> new TreeMap<>())
                    .computeIfAbsent(s.getDate(), k -> new ArrayList<>())
                    .add(s);
        }

        // Trier les cours par code
        List<Course> courses = courseById.values().stream()
                .sorted(Comparator.comparing(Course::getCode, Comparator.nullsLast(String::compareToIgnoreCase)))
                .collect(Collectors.toList());

        // 7. Générer le PDF
        return buildPdf(classroom, students, courses, courseSessionsByDate, attendanceMap, monday, saturday);
    }

    // =====================================================================
    //  GÉNÉRATION PDF
    // =====================================================================

    private ByteArrayInputStream buildPdf(
            Classroom classroom,
            List<User> students,
            List<Course> courses,
            Map<Integer, Map<LocalDate, List<Session>>> courseSessionsByDate,
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
            if (students.isEmpty()) {
                Paragraph msg = new Paragraph(
                        "Aucun étudiant inscrit dans cette classe.",
                        FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY));
                msg.setAlignment(Element.ALIGN_CENTER);
                msg.setSpacingBefore(20);
                document.add(msg);
            } else {
                PdfPTable mainTable = buildAttendanceTable(
                        students, courses, courseSessionsByDate, attendanceMap, weekStart);
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
            List<Course> courses,
            Map<Integer, Map<LocalDate, List<Session>>> courseSessionsByDate,
            Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap,
            LocalDate weekStart) throws DocumentException {

        int n = students.size();
        // Colonnes : 1 (label jour) + n (étudiants) + 1 (nom cours) = n+2
        int totalCols = n + 2;

        PdfPTable table = new PdfPTable(totalCols);
        table.setWidthPercentage(100);
        table.setKeepTogether(false);

        // Calcul des largeurs relatives
        float dayW    = 9f;            // colonne "jour"
        float courseW = 5f;            // colonne "matière"
        float stuW    = (86f) / n;     // largeur par étudiant
        float[] widths = new float[totalCols];
        widths[0] = dayW;
        for (int i = 1; i <= n; i++) widths[i] = stuW;
        widths[totalCols - 1] = courseW;
        table.setWidths(widths);

        // ---- Ligne d'en-tête : noms des étudiants ----
        addStudentHeaderRow(table, students);

        // ---- Sections par cours ----
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        for (Course course : courses) {
            Map<LocalDate, List<Session>> sessionsByDate =
                    courseSessionsByDate.getOrDefault(course.getCourseId(), Collections.emptyMap());

            // 8 lignes par cours : 6 jours + Total H.UE + H. Justifiées
            // La cellule "matière" a un rowspan=8 et est ajoutée sur la 1ère ligne

            for (int dayOffset = 0; dayOffset < 6; dayOffset++) {
                LocalDate date     = weekStart.plusDays(dayOffset);
                String    dayLabel = FRENCH_DAYS[dayOffset];

                // Cellule "Jour"
                Font dayFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, Color.BLACK);
                PdfPCell dayCell = new PdfPCell(
                        new Phrase(dayLabel + "\n" + date.format(dateFmt), dayFont));
                dayCell.setBackgroundColor(COLOR_DAY_LABEL_BG);
                dayCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                dayCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                dayCell.setPadding(1.5f);
                dayCell.setFixedHeight(13f);
                applyBorder(dayCell);
                table.addCell(dayCell);

                // Cellules étudiants
                List<Session> sessionsOnDay = sessionsByDate.getOrDefault(date, Collections.emptyList());
                for (User student : students) {
                    table.addCell(buildDayCell(student, sessionsOnDay, attendanceMap));
                }

                // Cellule "Matière" avec rowspan=8 uniquement sur la 1ère ligne
                if (dayOffset == 0) {
                    String label = course.getCode() + " " + shorten(course.getCourseName(), 25);
                    Font courseFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5f, Color.WHITE);
                    PdfPCell courseCell = new PdfPCell(new Phrase(label, courseFont));
                    courseCell.setRowspan(8);
                    courseCell.setRotation(90);
                    courseCell.setBackgroundColor(COLOR_COURSE_BG);
                    courseCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    courseCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                    courseCell.setPadding(2);
                    courseCell.setBorderColor(Color.DARK_GRAY);
                    courseCell.setBorderWidth(0.5f);
                    table.addCell(courseCell);
                }
            }

            // Ligne "Total Heures UE"
            Font totalLabelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, Color.BLACK);
            PdfPCell totalLabel = new PdfPCell(new Phrase("Total\nH.UE", totalLabelFont));
            totalLabel.setBackgroundColor(COLOR_TOTAL_ROW_BG);
            totalLabel.setHorizontalAlignment(Element.ALIGN_CENTER);
            totalLabel.setVerticalAlignment(Element.ALIGN_MIDDLE);
            totalLabel.setPadding(1.5f);
            totalLabel.setFixedHeight(11f);
            applyBorder(totalLabel);
            table.addCell(totalLabel);

            Font totalValFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6f, Color.BLACK);
            for (User student : students) {
                int absentH = sumAbsentHours(student, sessionsByDate, attendanceMap);
                Color bg = absentH > 0 ? COLOR_ABSENT_LIGHT : COLOR_TOTAL_ROW_BG;
                Font f  = absentH > 0
                        ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6f, COLOR_ABSENT)
                        : totalValFont;
                PdfPCell cell = new PdfPCell(new Phrase(absentH > 0 ? String.valueOf(absentH) : "", f));
                cell.setBackgroundColor(bg);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cell.setPadding(1.5f);
                cell.setFixedHeight(11f);
                applyBorder(cell);
                table.addCell(cell);
            }
            // (pas de cellule ici : la colonne "matière" est couverte par rowspan)

            // Ligne "Heures Justifiées"
            Font justLabelFont = FontFactory.getFont(FontFactory.HELVETICA, 5f, Color.DARK_GRAY);
            PdfPCell justLabel = new PdfPCell(new Phrase("H. Just.", justLabelFont));
            justLabel.setBackgroundColor(COLOR_SUMMARY_BG);
            justLabel.setHorizontalAlignment(Element.ALIGN_CENTER);
            justLabel.setVerticalAlignment(Element.ALIGN_MIDDLE);
            justLabel.setPadding(1.5f);
            justLabel.setFixedHeight(11f);
            applyBorder(justLabel);
            table.addCell(justLabel);

            Font justValFont = FontFactory.getFont(FontFactory.HELVETICA, 5.5f, Color.DARK_GRAY);
            for (User student : students) {
                int excH = sumExcusedHours(student, sessionsByDate, attendanceMap);
                PdfPCell cell = new PdfPCell(new Phrase(excH > 0 ? String.valueOf(excH) : "", justValFont));
                cell.setBackgroundColor(excH > 0 ? new Color(255, 249, 196) : COLOR_SUMMARY_BG);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cell.setPadding(1.5f);
                cell.setFixedHeight(11f);
                applyBorder(cell);
                table.addCell(cell);
            }
            // (colonne matière couverte par rowspan)
        }

        // ---- Ligne Grand Total ----
        addGrandTotalRow(table, students, courses, courseSessionsByDate, attendanceMap, n);

        // ---- Ligne N° (numéros d'étudiants) ----
        addNumberRow(table, n);

        return table;
    }

    // =====================================================================
    //  LIGNE EN-TÊTE : NOMS DES ÉTUDIANTS (pivotés)
    // =====================================================================

    private void addStudentHeaderRow(PdfPTable table, List<User> students) {
        Font hFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, Color.WHITE);

        // Première cellule (coin haut-gauche)
        PdfPCell corner = new PdfPCell(
                new Phrase("NOMS ET PRÉNOMS", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.5f, Color.WHITE)));
        corner.setBackgroundColor(COLOR_HEADER_BG);
        corner.setHorizontalAlignment(Element.ALIGN_CENTER);
        corner.setVerticalAlignment(Element.ALIGN_BOTTOM);
        corner.setPadding(3);
        corner.setFixedHeight(75f);
        corner.setBorderColor(COLOR_BORDER);
        table.addCell(corner);

        // Une cellule par étudiant, pivotée à 90°
        for (User student : students) {
            String nomComplet = nvl(student.getLastName()).toUpperCase()
                    + " " + nvl(student.getFirstName());
            PdfPCell cell = new PdfPCell(new Phrase(nomComplet.trim(), hFont));
            cell.setRotation(90);
            cell.setBackgroundColor(COLOR_HEADER_BG);
            cell.setHorizontalAlignment(Element.ALIGN_LEFT);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPadding(2);
            cell.setFixedHeight(75f);
            cell.setBorderColor(COLOR_BORDER);
            cell.setBorderWidth(0.4f);
            table.addCell(cell);
        }

        // Dernière cellule coin haut-droit
        PdfPCell matHeader = new PdfPCell(
                new Phrase("MATIÈRE", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5f, Color.WHITE)));
        matHeader.setRotation(90);
        matHeader.setBackgroundColor(COLOR_HEADER_BG);
        matHeader.setHorizontalAlignment(Element.ALIGN_CENTER);
        matHeader.setVerticalAlignment(Element.ALIGN_MIDDLE);
        matHeader.setPadding(2);
        matHeader.setFixedHeight(75f);
        matHeader.setBorderColor(COLOR_BORDER);
        table.addCell(matHeader);
    }

    // =====================================================================
    //  CELLULE ASSIDUITÉ POUR UN JOUR DONNÉ
    // =====================================================================

    private PdfPCell buildDayCell(User student,
                                  List<Session> sessionsOnDay,
                                  Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap) {
        Font cellFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6f, Color.WHITE);

        // Pas de séance ce jour-là
        if (sessionsOnDay.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase(""));
            empty.setBackgroundColor(Color.WHITE);
            empty.setFixedHeight(13f);
            applyBorder(empty);
            return empty;
        }

        int totalSessionHours = 0;
        int absentHours       = 0;
        int excusedHours      = 0;
        boolean hasRecord     = false;

        for (Session s : sessionsOnDay) {
            int dur = sessionDuration(s);
            totalSessionHours += dur;

            Map<Integer, AttendanceRecord> byUser =
                    attendanceMap.getOrDefault(s.getSessionId(), Collections.emptyMap());
            AttendanceRecord rec = byUser.get(student.getUserId());

            if (rec != null) {
                hasRecord = true;
                if (rec.getStatus() == AttendanceStatus.ABSENT) {
                    absentHours += dur;
                } else if (rec.getStatus() == AttendanceStatus.EXCUSED) {
                    excusedHours += dur;
                }
            }
        }

        Color bg;
        String text;

        if (!hasRecord) {
            // Séance planifiée mais pas encore d'enregistrement
            bg   = Color.WHITE;
            text = "";
        } else if (absentHours > 0) {
            // Absent
            bg   = COLOR_ABSENT;
            text = String.valueOf(absentHours);
        } else if (excusedHours > 0) {
            // Justifié
            bg   = COLOR_EXCUSED;
            text = String.valueOf(excusedHours);
        } else {
            // Présent
            bg   = COLOR_PRESENT;
            text = String.valueOf(totalSessionHours);
        }

        PdfPCell cell = new PdfPCell(new Phrase(text, cellFont));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(1);
        cell.setFixedHeight(13f);
        applyBorder(cell);
        return cell;
    }

    // =====================================================================
    //  LIGNE GRAND TOTAL
    // =====================================================================

    private void addGrandTotalRow(PdfPTable table, List<User> students,
                                  List<Course> courses,
                                  Map<Integer, Map<LocalDate, List<Session>>> courseSessionsByDate,
                                  Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap,
                                  int n) {
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6f, Color.WHITE);
        Font valFont   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7f, Color.BLACK);

        // Cellule label
        PdfPCell label = new PdfPCell(new Phrase("TOTAL\nABS.", labelFont));
        label.setBackgroundColor(COLOR_GRANDTOTAL_BG.darker());
        label.setHorizontalAlignment(Element.ALIGN_CENTER);
        label.setVerticalAlignment(Element.ALIGN_MIDDLE);
        label.setPadding(2);
        label.setFixedHeight(16f);
        label.setBorderColor(Color.DARK_GRAY);
        label.setBorderWidth(0.5f);
        table.addCell(label);

        // Totaux par étudiant
        for (User student : students) {
            int grandTotal = 0;
            for (Course course : courses) {
                Map<LocalDate, List<Session>> sd =
                        courseSessionsByDate.getOrDefault(course.getCourseId(), Collections.emptyMap());
                grandTotal += sumAbsentHours(student, sd, attendanceMap);
            }

            Color bg = grandTotal > 0 ? COLOR_ABSENT_LIGHT : COLOR_PRESENT_LIGHT;
            Font  f  = grandTotal > 0
                    ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7f, COLOR_ABSENT)
                    : FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7f, new Color(27, 94, 32));

            PdfPCell cell = new PdfPCell(new Phrase(String.valueOf(grandTotal), f));
            cell.setBackgroundColor(bg);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPadding(2);
            cell.setFixedHeight(16f);
            cell.setBorderColor(COLOR_BORDER);
            cell.setBorderWidth(0.4f);
            table.addCell(cell);
        }

        // Cellule vide colonne matière
        PdfPCell empty = new PdfPCell(new Phrase(""));
        empty.setBackgroundColor(COLOR_GRANDTOTAL_BG.darker());
        empty.setBorderColor(Color.DARK_GRAY);
        empty.setBorderWidth(0.5f);
        table.addCell(empty);
    }

    // =====================================================================
    //  LIGNE N° (NUMÉROS DES ÉTUDIANTS)
    // =====================================================================

    private void addNumberRow(PdfPTable table, int n) {
        Font numFont = FontFactory.getFont(FontFactory.HELVETICA, 5.5f, Color.DARK_GRAY);

        PdfPCell nLabel = new PdfPCell(new Phrase("N°", numFont));
        nLabel.setBackgroundColor(COLOR_DAY_LABEL_BG);
        nLabel.setHorizontalAlignment(Element.ALIGN_CENTER);
        nLabel.setVerticalAlignment(Element.ALIGN_MIDDLE);
        nLabel.setPadding(1.5f);
        nLabel.setFixedHeight(11f);
        applyBorder(nLabel);
        table.addCell(nLabel);

        for (int i = 1; i <= n; i++) {
            PdfPCell cell = new PdfPCell(new Phrase(String.valueOf(i), numFont));
            cell.setBackgroundColor(COLOR_DAY_LABEL_BG);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPadding(1);
            cell.setFixedHeight(11f);
            applyBorder(cell);
            table.addCell(cell);
        }

        PdfPCell empty = new PdfPCell(new Phrase(""));
        empty.setBackgroundColor(COLOR_DAY_LABEL_BG);
        applyBorder(empty);
        table.addCell(empty);
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

    /** Total heures ABSENT pour un étudiant dans un cours (toute la semaine). */
    private int sumAbsentHours(User student,
                               Map<LocalDate, List<Session>> sessionsByDate,
                               Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap) {
        int total = 0;
        for (List<Session> sessions : sessionsByDate.values()) {
            for (Session s : sessions) {
                Map<Integer, AttendanceRecord> byUser =
                        attendanceMap.getOrDefault(s.getSessionId(), Collections.emptyMap());
                AttendanceRecord rec = byUser.get(student.getUserId());
                if (rec != null && rec.getStatus() == AttendanceStatus.ABSENT) {
                    total += sessionDuration(s);
                }
            }
        }
        return total;
    }

    /** Total heures EXCUSED (justifiées) pour un étudiant dans un cours. */
    private int sumExcusedHours(User student,
                                Map<LocalDate, List<Session>> sessionsByDate,
                                Map<Integer, Map<Integer, AttendanceRecord>> attendanceMap) {
        int total = 0;
        for (List<Session> sessions : sessionsByDate.values()) {
            for (Session s : sessions) {
                Map<Integer, AttendanceRecord> byUser =
                        attendanceMap.getOrDefault(s.getSessionId(), Collections.emptyMap());
                AttendanceRecord rec = byUser.get(student.getUserId());
                if (rec != null && rec.getStatus() == AttendanceStatus.EXCUSED) {
                    total += sessionDuration(s);
                }
            }
        }
        return total;
    }

    /** Applique une bordure fine grise à une cellule. */
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