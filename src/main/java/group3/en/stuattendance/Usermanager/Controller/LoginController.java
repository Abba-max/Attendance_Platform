package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Usermanager.Authentication.JwtUtil;
//import jakarta.servlet.http.Cookie;
//import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
//import org.springframework.security.authentication.BadCredentialsException;
//import org.springframework.security.authentication.DisabledException;
//import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
//import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
//import org.springframework.web.bind.annotation.PostMapping;
//import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class LoginController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtil jwtUtil;

    @Value("${jwt.expiration}")
    private int jwtExpiration;

    @Value("${jwt.cookie-name}")
    private String cookieName;

    @GetMapping("/login")
    public String loginPage() {
        return "login"; // → src/main/resources/templates/login.html
    }

    @GetMapping("/")
    public String root() {
        return "redirect:/login";
    }
//    @PostMapping("/login")
//    public String processLogin(@RequestParam("username") String username,
//                               @RequestParam("password") String password,
//                               HttpServletResponse response) {
//        try {
//            // 1. Authentifier les credentials
//            Authentication authentication = authenticationManager.authenticate(
//                    new UsernamePasswordAuthenticationToken(username, password)
//            );
//
//            // 2. Générer le token JWT
//            String token = jwtUtil.generateToken(authentication.getName());
//
//            // 3. Stocker le token dans un cookie HttpOnly
//            Cookie jwtCookie = new Cookie(cookieName, token);
//            jwtCookie.setHttpOnly(true);   // inaccessible depuis JavaScript (anti-XSS)
//            jwtCookie.setSecure(false);    // mettre true en production (HTTPS)
//            jwtCookie.setPath("/");        // valable pour toutes les routes
//            jwtCookie.setMaxAge(jwtExpiration / 1000); // durée en secondes
//
//            response.addCookie(jwtCookie);
//
//            // 4. Rediriger vers le dashboard
//            return "redirect:/dashboard";
//
//        } catch (BadCredentialsException e) {
//            // Mauvais username ou password → retour login avec ?error
//            return "redirect:/login?error";
//
//        } catch (DisabledException e) {
//            // Compte désactivé
//            return "redirect:/login?disabled";
//
//        } catch (Exception e) {
//            return "redirect:/login?error";
//        }
//    }
}
