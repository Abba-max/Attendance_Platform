package group3.en.stuattendance.Usermanager.ServiceImpl;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Attendancemanager.Repository.AttendanceRecordRepository;
import group3.en.stuattendance.Justificationmanager.Enum.JustificationStatus;
import group3.en.stuattendance.Justificationmanager.Repository.JustificationRepository;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Usermanager.DTO.*;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import group3.en.stuattendance.Usermanager.Service.StudentService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentServiceImpl implements StudentService {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final JustificationRepository justificationRepository;

    @Override
    public List<StudentScheduleDto> getTodaySchedule(Integer userId) {
        User student = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found with id: " + userId));

        if (student.getClassroom() == null) {
            return java.util.Collections.emptyList();
        }

        return sessionRepository.findByClassroomClassIdAndDate(student.getClassroom().getClassId(), LocalDate.now())
                .stream()
                .map(session -> {
                    String attStatus = attendanceRecordRepository.findByUserAndSession(student, session)
                            .map(r -> r.getStatus().name())
                            .orElse("NOT_MARKED");
                    
                    return StudentScheduleDto.builder()
                        .sessionId(session.getSessionId())
                        .courseName(session.getCourse() != null ? session.getCourse().getCourseName() : "N/A")
                        .teacherName(session.getTeacher() != null ? session.getTeacher().getFirstName() + " " + session.getTeacher().getLastName() : "N/A")
                        .date(session.getDate())
                        .startTime(session.getStartTime())
                        .endTime(session.getEndTime())
                        .classroomName(session.getClassroom() != null ? session.getClassroom().getName() : "N/A")
                        .status(session.getStatus().name())
                        .attendanceStatus(attStatus)
                        .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    public Page<StudentAttendanceHistoryDto> getAttendanceHistory(Integer userId, AttendanceStatus status, Pageable pageable) {
        Page<AttendanceRecord> records;
        if (status != null) {
            records = attendanceRecordRepository.findByUserUserIdAndStatus(userId, status, pageable);
        } else {
            records = attendanceRecordRepository.findByUserUserId(userId, pageable);
        }

        return records.map(record -> StudentAttendanceHistoryDto.builder()
                .attendanceId(record.getAttendanceId())
                .courseName(record.getSession().getCourse() != null ? record.getSession().getCourse().getCourseName() : "N/A")
                .date(record.getSession().getDate())
                .startTime(record.getSession().getStartTime())
                .endTime(record.getSession().getEndTime())
                .status(record.getStatus())
                .checkInTime(record.getTimestamp())
                .teacherName(record.getSession().getTeacher() != null ? record.getSession().getTeacher().getFirstName() + " " + record.getSession().getTeacher().getLastName() : "N/A")
                .build());
    }

    @Override
    public List<StudentAttendanceStatsDto> getCourseAttendanceStats(Integer userId) {
        List<AttendanceRecord> allRecords = attendanceRecordRepository.findByUserUserId(userId);
        
        Map<Integer, List<AttendanceRecord>> byCourse = allRecords.stream()
                .filter(r -> r.getSession() != null && r.getSession().getCourse() != null)
                .collect(Collectors.groupingBy(r -> r.getSession().getCourse().getCourseId()));

        return byCourse.entrySet().stream().map(entry -> {
            List<AttendanceRecord> courseRecords = entry.getValue();
            long total = courseRecords.size();
            long present = courseRecords.stream().filter(r -> r.getStatus() == AttendanceStatus.PRESENT).count();
            
            return StudentAttendanceStatsDto.builder()
                    .courseId(entry.getKey())
                    .courseName(courseRecords.get(0).getSession().getCourse().getCourseName())
                    .totalSessions(total)
                    .presentCount(present)
                    .attendanceRate(total > 0 ? (double) present / total * 100 : 0)
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    public StudentDashboardStatsDto getDashboardStats(Integer userId) {
        List<AttendanceRecord> allRecords = attendanceRecordRepository.findByUserUserId(userId);
        long totalSessions = allRecords.size();
        long presentCount = allRecords.stream().filter(r -> r.getStatus() == AttendanceStatus.PRESENT).count();
        long totalAbsences = allRecords.stream().filter(r -> r.getStatus() == AttendanceStatus.ABSENT).count();
        
        long pendingJustifications = justificationRepository.findByUserUserIdAndStatus(
                userId, JustificationStatus.PENDING, Pageable.unpaged()).getTotalElements();
        
        double rate = totalSessions > 0 ? (double) presentCount / totalSessions * 100 : 100.0;

        return StudentDashboardStatsDto.builder()
                .totalAbsences(totalAbsences)
                .pendingJustifications(pendingJustifications)
                .overallAttendanceRate(rate)
                .build();
    }
}
