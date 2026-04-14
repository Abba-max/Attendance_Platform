package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Usermanager.Authentication.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/student")
@RequiredArgsConstructor
public class StudentViewController {

    @GetMapping("/dashboard")
    public String studentDashboard(Model model, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails != null) {
            model.addAttribute("username", userDetails.getUsername());
            model.addAttribute("userId", userDetails.getUserId());
            model.addAttribute("firstName", userDetails.getFirstName());
            model.addAttribute("lastName", userDetails.getLastName());
        }
        return "dashboards/student/student";
    }
}
