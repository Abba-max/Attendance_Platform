package group3.en.stuattendance.Usermanager.ServiceImpl;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Attendancemanager.Repository.AttendanceRecordRepository;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Usermanager.DTO.TeacherClassCourseDto;
import group3.en.stuattendance.Usermanager.DTO.TeacherStudentStatDto;
import group3.en.stuattendance.Usermanager.DTO.TeacherFullStudentDto;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import group3.en.stuattendance.Usermanager.Service.TeacherStatsService;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeacherStatsServiceImpl implements TeacherStatsService {

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final ClassroomRepository classroomRepository;

    @Override
    public List<TeacherClassCourseDto> getTeacherClassesAndCourses(Integer teacherId) {
        List<TeacherClassCourseDto> contexts = new ArrayList<>();

        // 1. Get from scheduled sessions (Timetable)
        List<Session> sessions = sessionRepository.findByTeacherUserId(teacherId);
        List<TeacherClassCourseDto> sessionContexts = sessions.stream()
                .filter(s -> s.getClassroom() != null && s.getCourse() != null)
                .map(s -> new TeacherClassCourseDto(
                        s.getClassroom().getClassId(),
                        s.getClassroom().getName(),
                        s.getCourse().getCourseId(),
                        s.getCourse().getCourseName()
                ))
                .collect(Collectors.toList());
        contexts.addAll(sessionContexts);

        // 2. Get from explicitly assigned courses (Independent of Timetable)
        User teacher = userRepository.findById(teacherId).orElse(null);
        if (teacher != null && teacher.getCourses() != null) {
            for (Course course : teacher.getCourses()) {
                if (course.getSpeciality() != null && course.getLevel() != null) {
                    List<Classroom> classrooms = classroomRepository.findBySpeciality_SpecialityIdAndLevel(
                            course.getSpeciality().getSpecialityId(), course.getLevel());
                    for (Classroom classroom : classrooms) {
                        contexts.add(new TeacherClassCourseDto(
                                classroom.getClassId(),
                                classroom.getName(),
                                course.getCourseId(),
                                course.getCourseName()
                        ));
                    }
                }
            }
        }

        return contexts.stream().distinct().collect(Collectors.toList());
    }

    @Override
    public List<TeacherStudentStatDto> getStudentAttendanceForCourse(Integer classroomId, Integer courseId) {
        List<User> students = userRepository.findByClassroomClassId(classroomId);
        Course course = courseRepository.findById(courseId).orElse(null);
        
        Integer totalHours = (course != null && course.getTotalHours() != null) ? course.getTotalHours() : 0;

        List<TeacherStudentStatDto> stats = new ArrayList<>();
        
        // Fetch all relevant records in ONE query
        List<AttendanceRecord> courseRecords = attendanceRecordRepository.findByClassroomAndCourse(classroomId, courseId);
        
        // Group by user ID
        java.util.Map<Integer, List<AttendanceRecord>> recordsByUserId = courseRecords.stream()
            .collect(Collectors.groupingBy(r -> r.getUser().getUserId()));
        
        for (User student : students) {
            List<AttendanceRecord> studentRecords = recordsByUserId.getOrDefault(student.getUserId(), new ArrayList<>());
            
            int attendedHours = studentRecords.stream()
                    .mapToInt(r -> r.getHoursAttended() != null ? r.getHoursAttended() : 0)
                    .sum();
                    
            double attendanceRate = totalHours > 0 ? ((double) attendedHours / totalHours) * 100 : 0.0;
            
            stats.add(new TeacherStudentStatDto(
                    student.getUserId(),
                    student.getFirstName() + " " + student.getLastName(),
                    student.getEmail(),
                    attendedHours,
                    totalHours,
                    attendanceRate
            ));
        }
        
        return stats;
    }

    @Override
    public List<TeacherFullStudentDto> getTeacherFullStudentList(Integer teacherId) {
        List<TeacherClassCourseDto> contexts = getTeacherClassesAndCourses(teacherId);
        List<TeacherFullStudentDto> result = new ArrayList<>();

        for (TeacherClassCourseDto ctx : contexts) {
            List<TeacherStudentStatDto> studentStats = getStudentAttendanceForCourse(ctx.getClassroomId(), ctx.getCourseId());
            for (TeacherStudentStatDto ss : studentStats) {
                String initials = "";
                if (ss.getStudentName() != null && !ss.getStudentName().isEmpty()) {
                    String[] parts = ss.getStudentName().split(" ");
                    if (parts.length >= 2) {
                        initials = (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
                    } else {
                        initials = ss.getStudentName().substring(0, Math.min(2, ss.getStudentName().length())).toUpperCase();
                    }
                }

                result.add(TeacherFullStudentDto.builder()
                        .name(ss.getStudentName())
                        .initials(initials)
                        .classLabel(ctx.getClassroomName())
                        .subject(ctx.getCourseName())
                        .pct(ss.getAttendanceRate())
                        .attendedHours(ss.getAttendedHours())
                        .totalHours(ss.getTotalCourseHours())
                        .build());
            }
        }
        return result;
    }
}
