package group3.en.stuattendance.Timetablemanager.Controller;

import group3.en.stuattendance.Timetablemanager.DTO.CourseDto;
import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import group3.en.stuattendance.Timetablemanager.Service.CourseService;
import group3.en.stuattendance.Timetablemanager.Service.TimetablecontentService;
import group3.en.stuattendance.Timetablemanager.Service.PdfExportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@WebMvcTest(controllers = {CourseController.class, TimetablecontentController.class})
@AutoConfigureMockMvc(addFilters = false)
public class CourseTimetableApiTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CourseService courseService;

    @MockBean
    private TimetablecontentService timetablecontentService;
    
    @MockBean
    private PdfExportService pdfExportService;

    @Test
    void testGetCoursesBySpecialityAndSemester() throws Exception {
        CourseDto course = CourseDto.builder()
                .courseId(1)
                .courseName("Java Programming")
                .semester(1)
                .build();
        
        when(courseService.getCoursesBySpecialityAndSemester(1, 1))
                .thenReturn(Collections.singletonList(course));

        mockMvc.perform(get("/api/courses/speciality/1/semester/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseName").value("Java Programming"));
    }

    @Test
    void testGetWeeklyTimetable_Quadriad() throws Exception {
        TimetablecontentDto dto = new TimetablecontentDto();
        dto.setWeek(10);
        dto.setSemester(1);
        
        when(timetablecontentService.getWeeklyTimetable(1, 1L, 10, 1))
                .thenReturn(dto);

        mockMvc.perform(get("/api/timetablecontent/weekly/1/1/10/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.week").value(10))
                .andExpect(jsonPath("$.semester").value(1));
    }
}
