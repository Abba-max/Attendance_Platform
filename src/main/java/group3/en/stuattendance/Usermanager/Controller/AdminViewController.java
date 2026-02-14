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

    @GetMapping("")
    public String adminRoot() {
        return "redirect:/admin/dashboard";
    }

    @GetMapping("/dashboard")
    public String dashboard(Model model) {
        // Adding empty lists and DTOs to satisfy Thymeleaf requirements in admin.html
        // as the user mentioned neglecting current endpoints for now.
        model.addAttribute("institutions", new java.util.ArrayList<>());
        model.addAttribute("classrooms", new ArrayList<>());
        model.addAttribute("courses", new ArrayList<>());
        model.addAttribute("roles", roleRepository.findAll());
        model.addAttribute("allPermissions", permissionService.getAllPermissions());
        
        model.addAttribute("institutionDto", new InstitutionDto());
        model.addAttribute("staffDto", new group3.en.stuattendance.Usermanager.DTO.StaffCreateDto());
        model.addAttribute("classroomDto", new ClassroomDto());
        model.addAttribute("courseDto", new CourseDto());
        
        return "dashboards/admin";
    }
}
