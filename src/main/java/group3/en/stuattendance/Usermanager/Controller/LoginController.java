package group3.en.stuattendance.Usermanager.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LoginController {

    // 1. This catches "localhost:8080" and instantly redirects to "localhost:8080/login"
    @GetMapping("/")
    public String rootRedirect() {
        return "redirect:/login";
    }

    // 2. This catches "localhost:8080/login" and actually displays the HTML page
    @GetMapping("/login")
    public String showLoginPage() {
        return "login"; // Looks for src/main/resources/templates/login.html
    }
}