package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Usermanager.Model.Role;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import group3.en.stuattendance.Usermanager.Service.EmailService;
import group3.en.stuattendance.Notificationmanager.Service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
public class AnnouncementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private EmailService emailService;

    @MockBean
    private NotificationService notificationService;

    private void setupMockSecurityContext(String username, String role) {
        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        
        when(authentication.getName()).thenReturn(username);
        when(authentication.isAuthenticated()).thenReturn(true);
        
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        doReturn(authorities).when(authentication).getAuthorities();
    }

    @Test
    public void testSendAnnouncement_Success_Admin_All() throws Exception {
        setupMockSecurityContext("admin", "ADMIN");
        
        User mockStudent = User.builder().userId(1).email("student@example.com").build();
        User mockTeacher = User.builder().userId(2).email("teacher@example.com").build();

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(User.builder().email("admin@example.com").firstName("Admin").lastName("User").build()));
        when(userRepository.findByRolesName("STUDENT")).thenReturn(List.of(mockStudent));
        when(userRepository.findByRolesName("TEACHER")).thenReturn(List.of(mockTeacher));

        mockMvc.perform(multipart("/api/announcements/send")
                .param("targetType", "ALL")
                .param("subject", "Test Subject")
                .param("content", "Test Content")
                .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        verify(emailService, times(1)).sendAnnouncementEmail(any(), any(), any(), any(), any(), any());
        verify(notificationService, times(2)).sendNotification(anyInt(), eq("ANNOUNCEMENT"), any());
    }

    @Test
    public void testSendAnnouncement_Forbidden_Teacher_All() throws Exception {
        setupMockSecurityContext("teacher", "TEACHER");
        
        mockMvc.perform(multipart("/api/announcements/send")
                .param("targetType", "ALL")
                .param("subject", "Test Subject")
                .param("content", "Test Content")
                .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Teachers are not authorized to send to global target groups."));
    }

    @Test
    public void testSendAnnouncement_Success_Pedagog_All() throws Exception {
        setupMockSecurityContext("pedagog", "PEDAGOG");
        User mockStudent = User.builder().userId(1).email("student@example.com").build();
        when(userRepository.findByRolesName("STUDENT")).thenReturn(List.of(mockStudent));
        
        mockMvc.perform(multipart("/api/announcements/send")
                .param("targetType", "ALL")
                .param("subject", "Test Subject")
                .param("content", "Test Content")
                .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk());
    }

    @Test
    public void testSendAnnouncement_Success_Pedagog_Students() throws Exception {
        setupMockSecurityContext("pedagog", "PEDAGOG");
        User mockStudent = User.builder().userId(1).email("student@example.com").build();
        when(userRepository.findByRolesName("STUDENT")).thenReturn(List.of(mockStudent));

        mockMvc.perform(multipart("/api/announcements/send")
                .param("targetType", "STUDENTS")
                .param("subject", "Test Subject")
                .param("content", "Test Content")
                .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk());
    }

    @Test
    public void testSendAnnouncement_Success_Pedagog_Teachers() throws Exception {
        setupMockSecurityContext("pedagog", "PEDAGOG");
        User mockTeacher = User.builder().userId(2).email("teacher@example.com").build();
        when(userRepository.findByRolesName("TEACHER")).thenReturn(List.of(mockTeacher));

        mockMvc.perform(multipart("/api/announcements/send")
                .param("targetType", "TEACHERS")
                .param("subject", "Test Subject")
                .param("content", "Test Content")
                .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk());
    }

    @Test
    public void testSendAnnouncement_Success_Pedagog_Delegates() throws Exception {
        setupMockSecurityContext("pedagog", "PEDAGOG");
        User mockDelegate = User.builder().userId(3).email("delegate@example.com").isDelegate(true).build();
        when(userRepository.findByRolesName("STUDENT")).thenReturn(List.of(mockDelegate));

        mockMvc.perform(multipart("/api/announcements/send")
                .param("targetType", "DELEGATES")
                .param("subject", "Test Subject")
                .param("content", "Test Content")
                .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk());
    }
}
