package group3.en.stuattendance.SecurityManager;

import group3.en.stuattendance.Usermanager.Authentication.JwtAuthenticationFilter;
import group3.en.stuattendance.Usermanager.Authentication.CustomUserDetailsService;
import group3.en.stuattendance.Usermanager.Authentication.JwtUtil;
import jakarta.servlet.http.Cookie;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {


    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private CustomUserDetailsService customUserDetailsService;

    @Value("${jwt.cookie-name}")
    private String cookieName;
    // ─────────────────────────────────────────────────────────


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/login",
                                "/change-password",
                                "/forgot-password/**",
                                "/css/**",
                                "/js/**",
                                "/image/**",
                                "/images/**",
                                "/webjars/**",
                                "/favicon.ico",
                                "/error"
                        ).permitAll()
                        .requestMatchers("/admin/**", "/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/pedagog/**", "/api/pedagog/**").hasRole("PEDAGOG")
                        .anyRequest().authenticated()  // ← doit toujours être en dernier
                )

                .formLogin(form -> form
                        .loginPage("/login")
                        .loginProcessingUrl("/login")
                        .successHandler((request, response, authentication) -> {
                            String token = jwtUtil.generateToken(authentication.getName());
                            Cookie jwtCookie = new Cookie(cookieName, token);
                            jwtCookie.setHttpOnly(true);
                            jwtCookie.setSecure(false);
                            jwtCookie.setPath("/");
                            jwtCookie.setMaxAge(86400);
                            response.addCookie(jwtCookie);
                            
                            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
                            
                            // Check if password change is required
                            if (!userDetails.isPasswordChanged()) {
                                response.sendRedirect("/change-password");
                                return;
                            }

                            // Dynamic redirection based on role
                            boolean isAdmin = authentication.getAuthorities().stream()
                                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
                            boolean isPedagog = authentication.getAuthorities().stream()
                                    .anyMatch(a -> a.getAuthority().equals("ROLE_PEDAGOG"));
                                    
                            if (isAdmin) {
                                response.sendRedirect("/admin/dashboard");
                            } else if (isPedagog) {
                                response.sendRedirect("/pedagog/dashboard");
                            } else {
                                response.sendRedirect("/"); // Or some default page
                            }
                        })
                        .failureUrl("/login?error")
                        .permitAll()
                )

                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .addLogoutHandler((request, response, authentication) -> {
                            Cookie cookie = new Cookie(cookieName, null);
                            cookie.setMaxAge(0);
                            cookie.setPath("/");
                            cookie.setHttpOnly(true);
                            response.addCookie(cookie);
                        })
                        .logoutSuccessUrl("/login?logout")
                        .permitAll()
                )

                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return web -> web.ignoring()
                .requestMatchers("/css/**", "/js/**", "/image/**", "/favicon.ico");
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(customUserDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    // ─────────────────────────────────────────────────────────
}