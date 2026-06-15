package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Usermanager.Service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestEmailRunner {

    @Autowired
    private EmailService emailService;

    @GetMapping("/api/test-email")
    public String testEmail(@RequestParam String email) {
        try {
            emailService.sendAccountCredentialsEmail(email, "testuser", "temporary_password_123");
            return "Test account creation email successfully sent to " + email + "! Check your inbox.";
        } catch (Exception e) {
            return "Email sending failed: " + e.getMessage();
        }
    }

    @GetMapping("/api/test-forgot-password")
    public String testForgotPassword(@RequestParam String email) {
        try {
            emailService.sendPasswordResetNotification(email, "new_reset_pass_789", "admin@school.com", "System Admin");
            return "Forgot password simulation email sent to " + email + "!";
        } catch (Exception e) {
            return "Forgot password email failed: " + e.getMessage();
        }
    }
}
