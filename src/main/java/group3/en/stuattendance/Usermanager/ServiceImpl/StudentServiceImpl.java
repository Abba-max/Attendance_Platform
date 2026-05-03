package group3.en.stuattendance.Usermanager.ServiceImpl;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Attendancemanager.Repository.AttendanceRecordRepository;
import group3.en.stuattendance.Justificationmanager.Enum.JustificationStatus;
import group3.en.stuattendance.Justificationmanager.Repository.JustificationRepository;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
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
    private final CourseRepository courseRepository;
    private final group3.en.stuattendance.Institutionmanager.Mapper.InstitutionMapper institutionMapper;

    @Override
    public group3.en.stuattendance.Institutionmanager.DTO.InstitutionDto getInstitutionGeofence(Integer userId) {
        User student = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found with id: " + userId));
        
        group3.en.stuattendance.Institutionmanager.Model.Institution inst = student.getInstitution();
        
        if (inst == null && student.getClassroom() != null 
            && student.getClassroom().getSpeciality() != null
            && student.getClassroom().getSpeciality().getDepartment() != null) {
            inst = student.getClassroom().getSpeciality().getDepartment().getInstitution();
        }

        if (inst == null) {
            return null;
        }
        
        return institutionMapper.toDto(inst);
    }

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
                    List<AttendanceRecord> records = attendanceRecordRepository.findByUserAndSession(student, session);
                    String attStatus = records.isEmpty() ? "NOT_MARKED" : records.get(0).getStatus().name();
                    
                    String sessionStatus = session.getStatus().name();
                    if (group3.en.stuattendance.Timetablemanager.Enum.SessionStatus.SCHEDULED.name().equals(sessionStatus) && session.isPast()) {
                        sessionStatus = group3.en.stuattendance.Timetablemanager.Enum.SessionStatus.MISSED.name();
                    }

                    return StudentScheduleDto.builder()
                        .sessionId(session.getSessionId())
                        .courseName(session.getCourse() != null ? session.getCourse().getCourseName() : "N/A")
                        .teacherName(session.getTeacher() != null ? session.getTeacher().getFirstName() + " " + session.getTeacher().getLastName() : "N/A")
                        .date(session.getDate())
                        .startTime(session.getStartTime())
                        .endTime(session.getEndTime())
                        .classroomName(session.getClassroom() != null ? session.getClassroom().getName() : "N/A")
                        .status(sessionStatus)
                        .attendanceStatus(attStatus)
                        .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<StudentScheduleDto> getSessionsForGrid(Integer userId, Integer week) {
        User student = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found with id: " + userId));

        if (student.getClassroom() == null) {
            return java.util.Collections.emptyList();
        }

        Integer targetWeek = week;
        if (targetWeek == null) {
            targetWeek = LocalDate.now().get(java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear());
        }

        // Fetch sessions for the specific week and sort from newest to oldest
        return sessionRepository.findByClassroomClassIdAndWeek(student.getClassroom().getClassId(), targetWeek)
                .stream()
                .sorted((s1, s2) -> {
                    int dateCompare = s2.getDate().compareTo(s1.getDate());
                    if (dateCompare != 0) return dateCompare;
                    return s2.getStartTime().compareTo(s1.getStartTime());
                })
                .map(session -> {
                    List<AttendanceRecord> records = attendanceRecordRepository.findByUserAndSession(student, session);
                    String attStatus = records.isEmpty() ? "NOT_MARKED" : records.get(0).getStatus().name();
                    
                    String sessionStatus = session.getStatus().name();
                    if (group3.en.stuattendance.Timetablemanager.Enum.SessionStatus.SCHEDULED.name().equals(sessionStatus) && session.isPast()) {
                        sessionStatus = group3.en.stuattendance.Timetablemanager.Enum.SessionStatus.MISSED.name();
                    }

                    return StudentScheduleDto.builder()
                        .sessionId(session.getSessionId())
                        .courseName(session.getCourse() != null ? session.getCourse().getCourseName() : "N/A")
                        .teacherName(session.getTeacher() != null ? session.getTeacher().getFirstName() + " " + session.getTeacher().getLastName() : "N/A")
                        .date(session.getDate())
                        .startTime(session.getStartTime())
                        .endTime(session.getEndTime())
                        .classroomName(session.getClassroom() != null ? session.getClassroom().getName() : "N/A")
                        .status(sessionStatus)
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
        User student = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found"));

        if (student.getClassroom() == null || student.getClassroom().getSpeciality() == null) {
            return java.util.Collections.emptyList();
        }

        List<group3.en.stuattendance.Timetablemanager.Model.Course> enrolledCourses = courseRepository.findBySpecialitySpecialityIdAndLevel(
                student.getClassroom().getSpeciality().getSpecialityId(), 
                student.getClassroom().getLevel());

        List<AttendanceRecord> allRecords = attendanceRecordRepository.findByUserUserId(userId);
        
        Map<Integer, List<AttendanceRecord>> recordsByCourse = allRecords.stream()
                .filter(r -> r.getSession() != null && r.getSession().getCourse() != null)
                .collect(Collectors.groupingBy(r -> r.getSession().getCourse().getCourseId()));

        return enrolledCourses.stream().map(course -> {
            List<AttendanceRecord> courseRecords = recordsByCourse.getOrDefault(course.getCourseId(), java.util.Collections.emptyList());
            
            long totalSessions = courseRecords.size();
            long presentCount = courseRecords.stream().filter(r -> r.getStatus() == AttendanceStatus.PRESENT).count();
            
            Integer courseTotalHours = course.getTotalHours() != null ? course.getTotalHours() : 0;
            
            int studentAttendedHours = courseRecords.stream()
                    .mapToInt(r -> r.getHoursAttended() != null ? r.getHoursAttended() : 0)
                    .sum();
            
            double attendanceRate = courseTotalHours > 0 ? ((double) studentAttendedHours / courseTotalHours) * 100 : 0;
            
            String teacherName = "TBD";
            String teacherEmail = "N/A";
            if (course.getTeachers() != null && !course.getTeachers().isEmpty()) {
                User teacher = course.getTeachers().iterator().next();
                teacherName = teacher.getFirstName() + " " + teacher.getLastName();
                teacherEmail = teacher.getEmail();
            }

            return StudentAttendanceStatsDto.builder()
                    .courseId(course.getCourseId())
                    .courseName(course.getCourseName())
                    .totalSessions(totalSessions)
                    .presentCount(presentCount)
                    .attendanceRate(attendanceRate)
                    .courseTotalHours(courseTotalHours)
                    .studentAttendedHours(studentAttendedHours)
                    .teacherName(teacherName)
                    .teacherEmail(teacherEmail)
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
