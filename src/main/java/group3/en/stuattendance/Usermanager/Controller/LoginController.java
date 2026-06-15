package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Usermanager.Authentication.JwtUtil;
import group3.en.stuattendance.Usermanager.Service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class LoginController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserService userService;

    @Value("${jwt.expiration}")
    private int jwtExpiration;

    @Value("${jwt.cookie-name}")
    private String cookieName;

    @GetMapping("/login")
    public String loginPage() {
        return "login"; // → src/main/resources/templates/login.html
    }

    @GetMapping("/change-password")
    public String changePasswordPage() {
        return "auth/change-password";
    }

    @GetMapping("/")
    public String root() {
        return "redirect:/login";
    }

    @PostMapping("/change-password")
    public String processChangePassword(
            @RequestParam("currentPassword") String currentPassword,
            @RequestParam("newPassword") String newPassword,
            @RequestParam("confirmPassword") String confirmPassword,
            Model model,
            Authentication authentication) {

        if (!newPassword.equals(confirmPassword)) {
            model.addAttribute("error", "New passwords do not match.");
            return "auth/change-password";
        }

        try {
            userService.changePassword(currentPassword, newPassword);

            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isPedagog = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_PEDAGOG"));
            boolean isTeacher = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));

            if (isAdmin) {
                return "redirect:/admin/dashboard";
            } else if (isPedagog) {
                return "redirect:/pedagog/dashboard";
            } else if (isTeacher) {
                return "redirect:/teacher/dashboard";
            } else {
                return "redirect:/";
            }
        } catch (Exception e) {
            model.addAttribute("error", e.getMessage());
            return "auth/change-password";
        }
    }

    @PostMapping("/forgot-password")
    public String processForgotPassword(@RequestParam("email") String email, org.springframework.web.servlet.mvc.support.RedirectAttributes redirectAttributes) {
        try {
            userService.requestPasswordReset(email);
            redirectAttributes.addFlashAttribute("message", "If an account exists for that email, a password reset request has been sent to the administrator.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "An error occurred: " + e.getMessage());
        }
        return "redirect:/login";
    }
}

