package group3.en.stuattendance.Institutionmanager.Controller;

import group3.en.stuattendance.Institutionmanager.DTO.CycleDto;
import group3.en.stuattendance.Institutionmanager.Mapper.CycleMapper;
import group3.en.stuattendance.Institutionmanager.Model.Cycle;
import group3.en.stuattendance.Institutionmanager.Service.CycleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import java.util.Map;
import java.util.HashMap;

/**
 * Controller for managing Cycles
 */
@Controller
@RequestMapping("/admin/cycles")
public class CycleController {

    @Autowired
    private CycleService cycleService;

    @Autowired
    private CycleMapper cycleMapper;

    /**
     * Update existing cycle
     */
    @PostMapping("/edit/{id}")
    public String updateCycle(
            @PathVariable Integer id,
            @RequestParam String name,
            @RequestParam(required = false) String description,
            RedirectAttributes redirectAttributes) {

        try {
            Cycle cycle = cycleService.findById(id);
            cycle.setName(name);
            cycle.setDescription(description);
            
            cycleService.save(cycle);

            redirectAttributes.addFlashAttribute("success",
                    "Cycle updated successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error",
                    "Failed to update cycle: " + e.getMessage());
        }

        return "redirect:/admin/dashboard?section=institutions";
    }

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
    public ResponseEntity<Map<String, Object>> deleteCycle(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            cycleService.deleteById(id);
            response.put("success", true);
            response.put("message", "Cycle deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to delete cycle: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ResponseEntity<CycleDto> getCycleById(@PathVariable Integer id) {
        return ResponseEntity.ok(cycleService.getCycleDtoById(id));
    }
}
