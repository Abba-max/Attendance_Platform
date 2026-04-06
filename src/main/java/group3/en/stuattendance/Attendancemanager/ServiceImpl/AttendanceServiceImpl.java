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

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final AttendanceRecordMapper attendanceRecordMapper;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @Override
    public AttendanceRecordDto markAttendance(AttendanceRecordDto dto) {
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + dto.getUserId()));
        Session session = sessionRepository.findById(dto.getSessionId())
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + dto.getSessionId()));

        AttendanceRecord record = attendanceRecordRepository.findByUserAndSession(user, session)
                .orElse(AttendanceRecord.builder()
                        .user(user)
                        .session(session)
                        .build());

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
        AttendanceRecord record = attendanceRecordRepository.findByUserAndSession(teacher, session)
                .orElse(AttendanceRecord.builder()
                        .user(teacher)
                        .session(session)
                        .build());

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

            AttendanceRecord record = attendanceRecordRepository.findByUserAndSession(student, session)
                    .orElse(AttendanceRecord.builder()
                            .user(student)
                            .session(session)
                            .build());

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
            String qrToken = "QR_" + sessionId + "_" + System.currentTimeMillis();
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

        AttendanceRecord record = attendanceRecordRepository.findByUserAndSession(student, session)
                .orElse(AttendanceRecord.builder()
                        .user(student)
                        .session(session)
                        .status(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT) 
                        .build());

        // 1. Validation logic
        boolean isValid = false;
        if (qrCode != null && qrCode.equals(session.getQrCode())) {
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
            // Added 15-min grace period for early arrivals
            int currentHour = (int) ChronoUnit.HOURS.between(session.getStartTime().minusMinutes(15), java.time.LocalTime.now());
            int totalHours = (int) ChronoUnit.HOURS.between(session.getStartTime(), session.getEndTime());
            
            // Safety check for early/late birds
            if (currentHour < 0) currentHour = 0;
            if (currentHour >= totalHours) currentHour = totalHours - 1;
            
            updateHourSlot(record, currentHour, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT, false);
        }

        // Summary status update
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

        AttendanceRecord record = attendanceRecordRepository.findByUserAndSession(student, session)
                .orElse(AttendanceRecord.builder()
                        .user(student)
                        .session(session)
                        .status(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT)
                        .build());

        record.setVerifiedByTeacher(true);
        
        if (hourIndex != null) {
            // Verify specific hour
            updateHourSlot(record, hourIndex, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT, true);
        } else {
            // Bulk verify ALL hours
            int totalHours = (int) ChronoUnit.HOURS.between(session.getStartTime(), session.getEndTime());
            if (totalHours < 1) totalHours = 1; 
            
            // Fix: i < totalHours instead of i <= totalHours
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
        group3.en.stuattendance.Attendancemanager.Model.AttendanceHour hour = record.getHourSlots().stream()
                .filter(h -> h.getHourIndex() == hourIndex)
                .findFirst()
                .orElseGet(() -> {
                    group3.en.stuattendance.Attendancemanager.Model.AttendanceHour newHour = group3.en.stuattendance.Attendancemanager.Model.AttendanceHour.builder()
                            .attendanceRecord(record)
                            .hourIndex(hourIndex)
                            .build();
                    record.getHourSlots().add(newHour);
                    return newHour;
                });
        
        hour.setStatus(status);
        hour.setVerifiedByTeacher(verified);
        hour.setTimestamp(LocalDateTime.now());
    }

    @Override
    public List<AttendanceRecordDto> getEnrollmentStatus(Integer sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));
        
        // Get all students for the session's classroom
        if (session.getClassroom() == null) {
            return getAttendanceBySession(sessionId);
        }

        List<User> classroomStudents = userRepository.findByClassroomClassIdAndRolesName(
                session.getClassroom().getClassId(), "STUDENT");
        
        return classroomStudents.stream()
                .map(student -> {
                    AttendanceRecord record = attendanceRecordRepository.findByUserAndSession(student, session)
                            .orElse(null);
                    if (record != null) {
                        return attendanceRecordMapper.toDto(record);
                    } else {
                        // Return a virtual "ABSENT" record for display
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
        boolean factorsMet = (Boolean.TRUE.equals(record.getQrValidated()) || Boolean.TRUE.equals(record.getPinValidated()))
                && Boolean.TRUE.equals(record.getGeoValidated())
                && Boolean.TRUE.equals(record.getVerifiedByTeacher());
        
        if (factorsMet) {
            record.setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT);
        } else {
            // Keep as ABSENT or LATE if it was already marked LATE but not yet verified
            if (record.getStatus() == null) {
                record.setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT);
            }
        }
    }
}
