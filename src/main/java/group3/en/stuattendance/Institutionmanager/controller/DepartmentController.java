package group3.en.stuattendance.Institutionmanager.Controller;

import group3.en.stuattendance.Institutionmanager.Model.Cycle;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Institutionmanager.Service.CycleService;
import group3.en.stuattendance.Institutionmanager.Service.DepartmentService;
import group3.en.stuattendance.Institutionmanager.Service.InstitutionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

/**
 * Controller for managing Departments
 */
@Controller
@RequestMapping("/admin/departments")
public class DepartmentController {

    @Autowired
    private DepartmentService departmentService;

    @Autowired
    private InstitutionService institutionService;

    @Autowired
    private CycleService cycleService;

    @Autowired
    private group3.en.stuattendance.Institutionmanager.Mapper.DepartmentMapper departmentMapper;

    @GetMapping("/by-cycle/{cycleId}")
    @ResponseBody
    public java.util.List<group3.en.stuattendance.Institutionmanager.DTO.DepartmentDto> getDepartmentsByCycle(@PathVariable Integer cycleId) {
        return departmentService.findByCycleId(cycleId).stream()
                .map(departmentMapper::toDto)
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Create new department
     */
    @PostMapping("/create")
    public String createDepartment(
            @RequestParam String name,
            @RequestParam(required = false) String chief,
            @RequestParam Integer cycleId,
            @RequestParam Integer institutionId,
            @RequestParam(required = false) java.util.Set<Integer> pedagogicAssistantIds,
            @RequestParam(required = false) java.util.Set<Integer> supervisorIds,
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

            Department savedDept = departmentService.save(department);
            
            // Assign staff if provided
            if ((pedagogicAssistantIds != null && !pedagogicAssistantIds.isEmpty()) || (supervisorIds != null && !supervisorIds.isEmpty())) {
                 departmentService.assignStaffToDepartment(savedDept.getDepartmentId(), pedagogicAssistantIds, supervisorIds);
            }

            redirectAttributes.addFlashAttribute("success",
                    "Department '" + name + "' created successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error",
                    "Failed to create department: " + e.getMessage());
        }

        return "redirect:/admin/dashboard?section=institutions";
    }

    /**
     * Update department
     */
    @PostMapping("/edit/{id}")
    public String updateDepartment(
            @PathVariable Integer id,
            @RequestParam String name,
            @RequestParam(required = false) String chief,
            @RequestParam Integer cycleId,
            @RequestParam Integer institutionId,
            @RequestParam(required = false) java.util.Set<Integer> pedagogicAssistantIds,
            @RequestParam(required = false) java.util.Set<Integer> supervisorIds,
            RedirectAttributes redirectAttributes) {

        try {
            Department department = departmentService.findById(id);
            department.setName(name);
            department.setChief(chief);
            
            // Update associations
            department.setCycle(cycleService.findById(cycleId));
            department.setInstitution(institutionService.findById(institutionId));
            
            departmentService.save(department);

            // Update staff assignment
            departmentService.assignStaffToDepartment(id, pedagogicAssistantIds, supervisorIds);

            redirectAttributes.addFlashAttribute("success",
                    "Department updated successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error",
                    "Failed to update department: " + e.getMessage());
        }

        return "redirect:/admin/dashboard?section=institutions";
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
