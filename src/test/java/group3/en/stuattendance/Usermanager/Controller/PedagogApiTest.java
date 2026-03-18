package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Timetablemanager.Service.CourseService;
import group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto;
import group3.en.stuattendance.Usermanager.Service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@WebMvcTest(PedagogController.class)
@AutoConfigureMockMvc(addFilters = false)
public class PedagogApiTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private CourseService courseService;

    @Test
    void testBulkImportCourses() throws Exception {
        BulkImportResultDto result = BulkImportResultDto.builder()
                .totalRows(5)
                .successCount(5)
                .build();

        when(courseService.bulkImportCourses(any())).thenReturn(result);

        MockMultipartFile file = new MockMultipartFile("file", "courses.csv", "text/csv", "name,code,credits\nJava,J101,3".getBytes());

        mockMvc.perform(multipart("/api/pedagog/courses/bulk-import").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.successCount").value(5));
    }
    
    @Test
    void testBulkImportStudents() throws Exception {
        BulkImportResultDto result = BulkImportResultDto.builder()
                .totalRows(10)
                .successCount(8)
                .failureCount(2)
                .build();

        when(userService.bulkImportStudents(any(), any())).thenReturn(result);

        MockMultipartFile file = new MockMultipartFile("file", "students.csv", "text/csv", "firstName,lastName,email\nJohn,Doe,john@example.com".getBytes());

        mockMvc.perform(multipart("/api/pedagog/students/bulk-import")
                .file(file)
                .param("classroomId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.successCount").value(8))
                .andExpect(jsonPath("$.failureCount").value(2));
    }
}
