package group3.en.stuattendance.Institutionmanager.Service;

import group3.en.stuattendance.Institutionmanager.DTO.*;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.StudentClassHistory;
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

@Service
public class StudentMigrationService {

    private final UserRepository userRepository;
    private final ClassroomRepository classroomRepository;
    private final StudentClassHistoryRepository historyRepository;

    public StudentMigrationService(UserRepository userRepository,
                                   ClassroomRepository classroomRepository,
                                   StudentClassHistoryRepository historyRepository) {
        this.userRepository = userRepository;
        this.classroomRepository = classroomRepository;
        this.historyRepository = historyRepository;
    }

    // ─────────────────────────────────────────────
    // 1. Migrate a single student to any classroom
    // ─────────────────────────────────────────────
    @Transactional
    public MigrationResponse migrateStudent(MigrateStudentRequest request) {

        // Find the student
        User student = userRepository.findById(request.getStudentId())
                .orElseThrow(() -> new RuntimeException("Student not found with id: " + request.getStudentId()));

        // Find the target classroom
        Classroom toClassroom = classroomRepository.findById(request.getToClassroomId())
                .orElseThrow(() -> new RuntimeException("Target classroom not found with id: " + request.getToClassroomId()));

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

        // Get the currently logged-in admin/staff
        User migratedBy = getCurrentUser();

        // Save history record
        StudentClassHistory history = new StudentClassHistory();
        history.setStudent(student);
        history.setFromClassroom(fromClassroom);
        history.setToClassroom(toClassroom);
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

    // ─────────────────────────────────────────────
    // 2. Migrate a selection of students (bulk)
    // ─────────────────────────────────────────────
    @Transactional
    public List<MigrationResponse> migrateBulkStudents(MigrateBulkStudentsRequest request) {

        List<MigrationResponse> responses = new ArrayList<>();

        // Resolve the target classroom
        Classroom toClassroom;

        if (request.isAutoNextLevel()) {
            // Auto-find the next level classroom in the same speciality
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
            // Use the manually provided target classroom
            toClassroom = classroomRepository.findById(request.getToClassroomId())
                    .orElseThrow(() -> new RuntimeException("Target classroom not found."));
        }

        User migratedBy = getCurrentUser();

        // Process each student
        for (Integer studentId : request.getStudentIds()) {
            try {
                User student = userRepository.findById(studentId)
                        .orElseThrow(() -> new RuntimeException("Student not found with id: " + studentId));

                Classroom fromClassroom = student.getClassroom();
                if (fromClassroom == null) {
                    responses.add(new MigrationResponse(
                            false,
                            "Student has no current classroom assigned.",
                            student.getUserId(),
                            student.getFirstName() + " " + student.getLastName(),
                            null,
                            toClassroom.getName()
                    ));
                    continue;
                }

                if (fromClassroom.getClassId().equals(toClassroom.getClassId())) {
                    responses.add(new MigrationResponse(
                            false,
                            "Student is already in the target classroom.",
                            student.getUserId(),
                            student.getFirstName() + " " + student.getLastName(),
                            fromClassroom.getName(),
                            toClassroom.getName()
                    ));
                    continue;
                }

                if (toClassroom.isAtCapacity()) {
                    responses.add(new MigrationResponse(
                            false,
                            "Target classroom is at full capacity.",
                            student.getUserId(),
                            student.getFirstName() + " " + student.getLastName(),
                            fromClassroom.getName(),
                            toClassroom.getName()
                    ));
                    continue;
                }

                // Save history
                StudentClassHistory history = new StudentClassHistory();
                history.setStudent(student);
                history.setFromClassroom(fromClassroom);
                history.setToClassroom(toClassroom);
                history.setMigratedBy(migratedBy);
                history.setReason(request.getReason());
                historyRepository.save(history);

                // Update classroom
                student.setClassroom(toClassroom);
                userRepository.save(student);

                responses.add(new MigrationResponse(
                        true,
                        "Migrated successfully.",
                        student.getUserId(),
                        student.getFirstName() + " " + student.getLastName(),
                        fromClassroom.getName(),
                        toClassroom.getName()
                ));

            } catch (Exception e) {
                responses.add(new MigrationResponse(
                        false,
                        e.getMessage(),
                        studentId,
                        null,
                        null,
                        null
                ));
            }
        }

        return responses;
    }

    // ─────────────────────────────────────────────
    // 3. Get full migration history of a student
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
            responses.add(dto);
        }

        return responses;
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