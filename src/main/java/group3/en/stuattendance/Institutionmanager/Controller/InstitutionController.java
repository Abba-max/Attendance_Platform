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
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

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
    public ResponseEntity<Map<String, Object>> deleteInstitution(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            institutionService.deleteById(id);
            response.put("success", true);
            response.put("message", "Institution deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to delete institution: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}