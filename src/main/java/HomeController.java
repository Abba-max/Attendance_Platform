import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    // Maps the root URL (http://localhost:8080/)
    @GetMapping("/")
    public String home() {
        // Spring Boot automatically looks for 'index.html' 
        // inside the 'src/main/resources/templates/' folder
        return "index"; 
    }
}