package group3.en.stuattendance.Timetablemanager.ServiceImpl;

import group3.en.stuattendance.Timetablemanager.DTO.SessionDto;
import group3.en.stuattendance.Timetablemanager.Mapper.SessionMapper;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Timetablemanager.Service.SessionService;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Attendancemanager.Repository.AttendanceRecordRepository;
import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import group3.en.stuattendance.Timetablemanager.Enum.SessionStatus;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import group3.en.stuattendance.Auditmanager.Annotation.Auditable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SessionServiceImpl implements SessionService {

    private final SessionRepository sessionRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final ClassroomRepository classroomRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final group3.en.stuattendance.Notificationmanager.Service.NotificationService notificationService;
    private final SessionMapper sessionMapper;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    @Auditable(action = "SESSION_START", category = "SESSION_MANAGEMENT", severity = "INFO")
    public SessionDto startSession(Integer sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with id: " + sessionId));

        if (session.getStatus() != SessionStatus.SCHEDULED) {
            throw new IllegalStateException("Session must be in SCHEDULED status to start. Current status: " + session.getStatus());
        }

        // Strict Scheduling Enforcement
        if (session.isPast()) {
            session.setStatus(SessionStatus.MISSED);
            sessionRepository.save(session);
            throw new IllegalStateException("This session is in the past and cannot be started. It has been marked as MISSED.");
        }

        if (!session.isActive()) {
            throw new IllegalStateException(String.format(
                "Cannot start session yet. It is scheduled for %s at %s.", 
                session.getDate(), session.getStartTime()));
        }

        session.setStatus(SessionStatus.IN_PROGRESS);
        session.setActualStartTime(LocalDateTime.now());

        Session saved = sessionRepository.save(session);
        
        // Notify students of session start
        if (saved.getClassroom() != null) {
            List<User> classroomStudents = userRepository.findByClassroomClassIdAndRolesName(
                    saved.getClassroom().getClassId(), "STUDENT");
            
            String courseName = saved.getCourse() != null ? saved.getCourse().getCourseName() : "a session";
            String teacherName = saved.getTeacher() != null ? saved.getTeacher().getFirstName() + " " + saved.getTeacher().getLastName() : "Your teacher";

            for (User student : classroomStudents) {
                try {
                    notificationService.sendNotification(student.getUserId(), "SESSION_STARTED",
                            teacherName + " has started the session for " + courseName + ".");
                } catch (Exception e) {
                    System.err.println("Failed to send notification to student " + student.getUserId() + ": " + e.getMessage());
                }
            }
        }

        SessionDto responseDto = sessionMapper.toDto(saved);
        messagingTemplate.convertAndSend("/topic/sessions", responseDto);
        return responseDto;
    }

    @Override
    @Transactional
    @Auditable(action = "SESSION_END", category = "SESSION_MANAGEMENT", severity = "INFO")
    public SessionDto endSession(Integer sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with id: " + sessionId));

        // Idempotency: if already COMPLETED or VALIDATED, return as-is — never throw on double-call
        if (session.getStatus() == SessionStatus.COMPLETED
                || (session.getIsValidated() != null && session.getIsValidated())) {
            return sessionMapper.toDto(session);
        }

        // Guard: only IN_PROGRESS sessions can be ended
        if (session.getStatus() != SessionStatus.IN_PROGRESS) {
            // Treat SCHEDULED as a no-op instead of crashing (edge-case: teacher clicks End before Start)
            return sessionMapper.toDto(session);
        }

        session.setStatus(SessionStatus.COMPLETED);
        session.setActualEndTime(LocalDateTime.now());

        // Auto-Absence Logic: Mark students who didn't show up
        if (session.getClassroom() != null) {
            List<User> classroomStudents = userRepository.findByClassroomClassIdAndRolesName(
                    session.getClassroom().getClassId(), "STUDENT");

            for (User student : classroomStudents) {
                if (!attendanceRecordRepository.existsByUserAndSession(student, session)) {
                    AttendanceRecord autoAbsent = AttendanceRecord.builder()
                            .user(student)
                            .session(session)
                            .status(AttendanceStatus.ABSENT)
                            .comments("Auto-marked ABSENT upon session closure")
                            .timestamp(LocalDateTime.now())
                            .verifiedByTeacher(false)
                            .qrValidated(false)
                            .geoValidated(false)
                            .pinValidated(false)
                            .build();
                    attendanceRecordRepository.save(autoAbsent);

                    // Notify student of absence
                    try {
                        String courseName = "this course";
                        if (session.getCourse() != null && session.getCourse().getCourseName() != null) {
                            courseName = session.getCourse().getCourseName();
                        }

                        notificationService.sendNotification(student.getUserId(), "ABSENCE_ALERT",
                                "You were marked ABSENT for " + courseName + " on " + session.getDate());
                    } catch (Exception e) {
                        // Senior Dev: Non-critical notification failure should not rollback the critical session end transaction
                        System.err.println("Failed to send absence notification to user " + student.getUserId() + ": " + e.getMessage());
                    }
                }
            }
        }

        Session saved = sessionRepository.save(session);
        SessionDto responseDto = sessionMapper.toDto(saved);
        messagingTemplate.convertAndSend("/topic/sessions", responseDto);
        return responseDto;
    }

    @Override
    @Transactional
    @Auditable(action = "SESSION_CONFIRM", category = "SESSION_MANAGEMENT", severity = "INFO")
    public SessionDto confirmAttendance(Integer sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with id: " + sessionId));

        // If it's still in progress, end it first
        if (session.getStatus() == SessionStatus.IN_PROGRESS) {
            // We call endSession within the same transactional context
            this.endSession(sessionId);
            // Refresh to get updated status and timestamps
            session = sessionRepository.findById(sessionId).get();
        } else if (session.getStatus() == SessionStatus.SCHEDULED) {
            throw new IllegalStateException("Cannot confirm attendance for a SCHEDULED session. Start it first.");
        }

        session.setIsValidated(true);
        Session saved = sessionRepository.save(session);
        
        // Notify Pedagogic Assistants of that specialty
        if (saved.getCourse() != null && saved.getCourse().getSpeciality() != null) {
            String courseName = saved.getCourse().getCourseName();
            String teacherName = saved.getTeacher() != null ? saved.getTeacher().getFirstName() + " " + saved.getTeacher().getLastName() : "A teacher";
            notificationService.notifyRoleBySpeciality("PEDAGOG",
                    saved.getCourse().getSpeciality().getSpecialityId(),
                    "ATTENDANCE_SUBMITTED",
                    teacherName + " has finalized the attendance for " + courseName + ".");
        }

        SessionDto responseDto = sessionMapper.toDto(saved);
        messagingTemplate.convertAndSend("/topic/sessions", responseDto);
        return responseDto;
    }

    @Override
    @Transactional
    @Auditable(action = "SESSION_CANCEL", category = "SESSION_MANAGEMENT", severity = "WARNING")
    public SessionDto cancelSession(Integer sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with id: " + sessionId));

        session.setStatus(SessionStatus.CANCELLED);

        Session saved = sessionRepository.save(session);
        
        // Notify Teacher of session cancellation
        if (saved.getTeacher() != null) {
            try {
                String courseName = saved.getCourse() != null ? saved.getCourse().getCourseName() : "a session";
                notificationService.sendNotification(saved.getTeacher().getUserId(), "SESSION_CANCELLED",
                        "The pedagogic assistant has CANCELLED the session for " + courseName + " on " + saved.getDate() + ".");
            } catch (Exception e) {
                System.err.println("Failed to send notification to teacher " + saved.getTeacher().getUserId() + ": " + e.getMessage());
            }
        }

        SessionDto responseDto = sessionMapper.toDto(saved);
        messagingTemplate.convertAndSend("/topic/sessions", responseDto);
        return responseDto;
    }

    @Override
    public List<SessionDto> getLiveSessionsByClassrooms(java.util.List<Integer> classroomIds) {
        if (classroomIds == null || classroomIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return sessionRepository.findByClassroomClassIdInAndStatus(classroomIds, SessionStatus.IN_PROGRESS)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Auditable(action = "SESSION_CREATE", category = "SESSION_MANAGEMENT", severity = "INFO")
    public SessionDto createSession(SessionDto sessionDto) {
        Session session = sessionMapper.toEntity(sessionDto);

        if (sessionDto.getCourseId() != null) {
            Course course = courseRepository.findById(sessionDto.getCourseId())
                    .orElseThrow(() -> new EntityNotFoundException("Course not found with id: " + sessionDto.getCourseId()));
            session.setCourse(course);
        }

        if (sessionDto.getTeacherId() != null) {
            User teacher = userRepository.findById(sessionDto.getTeacherId())
                    .orElseThrow(() -> new EntityNotFoundException("Teacher not found with id: " + sessionDto.getTeacherId()));
            session.setTeacher(teacher);
        }

        if (sessionDto.getClassroomId() != null) {
            Classroom classroom = classroomRepository.findById(sessionDto.getClassroomId())
                    .orElseThrow(() -> new EntityNotFoundException("Classroom not found with id: " + sessionDto.getClassroomId()));
            session.setClassroom(classroom);
        }

        Session saved = sessionRepository.save(session);
        return sessionMapper.toDto(saved);
    }

    @Override
    @Auditable(action = "SESSION_UPDATE", category = "SESSION_MANAGEMENT", severity = "INFO")
    public SessionDto updateSession(Integer id, SessionDto sessionDto) {
        Session existing = sessionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with id: " + id));

        existing.setDay(sessionDto.getDay());
        existing.setDate(sessionDto.getDate());
        existing.setStartTime(sessionDto.getStartTime());
        existing.setEndTime(sessionDto.getEndTime());
        existing.setWeek(sessionDto.getWeek());
        existing.setLocationGeographicalCoordinates(sessionDto.getLocationGeographicalCoordinates());
        existing.setQrCode(sessionDto.getQrCode());

        if (sessionDto.getCourseId() != null) {
            Course course = courseRepository.findById(sessionDto.getCourseId())
                    .orElseThrow(() -> new EntityNotFoundException("Course not found with id: " + sessionDto.getCourseId()));
            existing.setCourse(course);
        }

        if (sessionDto.getTeacherId() != null) {
            User teacher = userRepository.findById(sessionDto.getTeacherId())
                    .orElseThrow(() -> new EntityNotFoundException("Teacher not found with id: " + sessionDto.getTeacherId()));
            existing.setTeacher(teacher);
        }

        if (sessionDto.getClassroomId() != null) {
            Classroom classroom = classroomRepository.findById(sessionDto.getClassroomId())
                    .orElseThrow(() -> new EntityNotFoundException("Classroom not found with id: " + sessionDto.getClassroomId()));
            existing.setClassroom(classroom);
        }

        Session updated = sessionRepository.save(existing);
        
        // Notify Teacher of session update
        if (updated.getTeacher() != null) {
            try {
                String courseName = updated.getCourse() != null ? updated.getCourse().getCourseName() : "a session";
                notificationService.sendNotification(updated.getTeacher().getUserId(), "SESSION_UPDATED",
                        "The pedagogic assistant has updated the session for " + courseName + " scheduled on " + updated.getDate() + ".");
            } catch (Exception e) {
                System.err.println("Failed to send notification to teacher " + updated.getTeacher().getUserId() + ": " + e.getMessage());
            }
        }
        
        return sessionMapper.toDto(updated);
    }

    @Override
    @Auditable(action = "SESSION_DELETE", category = "SESSION_MANAGEMENT", severity = "WARNING")
    public void deleteSession(Integer id) {
        if (!sessionRepository.existsById(id)) {
            throw new EntityNotFoundException("Session not found with id: " + id);
        }
        sessionRepository.deleteById(id);
    }

    @Override
    public SessionDto getSessionById(Integer id) {
        Session session = sessionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with id: " + id));
        return sessionMapper.toDto(session);
    }

    @Override
    public List<SessionDto> getAllSessions() {
        return sessionRepository.findAll()
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByCourse(Integer courseId) {
        return sessionRepository.findByCourseCourseId(courseId)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByTeacher(Integer teacherId) {
        return sessionRepository.findByTeacherUserId(teacherId)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByClassroom(Integer classroomId) {
        return sessionRepository.findByClassroomClassId(classroomId)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByDate(LocalDate date) {
        return sessionRepository.findByDate(date)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByWeek(Integer week) {
        return sessionRepository.findByWeek(week)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByCourseAndWeek(Integer courseId, Integer week) {
        return sessionRepository.findByCourseCourseIdAndWeek(courseId, week)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByTeacherAndDate(Integer teacherId, LocalDate date) {
        return sessionRepository.findByTeacherUserIdAndDate(teacherId, date)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionDto> getSessionsByTeacherSorted(Integer teacherId) {
        return sessionRepository.findByTeacherUserIdOrderByDateAscStartTimeAsc(teacherId)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }
}