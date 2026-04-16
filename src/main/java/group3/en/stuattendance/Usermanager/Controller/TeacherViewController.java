package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository;
import group3.en.stuattendance.Usermanager.Authentication.CustomUserDetails;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/teacher")
@RequiredArgsConstructor
public class TeacherViewController {

    private final AcademicYearRepository academicYearRepository;
    private final UserRepository userRepository;

    @GetMapping("/dashboard")
    public String teacherDashboard(Model model, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails != null) {
            model.addAttribute("username", userDetails.getUsername());
            model.addAttribute("userId", userDetails.getUserId());
            model.addAttribute("firstName", userDetails.getFirstName());
            model.addAttribute("lastName", userDetails.getLastName());
        }

        model.addAttribute("currentWeek", getWeekNumber(new java.util.Date()));
        
        return "dashboards/teacher/teacher"; // → dashboards/teacher/teacher.html
    }

    private int getWeekNumber(java.util.Date date) {
        java.util.Calendar cal = java.util.Calendar.getInstance();
        cal.setTime(date);
        return cal.get(java.util.Calendar.WEEK_OF_YEAR);
    }
}
