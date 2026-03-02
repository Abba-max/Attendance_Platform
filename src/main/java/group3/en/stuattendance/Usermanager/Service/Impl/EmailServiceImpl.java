package group3.en.stuattendance.Usermanager.Service.Impl;

import group3.en.stuattendance.Usermanager.Service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.nio.charset.StandardCharsets;

/**
 * Implementation of EmailService using Spring Mail and Thymeleaf.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Override
    @Async
    public void sendAccountCredentialsEmail(String to, String username, String password) {
        log.info("Sending account credentials email to: {}", to);
        
        try {
            MimeMessage message = mailSender.createMimeMessage();
            // Enable multi-part mode
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    true,
                    StandardCharsets.UTF_8.name()
            );


            Context context = new Context();
            context.setVariable("username", username);
            context.setVariable("password", password);
            context.setVariable("loginUrl", baseUrl + "/login");

            // Process the template
            String html = templateEngine.process("mail/account-credentials", context);
            
            // Create plain text version
            String text = String.format(
                "Hello,\n\nYour account for the Student Attendance System has been created.\n\n" +
                "Username: %s\n" +
                "Temporary Password: %s\n\n" +
                "Please reset your password after your first login.\n\n" +
                "Regards,\nAttendance Management Team", username, password);

            // Set up the message
            helper.setTo(to);
            helper.setSubject("Attendee - Your Student Attendance System Account Credentials");
            helper.setText(text, html); // Set both plain text and HTML
            helper.setFrom("Attendance System <" + fromEmail + ">");
            
            // Add anti-spam headers
            message.addHeader("X-Priority", "3");
            message.addHeader("X-Mailer", "Student Attendance System Mailer");
            message.addHeader("Auto-Submitted", "auto-generated");

            // Add Logo as inline resource
            helper.addInline("logo", new ClassPathResource("static/image/logo.png"));

            // Send the email
            mailSender.send(message);
            log.info("Account credentials email sent successfully to: {}", to);
            
        } catch (MessagingException e) {
            log.error("Failed to send account credentials email to: {}", to, e);
           
        } catch (Exception e) {
            log.error("Unexpected error while sending email to: {}", to, e);
        }
    }
}
