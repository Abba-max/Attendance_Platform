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
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final AttendanceRecordMapper attendanceRecordMapper;

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
        record.setRecordedAt(LocalDateTime.now());
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
        record.setRecordedAt(LocalDateTime.now());
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
            record.setRecordedAt(LocalDateTime.now());
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
            // Placeholder for QR token generation logic
            return "QR_" + sessionId + "_" + System.currentTimeMillis();
        }
    }
}
