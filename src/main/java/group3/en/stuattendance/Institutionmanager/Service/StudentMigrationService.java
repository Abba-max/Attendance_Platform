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

    // ─────────────────────────────────────────────
    // 1. Get all students in a classroom
    //    Used by PEDAGOG to select students
    //    before triggering a migration
    // ─────────────────────────────────────────────
    public List<StudentSelectionDto> getStudentsInClassroom(Integer classroomId) {

        classroomRepository.findById(classroomId)
                .orElseThrow(() -> new RuntimeException("Classroom not found with id: " + classroomId));

        List<User> students = userRepository
                .findByClassroomClassIdAndRolesName(classroomId, "STUDENT");

        return students.stream().map(student -> {
            StudentSelectionDto dto = new StudentSelectionDto();
            dto.setStudentId(student.getUserId());
            dto.setFullName(student.getFirstName() + " " + student.getLastName());
            dto.setMatricule(student.getMatricule());
            dto.setEmail(student.getEmail());
            dto.setClassroomId(classroomId);
            return dto;
        }).collect(Collectors.toList());
    }

    /**
     * Return students for a classroom filtered by academic year.
     * - Active year → current enrollment (user.classroom).
     * - Historical year → union of students who LEFT or ARRIVED in this classroom
     *   during that year, reconstructed from migration history.
     */
    public List<StudentSelectionDto> getStudentsInClassroom(Integer classroomId, Long academicYearId) {

        if (academicYearId == null) {
            return getStudentsInClassroom(classroomId);
        }

        classroomRepository.findById(classroomId)
                .orElseThrow(() -> new RuntimeException("Classroom not found with id: " + classroomId));

        AcademicYear year = academicYearRepository.findById(academicYearId)
                .orElseThrow(() -> new RuntimeException("Academic year not found with id: " + academicYearId));

        // For the active year, use live enrollment data
        if (year.isActive()) {
            return getStudentsInClassroom(classroomId);
        }

        // For historical years: reconstruct from migration records
        // Departures: students who were IN this classroom and got migrated OUT during that year
        List<StudentClassHistory> departures = historyRepository
                .findByFromClassroom_ClassIdAndAcademicYear_Id(classroomId, academicYearId);
        // Arrivals: students who were migrated INTO this classroom during that year
        List<StudentClassHistory> arrivals = historyRepository
                .findByToClassroom_ClassIdAndAcademicYear_Id(classroomId, academicYearId);

        // Deduplicate using a map keyed by userId
        java.util.Map<Integer, User> uniqueStudents = new java.util.LinkedHashMap<>();
        for (StudentClassHistory h : departures) {
            User s = h.getStudent();
            if (s != null) uniqueStudents.put(s.getUserId(), s);
        }
        for (StudentClassHistory h : arrivals) {
            User s = h.getStudent();
            if (s != null) uniqueStudents.put(s.getUserId(), s);
        }

        return uniqueStudents.values().stream().map(student -> {
            StudentSelectionDto dto = new StudentSelectionDto();
            dto.setStudentId(student.getUserId());
            dto.setFullName(student.getFirstName() + " " + student.getLastName());
            dto.setMatricule(student.getMatricule());
            dto.setEmail(student.getEmail());
            dto.setClassroomId(classroomId);
            return dto;
        }).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────
    // 2. Migrate a single student to any classroom
    // ─────────────────────────────────────────────
    @Transactional
    public MigrationResponse migrateStudent(MigrateStudentRequest request) {

        // Find the student
        User student = userRepository.findById(request.getStudentId())
                .orElseThrow(() -> new RuntimeException("Student not found with id: " + request.getStudentId()));

        // Find the target classroom
        Classroom toClassroom = classroomRepository.findById(request.getToClassroomId())
                .orElseThrow(() -> new RuntimeException("Target classroom not found with id: " + request.getToClassroomId()));

        // Resolve academic year
        AcademicYear academicYear = resolveAcademicYear(request.getAcademicYearId());

        // Make sure the student is currently in a classroom
        Classroom fromClassroom = student.getClassroom();
        if (fromClassroom == null) {
            throw new RuntimeException("Student is not currently assigned to any classroom.");
        }

        // Avoid migrating to the same classroom
        if (fromClassroom.getClassId().equals(toClassroom.getClassId())) {
            throw new RuntimeException("Student is already in the target classroom.");
        }

        // Check target classroom capacity
        if (toClassroom.isAtCapacity()) {
            throw new RuntimeException("Target classroom is already at full capacity.");
        }

        User migratedBy = getCurrentUser();

        // Save history record with academic year
        StudentClassHistory history = new StudentClassHistory();
        history.setStudent(student);
        history.setFromClassroom(fromClassroom);
        history.setToClassroom(toClassroom);
        history.setAcademicYear(academicYear);
        history.setMigratedBy(migratedBy);
        history.setReason(request.getReason());
        historyRepository.save(history);

        // Update the student's current classroom
        student.setClassroom(toClassroom);
        userRepository.save(student);

        return new MigrationResponse(
                true,
                "Student migrated successfully.",
                student.getUserId(),
                student.getFirstName() + " " + student.getLastName(),
                fromClassroom.getName(),
                toClassroom.getName()
        );
    }

    public AcademicYear getOrCreateNextAcademicYear() {
        return academicYearRepository.findNextAcademicYear()
                .orElseGet(() -> {
                    // Auto-create a placeholder if none exists
                    AcademicYear next = new AcademicYear();
                    AcademicYear current = academicYearRepository.findActiveAcademicYear()
                            .orElseThrow(() -> new RuntimeException("No active academic year"));

                    next.setAcademicYear(generateNextYearName(current.getAcademicYear()));
                    next.setStartDate(current.getEndDate().plusDays(1));
                    next.setEndDate(next.getStartDate().plusYears(1).minusDays(1));
                    next.setStatus(AcademicYearStatus.PLANNED);
                    return academicYearRepository.save(next);
                });
    }

    private String generateNextYearName(String current) {
        // e.g. "2025/2026" → "2026/2027"
        String[] parts = current.split("/");
        int start = Integer.parseInt(parts[0]);
        return (start + 1) + "/" + (start + 2);
    }

    // ─────────────────────────────────────────────
    // 3. Migrate a selection of students (bulk)
    // ─────────────────────────────────────────────
    @Transactional
    public List<MigrationResponse> migrateBulkStudents(MigrateBulkStudentsRequest request) {

        List<MigrationResponse> responses = new ArrayList<>();

        // Resolve academic year
        AcademicYear academicYear = resolveAcademicYear(request.getAcademicYearId());

        // Resolve the target classroom
        Classroom toClassroom;

        if (request.isAutoNextLevel()) {
            Classroom fromClassroom = classroomRepository.findById(request.getFromClassroomId())
                    .orElseThrow(() -> new RuntimeException("Source classroom not found."));

            Integer nextLevel = fromClassroom.getLevel() + 1;

            toClassroom = classroomRepository
                    .findFirstBySpeciality_SpecialityIdAndLevel(
                            fromClassroom.getSpeciality().getSpecialityId(),
                            nextLevel)
                    .orElseThrow(() -> new RuntimeException(
                            "No classroom found at level " + nextLevel +
                                    " for this speciality. Migration aborted."));
        } else {
            toClassroom = classroomRepository.findById(request.getToClassroomId())
                    .orElseThrow(() -> new RuntimeException("Target classroom not found."));
        }

        User migratedBy = getCurrentUser();

        // Process each selected student
        for (Integer studentId : request.getStudentIds()) {
            try {
                User student = userRepository.findById(studentId)
                        .orElseThrow(() -> new RuntimeException("Student not found with id: " + studentId));

                Classroom fromClassroom = student.getClassroom();
                if (fromClassroom == null) {
                    responses.add(new MigrationResponse(false,
                            "Student has no current classroom assigned.",
                            student.getUserId(),
                            student.getFirstName() + " " + student.getLastName(),
                            null, toClassroom.getName()));
                    continue;
                }

                if (fromClassroom.getClassId().equals(toClassroom.getClassId())) {
                    responses.add(new MigrationResponse(false,
                            "Student is already in the target classroom.",
                            student.getUserId(),
                            student.getFirstName() + " " + student.getLastName(),
                            fromClassroom.getName(), toClassroom.getName()));
                    continue;
                }

                if (toClassroom.isAtCapacity()) {
                    responses.add(new MigrationResponse(false,
                            "Target classroom is at full capacity.",
                            student.getUserId(),
                            student.getFirstName() + " " + student.getLastName(),
                            fromClassroom.getName(), toClassroom.getName()));
                    continue;
                }

                // Save history with academic year
                StudentClassHistory history = new StudentClassHistory();
                history.setStudent(student);
                history.setFromClassroom(fromClassroom);
                history.setToClassroom(toClassroom);
                history.setAcademicYear(academicYear);
                history.setMigratedBy(migratedBy);
                history.setReason(request.getReason());
                historyRepository.save(history);

                // Update classroom
                student.setClassroom(toClassroom);
                userRepository.save(student);

                responses.add(new MigrationResponse(true,
                        "Migrated successfully.",
                        student.getUserId(),
                        student.getFirstName() + " " + student.getLastName(),
                        fromClassroom.getName(), toClassroom.getName()));

            } catch (Exception e) {
                responses.add(new MigrationResponse(false,
                        e.getMessage(), studentId, null, null, null));
            }
        }

        return responses;
    }

    // ─────────────────────────────────────────────
    // 4. Get full migration history of a student
    // ─────────────────────────────────────────────
    public List<ClassHistoryResponse> getStudentHistory(Integer studentId) {

        List<StudentClassHistory> histories =
                historyRepository.findByStudent_UserIdOrderByMigratedAtDesc(studentId);

        List<ClassHistoryResponse> responses = new ArrayList<>();

        for (StudentClassHistory h : histories) {
            ClassHistoryResponse dto = new ClassHistoryResponse();
            dto.setHistoryId(h.getHistoryId());
            dto.setStudentId(h.getStudent().getUserId());
            dto.setStudentName(h.getStudent().getFirstName() + " " + h.getStudent().getLastName());
            dto.setFromClassroom(h.getFromClassroom().getName());
            dto.setToClassroom(h.getToClassroom().getName());
            dto.setReason(h.getReason());
            dto.setMigratedAt(h.getMigratedAt());
            if (h.getMigratedBy() != null) {
                dto.setMigratedBy(h.getMigratedBy().getFirstName() + " " + h.getMigratedBy().getLastName());
            }
            if (h.getAcademicYear() != null) {
                dto.setAcademicYear(h.getAcademicYear().getAcademicYear());
            }
            responses.add(dto);
        }

        return responses;
    }

    // ─────────────────────────────────────────────
    // Helper: resolve academic year from request
    // If academicYearId is provided → use it
    // Otherwise → fall back to the active one
    // ─────────────────────────────────────────────
    private AcademicYear resolveAcademicYear(Long academicYearId, boolean useNextYear) {
        if (useNextYear) {
            return getOrCreateNextAcademicYear();
        }
        if (academicYearId != null) {
            return academicYearRepository.findById(academicYearId)
                    .orElseThrow(() -> new RuntimeException("Academic year not found"));
        }
        return academicYearRepository.findActiveAcademicYear()
                .orElseThrow(() -> new RuntimeException("No active academic year"));
    }

    // ─────────────────────────────────────────────
    // Helper: get the currently logged-in user
    // ─────────────────────────────────────────────
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found."));
    }
}