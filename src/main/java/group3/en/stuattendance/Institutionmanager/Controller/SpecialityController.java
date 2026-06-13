package group3.en.stuattendance.Institutionmanager.Controller;

import group3.en.stuattendance.Institutionmanager.DTO.SpecialityDto;
import group3.en.stuattendance.Institutionmanager.Service.SpecialityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.HashMap;

import java.util.List;

@Controller
@RequestMapping("/admin/specialities")
@RequiredArgsConstructor
public class SpecialityController {

    private final SpecialityService specialityService;

    @PostMapping("/create")
    public String createSpeciality(
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestParam Integer departmentId,
            RedirectAttributes redirectAttributes) {

        try {
            SpecialityDto specialityDto = SpecialityDto.builder()
                    .name(name)
                    .description(description)
                    .departmentId(departmentId)
                    .build();

            specialityService.createSpeciality(specialityDto);

            redirectAttributes.addFlashAttribute("success",
                    "Speciality '" + name + "' created successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error",
                    "Failed to create speciality: " + e.getMessage());
        }

        return "redirect:/admin/dashboard?section=institutions";
    }

    @PostMapping("/edit/{id}")
    public String updateSpeciality(
            @PathVariable Integer id,
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestParam Integer departmentId,
            RedirectAttributes redirectAttributes) {

        try {
            SpecialityDto specialityDto = SpecialityDto.builder()
                    .name(name)
                    .description(description)
                    .departmentId(departmentId)
                    .build();

            specialityService.updateSpeciality(id, specialityDto);

            redirectAttributes.addFlashAttribute("success",
                    "Speciality updated successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error",
                    "Failed to update speciality: " + e.getMessage());
        }

        return "redirect:/admin/dashboard?section=institutions";
    }

    @PostMapping("/delete/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> deleteSpeciality(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            specialityService.deleteSpeciality(id);
            response.put("success", true);
            response.put("message", "Speciality deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to delete speciality: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ResponseEntity<SpecialityDto> getSpecialityById(@PathVariable Integer id) {
        return ResponseEntity.ok(specialityService.getSpecialityById(id));
    }

    @GetMapping
    @ResponseBody
    public ResponseEntity<List<SpecialityDto>> getAllSpecialities() {
        return ResponseEntity.ok(specialityService.getAllSpecialities());
    }

    @GetMapping("/by-department/{departmentId}")
    @ResponseBody
    public ResponseEntity<List<SpecialityDto>> getSpecialitiesByDepartment(@PathVariable Integer departmentId) {
        return ResponseEntity.ok(specialityService.getSpecialitiesByDepartmentId(departmentId));
    }
}
