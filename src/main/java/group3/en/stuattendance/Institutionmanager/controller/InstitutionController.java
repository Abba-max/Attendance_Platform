package group3.en.stuattendance.Institutionmanager.Controller;

import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Institutionmanager.Model.Cycle;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Service.InstitutionService;
import group3.en.stuattendance.Institutionmanager.Service.CycleService;
import group3.en.stuattendance.Institutionmanager.Service.DepartmentService;
import group3.en.stuattendance.Institutionmanager.Service.ClassroomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

/**
 * Controller for managing Institutions
 */
@Controller
@RequestMapping("/admin/institutions")
public class InstitutionController {

    @Autowired
    private InstitutionService institutionService;

    @Autowired
    private CycleService cycleService;

    /**
     * Show institutions management page
     */
    @GetMapping
    public String showInstitutions(Model model) {
        List<Institution> institutions = institutionService.getAllInstitutions();
        List<Cycle> cycles = cycleService.getAllCycles();

        model.addAttribute("institutions", institutions);
        model.addAttribute("cycles", cycles);

        return "dashboards/updated-manage-institutions";
    }

    /**
     * Create new institution
     */
    @PostMapping("/create")
    public String createInstitution(
            @RequestParam String name,
            @RequestParam String location,
            RedirectAttributes redirectAttributes) {

        try {
            Institution institution = Institution.builder()
                    .name(name)
                    .location(location)
                    .build();

            institutionService.save(institution);

            redirectAttributes.addFlashAttribute("success",
                    "Institution '" + name + "' created successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error",
                    "Failed to create institution: " + e.getMessage());
        }

        return "redirect:/admin/dashboard?section=institutions";
    }

    /**
     * Edit institution page
     */
    @GetMapping("/edit/{id}")
    public String editInstitution(@PathVariable Integer id, Model model) {
        Institution institution = institutionService.findById(id);
        model.addAttribute("institution", institution);
        return "admin/edit-institution";
    }

    /**
     * Update institution
     */
    @PostMapping("/edit/{id}")
    public String updateInstitution(
            @PathVariable Integer id,
            @RequestParam String name,
            @RequestParam String location,
            RedirectAttributes redirectAttributes) {

        try {
            Institution institution = institutionService.findById(id);
            institution.setName(name);
            institution.setLocation(location);

            institutionService.save(institution);

            redirectAttributes.addFlashAttribute("success",
                    "Institution updated successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error",
                    "Failed to update institution: " + e.getMessage());
        }

        return "redirect:/admin/dashboard?section=institutions";
    }

    /**
     * Delete institution
     */
    @PostMapping("/delete/{id}")
    @ResponseBody
    public String deleteInstitution(@PathVariable Integer id) {
        try {
            institutionService.deleteById(id);
            return "success";
        } catch (Exception e) {
            return "error";
        }
    }
}

/**
 * Controller for managing Cycles
 */
@Controller
@RequestMapping("/admin/cycles")
class CycleController {

    @Autowired
    private CycleService cycleService;

    /**
     * Create new cycle
     */
    @PostMapping("/create")
    public String createCycle(
            @RequestParam String name,
            @RequestParam(required = false) String description,
            RedirectAttributes redirectAttributes) {

        try {
            Cycle cycle = Cycle.builder()
                    .name(name)
                    .description(description)
                    .build();

            cycleService.save(cycle);

            redirectAttributes.addFlashAttribute("success",
                    "Cycle '" + name + "' created successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error",
                    "Failed to create cycle: " + e.getMessage());
        }

        return "redirect:/admin/dashboard?section=institutions";
    }

    /**
     * Delete cycle
     */
    @PostMapping("/delete/{id}")
    @ResponseBody
    public String deleteCycle(@PathVariable Integer id) {
        try {
            cycleService.deleteById(id);
            return "success";
        } catch (Exception e) {
            return "error";
        }
    }
}

/**
 * Controller for managing Departments
 */
@Controller
@RequestMapping("/admin/departments")
class DepartmentController {

    @Autowired
    private DepartmentService departmentService;

    @Autowired
    private InstitutionService institutionService;

    @Autowired
    private CycleService cycleService;

    /**
     * Create new department
     */
    @PostMapping("/create")
    public String createDepartment(
            @RequestParam String name,
            @RequestParam(required = false) String chief,
            @RequestParam Integer cycleId,
            @RequestParam Integer institutionId,
            RedirectAttributes redirectAttributes) {

        try {
            Institution institution = institutionService.findById(institutionId);
            Cycle cycle = cycleService.findById(cycleId);

            Department department = Department.builder()
                    .name(name)
                    .chief(chief)
                    .institution(institution)
                    .cycle(cycle)
                    .build();

            departmentService.save(department);

            redirectAttributes.addFlashAttribute("success",
                    "Department '" + name + "' created successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error",
                    "Failed to create department: " + e.getMessage());
        }

        return "redirect:/admin/dashboard?section=institutions";
    }

    /**
     * View department details
     */
    @GetMapping("/view/{id}")
    public String viewDepartment(@PathVariable Integer id, Model model) {
        Department department = departmentService.findById(id);
        model.addAttribute("department", department);
        return "admin/view-department";
    }

    /**
     * Delete department
     */
    @PostMapping("/delete/{id}")
    @ResponseBody
    public String deleteDepartment(@PathVariable Integer id) {
        try {
            departmentService.deleteById(id);
            return "success";
        } catch (Exception e) {
            return "error";
        }
    }
}

/**
 * Controller for managing Classrooms
 */
@Controller
@RequestMapping("/admin/classrooms")
class ClassroomController {

    @Autowired
    private ClassroomService classroomService;

    @Autowired
    private DepartmentService departmentService;

    /**
     * Create new classroom
     */
    @PostMapping("/create")
    public String createClassroom(
            @RequestParam String name,
            @RequestParam Integer level,
            @RequestParam Integer capacity,
            @RequestParam Integer departmentId,
            RedirectAttributes redirectAttributes) {

        try {
            Department department = departmentService.findById(departmentId);

            Classroom classroom = Classroom.builder()
                    .name(name)
                    .level(level)
                    .capacity(capacity)
                    .department(department)
                    .build();

            classroomService.save(classroom);

            redirectAttributes.addFlashAttribute("success",
                    "Classroom '" + name + "' created successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error",
                    "Failed to create classroom: " + e.getMessage());
        }

        return "redirect:/admin/dashboard?section=institutions";
    }

    /**
     * View classroom details
     */
    @GetMapping("/view/{id}")
    public String viewClassroom(@PathVariable Integer id, Model model) {
        Classroom classroom = classroomService.findById(id);
        model.addAttribute("classroom", classroom);
        return "admin/view-classroom";
    }

    /**
     * Delete classroom
     */
    @PostMapping("/delete/{id}")
    @ResponseBody
    public String deleteClassroom(@PathVariable Integer id) {
        try {
            classroomService.deleteById(id);
            return "success";
        } catch (Exception e) {
            return "error";
        }
    }
}