package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Institutionmanager.Model.AcademicYear;
import group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository;
import group3.en.stuattendance.Usermanager.Authentication.JwtUtil;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequiredArgsConstructor
public class LoginController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final AcademicYearRepository academicYearRepository;

    @Value("${jwt.expiration}")
    private int jwtExpiration;

    @Value("${jwt.cookie-name}")
    private String cookieName;

    @GetMapping("/login")
    public String loginPage() {
        return "login";
    }

    @GetMapping("/")
    public String root() {
        return "redirect:/login";
    }

    @PostMapping("/login")
    public String processLogin(@RequestParam("username") String username,
                               @RequestParam("password") String password,
                               HttpServletResponse response) {
        try {
            // 1. Authenticate credentials
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );

            // 2. Load user from database
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // 3. Get active academic year ID
            AcademicYear activeYear = academicYearRepository.findActiveAcademicYear().orElse(null);
            Long academicYearId = activeYear != null ? activeYear.getId() : null;

            // 4. Generate token using the existing JwtUtil method
            String token = jwtUtil.generateToken(user, academicYearId);

            // 5. Store token in HttpOnly cookie
            Cookie jwtCookie = new Cookie(cookieName, token);
            jwtCookie.setHttpOnly(true);
            jwtCookie.setSecure(false); // set to true in production
            jwtCookie.setPath("/");
            jwtCookie.setMaxAge(jwtExpiration / 1000);
            response.addCookie(jwtCookie);

            // 6. Redirect to appropriate dashboard based on role
            return determineDashboard(user);

        } catch (BadCredentialsException e) {
            return "redirect:/login?error";
        } catch (DisabledException e) {
            return "redirect:/login?disabled";
        } catch (Exception e) {
            return "redirect:/login?error";
        }
    }

    private String determineDashboard(User user) {
        boolean isAdmin = user.getRoles().stream().anyMatch(r -> r.getName().equals("ADMIN"));
        boolean isTeacher = user.getRoles().stream().anyMatch(r -> r.getName().equals("TEACHER"));
        boolean isStudent = user.getRoles().stream().anyMatch(r -> r.getName().equals("STUDENT"));
        boolean isPedag = user.getRoles().stream().anyMatch(r -> r.getName().equals("PEDAGOG"));

        if (isAdmin) return "redirect:/admin/dashboard";
        if (isPedag) return "redirect:/pedagog/dashboard";
        if (isTeacher) return "redirect:/teacher/dashboard";
        if (isStudent) return "redirect:/student/dashboard";
        return "redirect:/dashboard";
    }
}