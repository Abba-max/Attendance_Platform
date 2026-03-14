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

import java.util.Set;
import java.util.stream.Collectors;

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
            // 1. Authentifier les credentials
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );

            // 2. Charger l'utilisateur depuis la BDD
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // 3. Extraire les roles
            Set<String> roles = user.getRoles().stream()
                    .map(role -> role.getName())
                    .collect(Collectors.toSet());

            // 4. Extraire les permissions effectives
            Set<String> permissions = user.getRoles().stream()
                    .flatMap(role -> role.getPermissions().stream())
                    .map(permission -> permission.getName())
                    .collect(Collectors.toSet());

            // Add additional permissions
            user.getAdditionalPermissions().forEach(p -> permissions.add(p.getName()));

            // Remove denied permissions
            Set<String> deniedPermissions = user.getDeniedPermissions().stream()
                    .map(p -> p.getName())
                    .collect(Collectors.toSet());
            permissions.removeAll(deniedPermissions);

            // 5. Déterminer le dashboard selon le rôle
            String dashboard = determineDashboard(roles);

            // 6. Récupérer l'année académique active
            AcademicYear activeYear = academicYearRepository.findActiveAcademicYear()
                    .orElse(null);
            Long academicYearId = activeYear != null ? activeYear.getId() : null;
            String academicYearName = activeYear != null ? activeYear.getAcademicYear() : null;

            // 7. Extraire le niveau de l'utilisateur
            Integer level = extractLevel(user);

            // 8. Générer le token JWT avec toutes les informations
            String token = jwtUtil.generateToken(
                    authentication.getName(),
                    roles,
                    permissions,
                    academicYearId,
                    academicYearName,
                    level,
                    dashboard
            );

            // 9. Stocker le token dans un cookie HttpOnly
            Cookie jwtCookie = new Cookie(cookieName, token);
            jwtCookie.setHttpOnly(true);
            jwtCookie.setSecure(false); // mettre true en production (HTTPS)
            jwtCookie.setPath("/");
            jwtCookie.setMaxAge(jwtExpiration / 1000);

            response.addCookie(jwtCookie);

            // 10. Rediriger vers le dashboard approprié
            return "redirect:/" + dashboard;

        } catch (BadCredentialsException e) {
            return "redirect:/login?error";
        } catch (DisabledException e) {
            return "redirect:/login?disabled";
        } catch (Exception e) {
            return "redirect:/login?error";
        }
    }

    private String determineDashboard(Set<String> roles) {
        if (roles.contains("ADMIN")) return "dashboard/admin";
        if (roles.contains("TEACHER")) return "dashboard/teacher";
        if (roles.contains("STUDENT")) return "dashboard/student";
        if (roles.contains("PEDAGOGIC_ASSISTANT")) return "dashboard/pedagogic";
        return "dashboard";
    }

    private Integer extractLevel(User user) {
        if (user.getClassroom() != null) {
            return user.getClassroom().getLevel();
        }
        return null;
    }
}