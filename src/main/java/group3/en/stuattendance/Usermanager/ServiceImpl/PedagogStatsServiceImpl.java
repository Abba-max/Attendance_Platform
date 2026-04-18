package group3.en.stuattendance.Usermanager.ServiceImpl;

import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Attendancemanager.Repository.AttendanceRecordRepository;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Speciality;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Institutionmanager.Repository.SpecialityRepository;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Usermanager.DTO.PedagogAttendanceStatsDto;
import group3.en.stuattendance.Usermanager.DTO.PedagogStudentAttendanceStatsDto;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import group3.en.stuattendance.Usermanager.Service.PedagogStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PedagogStatsServiceImpl implements PedagogStatsService {

    private final SpecialityRepository specialityRepository;
    private final ClassroomRepository classroomRepository;
    private final CourseRepository courseRepository;
    private final SessionRepository sessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final UserRepository userRepository;

    @Override
    public List<PedagogAttendanceStatsDto> getAttendanceStats(Integer departmentId, Integer specialityId, Integer classroomId, Integer courseId, Integer week) {
        List<PedagogAttendanceStatsDto> result = new ArrayList<>();

        List<Speciality> specialities;
        if (specialityId != null) {
            specialities = List.of(specialityRepository.findById(specialityId).orElseThrow());
        } else {
            specialities = specialityRepository.findByDepartment_DepartmentId(departmentId);
        }

        for (Speciality spec : specialities) {
            List<Classroom> classrooms;
            if (classroomId != null) {
                classrooms = List.of(classroomRepository.findById(classroomId).orElseThrow());
            } else {
                classrooms = classroomRepository.findBySpeciality_SpecialityId(spec.getSpecialityId());
            }

            List<Course> courses;
            if (courseId != null) {
                courses = List.of(courseRepository.findById(courseId).orElseThrow());
            } else {
                courses = courseRepository.findBySpecialitySpecialityId(spec.getSpecialityId());
            }

            for (Classroom room : classrooms) {
                for (Course course : courses) {
                    List<Session> sessions = sessionRepository.findByCourseCourseId(course.getCourseId());
                    sessions = sessions.stream()
                            .filter(s -> s.getClassroom() != null && s.getClassroom().getClassId().equals(room.getClassId()))
                            .filter(s -> week == null || (s.getWeek() != null && s.getWeek().equals(week)))
                            .collect(Collectors.toList());

                    if (sessions.isEmpty()) continue;

                    int plannedHours = 0;
                    if (week == null) {
                        plannedHours = course.getTotalHours();
                    } else {
                        for (Session session : sessions) {
                            if (session.getStartTime() != null && session.getEndTime() != null) {
                                long duration = ChronoUnit.MINUTES.between(session.getStartTime(), session.getEndTime());
                                plannedHours += (int) Math.max(1, Math.round((double) duration / 60));
                            }
                        }
                    }

                    int attendedHours = 0;
                    for (Session session : sessions) {
                        List<AttendanceRecord> records = attendanceRecordRepository.findBySession_SessionId(session.getSessionId());
                        attendedHours += records.stream()
                                .mapToInt(r -> r.getHoursAttended() != null ? r.getHoursAttended() : 0)
                                .sum();
                    }

                    // Adjust plannedHours: total hours is students * hours per student
                    // But for a dashboard, average yield is (attended) / (total_possible).
                    // Total possible = student_count * plannedHours.
                    long studentCount = room.getStudents() != null ? room.getStudents().size() : 0;
                    if (studentCount == 0) continue;

                    double maxPossibleHours = (double) plannedHours * studentCount;
                    double rate = maxPossibleHours > 0 ? (attendedHours / maxPossibleHours) * 100 : 0.0;

                    result.add(PedagogAttendanceStatsDto.builder()
                            .specialityId(spec.getSpecialityId())
                            .specialityName(spec.getName())
                            .classroomId(room.getClassId())
                            .classroomName(room.getName())
                            .courseId(course.getCourseId())
                            .courseName(course.getCourseName())
                            .attendanceRate(rate)
                            .attendedHours(attendedHours)
                            .plannedHours((int) maxPossibleHours)
                            .build());
                }
            }
        }

        return result;
    }

    @Override
    public List<PedagogStudentAttendanceStatsDto> getStudentAttendanceStats(Integer classroomId, Integer courseId, Integer week) {
        List<PedagogStudentAttendanceStatsDto> result = new ArrayList<>();

        Course course = courseRepository.findById(courseId).orElseThrow();
        List<User> students = userRepository.findByClassroomClassId(classroomId);
        List<Session> sessions = sessionRepository.findByCourseCourseId(courseId).stream()
                .filter(s -> s.getClassroom() != null && s.getClassroom().getClassId().equals(classroomId))
                .filter(s -> week == null || (s.getWeek() != null && s.getWeek().equals(week)))
                .collect(Collectors.toList());

        int plannedHours = 0;
        if (week == null) {
            plannedHours = course.getTotalHours();
        } else {
            for (Session session : sessions) {
                if (session.getStartTime() != null && session.getEndTime() != null) {
                    long duration = ChronoUnit.MINUTES.between(session.getStartTime(), session.getEndTime());
                    plannedHours += (int) Math.max(1, Math.round((double) duration / 60));
                }
            }
        }

        if (plannedHours == 0) return result;

        for (User student : students) {
            int attendedHours = 0;
            for (Session session : sessions) {
                var recordOpt = attendanceRecordRepository.findByUserAndSession(student, session);
                if (!recordOpt.isEmpty()) {
                    // findByUserAndSession returns a List in some versions, let's assume it's List or Optional.
                    // Actually checking AttendanceRecordRepository: List<AttendanceRecord> findByUserAndSession(User user, Session session);
                    attendedHours += recordOpt.stream()
                            .mapToInt(r -> r.getHoursAttended() != null ? r.getHoursAttended() : 0)
                            .sum();
                }
            }

            double rate = (attendedHours / (double) plannedHours) * 100;

            result.add(PedagogStudentAttendanceStatsDto.builder()
                    .userId(student.getUserId())
                    .firstName(student.getFirstName())
                    .lastName(student.getLastName())
                    .matricule(student.getMatricule())
                    .attendanceRate(rate)
                    .attendedHours(attendedHours)
                    .plannedHours(plannedHours)
                    .build());
        }

        return result;
    }

    @Override
    public List<Integer> getCompletedWeeks() {
        return sessionRepository.findDistinctWeeksWithCompletedSessions();
    }
}
