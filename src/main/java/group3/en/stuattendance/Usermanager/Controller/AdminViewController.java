package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearDto;
import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearScheduleDto;
import group3.en.stuattendance.Institutionmanager.DTO.ClassroomDto;
import group3.en.stuattendance.Institutionmanager.Service.ClassroomService;
import group3.en.stuattendance.Institutionmanager.Service.AcademicYearScheduleService;
import group3.en.stuattendance.Institutionmanager.Service.AcademicYearService;
import group3.en.stuattendance.Institutionmanager.DTO.DepartmentDto;
import group3.en.stuattendance.Institutionmanager.Service.*;
import group3.en.stuattendance.Timetablemanager.DTO.CourseDto;
import group3.en.stuattendance.Institutionmanager.DTO.InstitutionDto;
import group3.en.stuattendance.Usermanager.Repository.RoleRepository;
import group3.en.stuattendance.Usermanager.Service.PermissionService;
import group3.en.stuattendance.Usermanager.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.ArrayList;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

@Controller
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminViewController {

    private final RoleRepository roleRepository;
    private final UserService userService;
    private final PermissionService permissionService;
    private final InstitutionService institutionService;
    private final CycleService cycleService;
    private final DepartmentService departmentService;
    private final ClassroomService classroomService;
    private final AcademicYearService academicYearService;
    private final AcademicYearScheduleService academicYearScheduleService;

    @GetMapping("")
    public String adminRoot() {
        return "redirect:/admin/dashboard";
    }

    @GetMapping("/dashboard")
    public String dashboard(Model model) {
        // Adding data to satisfy Thymeleaf requirements in admin.html
        model.addAttribute("institutions", institutionService.getAllInstitutions());
        model.addAttribute("cycles", cycleService.getAllCycles());
        model.addAttribute("allDepartments", departmentService.getAllDepartments());
        model.addAttribute("classrooms", classroomService.getAllClassrooms());
        model.addAttribute("courses", new ArrayList<>());
        model.addAttribute("roles", roleRepository.findAll());
        model.addAttribute("allPermissions", permissionService.getAllPermissions());
        
        // Fetch currently authenticated user's name
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = (auth != null) ? auth.getName() : "Administrator";
        
        // Add missing attributes for the overview section
        model.addAttribute("adminName", currentUsername);
        model.addAttribute("notifications", 0);
        
        java.util.List<group3.en.stuattendance.Usermanager.Model.User> allStaff = userService.getAllStaff();
        model.addAttribute("pedagogicAssistants", allStaff.stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> r.getName().equals("PEDAGOG")))
            .collect(java.util.stream.Collectors.toList()));
        model.addAttribute("supervisors", allStaff.stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> r.getName().equals("SUPERVISOR")))
            .collect(java.util.stream.Collectors.toList()));

        java.util.List<group3.en.stuattendance.Usermanager.Model.User> allUsers = userService.getAllUsers();
        
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("totalUsers", allUsers.size());
        stats.put("userGrowth", "+0%"); // Placeholder for now
        
        long studentCount = allUsers.stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> r.getName().equals("STUDENT")))
            .count();
        long adminCount = allUsers.stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> r.getName().equals("ADMIN")))
            .count();
        long staffCount = allUsers.stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> r.getName().equals("PEDAGOG") || r.getName().equals("SUPERVISOR")))
            .count();
            
        stats.put("studentCount", studentCount);
        stats.put("departmentCount", departmentService.getAllDepartments().size());
        stats.put("staffCount", staffCount);
        stats.put("adminCount", adminCount);
        
        stats.put("activeSessions", 0);
        stats.put("sessionGrowth", "+0%");
        stats.put("currentSessions", 0);
        stats.put("peakSessions", 0);
        
        stats.put("totalInstitutions", institutionService.getAllInstitutions().size());
        stats.put("totalCycles", cycleService.getAllCycles().size());
        stats.put("activeStaff", staffCount); // Using staffCount as activeStaff for now
        stats.put("totalStudents", studentCount);
        
        model.addAttribute("stats", stats);
        
        model.addAttribute("institutionDto", new InstitutionDto());
        model.addAttribute("staffDto", new group3.en.stuattendance.Usermanager.DTO.StaffCreateDto());
        model.addAttribute("classroomDto", new ClassroomDto());
        model.addAttribute("courseDto", new CourseDto());

        // Academic Years + their scoped schedules
        List<AcademicYearDto> academicYears = academicYearService.getAllAcademicYears();
        model.addAttribute("academicYears", academicYears);

        // Build a map: yearId -> list of schedules
        Map<Long, List<AcademicYearScheduleDto>> schedulesByYear = new LinkedHashMap<>();
        for (AcademicYearDto year : academicYears) {
            schedulesByYear.put(year.getId(), academicYearScheduleService.getSchedulesByAcademicYear(year.getId()));
        }
        model.addAttribute("schedulesByYear", schedulesByYear);
        
        return "dashboards/admin";
    }
}
