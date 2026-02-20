package group3.en.stuattendance.Institutionmanager.Controller;

import group3.en.stuattendance.Institutionmanager.Model.Cycle;
import group3.en.stuattendance.Institutionmanager.Service.CycleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

/**
 * Controller for managing Cycles
 */
@Controller
@RequestMapping("/admin/cycles")
public class CycleController {

    @Autowired
    private CycleService cycleService;

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
    public String deleteCycle(@PathVariable Integer id) {
        try {
            cycleService.deleteById(id);
            return "success";
        } catch (Exception e) {
            return "error";
        }
    }
}
