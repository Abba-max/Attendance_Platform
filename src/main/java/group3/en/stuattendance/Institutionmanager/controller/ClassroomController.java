package group3.en.stuattendance.Institutionmanager.Controller;

import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import group3.en.stuattendance.Institutionmanager.Service.ClassroomService;
import group3.en.stuattendance.Institutionmanager.Service.DepartmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

/**
 * Controller for managing Classrooms
 */
@Controller
@RequestMapping("/admin/classrooms")
public class ClassroomController {

    @Autowired
    private ClassroomService classroomService;

    @Autowired
    private DepartmentService departmentService;

    @Autowired
    private group3.en.stuattendance.Institutionmanager.Mapper.ClassroomMapper classroomMapper;

    @GetMapping("/by-department/{deptId}")
    @ResponseBody
    public java.util.List<group3.en.stuattendance.Institutionmanager.DTO.ClassroomDto> getClassroomsByDepartment(@PathVariable Integer deptId) {
        return classroomService.findByDepartmentId(deptId).stream()
                .map(classroomMapper::toDto)
                .collect(java.util.stream.Collectors.toList());
    }

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
     * Update existing classroom
     */
    @PostMapping("/edit/{id}")
    public String updateClassroom(
            @PathVariable Integer id,
            @RequestParam String name,
            @RequestParam Integer level,
            @RequestParam Integer capacity,
            @RequestParam Integer departmentId,
            RedirectAttributes redirectAttributes) {

        try {
            Classroom classroom = classroomService.findById(id);
            classroom.setName(name);
            classroom.setLevel(level);
            classroom.setCapacity(capacity);
            classroom.setDepartment(departmentService.findById(departmentId));
            
            classroomService.save(classroom);

            redirectAttributes.addFlashAttribute("success",
                    "Classroom updated successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error",
                    "Failed to update classroom: " + e.getMessage());
        }

        return "redirect:/admin/dashboard?section=institutions";
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
