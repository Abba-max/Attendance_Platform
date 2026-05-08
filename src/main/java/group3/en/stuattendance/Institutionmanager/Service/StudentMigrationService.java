package group3.en.stuattendance.Institutionmanager.Service;

import group3.en.stuattendance.Institutionmanager.DTO.*;
import group3.en.stuattendance.Institutionmanager.Model.AcademicYear;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.StudentClassHistory;
import group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Institutionmanager.Repository.StudentClassHistoryRepository;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class StudentMigrationService {

    private final UserRepository userRepository;
    private final ClassroomRepository classroomRepository;
    private final StudentClassHistoryRepository historyRepository;
    private final AcademicYearRepository academicYearRepository;

    public StudentMigrationService(UserRepository userRepository,
                                   ClassroomRepository classroomRepository,
                                   StudentClassHistoryRepository historyRepository,
                                   AcademicYearRepository academicYearRepository) {
        this.userRepository = userRepository;
        this.classroomRepository = classroomRepository;
        this.historyRepository = historyRepository;
        this.academicYearRepository = academicYearRepository;
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 1 — Informations sur le pédagogue connecté
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Retourne true si l'une des classes gérées par ce pédagogue
     * est un Tronc Commun (déterminé par le nom de la spécialité).
     */
    public boolean pedagHasTroncCommun(User pedagog) {
        return pedagog.getStaffClassrooms().stream()
                .anyMatch(StudentMigrationService::isTroncCommunClassroom);
    }

    /**
     * Détecte si une classe est de type "Tronc Commun"
     * en vérifiant si le nom de sa spécialité contient "tronc" ou "commun"
     * (insensible à la casse).
     */
    public static boolean isTroncCommunClassroom(Classroom classroom) {
        if (classroom.getSpeciality() == null) return false;
        String sName = classroom.getSpeciality().getName().toLowerCase();
        return sName.contains("tronc") || sName.contains("commun");
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 2 — Récupération des classes disponibles selon le type
    //             de migration (endpoint principal du frontend)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Retourne les classes SOURCE (gérées par le pédagogue) et les classes CIBLES
     * disponibles selon le type de migration demandé.
     *
     * @param migrationType type de migration : LEVEL_PROMOTION, SPECIALITY_CHANGE, TRONC_COMMUN
     * @param sourceClassroomId classe source choisie (peut être null pour initialisation)
     */
    public AvailableMigrationTargetsDto getAvailableMigrationTargets(
            MigrationTypeDto migrationType,
            Integer sourceClassroomId) {

        User pedagog = getCurrentUser();
        boolean hasTronc = pedagHasTroncCommun(pedagog);

        // ── Classes source gérées par le pédagogue ──────────────────────
        List<Classroom> managedClassrooms = classroomRepository.findByStaffUserId(pedagog.getUserId());

        // Si TRONC_COMMUN demandé mais le pédagogue ne gère pas de TC → erreur
        if (migrationType == MigrationTypeDto.TRONC_COMMUN && !hasTronc) {
            throw new AccessDeniedException(
                    "Vous ne gérez pas de classe Tronc Commun. " +
                            "Ce type de migration n'est pas disponible pour votre compte.");
        }

        // ── Classes source filtrées selon le type de migration ──────────
        List<Classroom> sourceList;
        if (migrationType == MigrationTypeDto.TRONC_COMMUN) {
            // Source = uniquement les TC gérés par ce pédagogue
            sourceList = managedClassrooms.stream()
                    .filter(StudentMigrationService::isTroncCommunClassroom)
                    .collect(Collectors.toList());
        } else {
            sourceList = managedClassrooms;
        }

        // ── Classes cibles selon le type et la classe source choisie ────
        List<Classroom> targetList = resolveTargetClassrooms(migrationType, sourceClassroomId, pedagog);

        // ── Construction de la réponse ───────────────────────────────────
        AvailableMigrationTargetsDto dto = new AvailableMigrationTargetsDto();
        dto.setMigrationType(migrationType);
        dto.setPedagHasTroncCommun(hasTronc);
        dto.setSourceClassrooms(toSummaryList(sourceList));
        dto.setTargetClassrooms(toSummaryList(targetList));
        return dto;
    }

    /**
     * Résout les classes cibles disponibles selon le type de migration
     * et la classe source sélectionnée.
     */
    private List<Classroom> resolveTargetClassrooms(
            MigrationTypeDto type,
            Integer sourceClassroomId,
            User pedagog) {

        if (sourceClassroomId == null) return List.of();

        Classroom source = classroomRepository.findById(sourceClassroomId)
                .orElseThrow(() -> new RuntimeException("Classe source introuvable : " + sourceClassroomId));

        // Vérifier que le pédagogue gère bien cette classe source
        boolean manages = pedagog.getStaffClassrooms().stream()
                .anyMatch(c -> c.getClassId().equals(source.getClassId()));

        // Pour TRONC_COMMUN : la source doit être un TC géré par lui
        if (type == MigrationTypeDto.TRONC_COMMUN) {
            if (!isTroncCommunClassroom(source)) {
                throw new AccessDeniedException("La classe source n'est pas un Tronc Commun.");
            }
            // Cibles = toutes les classes spécialité au niveau source+1 (ex. TC L2 → spécialités L3)
            int targetLevel = source.getLevel() != null ? source.getLevel() + 1 : 3;
            return classroomRepository.findAllSpecialityClassroomsAtLevel(targetLevel);
        }

        // Pour les autres types, vérifier que le pédagogue gère la classe source
        if (!manages) {
            throw new AccessDeniedException(
                    "Vous ne gérez pas la classe source sélectionnée.");
        }

        return switch (type) {
            case LEVEL_PROMOTION -> {
                // Même spécialité, niveau suivant
                if (source.getSpeciality() == null || source.getLevel() == null) yield List.of();
                int nextLevel = source.getLevel() + 1;
                yield classroomRepository
                        .findBySpeciality_SpecialityIdAndLevel(
                                source.getSpeciality().getSpecialityId(), nextLevel);
            }
            case SPECIALITY_CHANGE -> {
                // Même niveau, spécialité différente (non-TC)
                if (source.getSpeciality() == null || source.getLevel() == null) yield List.of();
                yield classroomRepository
                        .findByLevelAndSpecialityNot(
                                source.getLevel(),
                                source.getSpeciality().getSpecialityId())
                        .stream()
                        .filter(c -> !isTroncCommunClassroom(c))
                        .collect(Collectors.toList());
            }
            default -> List.of();
        };
    }

    /** Convertit une liste de Classroom en liste de résumés DTO. */
    private List<AvailableMigrationTargetsDto.ClassroomSummaryDto> toSummaryList(List<Classroom> classrooms) {
        return classrooms.stream().map(c -> {
            int occupied = c.getStudents() != null ? c.getStudents().size() : 0;
            int slots = c.getCapacity() != null ? c.getCapacity() - occupied : 0;
            String specName = c.getSpeciality() != null ? c.getSpeciality().getName() : "—";
            return new AvailableMigrationTargetsDto.ClassroomSummaryDto(
                    c.getClassId(),
                    c.getName(),
                    c.getLevel(),
                    specName,
                    Math.max(slots, 0),
                    isTroncCommunClassroom(c)
            );
        }).collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 3 — Récupération des étudiants d'une classe
    // ═══════════════════════════════════════════════════════════════════

    public List<StudentSelectionDto> getStudentsInClassroom(Integer classroomId) {
        classroomRepository.findById(classroomId)
                .orElseThrow(() -> new RuntimeException("Classroom not found: " + classroomId));
        return userRepository
                .findByClassroomClassIdAndRolesName(classroomId, "STUDENT")
                .stream().map(s -> toSelectionDto(s, classroomId))
                .collect(Collectors.toList());
    }

    public List<StudentSelectionDto> getStudentsInClassroom(Integer classroomId, Long academicYearId) {
        if (academicYearId == null) return getStudentsInClassroom(classroomId);

        classroomRepository.findById(classroomId)
                .orElseThrow(() -> new RuntimeException("Classroom not found: " + classroomId));
        AcademicYear year = academicYearRepository.findById(academicYearId)
                .orElseThrow(() -> new RuntimeException("Academic year not found: " + academicYearId));

        if (year.isActive()) return getStudentsInClassroom(classroomId);

        java.util.Map<Integer, User> unique = new java.util.LinkedHashMap<>();
        historyRepository.findByFromClassroom_ClassIdAndAcademicYear_Id(classroomId, academicYearId)
                .forEach(h -> { if (h.getStudent() != null) unique.put(h.getStudent().getUserId(), h.getStudent()); });
        historyRepository.findByToClassroom_ClassIdAndAcademicYear_Id(classroomId, academicYearId)
                .forEach(h -> { if (h.getStudent() != null) unique.put(h.getStudent().getUserId(), h.getStudent()); });

        return unique.values().stream()
                .map(s -> toSelectionDto(s, classroomId))
                .collect(Collectors.toList());
    }

    private StudentSelectionDto toSelectionDto(User s, Integer classroomId) {
        StudentSelectionDto dto = new StudentSelectionDto();
        dto.setStudentId(s.getUserId());
        dto.setFullName(s.getFirstName() + " " + s.getLastName());
        dto.setMatricule(s.getMatricule());
        dto.setEmail(s.getEmail());
        dto.setClassroomId(classroomId);
        return dto;
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 4 — Migration d'un étudiant unique
    // ═══════════════════════════════════════════════════════════════════

    @Transactional
    public MigrationResponse migrateStudent(MigrateStudentRequest request) {

        User student = userRepository.findById(request.getStudentId())
                .orElseThrow(() -> new RuntimeException("Étudiant introuvable : " + request.getStudentId()));

        Classroom toClassroom = classroomRepository.findById(request.getToClassroomId())
                .orElseThrow(() -> new RuntimeException("Classe cible introuvable : " + request.getToClassroomId()));

        AcademicYear academicYear = resolveAcademicYear(
                request.getAcademicYearId(),
                Boolean.TRUE.equals(request.getUseNextAcademicYear()));

        Classroom fromClassroom = student.getClassroom();
        if (fromClassroom == null)
            throw new RuntimeException("L'étudiant n'est assigné à aucune classe.");
        if (fromClassroom.getClassId().equals(toClassroom.getClassId()))
            throw new RuntimeException("L'étudiant est déjà dans la classe cible.");
        if (toClassroom.isAtCapacity())
            throw new RuntimeException("La classe cible est à pleine capacité.");

        User migratedBy = getCurrentUser();
        saveHistory(student, fromClassroom, toClassroom, academicYear, migratedBy, request.getReason());
        student.setClassroom(toClassroom);
        userRepository.save(student);

        return new MigrationResponse(true, "Étudiant migré avec succès.",
                student.getUserId(), student.getFirstName() + " " + student.getLastName(),
                fromClassroom.getName(), toClassroom.getName());
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 5 — Migration en masse (avec type de migration)
    // ═══════════════════════════════════════════════════════════════════

    @Transactional
    public List<MigrationResponse> migrateBulkStudents(MigrateBulkStudentsRequest request) {

        List<MigrationResponse> responses = new ArrayList<>();
        User pedagog = getCurrentUser();
        AcademicYear academicYear = resolveAcademicYear(
                request.getAcademicYearId(),
                Boolean.TRUE.equals(request.getUseNextAcademicYear()));

        MigrationTypeDto type = request.getMigrationType() != null
                ? request.getMigrationType()
                : MigrationTypeDto.LEVEL_PROMOTION;

        // ── Résoudre la classe cible ─────────────────────────────────
        Classroom toClassroom = resolveToClassroomForBulk(request, type, pedagog);

        // ── Traiter chaque étudiant ──────────────────────────────────
        for (Integer studentId : request.getStudentIds()) {
            try {
                User student = userRepository.findById(studentId)
                        .orElseThrow(() -> new RuntimeException("Étudiant introuvable : " + studentId));

                Classroom from = student.getClassroom();
                if (from == null) {
                    responses.add(fail(studentId, student, null, toClassroom, "Aucune classe assignée."));
                    continue;
                }
                if (from.getClassId().equals(toClassroom.getClassId())) {
                    responses.add(fail(studentId, student, from, toClassroom, "Déjà dans la classe cible."));
                    continue;
                }
                if (toClassroom.isAtCapacity()) {
                    responses.add(fail(studentId, student, from, toClassroom, "Classe cible à pleine capacité."));
                    continue;
                }

                saveHistory(student, from, toClassroom, academicYear, pedagog, request.getReason());
                student.setClassroom(toClassroom);
                userRepository.save(student);

                responses.add(new MigrationResponse(true, "Migré avec succès.",
                        student.getUserId(), student.getFirstName() + " " + student.getLastName(),
                        from.getName(), toClassroom.getName()));

            } catch (Exception e) {
                responses.add(new MigrationResponse(false, e.getMessage(), studentId, null, null, null));
            }
        }
        return responses;
    }

    /**
     * Résout la classe cible pour une migration en masse
     * en tenant compte du type de migration.
     */
    private Classroom resolveToClassroomForBulk(
            MigrateBulkStudentsRequest request,
            MigrationTypeDto type,
            User pedagog) {

        // LEVEL_PROMOTION avec autoNextLevel
        if (type == MigrationTypeDto.LEVEL_PROMOTION && request.isAutoNextLevel()) {
            Classroom from = classroomRepository.findById(request.getFromClassroomId())
                    .orElseThrow(() -> new RuntimeException("Classe source introuvable."));
            int next = from.getLevel() + 1;
            return classroomRepository
                    .findFirstBySpeciality_SpecialityIdAndLevel(
                            from.getSpeciality().getSpecialityId(), next)
                    .orElseThrow(() -> new RuntimeException(
                            "Aucune classe trouvée au niveau " + next + " pour cette spécialité."));
        }

        // TRONC_COMMUN : vérifier que le pédagogue gère un TC
        if (type == MigrationTypeDto.TRONC_COMMUN && !pedagHasTroncCommun(pedagog)) {
            throw new AccessDeniedException(
                    "Vous ne gérez pas de classe Tronc Commun.");
        }

        // Par défaut : utiliser toClassroomId fourni
        return classroomRepository.findById(request.getToClassroomId())
                .orElseThrow(() -> new RuntimeException("Classe cible introuvable."));
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 6 — Historique des migrations d'un étudiant
    // ═══════════════════════════════════════════════════════════════════

    public List<ClassHistoryResponse> getStudentHistory(Integer studentId) {
        return historyRepository.findByStudent_UserIdOrderByMigratedAtDesc(studentId)
                .stream().map(h -> {
                    ClassHistoryResponse dto = new ClassHistoryResponse();
                    dto.setHistoryId(h.getHistoryId());
                    dto.setStudentId(h.getStudent().getUserId());
                    dto.setStudentName(h.getStudent().getFirstName() + " " + h.getStudent().getLastName());
                    dto.setFromClassroom(h.getFromClassroom().getName());
                    dto.setToClassroom(h.getToClassroom().getName());
                    dto.setReason(h.getReason());
                    dto.setMigratedAt(h.getMigratedAt());
                    if (h.getMigratedBy() != null)
                        dto.setMigratedBy(h.getMigratedBy().getFirstName() + " " + h.getMigratedBy().getLastName());
                    if (h.getAcademicYear() != null)
                        dto.setAcademicYear(h.getAcademicYear().getAcademicYear());
                    return dto;
                }).collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════════════
    // Helpers privés
    // ═══════════════════════════════════════════════════════════════════

    public AcademicYear getOrCreateNextAcademicYear() {
        return academicYearRepository.findNextAcademicYear()
                .orElseGet(() -> {
                    AcademicYear current = academicYearRepository.findActiveAcademicYear()
                            .orElseThrow(() -> new RuntimeException("Aucune année académique active."));
                    AcademicYear next = new AcademicYear();
                    next.setAcademicYear(generateNextYearName(current.getAcademicYear()));
                    next.setStartDate(current.getEndDate().plusDays(1));
                    next.setEndDate(next.getStartDate().plusYears(1).minusDays(1));
                    next.setStatus(AcademicYearStatus.PLANNED);
                    return academicYearRepository.save(next);
                });
    }

    private String generateNextYearName(String current) {
        String[] parts = current.split("/");
        int start = Integer.parseInt(parts[0].trim());
        return (start + 1) + "/" + (start + 2);
    }

    private AcademicYear resolveAcademicYear(Long academicYearId, boolean useNextYear) {
        if (useNextYear) return getOrCreateNextAcademicYear();
        if (academicYearId != null) return academicYearRepository.findById(academicYearId)
                .orElseThrow(() -> new RuntimeException("Année académique introuvable."));
        return academicYearRepository.findActiveAcademicYear()
                .orElseThrow(() -> new RuntimeException("Aucune année académique active."));
    }

    private void saveHistory(User student, Classroom from, Classroom to,
                             AcademicYear year, User migratedBy, String reason) {
        StudentClassHistory h = new StudentClassHistory();
        h.setStudent(student);
        h.setFromClassroom(from);
        h.setToClassroom(to);
        h.setAcademicYear(year);
        h.setMigratedBy(migratedBy);
        h.setReason(reason);
        historyRepository.save(h);
    }

    private MigrationResponse fail(Integer id, User s, Classroom from, Classroom to, String msg) {
        return new MigrationResponse(false, msg, id,
                s != null ? s.getFirstName() + " " + s.getLastName() : null,
                from != null ? from.getName() : null,
                to != null ? to.getName() : null);
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur connecté introuvable."));
    }
}