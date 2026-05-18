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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class StudentMigrationService {

    private final UserRepository userRepository;
    private final ClassroomRepository classroomRepository;
    private final StudentClassHistoryRepository historyRepository;
    private final AcademicYearRepository academicYearRepository;

    /**
     * Helper dédié à la résolution de l'année académique selon le type de
     * migration.
     * - LEVEL_PROMOTION / TRONC_COMMUN → année N+1 (PLANNED)
     * - SPECIALITY_CHANGE → année N (ACTIVE)
     */
    private final MigrationAcademicYearHelper yearHelper;

    public StudentMigrationService(UserRepository userRepository,
            ClassroomRepository classroomRepository,
            StudentClassHistoryRepository historyRepository,
            AcademicYearRepository academicYearRepository,
            MigrationAcademicYearHelper yearHelper) {
        this.userRepository = userRepository;
        this.classroomRepository = classroomRepository;
        this.historyRepository = historyRepository;
        this.academicYearRepository = academicYearRepository;
        this.yearHelper = yearHelper;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 1. Contexte années académiques (pour l'affichage frontend)
    // ═══════════════════════════════════════════════════════════════════════

    /** Retourne le contexte N / N+1 pour affichage dans le dashboard pédagogue. */
    public MigrationAcademicYearContextdto getAcademicYearContext() {
        return yearHelper.buildContext();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. Contexte du pédagogue (classes gérées, hasTroncCommun)
    // ═══════════════════════════════════════════════════════════════════════

    public boolean pedagHasTroncCommun(User pedagog) {
        return pedagog.getStaffClassrooms().stream()
                .anyMatch(StudentMigrationService::isTroncCommunClassroom);
    }

    public static boolean isTroncCommunClassroom(Classroom c) {
        if (c.getSpeciality() == null)
            return false;
        String n = c.getSpeciality().getName().toLowerCase();
        return n.contains("tronc") || n.contains("commun");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. Classes source/cible disponibles selon le type de migration
    // ═══════════════════════════════════════════════════════════════════════

    public AvailableMigrationTargetsdto getAvailableMigrationTargets(
            MigrationTypedto migrationType, Integer sourceClassroomId) {

        User pedagog = getCurrentUser();
        boolean hasTronc = pedagHasTroncCommun(pedagog);

        if (migrationType == MigrationTypedto.TRONC_COMMUN && !hasTronc) {
            throw new AccessDeniedException(
                    "Vous ne gérez pas de classe Tronc Commun.");
        }

        List<Classroom> managed = classroomRepository.findByStaffUserId(pedagog.getUserId());

        List<Classroom> sourceList = (migrationType == MigrationTypedto.TRONC_COMMUN)
                ? managed.stream().filter(StudentMigrationService::isTroncCommunClassroom).collect(Collectors.toList())
                : managed;

        List<Classroom> targetList = resolveTargetClassrooms(migrationType, sourceClassroomId, pedagog);

        AvailableMigrationTargetsdto dto = new AvailableMigrationTargetsdto();
        dto.setMigrationType(migrationType);
        dto.setPedagHasTroncCommun(hasTronc);
        dto.setSourceClassrooms(toSummaryList(sourceList));
        dto.setTargetClassrooms(toSummaryList(targetList));
        return dto;
    }

    private List<Classroom> resolveTargetClassrooms(
            MigrationTypedto type, Integer sourceId, User pedagog) {

        if (sourceId == null)
            return List.of();

        Classroom source = classroomRepository.findById(sourceId)
                .orElseThrow(() -> new RuntimeException("Classe source introuvable : " + sourceId));

        boolean manages = pedagog.getStaffClassrooms().stream()
                .anyMatch(c -> c.getClassId().equals(source.getClassId()));

        if (type == MigrationTypedto.TRONC_COMMUN) {
            if (!isTroncCommunClassroom(source))
                throw new AccessDeniedException("La classe source n'est pas un Tronc Commun.");
            int targetLevel = source.getLevel() != null ? source.getLevel() + 1 : 3;
            return classroomRepository.findAllSpecialityClassroomsAtLevel(targetLevel);
        }

        if (!manages)
            throw new AccessDeniedException("Vous ne gérez pas la classe source sélectionnée.");

        return switch (type) {
            case LEVEL_PROMOTION -> {
                if (source.getSpeciality() == null || source.getLevel() == null)
                    yield List.of();
                yield classroomRepository.findBySpeciality_SpecialityIdAndLevel(
                        source.getSpeciality().getSpecialityId(), source.getLevel() + 1);
            }
            case SPECIALITY_CHANGE -> {
                if (source.getSpeciality() == null || source.getLevel() == null)
                    yield List.of();
                yield classroomRepository
                        .findByLevelAndSpecialityNot(source.getLevel(),
                                source.getSpeciality().getSpecialityId())
                        .stream().filter(c -> !isTroncCommunClassroom(c))
                        .collect(Collectors.toList());
            }
            default -> List.of();
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. Étudiants d'une classe
    // ═══════════════════════════════════════════════════════════════════════

    public List<StudentSelectionDto> getStudentsInClassroom(Integer classroomId) {
        classroomRepository.findById(classroomId)
                .orElseThrow(() -> new RuntimeException("Classe introuvable : " + classroomId));
        return userRepository.findByClassroomClassIdAndRolesName(classroomId, "STUDENT")
                .stream().map(s -> toSelectionDto(s, classroomId)).collect(Collectors.toList());
    }

    public List<StudentSelectionDto> getStudentsInClassroom(Integer classroomId, Long academicYearId) {
        if (academicYearId == null)
            return getStudentsInClassroom(classroomId);

        classroomRepository.findById(classroomId)
                .orElseThrow(() -> new RuntimeException("Classe introuvable : " + classroomId));
        AcademicYear year = academicYearRepository.findById(academicYearId)
                .orElseThrow(() -> new RuntimeException("Année introuvable : " + academicYearId));

        if (year.isActive())
            return getStudentsInClassroom(classroomId);

        java.util.Map<Integer, User> unique = new java.util.LinkedHashMap<>();
        historyRepository.findByFromClassroom_ClassIdAndAcademicYear_Id(classroomId, academicYearId)
                .forEach(h -> {
                    if (h.getStudent() != null)
                        unique.put(h.getStudent().getUserId(), h.getStudent());
                });
        historyRepository.findByToClassroom_ClassIdAndAcademicYear_Id(classroomId, academicYearId)
                .forEach(h -> {
                    if (h.getStudent() != null)
                        unique.put(h.getStudent().getUserId(), h.getStudent());
                });

        return unique.values().stream()
                .map(s -> toSelectionDto(s, classroomId)).collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. Migration d'un étudiant unique
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional
    public MigrationResponse migrateStudent(MigrateStudentRequest request) {

        User student = userRepository.findById(request.getStudentId())
                .orElseThrow(() -> new RuntimeException("Étudiant introuvable : " + request.getStudentId()));

        Classroom toClassroom = classroomRepository.findById(request.getToClassroomId())
                .orElseThrow(() -> new RuntimeException("Classe cible introuvable : " + request.getToClassroomId()));

        // Résolution de l'année académique selon le type de migration
        MigrationTypedto type = request.getMigrationType() != null
                ? request.getMigrationType()
                : MigrationTypedto.LEVEL_PROMOTION;
        AcademicYear academicYear = yearHelper.resolveForMigration(type);

        Classroom from = student.getClassroom();
        if (from == null)
            throw new RuntimeException("L'étudiant n'a aucune classe assignée.");
        if (from.getClassId().equals(toClassroom.getClassId()))
            throw new RuntimeException("L'étudiant est déjà dans la classe cible.");
        if (toClassroom.isAtCapacity())
            throw new RuntimeException("La classe cible est à pleine capacité.");

        User by = getCurrentUser();
        saveHistory(student, from, toClassroom, academicYear, by, request.getReason());
        student.setClassroom(toClassroom);
        userRepository.save(student);

        return new MigrationResponse(true,
                "Étudiant migré avec succès vers l'année " + academicYear.getAcademicYear() + ".",
                student.getUserId(), student.getFirstName() + " " + student.getLastName(),
                from.getName(), toClassroom.getName());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. Migration en masse
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional
    public List<MigrationResponse> migrateBulkStudents(MigrateBulkStudentsRequest request) {

        User pedagog = getCurrentUser();
        List<MigrationResponse> responses = new ArrayList<>();

        MigrationTypedto type = request.getMigrationType() != null
                ? request.getMigrationType()
                : MigrationTypedto.LEVEL_PROMOTION;

        // ── Résolution de l'année académique ─────────────────────────────
        // LEVEL_PROMOTION + TRONC_COMMUN → N+1 (PLANNED, jamais ACTIVE)
        // SPECIALITY_CHANGE → N (ACTIVE)
        AcademicYear academicYear = yearHelper.resolveForMigration(type);

        // ── Résolution de la classe cible ─────────────────────────────────
        Classroom toClassroom = resolveToClassroomForBulk(request, type, pedagog);

        // ── Traitement de chaque étudiant ─────────────────────────────────
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

                responses.add(new MigrationResponse(true,
                        "Migré vers l'année " + academicYear.getAcademicYear() + ".",
                        student.getUserId(), student.getFirstName() + " " + student.getLastName(),
                        from.getName(), toClassroom.getName()));

            } catch (Exception e) {
                responses.add(new MigrationResponse(false, e.getMessage(), studentId, null, null, null));
            }
        }
        return responses;
    }

    private Classroom resolveToClassroomForBulk(
            MigrateBulkStudentsRequest request, MigrationTypedto type, User pedagog) {

        if (type == MigrationTypedto.LEVEL_PROMOTION && request.isAutoNextLevel()) {
            Classroom from = classroomRepository.findById(request.getFromClassroomId())
                    .orElseThrow(() -> new RuntimeException("Classe source introuvable."));
            return classroomRepository
                    .findFirstBySpeciality_SpecialityIdAndLevel(
                            from.getSpeciality().getSpecialityId(), from.getLevel() + 1)
                    .orElseThrow(() -> new RuntimeException(
                            "Aucune classe de niveau " + (from.getLevel() + 1) + " trouvée."));
        }

        if (type == MigrationTypedto.TRONC_COMMUN && !pedagHasTroncCommun(pedagog)) {
            throw new AccessDeniedException("Vous ne gérez pas de Tronc Commun.");
        }

        return classroomRepository.findById(request.getToClassroomId())
                .orElseThrow(() -> new RuntimeException("Classe cible introuvable."));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. Historique de migration d'un étudiant
    // ═══════════════════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════════════════
    // Helpers privés
    // ═══════════════════════════════════════════════════════════════════════

    private List<AvailableMigrationTargetsdto.ClassroomSummaryDto> toSummaryList(List<Classroom> list) {
        return list.stream().map(c -> {
            int occ = c.getStudents() != null ? c.getStudents().size() : 0;
            int slots = c.getCapacity() != null ? Math.max(c.getCapacity() - occ, 0) : 0;
            String spec = c.getSpeciality() != null ? c.getSpeciality().getName() : "—";
            return new AvailableMigrationTargetsdto.ClassroomSummaryDto(
                    c.getClassId(), c.getName(), c.getLevel(), spec, slots,
                    isTroncCommunClassroom(c));
        }).collect(Collectors.toList());
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

    private void saveHistory(User student, Classroom from, Classroom to,
            AcademicYear year, User by, String reason) {
        StudentClassHistory h = new StudentClassHistory();
        h.setStudent(student);
        h.setFromClassroom(from);
        h.setToClassroom(to);
        h.setAcademicYear(year);
        h.setMigratedBy(by);
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