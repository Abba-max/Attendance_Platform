//package group3.en.stuattendance.SecurityManager;
//
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.security.config.annotation.web.builders.HttpSecurity;
//import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
//import org.springframework.security.web.SecurityFilterChain;
//
//@Configuration
//@EnableWebSecurity
//public class SecurityConfig {
//
//    @Bean
//    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
//        http
//                .csrf(csrf -> csrf.disable()) // Disable CSRF for development/APIs
//                .authorizeHttpRequests(auth -> auth
//                        .requestMatchers("/**").permitAll() // This allows access to ALL pages
//                        .anyRequest().authenticated()
//                )
//                .formLogin(form -> form.disable()) // This removes SpringSecurity standard login page
//                .httpBasic(basic -> basic.disable());
//
//        return http.build();
//    }
//}