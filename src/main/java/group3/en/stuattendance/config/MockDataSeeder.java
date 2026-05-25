package group3.en.stuattendance.config;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceHour;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Attendancemanager.Repository.AttendanceRecordRepository;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Institutionmanager.Model.Speciality;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Institutionmanager.Repository.InstitutionRepository;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import group3.en.stuattendance.Institutionmanager.Repository.DepartmentRepository;
import group3.en.stuattendance.Institutionmanager.Repository.SpecialityRepository;
import group3.en.stuattendance.Timetablemanager.Enum.SessionStatus;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Usermanager.Model.Role;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.RoleRepository;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;

@Slf4j
@Component
@Order(2) // Run after AdminDataInitialiser and DataInitializer
@RequiredArgsConstructor
public class MockDataSeeder implements CommandLineRunner {

    private final InstitutionRepository institutionRepository;
    private final DepartmentRepository departmentRepository;
    private final SpecialityRepository specialityRepository;
    private final ClassroomRepository classroomRepository;
    private final CourseRepository courseRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AttendanceRecordRepository attendanceRecordRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (classroomRepository.count() > 0) {
            log.info("Mock data already seeded.");
            return;
        }

        log.info("Seeding comprehensive mock data for PDF exports testing...");

        // 1. Institution and Speciality
        Institution institution = institutionRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new RuntimeException("Institution not found. Ensure DataInitializer runs first."));

        Department department = Department.builder()
                .name("Computer Science")
                .institution(institution)
                .build();
        department = departmentRepository.save(department);

        Speciality speciality = new Speciality();
        speciality.setName("Génie Logiciel");
        speciality.setDepartment(department);
        speciality = specialityRepository.save(speciality);

        // 2. Classroom
        Classroom classroom = Classroom.builder()
                .name("INGE-3 GL")
                .level(3)
                .capacity(50)
                .speciality(speciality)
                .build();
        classroom = classroomRepository.save(classroom);

        // 3. Roles
        Role teacherRole = roleRepository.findByName("TEACHER").orElseThrow();
        Role studentRole = roleRepository.findByName("STUDENT").orElseThrow();

        // 4. Users (Teacher and Students)
        User teacher = User.builder()
                .username("prof.smith")
                .firstName("John")
                .lastName("Smith")
                .email("prof@sji.com")
                .password(passwordEncoder.encode("password"))
                .roles(new HashSet<>(Collections.singleton(teacherRole)))
                .institution(institution)
                .build();
        teacher = userRepository.save(teacher);

        List<User> students = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            User student = User.builder()
                    .username("student" + i)
                    .firstName("Student")
                    .lastName(String.valueOf(i))
                    .matricule("MAT-2026-" + i)
                    .email("student" + i + "@sji.com")
                    .password(passwordEncoder.encode("password"))
                    .roles(new HashSet<>(Collections.singleton(studentRole)))
                    .classroom(classroom)
                    .institution(institution)
                    .build();
            students.add(userRepository.save(student));
        }

        // 5. Courses
        Course mathCourse = Course.builder()
                .courseName("Advanced Mathematics")
                .code("MATH301")
                .credits(4)
                .totalHours(40)
                .level(3)
                .semester(1)
                .speciality(speciality)
                .build();
        mathCourse.getTeachers().add(teacher);
        mathCourse = courseRepository.save(mathCourse);

        Course csCourse = Course.builder()
                .courseName("Software Architecture")
                .code("CS301")
                .credits(6)
                .totalHours(60)
                .level(3)
                .semester(1)
                .speciality(speciality)
                .build();
        csCourse.getTeachers().add(teacher);
        csCourse = courseRepository.save(csCourse);

        // 6. Sessions (Monday and Tuesday of the current week)
        LocalDate today = LocalDate.now();
        LocalDate monday = today.minusDays(today.getDayOfWeek().getValue() - 1);
        
        // Session 1: Monday Morning (8:00 - 12:00) - CS Course
        Session s1 = Session.builder()
                .course(csCourse)
                .teacher(teacher)
                .classroom(classroom)
                .date(monday)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(12, 0))
                .status(SessionStatus.COMPLETED)
                .build();
        s1 = sessionRepository.save(s1);

        // Session 2: Monday Afternoon (14:00 - 18:00) - Math Course
        Session s2 = Session.builder()
                .course(mathCourse)
                .teacher(teacher)
                .classroom(classroom)
                .date(monday)
                .startTime(LocalTime.of(14, 0))
                .endTime(LocalTime.of(18, 0))
                .status(SessionStatus.COMPLETED)
                .build();
        s2 = sessionRepository.save(s2);

        // Session 3: Tuesday Morning (8:00 - 10:00) - CS Course
        Session s3 = Session.builder()
                .course(csCourse)
                .teacher(teacher)
                .classroom(classroom)
                .date(monday.plusDays(1))
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(10, 0))
                .status(SessionStatus.COMPLETED)
                .build();
        s3 = sessionRepository.save(s3);

        // 7. Attendance Records
        // S1 (4 hours)
        for (int i = 0; i < students.size(); i++) {
            User student = students.get(i);
            AttendanceRecord record = AttendanceRecord.builder()
                    .session(s1)
                    .user(student)
                    .status(i == 0 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT) // student 1 is absent for 4 hours
                    .hoursAttended(i == 0 ? 0 : 4)
                    .build();
                    
            List<AttendanceHour> hours = new ArrayList<>();
            for (int h = 0; h < 4; h++) {
                AttendanceHour hour = new AttendanceHour();
                hour.setAttendanceRecord(record);
                hour.setHourIndex(h);
                hour.setStatus(i == 0 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT);
                hours.add(hour);
            }
            record.setHourSlots(hours);
            attendanceRecordRepository.save(record);
        }

        // S2 (4 hours)
        for (int i = 0; i < students.size(); i++) {
            User student = students.get(i);
            // student 2 is absent, student 1 is late (absent first 2 hours)
            AttendanceStatus overallStatus = (i == 1) ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
            int attended = (i == 1) ? 0 : (i == 0 ? 2 : 4);
            
            AttendanceRecord record = AttendanceRecord.builder()
                    .session(s2)
                    .user(student)
                    .status(overallStatus)
                    .hoursAttended(attended)
                    .build();

            List<AttendanceHour> hours = new ArrayList<>();
            for (int h = 0; h < 4; h++) {
                AttendanceHour hour = new AttendanceHour();
                hour.setAttendanceRecord(record);
                hour.setHourIndex(h);
                if (i == 1) {
                    hour.setStatus(AttendanceStatus.ABSENT);
                } else if (i == 0 && h < 2) {
                    hour.setStatus(AttendanceStatus.ABSENT);
                } else {
                    hour.setStatus(AttendanceStatus.PRESENT);
                }
                hours.add(hour);
            }
            record.setHourSlots(hours);
            attendanceRecordRepository.save(record);
        }
        
        // S3 (2 hours)
        for (int i = 0; i < students.size(); i++) {
            User student = students.get(i);
            AttendanceRecord record = AttendanceRecord.builder()
                    .session(s3)
                    .user(student)
                    .status(AttendanceStatus.PRESENT) // everyone is present
                    .hoursAttended(2)
                    .build();
            List<AttendanceHour> hours = new ArrayList<>();
            for (int h = 0; h < 2; h++) {
                AttendanceHour hour = new AttendanceHour();
                hour.setAttendanceRecord(record);
                hour.setHourIndex(h);
                hour.setStatus(AttendanceStatus.PRESENT);
                hours.add(hour);
            }
            record.setHourSlots(hours);
            attendanceRecordRepository.save(record);
        }

        log.info("Mock data seeding completed successfully.");
    }
}
