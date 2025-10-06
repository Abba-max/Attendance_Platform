//package group3.en.stuattendance.controller;
//
//import group3.en.stuattendance.dto.LoginRequest;
//import group3.en.stuattendance.dto.JwtResponse;
//import group3.en.stuattendance.dto.ApiResponse;
//import group3.en.stuattendance.security.JwtTokenProvider;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.ResponseEntity;
//import org.springframework.security.authentication.AuthenticationManager;
//import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
//import org.springframework.security.core.Authentication;
//import org.springframework.web.bind.annotation.*;
//
//import jakarta.validation.Valid;
//
//@RestController
//@RequestMapping("/api/auth")
//@RequiredArgsConstructor
//@CrossOrigin(origins = "*", maxAge = 3600)
//public class AuthController {
//
//    private final AuthenticationManager authenticationManager;
//    private final JwtTokenProvider tokenProvider;
//
//    public AuthController(AuthenticationManager authenticationManager, JwtTokenProvider tokenProvider) {
//        this.authenticationManager = authenticationManager;
//        this.tokenProvider = tokenProvider;
//    }
//
//    @PostMapping("/login")
//    public ResponseEntity<ApiResponse<JwtResponse>> login(@Valid @RequestBody LoginRequest loginRequest) {
//        Authentication authentication = authenticationManager.authenticate(
//                new UsernamePasswordAuthenticationToken(
//                        loginRequest.getUsername(),
//                        loginRequest.getPassword()
//                )
//        );
//
//        String jwt = tokenProvider.generateToken(authentication);
//
//        JwtResponse response = JwtResponse.builder()
//                .token(jwt)
//                .type("Bearer")
//                .username(authentication.getName())
//                .build();
//
//        return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
//    }
//
//    @PostMapping("/logout")
//    public ResponseEntity<ApiResponse<Void>> logout() {
//        return ResponseEntity.ok(ApiResponse.success(null, "Logout successful"));
//    }
//}