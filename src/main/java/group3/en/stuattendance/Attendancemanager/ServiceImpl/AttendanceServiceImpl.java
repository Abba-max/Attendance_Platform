package group3.en.stuattendance.Attendancemanager.ServiceImpl;

import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import group3.en.stuattendance.Attendancemanager.Mapper.AttendanceRecordMapper;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Attendancemanager.Repository.AttendanceRecordRepository;
import group3.en.stuattendance.Attendancemanager.Service.AttendanceService;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final AttendanceRecordMapper attendanceRecordMapper;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    public AttendanceServiceImpl(
            AttendanceRecordRepository attendanceRecordRepository,
            SessionRepository sessionRepository,
            UserRepository userRepository,
            AttendanceRecordMapper attendanceRecordMapper,
            org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate) {
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.attendanceRecordMapper = attendanceRecordMapper;
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public AttendanceRecordDto markAttendance(AttendanceRecordDto dto) {
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + dto.getUserId()));
        Session session = sessionRepository.findById(dto.getSessionId())
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + dto.getSessionId()));

        AttendanceRecord record = resolveAttendanceRecord(user, session);

        record.setStatus(dto.getStatus());
        record.setTimestamp(LocalDateTime.now());
        record.setComments(dto.getComments());
        record.setVerifiedByTeacher(dto.getVerifiedByTeacher());
        
        // If teacher is verifying, set status to PRESENT if it wasn't set, or keep existing
        if (record.getStatus() == null) record.setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT);

        AttendanceRecord saved = attendanceRecordRepository.save(record);
        return attendanceRecordMapper.toDto(saved);
    }

    @Override
    public List<AttendanceRecordDto> getAttendanceBySession(Integer sessionId) {
        return attendanceRecordRepository.findBySession_SessionId(sessionId).stream()
                .map(attendanceRecordMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<group3.en.stuattendance.Attendancemanager.DTO.TeacherRollCallDto> getRollCallForSession(Integer sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        if (session.getClassroom() == null || session.getClassroom().getStudents() == null) {
            return java.util.Collections.emptyList();
        }

        // Fetch all existing attendance records for the session
        java.util.Map<Integer, AttendanceRecord> recordMap = attendanceRecordRepository.findBySession_SessionId(sessionId)
                .stream()
                .collect(Collectors.toMap(r -> r.getUser().getUserId(), r -> r));

        // Calculate total hours in session safely
        int totalHours = 1;
        if (session.getStartTime() != null && session.getEndTime() != null) {
            totalHours = Math.max(1, (int) java.time.Duration.between(session.getStartTime(), session.getEndTime()).toHours());
        }
        final int finalTotalHours = totalHours;

        return session.getClassroom().getStudents().stream()
                .map(student -> {
                    AttendanceRecord record = recordMap.get(student.getUserId());
                    
                    List<group3.en.stuattendance.Attendancemanager.DTO.AttendanceHourDto> hourDtoSlots = 
                        (record != null && record.getHourSlots() != null) ? 
                        record.getHourSlots().stream()
                            .map(h -> group3.en.stuattendance.Attendancemanager.DTO.AttendanceHourDto.builder()
                                .hourId(h.getHourId())
                                .hourIndex(h.getHourIndex())
                                .status(h.getStatus())
                                .verifiedByTeacher(h.getVerifiedByTeacher())
                                .timestamp(h.getTimestamp())
                                .build())
                            .collect(Collectors.toList()) : new java.util.ArrayList<>();

                    return group3.en.stuattendance.Attendancemanager.DTO.TeacherRollCallDto.builder()
                            .userId(student.getUserId())
                            .firstName(student.getFirstName())
                            .lastName(student.getLastName())
                            .email(student.getEmail())
                            .matricule(student.getMatricule())
                            .attendanceId(record != null ? record.getAttendanceId() : null)
                            .status(record != null ? record.getStatus() : null)
                            .hoursAttended(record != null ? record.getHoursAttended() : 0)
                            .totalHours(finalTotalHours)
                            .hourSlots(hourDtoSlots)
                            .comments(record != null ? record.getComments() : null)
                            .isLive(record != null && (record.getQrValidated() || record.getGeoValidated() || record.getPinValidated()))
                            .build();
                })
                .sorted(java.util.Comparator.comparing(group3.en.stuattendance.Attendancemanager.DTO.TeacherRollCallDto::getLastName))
                .collect(Collectors.toList());
    }

    @Override
    public List<AttendanceRecordDto> getAttendanceByUser(Integer userId) {
        return attendanceRecordRepository.findByUser_UserId(userId).stream()
                .map(attendanceRecordMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public AttendanceRecordDto markTeacherPresence(Integer sessionId, Integer teacherId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new EntityNotFoundException("Teacher not found: " + teacherId));
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        // Create or update record for the teacher
        AttendanceRecord record = resolveAttendanceRecord(teacher, session);

        record.setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT);
        record.setTimestamp(LocalDateTime.now());
        record.setVerifiedByTeacher(true);
        record.setComments("Teacher self-marked presence.");

        AttendanceRecord saved = attendanceRecordRepository.save(record);
        return attendanceRecordMapper.toDto(saved);
    }

    @Override
    public void bulkMarkAbsent(Integer sessionId, List<Integer> studentIds, String comment) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        for (Integer studentId : studentIds) {
            User student = userRepository.findById(studentId)
                    .orElse(null);
            if (student == null) continue;

            AttendanceRecord record = resolveAttendanceRecord(student, session);

            record.setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT);
            record.setTimestamp(LocalDateTime.now());
            record.setComments(comment);
            record.setVerifiedByTeacher(true);

            attendanceRecordRepository.save(record);
        }
    }

    @Override
    public String generateSessionToken(Integer sessionId, String type) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));
        
        if ("PIN".equalsIgnoreCase(type)) {
            String pin = String.format("%04d", (int) (Math.random() * 10000));
            session.setTempPin(pin);
            sessionRepository.save(session);
            return pin;
        } else {
            String qrToken = java.util.UUID.randomUUID().toString();
            session.setQrCode(qrToken);
            sessionRepository.save(session);
            return qrToken;
        }
    }

    @Override
    public AttendanceRecordDto studentCheckIn(Integer sessionId, Integer userId, String qrCode, String pin, String location) {
        User student = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + userId));
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        AttendanceRecord record = resolveAttendanceRecord(student, session);

        // 1. Validation logic
        boolean isValid = false;
        
        // QR check (Accept current OR previous for grace period)
        if (qrCode != null && (qrCode.equals(session.getQrCode()) || qrCode.equals(session.getPreviousQrCode()))) {
            record.setQrValidated(true);
            isValid = true;
        } else if (pin != null && pin.equals(session.getTempPin())) {
            record.setPinValidated(true);
            isValid = true;
        }

        if (location != null && !location.isEmpty()) {
            record.setGeoValidated(true);
            record.setLocationAtCheckin(location);
        }

        record.setTimestamp(LocalDateTime.now());
        
        if (isValid) {
            // Mark the CURRENT hour as PRESENT
            int currentHour = 0;
            if (session.getStartTime() != null) {
                currentHour = (int) ChronoUnit.HOURS.between(session.getStartTime().minusMinutes(15), java.time.LocalTime.now());
            }
            
            int totalHours = 1;
            if (session.getStartTime() != null && session.getEndTime() != null) {
                totalHours = (int) ChronoUnit.HOURS.between(session.getStartTime(), session.getEndTime());
            }
            
            if (currentHour < 0) currentHour = 0;
            if (currentHour >= totalHours) currentHour = totalHours - 1;
            
            updateHourSlot(record, currentHour, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT, false);
        }

        updateRecordStatus(record);
        
        AttendanceRecord saved = attendanceRecordRepository.save(record);
        AttendanceRecordDto responseDto = attendanceRecordMapper.toDto(saved);
        messagingTemplate.convertAndSend("/topic/session/" + sessionId, responseDto);
        return responseDto;
    }

    @Override
    public AttendanceRecordDto teacherVerify(Integer sessionId, Integer userId, Integer hourIndex) {
        User student = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + userId));
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        AttendanceRecord record = resolveAttendanceRecord(student, session);

        record.setVerifiedByTeacher(true);
        
        if (hourIndex != null) {
            updateHourSlot(record, hourIndex, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT, true);
        } else {
            int totalHours = 1;
            if (session.getStartTime() != null && session.getEndTime() != null) {
                totalHours = (int) ChronoUnit.HOURS.between(session.getStartTime(), session.getEndTime());
            }
            if (totalHours < 1) totalHours = 1; 
            
            for (int i = 0; i < totalHours; i++) {
                updateHourSlot(record, i, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT, true);
            }
        }
        
        updateRecordStatus(record);
        
        AttendanceRecord saved = attendanceRecordRepository.save(record);
        AttendanceRecordDto responseDto = attendanceRecordMapper.toDto(saved);
        messagingTemplate.convertAndSend("/topic/session/" + sessionId, responseDto);
        return responseDto;
    }

    private void updateHourSlot(AttendanceRecord record, int hourIndex, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus status, boolean verified) {
        if (record.getHourSlots() == null) record.setHourSlots(new java.util.ArrayList<>());
        group3.en.stuattendance.Attendancemanager.Model.AttendanceHour hour = record.getHourSlots().stream()
                .filter(h -> h.getHourIndex() == hourIndex)
                .findFirst()
                .orElseGet(() -> {
                    group3.en.stuattendance.Attendancemanager.Model.AttendanceHour newHour = group3.en.stuattendance.Attendancemanager.Model.AttendanceHour.builder()
                            .attendanceRecord(record)
                            .hourIndex(hourIndex)
                            .status(status)
                            .verifiedByTeacher(verified)
                            .timestamp(verified ? LocalDateTime.now() : null)
                            .build();
                    record.getHourSlots().add(newHour);
                    return newHour;
                });
        
        if (hour.getStatus() != status) {
            hour.setStatus(status);
            hour.setVerifiedByTeacher(verified);
            hour.setTimestamp(LocalDateTime.now());
        }
    }

    @Override
    public List<AttendanceRecordDto> getEnrollmentStatus(Integer sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));
        
        if (session.getClassroom() == null) {
            return getAttendanceBySession(sessionId);
        }

        List<User> classroomStudents = userRepository.findByClassroomClassIdAndRolesName(
                session.getClassroom().getClassId(), "STUDENT");
        
        return classroomStudents.stream()
                .map(student -> {
                    AttendanceRecord record = resolveAttendanceRecord(student, session);
                    if (record.getAttendanceId() != null) {
                        return attendanceRecordMapper.toDto(record);
                    } else {
                        return AttendanceRecordDto.builder()
                                .userId(student.getUserId())
                                .studentName(student.getFirstName() + " " + student.getLastName())
                                .studentMatricule(student.getMatricule())
                                .sessionId(sessionId)
                                .status(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT)
                                .build();
                    }
                })
                .collect(Collectors.toList());
    }

    private void updateRecordStatus(AttendanceRecord record) {
        boolean factorsMet = Boolean.TRUE.equals(record.getVerifiedByTeacher()) || 
                ((Boolean.TRUE.equals(record.getQrValidated()) || Boolean.TRUE.equals(record.getPinValidated()))
                && Boolean.TRUE.equals(record.getGeoValidated()));
        
        // Count attended hours safely
        if (record.getHourSlots() == null) record.setHourSlots(new java.util.ArrayList<>());
        long attendedCount = record.getHourSlots().stream()
                .filter(h -> h != null && h.getStatus() == group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT)
                .count();
        record.setHoursAttended((int) attendedCount);

        if (factorsMet || attendedCount > 0) {
            record.setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT);
        } else {
            if (record.getStatus() == null) {
                record.setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT);
            }
        }
    }

    @Override
    public void markHourStatus(Integer sessionId, Integer userId, Integer hourIndex, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus status) {
        User student = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + userId));
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        AttendanceRecord record = resolveAttendanceRecord(student, session);

        record.setVerifiedByTeacher(true);
        updateHourSlot(record, hourIndex, status, true);
        updateRecordStatus(record);
        
        attendanceRecordRepository.save(record);
    }

    @Override
    public void markAllSessionStatus(Integer sessionId, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus status) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));
        
        if (session.getClassroom() == null || session.getClassroom().getStudents() == null) return;
        
        int totalHours = 1;
        if (session.getStartTime() != null && session.getEndTime() != null) {
             totalHours = (int) java.time.Duration.between(session.getStartTime(), session.getEndTime()).toHours();
        }
        if (totalHours < 1) totalHours = 1;

        List<AttendanceRecord> recordsToSave = new ArrayList<>();
        for (User student : session.getClassroom().getStudents()) {
            AttendanceRecord record = resolveAttendanceRecord(student, session);

            if (record.getStatus() != status) {
                record.setStatus(status);
                record.setVerifiedByTeacher(true);
            }
            
            for (int i = 0; i < totalHours; i++) {
                updateHourSlot(record, i, status, true);
            }
            
            updateRecordStatus(record);
            recordsToSave.add(record);
        }
        
        if (!recordsToSave.isEmpty()) {
            attendanceRecordRepository.saveAll(recordsToSave);
        }
    }

    private AttendanceRecord resolveAttendanceRecord(User user, Session session) {
        List<AttendanceRecord> records = attendanceRecordRepository.findByUserAndSession(user, session);
        
        if (records.isEmpty()) {
            return AttendanceRecord.builder()
                    .user(user)
                    .session(session)
                    .hourSlots(new java.util.ArrayList<>())
                    .build();
        }

        if (records.size() == 1) {
            return records.get(0);
        }

        // Senior Dev Cleanup: We found duplicates! Keep the latest one.
        records.sort((a, b) -> {
            if (a.getAttendanceId() != null && b.getAttendanceId() != null) {
                return b.getAttendanceId().compareTo(a.getAttendanceId());
            }
            return 0;
        });

        AttendanceRecord latest = records.get(0);
        List<AttendanceRecord> toDelete = records.subList(1, records.size());
        
        // Atomic cleanup within the same transaction
        attendanceRecordRepository.deleteAll(toDelete);
        
        return latest;
    }
}
