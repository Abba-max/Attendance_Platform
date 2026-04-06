package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import group3.en.stuattendance.Institutionmanager.Model.Speciality;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Institutionmanager.Repository.DepartmentRepository;
import group3.en.stuattendance.Institutionmanager.Repository.SpecialityRepository;
import group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.security.Principal;
import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@Controller
@RequestMapping("/pedagog")
@RequiredArgsConstructor
public class PedagogViewController {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final SpecialityRepository specialityRepository;
    private final ClassroomRepository classroomRepository;
    private final CourseRepository courseRepository;
    private final AcademicYearRepository academicYearRepository;

    @GetMapping("/dashboard")
    @Transactional(readOnly = true)
    public String dashboard(Model model, Principal principal) {
        if (principal == null) return "redirect:/login";

        User currentUser = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Department> departments = departmentRepository.findByPedagogicAssistants_UserId(currentUser.getUserId());

        List<Speciality> departmentSpecialities = new ArrayList<>();
        List<Classroom> departmentClassrooms = new ArrayList<>();
        List<Course> departmentCourses = new ArrayList<>();
        Set<User> departmentTeachers = new HashSet<>();

        for (Department dept : departments) {
            List<Speciality> specialities = specialityRepository.findByDepartment_DepartmentId(dept.getDepartmentId());
            departmentSpecialities.addAll(specialities);

            for (Speciality spec : specialities) {
                List<Classroom> classrooms = classroomRepository.findBySpeciality_SpecialityId(spec.getSpecialityId());
                departmentClassrooms.addAll(classrooms);

                List<Course> courses = courseRepository.findBySpecialitySpecialityId(spec.getSpecialityId());
                departmentCourses.addAll(courses);

                for (Course course : courses) {
                    if (course.getTeachers() != null) {
                        departmentTeachers.addAll(course.getTeachers());
                    }
                }
            }
        }

        List<User> departmentStudents = departmentClassrooms.stream()
                .flatMap(c -> c.getStudents() != null ? c.getStudents().stream() : java.util.stream.Stream.empty())
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        departmentStudents.sort((u1, u2) -> {
            if (u1.getCreatedAt() == null && u2.getCreatedAt() == null) return 0;
            if (u1.getCreatedAt() == null) return 1;
            if (u2.getCreatedAt() == null) return -1;
            return u2.getCreatedAt().compareTo(u1.getCreatedAt());
        });
        
        departmentCourses.sort((c1, c2) -> {
            if (c1.getCreatedAt() == null && c2.getCreatedAt() == null) return 0;
            if (c1.getCreatedAt() == null) return 1;
            if (c2.getCreatedAt() == null) return -1;
            return c2.getCreatedAt().compareTo(c1.getCreatedAt());
        });

        model.addAttribute("username", currentUser.getUsername());
        model.addAttribute("departmentName", departments.isEmpty() ? "Academic Services" : departments.get(0).getName());
        model.addAttribute("totalStudents", (long) departmentStudents.size());
        model.addAttribute("totalCourses", (long) departmentCourses.size());
        model.addAttribute("totalSpecialities", (long) departmentSpecialities.size());
        model.addAttribute("totalTeachers", (long) departmentTeachers.size());
        model.addAttribute("specialities", departmentSpecialities);
        model.addAttribute("classrooms", departmentClassrooms);
        model.addAttribute("departments", departments);
        model.addAttribute("students", departmentStudents);
        model.addAttribute("courses", departmentCourses);
        model.addAttribute("academicYears", academicYearRepository.findAll());
        model.addAttribute("activeAcademicYearId", academicYearRepository.findActiveAcademicYear()
                                                        .map(group3.en.stuattendance.Institutionmanager.Model.AcademicYear::getId)
                                                        .orElse(null));

        // Pre-compute classroom count per speciality to avoid lazy-load in template
        Map<Integer, Long> classroomCountBySpec = departmentClassrooms.stream()
                .filter(c -> c.getSpeciality() != null)
                .collect(Collectors.groupingBy(
                        c -> c.getSpeciality().getSpecialityId(),
                        Collectors.counting()));
        model.addAttribute("classroomCountBySpec", classroomCountBySpec);

        // Safe pedagog name
        String pedagogFirst = currentUser.getFirstName() != null ? currentUser.getFirstName() : "";
        String pedagogLast  = currentUser.getLastName()  != null ? currentUser.getLastName()  : "";
        model.addAttribute("pedagogName", (pedagogFirst + " " + pedagogLast).trim());
        model.addAttribute("userId", currentUser.getUserId());
        
        // Add current week (1-52)
        int currentWeek = LocalDate.now().get(WeekFields.of(Locale.getDefault()).weekOfWeekBasedYear());
        model.addAttribute("currentWeek", currentWeek);
        model.addAttribute("weekDays", List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"));

        return "dashboards/pedagog/pedagog";
    }
}