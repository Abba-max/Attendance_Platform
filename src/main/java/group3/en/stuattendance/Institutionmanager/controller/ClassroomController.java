package group3.en.stuattendance.Institutionmanager.Controller;

import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Model.Department;
import group3.en.stuattendance.Institutionmanager.Service.ClassroomService;
import group3.en.stuattendance.Institutionmanager.Service.DepartmentService;
import group3.en.stuattendance.Institutionmanager.Service.SpecialityService;
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
    private SpecialityService specialityService;

    @Autowired
    private group3.en.stuattendance.Institutionmanager.Mapper.ClassroomMapper classroomMapper;

    @GetMapping("/by-speciality/{specialityId}")
    @ResponseBody
    public java.util.List<group3.en.stuattendance.Institutionmanager.DTO.ClassroomDto> getClassroomsBySpeciality(@PathVariable Integer specialityId) {
        return classroomService.findBySpecialityId(specialityId);
    }

    /**
     * Create new classroom
     */
    @PostMapping("/create")
    public String createClassroom(
            @RequestParam String name,
            @RequestParam Integer level,
            @RequestParam Integer capacity,
            @RequestParam Integer specialityId,
            RedirectAttributes redirectAttributes) {

        try {
            group3.en.stuattendance.Institutionmanager.Model.Speciality speciality = specialityService.findByIdEntity(specialityId);

            Classroom classroom = Classroom.builder()
                    .name(name)
                    .level(level)
                    .capacity(capacity)
                    .speciality(speciality)
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
            @RequestParam Integer specialityId,
            RedirectAttributes redirectAttributes) {

        try {
            Classroom classroom = classroomService.findById(id);
            classroom.setName(name);
            classroom.setLevel(level);
            classroom.setCapacity(capacity);
            classroom.setSpeciality(specialityService.findByIdEntity(specialityId));
            
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
