package group3.en.stuattendance.Timetablemanager.ServiceImpl;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import group3.en.stuattendance.Attendancemanager.DTO.AttendanceHourDto;
import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import group3.en.stuattendance.Timetablemanager.DTO.SessionDto;
import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import group3.en.stuattendance.Timetablemanager.DTO.TimetableEntryDto;
import group3.en.stuattendance.Timetablemanager.Service.PdfExportService;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class PdfExportServiceImpl implements PdfExportService {

    // ─────────────────────────────────────────────────────────────
    //  CRÉNEAUX HORAIRES FIXES DE LA FICHE D'APPEL OFFICIELLE
    // ─────────────────────────────────────────────────────────────
    private static final int[][] FIXED_SLOTS = {
            {8, 9}, {9, 10}, {10, 11}, {11, 12},
            {14, 15}, {15, 16}, {16, 17}, {17, 18}
    };
    private static final String[] SLOT_LABELS = {
            "08:00\n09:00", "09:00\n10:00", "10:00\n11:00", "11:00\n12:00",
            "14:00\n15:00", "15:00\n16:00", "16:00\n17:00", "17:00\n18:00"
    };

    // ─────────────────────────────────────────────────────────────
    //  COULEURS
    // ─────────────────────────────────────────────────────────────
    private static final Color NAVY        = new Color(30, 58, 95);
    private static final Color LIGHT_GRAY  = new Color(240, 240, 240);
    private static final Color MID_GRAY    = new Color(200, 200, 200);
    private static final Color DARK_GRAY   = new Color(80, 80, 80);
    private static final Color GREEN_BG    = new Color(220, 245, 220);
    private static final Color RED_BG      = new Color(255, 220, 220);
    private static final Color YELLOW_BG   = new Color(255, 250, 205);
    private static final Color ORANGE_BG   = new Color(255, 237, 213);
    private static final Color ABSENT_RED  = new Color(180, 30, 30);
    private static final Color PRESENT_GRN = new Color(20, 100, 20);

    // ══════════════════════════════════════════════════════════════
    //  FICHE D'APPEL  (recto + verso dans un seul PDF)
    // ══════════════════════════════════════════════════════════════
    @Override
    public ByteArrayInputStream exportAttendanceToPdf(
            SessionDto session,
            List<AttendanceRecordDto> records) {

        // Portrait A4
        Document doc = new Document(PageSize.A4, 28, 28, 30, 22);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            doc.open();

            // ── PAGE 1 : RECTO ──────────────────────────────────
            addRectoPage(doc, session, records);

            // ── PAGE 2 : VERSO ──────────────────────────────────
            doc.newPage();
            addVersoPage(doc, session);

            doc.close();

        } catch (Exception ex) {
            throw new RuntimeException("Erreur génération fiche d'appel PDF : " + ex.getMessage(), ex);
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    // ══════════════════════════════════════════════════════════════
    //  RECTO — Fiche d'appel des étudiants
    // ══════════════════════════════════════════════════════════════
    private void addRectoPage(Document doc, SessionDto session,
                              List<AttendanceRecordDto> records)
            throws DocumentException {

        // ── En-tête ──────────────────────────────────────────────
        addRectoHeader(doc, session);

        // ── Tableau d'appel ──────────────────────────────────────
        // Colonnes : N° | Matricule | Noms & Prénoms | 8 créneaux
        int totalCols = 3 + FIXED_SLOTS.length;
        PdfPTable table = new PdfPTable(totalCols);
        table.setWidthPercentage(100);
        table.setSpacingBefore(8f);

        // Largeurs : N°(4%) | Matricule(10%) | Nom(26%) | 8×7.5% = 60%
        float[] widths = new float[totalCols];
        widths[0] = 4f;
        widths[1] = 10f;
        widths[2] = 26f;
        for (int i = 3; i < totalCols; i++) widths[i] = 7.5f;
        table.setWidths(widths);

        // ── Ligne d'en-tête du tableau ───────────────────────────
        Font hdrFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7f, Color.WHITE);

        addHdrCell(table, "N°",              hdrFont, NAVY, Element.ALIGN_CENTER, 30f);
        addHdrCell(table, "Matricule",        hdrFont, NAVY, Element.ALIGN_CENTER, 30f);
        addHdrCell(table, "Noms et Prénoms", hdrFont, NAVY, Element.ALIGN_LEFT,   30f);

        for (String label : SLOT_LABELS) {
            addHdrCell(table, label, hdrFont, NAVY, Element.ALIGN_CENTER, 30f);
        }

        // ── Lignes des étudiants ─────────────────────────────────
        List<AttendanceRecordDto> sorted = records.stream()
                .sorted(Comparator.comparing(
                        r -> nvl(r.getStudentLastName()).toUpperCase(),
                        Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.toList());

        Font dataFont  = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, Color.BLACK);
        Font boldFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, Color.BLACK);
        Font slotFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f,   Color.BLACK);

        for (int i = 0; i < sorted.size(); i++) {
            AttendanceRecordDto rec = sorted.get(i);
            Color rowBg = (i % 2 == 0) ? Color.WHITE : LIGHT_GRAY;

            // N°
            addDataCell(table, String.valueOf(i + 1), dataFont, rowBg,
                    Element.ALIGN_CENTER, true, 16f);

            // Matricule
            addDataCell(table, nvl(rec.getStudentMatricule()), dataFont, rowBg,
                    Element.ALIGN_CENTER, true, 16f);

            // Nom complet
            String fullName = (nvl(rec.getStudentLastName()).toUpperCase()
                    + " " + nvl(rec.getStudentFirstName())).trim();
            addDataCell(table, fullName, boldFont, rowBg,
                    Element.ALIGN_LEFT, true, 16f);

            // 8 créneaux horaires
            for (int slot = 0; slot < FIXED_SLOTS.length; slot++) {
                String statusForSlot = resolveSlotStatus(rec, session, slot);
                table.addCell(buildSlotCell(statusForSlot, rowBg, 16f));
            }
        }

        // ── Ligne Total ──────────────────────────────────────────
        if (!sorted.isEmpty()) {
            addTotalRow(table, sorted, session);
        }

        doc.add(table);

        // ── Légende ──────────────────────────────────────────────
        addLegend(doc);
    }

    // ══════════════════════════════════════════════════════════════
    //  VERSO — Émargements des Enseignants
    // ══════════════════════════════════════════════════════════════
    private void addVersoPage(Document doc, SessionDto session)
            throws DocumentException {

        // ── En-tête verso ────────────────────────────────────────
        Font uniFont    = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13f, NAVY);
        Font subUniFont = FontFactory.getFont(FontFactory.HELVETICA,       9f,  DARK_GRAY);
        Font titleFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11f, Color.BLACK);

        Paragraph uniName = new Paragraph("UNIVERSITÉ SAINT JEAN", uniFont);
        uniName.setAlignment(Element.ALIGN_CENTER);
        doc.add(uniName);

        Paragraph subUni = new Paragraph("Saint Jean Ingénieurs", subUniFont);
        subUni.setAlignment(Element.ALIGN_CENTER);
        doc.add(subUni);

        // Séparateur
        PdfPTable sep = new PdfPTable(1);
        sep.setWidthPercentage(100);
        sep.setSpacingBefore(4f);
        sep.setSpacingAfter(6f);
        PdfPCell sepLine = new PdfPCell();
        sepLine.setFixedHeight(2f);
        sepLine.setBackgroundColor(NAVY);
        sepLine.setBorder(Rectangle.NO_BORDER);
        sep.addCell(sepLine);
        doc.add(sep);

        Paragraph title = new Paragraph("Émargements des Enseignants", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(12f);
        doc.add(title);

        // ── Infos séance ─────────────────────────────────────────
        if (session != null) {
            Font infoFont = FontFactory.getFont(FontFactory.HELVETICA, 8f, DARK_GRAY);
            PdfPTable infos = new PdfPTable(3);
            infos.setWidthPercentage(100);
            infos.setSpacingAfter(12f);
            infos.setWidths(new float[]{34f, 33f, 33f});

            addInfoCell(infos, "Classe",
                    nvl(session.getClassroomName()), infoFont);
            addInfoCell(infos, "Matière",
                    nvl(session.getCourseName()),    infoFont);
            addInfoCell(infos, "Date",
                    session.getDate() != null
                            ? session.getDate().format(
                            DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "",
                    infoFont);
            doc.add(infos);
        }

        // ── Tableau d'émargement ─────────────────────────────────
        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{12f, 28f, 15f, 25f, 20f});

        Font colHdr = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, Color.WHITE);
        String[] cols = {"Horaires", "Nom de l'enseignant",
                "Nombre d'heures", "Unité d'enseignement", "Signature"};
        for (String col : cols) {
            PdfPCell c = new PdfPCell(new Phrase(col, colHdr));
            c.setBackgroundColor(NAVY);
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setVerticalAlignment(Element.ALIGN_MIDDLE);
            c.setPadding(6f);
            c.setFixedHeight(26f);
            c.setBorderColor(MID_GRAY);
            c.setBorderWidth(0.5f);
            table.addCell(c);
        }

        // Ligne par créneau horaire fixe
        String[] horaires = {
                "08h - 09h", "09h - 10h", "10h - 11h", "11h - 12h",
                "14h - 15h", "15h - 16h", "16h - 17h", "17h - 18h"
        };
        Font rowFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, Color.BLACK);

        for (int i = 0; i < horaires.length; i++) {
            Color bg = (i % 2 == 0) ? Color.WHITE : LIGHT_GRAY;

            // Horaires
            PdfPCell hCell = new PdfPCell(new Phrase(horaires[i], rowFont));
            hCell.setBackgroundColor(bg);
            hCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            hCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            hCell.setPadding(5f);
            hCell.setFixedHeight(36f);
            hCell.setBorderColor(MID_GRAY);
            hCell.setBorderWidth(0.4f);
            table.addCell(hCell);

            // Nom enseignant — pré-rempli si c'est le créneau de la session
            String teacherName = resolveTeacherForSlot(session, i);
            addEmptyOrPrefilledCell(table, teacherName, bg, 36f, false);

            // Nombre d'heures
            addEmptyOrPrefilledCell(table, teacherName.isEmpty() ? "" : "1h", bg, 36f, true);

            // Unité d'enseignement
            String ue = (!teacherName.isEmpty() && session != null)
                    ? nvl(session.getCourseName()) : "";
            addEmptyOrPrefilledCell(table, ue, bg, 36f, false);

            // Signature (toujours vide — à signer)
            PdfPCell sigCell = new PdfPCell(new Phrase(""));
            sigCell.setBackgroundColor(bg);
            sigCell.setFixedHeight(36f);
            sigCell.setBorderColor(MID_GRAY);
            sigCell.setBorderWidth(0.4f);
            table.addCell(sigCell);
        }

        doc.add(table);

        // ── Zone de signatures institutionnelles ─────────────────
        addVersoFooter(doc);
    }

    // ══════════════════════════════════════════════════════════════
    //  EN-TÊTE RECTO
    // ══════════════════════════════════════════════════════════════
    private void addRectoHeader(Document doc, SessionDto session)
            throws DocumentException {

        Font instFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12f, NAVY);
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10f, Color.BLACK);
        Font infoFont  = FontFactory.getFont(FontFactory.HELVETICA,       8.5f, DARK_GRAY);
        Font boldInfo  = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  8.5f, Color.BLACK);

        // Ligne 1 : Nom de l'établissement centré
        Paragraph inst = new Paragraph("INSTITUT UNIVERSITAIRE SAINT JEAN", instFont);
        inst.setAlignment(Element.ALIGN_CENTER);
        doc.add(inst);

        // Ligne 2 : Titre du document
        String academicYear = (session != null && session.getDate() != null)
                ? "SCHOOL YEAR " + session.getDate().getYear() + "-"
                + (session.getDate().getYear() + 1)
                : "SCHOOL YEAR 2025-2026";
        Paragraph formTitle = new Paragraph("ATTENDANCE FORM  " + academicYear, titleFont);
        formTitle.setAlignment(Element.ALIGN_CENTER);
        formTitle.setSpacingBefore(2f);
        doc.add(formTitle);

        // Séparateur bleu marine
        PdfPTable sep = new PdfPTable(1);
        sep.setWidthPercentage(100);
        sep.setSpacingBefore(4f);
        sep.setSpacingAfter(6f);
        PdfPCell sepLine = new PdfPCell();
        sepLine.setFixedHeight(2f);
        sepLine.setBackgroundColor(NAVY);
        sepLine.setBorder(Rectangle.NO_BORDER);
        sep.addCell(sepLine);
        doc.add(sep);

        // Lignes d'informations (Level / Option / Date)
        PdfPTable meta = new PdfPTable(3);
        meta.setWidthPercentage(100);
        meta.setSpacingAfter(6f);
        meta.setWidths(new float[]{30f, 40f, 30f});

        // Gauche : Level + Option
        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        Paragraph levelP = new Paragraph();
        levelP.add(new Chunk("Level: ", infoFont));
        levelP.add(new Chunk(
                session != null && session.getLevel() != null
                        ? "Engineering " + session.getLevel() : "",
                boldInfo));
        leftCell.addElement(levelP);
        Paragraph optP = new Paragraph();
        optP.add(new Chunk("Option: ", infoFont));
        optP.add(new Chunk(
                session != null ? nvl(session.getSpecialityName()) : "",
                boldInfo));
        leftCell.addElement(optP);
        meta.addCell(leftCell);

        // Centre : Cours + Enseignant
        PdfPCell centerCell = new PdfPCell();
        centerCell.setBorder(Rectangle.NO_BORDER);
        centerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        Paragraph courseP = new Paragraph();
        courseP.setAlignment(Element.ALIGN_CENTER);
        courseP.add(new Chunk("Course: ", infoFont));
        courseP.add(new Chunk(session != null ? nvl(session.getCourseName()) : "", boldInfo));
        centerCell.addElement(courseP);
        Paragraph teachP = new Paragraph();
        teachP.setAlignment(Element.ALIGN_CENTER);
        teachP.add(new Chunk("Lecturer: ", infoFont));
        teachP.add(new Chunk(session != null ? nvl(session.getTeacherName()) : "", boldInfo));
        centerCell.addElement(teachP);
        meta.addCell(centerCell);

        // Droite : Date
        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        Paragraph dateP = new Paragraph();
        dateP.setAlignment(Element.ALIGN_RIGHT);
        dateP.add(new Chunk("Date: ", infoFont));
        String dateStr = (session != null && session.getDate() != null)
                ? session.getDate().format(DateTimeFormatter.ofPattern("dd / MM / yyyy"))
                : "......... / ......... / 20.......";
        dateP.add(new Chunk(dateStr, boldInfo));
        rightCell.addElement(dateP);
        meta.addCell(rightCell);

        doc.add(meta);
    }

    // ══════════════════════════════════════════════════════════════
    //  LIGNE TOTAL DU TABLEAU
    // ══════════════════════════════════════════════════════════════
    private void addTotalRow(PdfPTable table,
                             List<AttendanceRecordDto> records,
                             SessionDto session) {
        Font totFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7f, Color.WHITE);
        Font numFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, Color.BLACK);

        // Cellule label sur 3 colonnes
        PdfPCell label = new PdfPCell(new Phrase("TOTAL", totFont));
        label.setColspan(3);
        label.setBackgroundColor(NAVY);
        label.setHorizontalAlignment(Element.ALIGN_CENTER);
        label.setVerticalAlignment(Element.ALIGN_MIDDLE);
        label.setPadding(3f);
        label.setFixedHeight(16f);
        label.setBorderColor(MID_GRAY);
        label.setBorderWidth(0.4f);
        table.addCell(label);

        // Comptage ABSENT par créneau
        for (int slot = 0; slot < FIXED_SLOTS.length; slot++) {
            final int s = slot;
            long absCount = records.stream()
                    .filter(r -> "ABSENT".equals(resolveSlotStatus(r, session, s)))
                    .count();

            String txt = absCount > 0 ? String.valueOf(absCount) : "";
            Color bg   = absCount > 0 ? RED_BG : LIGHT_GRAY;
            Font  f    = absCount > 0
                    ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, ABSENT_RED)
                    : numFont;

            PdfPCell cell = new PdfPCell(new Phrase(txt, f));
            cell.setBackgroundColor(bg);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPadding(2f);
            cell.setFixedHeight(16f);
            cell.setBorderColor(MID_GRAY);
            cell.setBorderWidth(0.4f);
            table.addCell(cell);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  LÉGENDE
    // ══════════════════════════════════════════════════════════════
    private void addLegend(Document doc) throws DocumentException {
        Font lgFont = FontFactory.getFont(FontFactory.HELVETICA, 6.5f, DARK_GRAY);
        Font lgBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.5f, DARK_GRAY);

        PdfPTable legend = new PdfPTable(6);
        legend.setWidthPercentage(70);
        legend.setHorizontalAlignment(Element.ALIGN_LEFT);
        legend.setSpacingBefore(6f);
        legend.setWidths(new float[]{8f, 20f, 8f, 20f, 8f, 20f});

        Object[][] items = {
                {GREEN_BG,  PRESENT_GRN, "P", "Présent"},
                {RED_BG,    ABSENT_RED,  "A", "Absent"},
                {YELLOW_BG, DARK_GRAY,   "J", "Justifié"}
        };

        for (Object[] item : items) {
            Color bg    = (Color) item[0];
            Color txtC  = (Color) item[1];
            String mark = (String) item[2];
            String desc = (String) item[3];

            Font mf = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7f, txtC);
            PdfPCell markCell = new PdfPCell(new Phrase(mark, mf));
            markCell.setBackgroundColor(bg);
            markCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            markCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            markCell.setPadding(2f);
            markCell.setFixedHeight(12f);
            markCell.setBorderColor(MID_GRAY);
            markCell.setBorderWidth(0.4f);
            legend.addCell(markCell);

            PdfPCell descCell = new PdfPCell(new Phrase(" = " + desc, lgFont));
            descCell.setBorder(Rectangle.NO_BORDER);
            descCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            legend.addCell(descCell);
        }
        doc.add(legend);
    }

    // ══════════════════════════════════════════════════════════════
    //  PIED DE PAGE VERSO
    // ══════════════════════════════════════════════════════════════
    private void addVersoFooter(Document doc) throws DocumentException {
        Font signTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, Color.BLACK);
        Font signLine  = FontFactory.getFont(FontFactory.HELVETICA,       8f, DARK_GRAY);

        PdfPTable footer = new PdfPTable(2);
        footer.setWidthPercentage(55);
        footer.setHorizontalAlignment(Element.ALIGN_RIGHT);
        footer.setSpacingBefore(20f);
        footer.setWidths(new float[]{50f, 50f});

        PdfPCell c1 = new PdfPCell();
        c1.setBorder(Rectangle.NO_BORDER);
        c1.addElement(new Paragraph("Le Responsable Pédagogique", signTitle));
        c1.addElement(new Paragraph("\n\n________________________", signLine));
        footer.addCell(c1);

        PdfPCell c2 = new PdfPCell();
        c2.setBorder(Rectangle.NO_BORDER);
        c2.addElement(new Paragraph("Le Directeur", signTitle));
        c2.addElement(new Paragraph("\n\n________________________", signLine));
        footer.addCell(c2);

        doc.add(footer);
    }

    // ══════════════════════════════════════════════════════════════
    //  CELLULE CRÉNEAU (statut)
    // ══════════════════════════════════════════════════════════════
    private PdfPCell buildSlotCell(String status, Color defaultBg, float height) {
        String text;
        Color  bg;
        Color  fg;

        switch (status == null ? "" : status) {
            case "PRESENT":
                text = "P";  bg = GREEN_BG;   fg = PRESENT_GRN; break;
            case "ABSENT":
                text = "A";  bg = RED_BG;     fg = ABSENT_RED;  break;
            case "EXCUSED":
                text = "J";  bg = YELLOW_BG;  fg = DARK_GRAY;   break;
            case "LATE":
                text = "R";  bg = ORANGE_BG;  fg = DARK_GRAY;   break;
            default:
                // Créneau hors séance ou pas encore enregistré → cellule vide
                text = "";   bg = defaultBg;  fg = Color.BLACK; break;
        }

        Font f = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, fg);
        PdfPCell cell = new PdfPCell(new Phrase(text, f));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(2f);
        cell.setFixedHeight(height);
        cell.setBorderColor(MID_GRAY);
        cell.setBorderWidth(0.4f);
        return cell;
    }

    // ══════════════════════════════════════════════════════════════
    //  RÉSOLUTION DU STATUT PAR CRÉNEAU
    // ══════════════════════════════════════════════════════════════

    /**
     * Retourne le statut de l'étudiant pour un créneau donné.
     * Si la séance ne couvre pas ce créneau → null (cellule vide).
     * Si elle le couvre → on regarde hourSlots puis le statut global.
     */
    private String resolveSlotStatus(AttendanceRecordDto rec,
                                     SessionDto session, int slotIndex) {
        // Vérifier si la séance couvre ce créneau
        if (!sessionCoversSlot(session, slotIndex)) return null;

        // Chercher dans hourSlots
        if (rec.getHourSlots() != null && session != null && session.getStartTime() != null) {
            int slotStart = FIXED_SLOTS[slotIndex][0];
            int relativeHour = slotStart - session.getStartTime().getHour();
            for (AttendanceHourDto h : rec.getHourSlots()) {
                if (h.getHourIndex() != null && h.getHourIndex() == relativeHour) {
                    return h.getStatus() != null ? h.getStatus().name() : null;
                }
            }
        }

        // Fallback sur le statut global
        return rec.getStatus() != null ? rec.getStatus().name() : null;
    }

    /**
     * Vérifie si la séance couvre le créneau horaire donné par son index.
     */
    private boolean sessionCoversSlot(SessionDto session, int slotIndex) {
        if (session == null) return true; // si pas de session, on affiche tout
        LocalTime start = session.getStartTime();
        LocalTime end   = session.getEndTime();
        if (start == null || end == null) return true;

        int slotStart = FIXED_SLOTS[slotIndex][0];
        int slotEnd   = FIXED_SLOTS[slotIndex][1];
        return start.getHour() <= slotStart && end.getHour() >= slotEnd;
    }

    /**
     * Retourne le nom de l'enseignant si la séance couvre ce créneau, sinon "".
     */
    private String resolveTeacherForSlot(SessionDto session, int slotIndex) {
        if (session == null) return "";
        if (!sessionCoversSlot(session, slotIndex)) return "";
        return nvl(session.getTeacherName());
    }

    // ══════════════════════════════════════════════════════════════
    //  MÉTHODES UTILITAIRES — CELLULES
    // ══════════════════════════════════════════════════════════════

    private void addHdrCell(PdfPTable table, String text, Font font,
                            Color bg, int align, float height) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(3f);
        cell.setFixedHeight(height);
        cell.setBorderColor(MID_GRAY);
        cell.setBorderWidth(0.5f);
        table.addCell(cell);
    }

    private void addDataCell(PdfPTable table, String text, Font font,
                             Color bg, int align, boolean border, float height) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPaddingLeft(3f);
        cell.setPaddingRight(2f);
        cell.setPaddingTop(2f);
        cell.setPaddingBottom(2f);
        cell.setFixedHeight(height);
        cell.setBorderColor(MID_GRAY);
        cell.setBorderWidth(border ? 0.4f : 0f);
        table.addCell(cell);
    }

    private void addInfoCell(PdfPTable table, String label,
                             String value, Font font) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);
        Font bold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, Color.BLACK);
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + ": ", font));
        p.add(new Chunk(value, bold));
        cell.addElement(p);
        table.addCell(cell);
    }

    private void addEmptyOrPrefilledCell(PdfPTable table, String text,
                                         Color bg, float height, boolean center) {
        Font f = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, DARK_GRAY);
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", f));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(center ? Element.ALIGN_CENTER : Element.ALIGN_LEFT);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPaddingLeft(4f);
        cell.setPaddingRight(2f);
        cell.setFixedHeight(height);
        cell.setBorderColor(MID_GRAY);
        cell.setBorderWidth(0.4f);
        table.addCell(cell);
    }

    private String nvl(String s) { return s != null ? s : ""; }

    // ══════════════════════════════════════════════════════════════
    //  EXPORT EMPLOI DU TEMPS (inchangé)
    // ══════════════════════════════════════════════════════════════
    @Override
    public ByteArrayInputStream exportTimetableToPdf(TimetablecontentDto timetableDto) {
        Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            addTimetableHeader(document, "CLASSROOM TIMETABLE",
                    timetableDto.getClassroomName());

            java.time.LocalDate startDate = timetableDto.getStartDate();
            java.time.LocalDate endDate   = timetableDto.getEndDate();

            if ((startDate == null || endDate == null) && timetableDto.getWeek() != null) {
                int isoWeek = timetableDto.getWeek();
                int year = java.time.LocalDate.now().getYear();
                java.time.LocalDate weekStart = java.time.LocalDate.ofYearDay(year, 1)
                        .with(java.time.temporal.WeekFields.ISO.weekOfYear(), isoWeek)
                        .with(java.time.DayOfWeek.MONDAY);
                if (startDate == null) startDate = weekStart;
                if (endDate   == null) endDate   = weekStart.plusDays(5);
            }

            java.time.format.DateTimeFormatter dateFmt =
                    java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy");
            String dateRange = (startDate != null && endDate != null)
                    ? startDate.format(dateFmt) + " - " + endDate.format(dateFmt)
                    : "Week " + timetableDto.getWeek();

            PdfPTable metaTable = new PdfPTable(3);
            metaTable.setWidthPercentage(100);
            metaTable.setSpacingAfter(15);
            addMetaCell(metaTable, "ACADEMIC YEAR",
                    timetableDto.getAcademicYearName(), Element.ALIGN_LEFT);
            addMetaCell(metaTable, "SEMESTER",
                    String.valueOf(timetableDto.getSemester()), Element.ALIGN_CENTER);
            addMetaCell(metaTable, "DURATION", dateRange, Element.ALIGN_RIGHT);
            document.add(metaTable);

            List<TimetableEntryDto> allEntries = timetableDto.getEntries();
            if (allEntries == null || allEntries.isEmpty()) {
                Paragraph emptyMsg = new Paragraph(
                        "No schedule entries found for this week.",
                        FontFactory.getFont(FontFactory.HELVETICA, 12, Color.GRAY));
                emptyMsg.setAlignment(Element.ALIGN_CENTER);
                emptyMsg.setSpacingBefore(50);
                document.add(emptyMsg);
            } else {
                PdfPTable table = new PdfPTable(7);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{1.2f, 2f, 2f, 2f, 2f, 2f, 2f});

                String[] headers = {"TIME","MONDAY","TUESDAY","WEDNESDAY",
                        "THURSDAY","FRIDAY","SATURDAY"};
                for (String h : headers) {
                    PdfPCell cell = new PdfPCell(new Phrase(h,
                            FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE)));
                    cell.setPadding(8);
                    cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    cell.setBackgroundColor(new Color(30, 41, 59));
                    cell.setBorder(Rectangle.NO_BORDER);
                    table.addCell(cell);
                }

                int[] skipCells = new int[6];
                for (int hour = 8; hour <= 16; hour++) {
                    PdfPCell timeCell = new PdfPCell(new Phrase(
                            String.format("%02d:00\n%02d:00", hour, hour + 1),
                            FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8,
                                    new Color(100, 116, 139))));
                    timeCell.setPadding(8);
                    timeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    timeCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                    timeCell.setBackgroundColor(new Color(248, 250, 252));
                    timeCell.setBorder(Rectangle.BOTTOM);
                    timeCell.setBorderColor(Color.WHITE);
                    table.addCell(timeCell);

                    for (int dayIndex = 0; dayIndex <= 5; dayIndex++) {
                        if (skipCells[dayIndex] > 0) {
                            skipCells[dayIndex]--;
                            continue;
                        }
                        final int ch = hour, cd = dayIndex;
                        TimetableEntryDto entry = allEntries.stream()
                                .filter(e -> {
                                    int dIdx = e.getDayOfWeek() != null
                                            ? e.getDayOfWeek() : -1;
                                    if (dIdx == -1 && e.getDay() != null) {
                                        switch (e.getDay().toUpperCase()) {
                                            case "MONDAY":    dIdx = 0; break;
                                            case "TUESDAY":   dIdx = 1; break;
                                            case "WEDNESDAY": dIdx = 2; break;
                                            case "THURSDAY":  dIdx = 3; break;
                                            case "FRIDAY":    dIdx = 4; break;
                                            case "SATURDAY":  dIdx = 5; break;
                                        }
                                    }
                                    return dIdx == cd && e.getStartTime() != null
                                            && e.getStartTime().getHour() == ch;
                                })
                                .findFirst().orElse(null);

                        if (entry != null) {
                            int duration = entry.getEndTime().getHour()
                                    - entry.getStartTime().getHour();
                            if (duration < 1) duration = 1;
                            skipCells[dayIndex] = duration - 1;

                            Color bgColor = new Color(224, 242, 254);
                            Color textColor = Color.BLACK;
                            if (entry.getColor() != null
                                    && entry.getColor().startsWith("#")) {
                                try {
                                    bgColor = Color.decode(entry.getColor());
                                    textColor = isDarkColor(bgColor)
                                            ? Color.WHITE : Color.BLACK;
                                } catch (Exception e) {
                                    log.error("Failed to decode color: {}", entry.getColor(), e);
                                }
                            }

                            String content = Boolean.TRUE.equals(entry.getIsEvent())
                                    ? (entry.getEventName() != null
                                    ? entry.getEventName() : "EVENT")
                                    : entry.getCourseName().toUpperCase() + "\n\n"
                                    + (entry.getTeacherName() != null
                                    ? entry.getTeacherName() : "");

                            PdfPCell cell = new PdfPCell(new Phrase(content,
                                    FontFactory.getFont(FontFactory.HELVETICA_BOLD,
                                            8, textColor)));
                            cell.setRowspan(duration);
                            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                            cell.setPadding(10);
                            cell.setBackgroundColor(bgColor);
                            cell.setBorder(Rectangle.BOX);
                            cell.setBorderWidth(1.5f);
                            cell.setBorderColor(Color.WHITE);
                            table.addCell(cell);
                        } else {
                            PdfPCell emptyCell = new PdfPCell(new Phrase(""));
                            emptyCell.setBackgroundColor(
                                    hour % 2 == 0
                                            ? Color.WHITE
                                            : new Color(253, 253, 253));
                            emptyCell.setBorder(Rectangle.BOX);
                            emptyCell.setBorderWidth(0.5f);
                            emptyCell.setBorderColor(new Color(241, 245, 249));
                            table.addCell(emptyCell);
                        }
                    }
                }
                document.add(table);
            }

            addTimetableFooter(document);
            document.close();

        } catch (Exception ex) {
            throw new RuntimeException("Error during Timetable PDF generation", ex);
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    // ── Helpers emploi du temps (inchangés) ──────────────────────
    private void addTimetableHeader(Document document, String mainTitle,
                                    String subTitle) throws Exception {
        PdfPTable header = new PdfPTable(2);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{1, 3});
        header.setSpacingAfter(10);

        try {
            Image img = Image.getInstance(
                    "src/main/resources/static/image/Logo_SJ.png");
            img.scaleToFit(70, 70);
            PdfPCell logoCell = new PdfPCell(img);
            logoCell.setBorder(Rectangle.NO_BORDER);
            header.addCell(logoCell);
        } catch (Exception e) {
            header.addCell(new PdfPCell(
                    new Phrase("", FontFactory.getFont(FontFactory.HELVETICA, 8))));
        }

        PdfPCell textCell = new PdfPCell();
        textCell.setBorder(Rectangle.NO_BORDER);
        textCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        textCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        Paragraph p1 = new Paragraph("SAINT JEAN INGENIEUR\n",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14,
                        new Color(0, 176, 255)));
        p1.setAlignment(Element.ALIGN_RIGHT);
        textCell.addElement(p1);

        Paragraph p2 = new Paragraph(mainTitle + "\n",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12,
                        new Color(51, 65, 85)));
        p2.setAlignment(Element.ALIGN_RIGHT);
        textCell.addElement(p2);

        Paragraph p3 = new Paragraph(subTitle != null ? subTitle.toUpperCase() : "",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.GRAY));
        p3.setAlignment(Element.ALIGN_RIGHT);
        textCell.addElement(p3);

        header.addCell(textCell);
        document.add(header);

        PdfPTable line = new PdfPTable(1);
        line.setWidthPercentage(100);
        PdfPCell lCell = new PdfPCell();
        lCell.setBorder(Rectangle.BOTTOM);
        lCell.setBorderWidth(2f);
        lCell.setBorderColor(new Color(0, 176, 255));
        line.addCell(lCell);
        document.add(line);
        document.add(Chunk.NEWLINE);
    }

    private void addMetaCell(PdfPTable table, String label,
                             String value, int align) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(align);
        Paragraph p = new Paragraph(label + ": ",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8,
                        new Color(100, 116, 139)));
        p.add(new Chunk(value != null ? value : "N/A",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8,
                        new Color(30, 41, 59))));
        cell.addElement(p);
        table.addCell(cell);
    }

    private void addTimetableFooter(Document document) throws Exception {
        Paragraph footer = new Paragraph(
                "\nGenerated on "
                        + java.time.LocalDateTime.now().format(
                        java.time.format.DateTimeFormatter.ofPattern(
                                "dd/MM/yyyy HH:mm"))
                        + " | Attendee Management System",
                FontFactory.getFont(FontFactory.HELVETICA, 7, Color.LIGHT_GRAY));
        footer.setAlignment(Element.ALIGN_CENTER);
        document.add(footer);
    }

    private boolean isDarkColor(Color color) {
        double brightness = (color.getRed() * 0.299 + color.getGreen() * 0.587
                + color.getBlue() * 0.114) / 255;
        return brightness < 0.6;
    }
}