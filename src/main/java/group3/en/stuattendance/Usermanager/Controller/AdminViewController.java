package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Institutionmanager.DTO.ClassroomDto;
import group3.en.stuattendance.Institutionmanager.DTO.DepartmentDto;
import group3.en.stuattendance.Timetablemanager.DTO.CourseDto;
import group3.en.stuattendance.Institutionmanager.DTO.InstitutionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.ArrayList;

@Controller
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminViewController {

    private final group3.en.stuattendance.Usermanager.Repository.RoleRepository roleRepository;
    private final group3.en.stuattendance.Usermanager.Service.UserService userService;
    private final group3.en.stuattendance.Usermanager.Service.PermissionService permissionService;
    private final group3.en.stuattendance.Institutionmanager.Service.InstitutionService institutionService;
    private final group3.en.stuattendance.Institutionmanager.Service.CycleService cycleService;

    @GetMapping("")
    public String adminRoot() {
        return "redirect:/admin/dashboard";
    }

    @GetMapping("/dashboard")
    public String dashboard(Model model) {
        // Adding data to satisfy Thymeleaf requirements in admin.html
        model.addAttribute("institutions", institutionService.getAllInstitutions());
        model.addAttribute("cycles", cycleService.getAllCycles());
        model.addAttribute("classrooms", new ArrayList<>());
        model.addAttribute("courses", new ArrayList<>());
        model.addAttribute("roles", roleRepository.findAll());
        model.addAttribute("allPermissions", permissionService.getAllPermissions());
        
        // Add missing attributes for the overview section
        model.addAttribute("adminName", "Administrator");
        model.addAttribute("notifications", 0);
        
        // Add dummy stats to satisfy the overview cards
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("totalUsers", 0);
        stats.put("userGrowth", "+0%");
        stats.put("studentCount", 0);
        stats.put("facultyCount", 0);
        stats.put("staffCount", 0);
        stats.put("adminCount", 0);
        stats.put("activeSessions", 0);
        stats.put("sessionGrowth", "+0%");
        stats.put("currentSessions", 0);
        stats.put("peakSessions", 0);
        stats.put("totalInstitutions", 0);
        stats.put("activeStaff", 0);
        stats.put("totalStudents", 0);
        model.addAttribute("stats", stats);
        
        model.addAttribute("institutionDto", new InstitutionDto());
        model.addAttribute("staffDto", new group3.en.stuattendance.Usermanager.DTO.StaffCreateDto());
        model.addAttribute("classroomDto", new ClassroomDto());
        model.addAttribute("courseDto", new CourseDto());
        
        return "dashboards/admin";
    }
}
