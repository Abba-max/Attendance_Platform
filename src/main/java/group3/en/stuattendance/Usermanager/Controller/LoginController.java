package group3.en.stuattendance.Usermanager.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LoginController {

    @GetMapping("/")
        return "redirect:/login";
    }
    }