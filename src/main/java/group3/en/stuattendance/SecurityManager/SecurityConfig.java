package group3.en.stuattendance.SecurityManager;

import group3.en.stuattendance.Usermanager.Authentication.CustomUserDetails;
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

    @Autowired
    private group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository academicYearRepository;

    @Value("${jwt.cookie-name}")
    private String cookieName;

    @Value("${server.http.port:8080}")
    private int httpPort;
    // ─────────────────────────────────────────────────────────

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))

                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

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
                                "/error",
                                "/manifest.json",
                                "/sw.js",
                                "/offline.html")
                        .permitAll()
                        // Justification document previews — accessible to authenticated users
                        .requestMatchers("/uploads/**").authenticated()
                        .requestMatchers("/admin/classrooms/**").hasAnyRole("ADMIN", "PEDAGOG")
                        .requestMatchers("/admin/**", "/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/pedagog/**", "/api/pedagog/**").hasRole("PEDAGOG")
                        .requestMatchers("/teacher/**").hasRole("TEACHER")
                        .requestMatchers("/api/teacher/**").hasAnyRole("TEACHER", "PEDAGOG", "ADMIN")
                        .requestMatchers("/api/attendance/**").hasAnyRole("TEACHER", "PEDAGOG")
                        .anyRequest().authenticated() // ← doit toujours être en dernier
                )
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> {
                            if (request.getRequestURI().startsWith("/api/")) {
                                response.sendError(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                            } else {
                                response.sendRedirect("/login");
                            }
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            if (request.getRequestURI().startsWith("/api/")) {
                                response.sendError(jakarta.servlet.http.HttpServletResponse.SC_FORBIDDEN, "Forbidden");
                            } else {
                                response.sendRedirect("/login");
                            }
                        })
                )

                .formLogin(form -> form
                        .loginPage("/login")
                        .loginProcessingUrl("/login")
                        .successHandler((request, response, authentication) -> {
                            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
                            Long activeYearId = academicYearRepository.findActiveAcademicYear()
                                    .map(group3.en.stuattendance.Institutionmanager.Model.AcademicYear::getId)
                                    .orElse(null);

                            String token = jwtUtil.generateToken(
                                    userDetails.getUsername(),
                                    userDetails.getUserId(),
                                    userDetails.getFirstName(),
                                    userDetails.getLastName(),
                                    activeYearId,
                                    userDetails.getCourseIds());
                            Cookie jwtCookie = new Cookie(cookieName, token);
                            jwtCookie.setHttpOnly(true);
                            jwtCookie.setSecure(false); // LAN school: allow cookie over both HTTP and HTTPS
                            jwtCookie.setPath("/");
                            jwtCookie.setMaxAge(86400);
                            response.addCookie(jwtCookie);

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
                            } else if (authentication.getAuthorities().stream()
                                    .anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"))) {
                                response.sendRedirect("/teacher/dashboard");
                            } else if (authentication.getAuthorities().stream()
                                    .anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT"))) {
                                response.sendRedirect("/student/dashboard");
                            } else {
                                response.sendRedirect("/"); // Or some default page
                            }
                        })
                        .failureUrl("/login?error")
                        .permitAll())

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
                        .permitAll())

                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return web -> web.ignoring()
                .requestMatchers("/css/**", "/js/**", "/image/**", "/favicon.ico", "/manifest.json", "/sw.js",
                        "/offline.html");
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

    /**
     * Configures Tomcat to listen on two ports:
     * 1. The default SSL port (from server.port, 8443)
     * 2. An additional HTTP port (8080) for legacy access
     */
    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "server.ssl.enabled", havingValue = "true")
    public org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory tomcatServletWebServerFactory() {
        org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory factory = new org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory();
        factory.addAdditionalTomcatConnectors(createHttpConnector());
        return factory;
    }

    private org.apache.catalina.connector.Connector createHttpConnector() {
        org.apache.catalina.connector.Connector connector = new org.apache.catalina.connector.Connector(
                org.apache.coyote.http11.Http11NioProtocol.class.getName());
        connector.setScheme("http");
        connector.setPort(httpPort);
        connector.setSecure(false);
        return connector;
    }
    // ─────────────────────────────────────────────────────────
}