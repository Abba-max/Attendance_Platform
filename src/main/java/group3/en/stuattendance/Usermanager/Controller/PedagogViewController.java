package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import group3.en.stuattendance.Institutionmanager.Model.Speciality;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Institutionmanager.Repository.DepartmentRepository;
import group3.en.stuattendance.Institutionmanager.Repository.SpecialityRepository;
import group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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
    public String dashboard(Model model, Principal principal) {
        if (principal == null) return "redirect:/login";

        User currentUser = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Get departments assigned to this pedagog
        List<Department> departments = departmentRepository.findByPedagogicAssistants_UserId(currentUser.getUserId());
        
        List<Speciality> departmentSpecialities = new ArrayList<>();
        List<Classroom> departmentClassrooms = new ArrayList<>();
        long totalStudents = 0;
        long totalCourses = 0;
        long totalTeachers = 0;

        List<group3.en.stuattendance.Timetablemanager.Model.Course> departmentCourses = new ArrayList<>();
        for (Department dept : departments) {
            List<Speciality> specialities = specialityRepository.findByDepartment_DepartmentId(dept.getDepartmentId());
            departmentSpecialities.addAll(specialities);
            
            for (Speciality spec : specialities) {
                List<Classroom> classrooms = classroomRepository.findBySpeciality_SpecialityId(spec.getSpecialityId());
                departmentClassrooms.addAll(classrooms);
                
                List<group3.en.stuattendance.Timetablemanager.Model.Course> courses = courseRepository.findBySpeciality_SpecialityId(spec.getSpecialityId());
                departmentCourses.addAll(courses);
                
                for (Classroom classroom : classrooms) {
                    totalStudents += classroom.getStudents().size();
                }
            }
        }

        List<User> departmentStudents = new ArrayList<>();
        for (Classroom classroom : departmentClassrooms) {
            departmentStudents.addAll(classroom.getStudents());
        }

        // Distinct counts if needed, but usually pedagog is assigned to one or few distinct departments
        model.addAttribute("pedagogName", currentUser.getFirstName() + " " + currentUser.getLastName());
        model.addAttribute("username", currentUser.getUsername());
        model.addAttribute("departmentName", departments.isEmpty() ? "Academic Services" : departments.get(0).getName());
        model.addAttribute("totalStudents", (long) departmentStudents.size());
        model.addAttribute("totalCourses", (long) departmentCourses.size());
        model.addAttribute("totalSpecialities", (long) departmentSpecialities.size());
        model.addAttribute("totalTeachers", totalTeachers); // This might need a more complex query if teachers are not directly linked to spec
        
        model.addAttribute("specialities", departmentSpecialities);
        model.addAttribute("classrooms", departmentClassrooms);
        model.addAttribute("departments", departments);
        model.addAttribute("students", departmentStudents);
        model.addAttribute("courses", departmentCourses);
        model.addAttribute("academicYears", academicYearRepository.findAll());

        return "dashboards/pedagog/pedagog";
    }
}