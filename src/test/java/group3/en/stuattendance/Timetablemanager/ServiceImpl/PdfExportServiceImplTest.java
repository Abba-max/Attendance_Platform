package group3.en.stuattendance.Timetablemanager.ServiceImpl;

import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import group3.en.stuattendance.Timetablemanager.DTO.SessionDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PdfExportServiceImplTest {

    private PdfExportServiceImpl pdfExportService;

    @BeforeEach
    void setUp() {
        pdfExportService = new PdfExportServiceImpl();
    }

    @Test
    void testExportAttendanceToPdf_Success() throws Exception {
        // Given
        SessionDto sessionDto = new SessionDto();
        sessionDto.setSessionId(1);
        sessionDto.setCourseName("Mathematics");
        sessionDto.setTeacherName("John Doe");
        sessionDto.setClassroomName("Ing 3 ISI");
        sessionDto.setDate(LocalDate.now());
        sessionDto.setStartTime(LocalTime.of(8, 0));
        sessionDto.setEndTime(LocalTime.of(10, 0));
        
        AttendanceRecordDto recordDto = new AttendanceRecordDto();
        recordDto.setStudentFirstName("Jane");
        recordDto.setStudentLastName("Smith");
        recordDto.setStudentMatricule("12345");

        // When
        ByteArrayInputStream pdfStream = pdfExportService.exportAttendanceToPdf(sessionDto, Collections.singletonList(recordDto));

        // Then
        assertNotNull(pdfStream, "The generated PDF stream should not be null");
        assertTrue(pdfStream.available() > 0, "The generated PDF stream should contain data");
    }
}
