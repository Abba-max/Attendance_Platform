package group3.en.stuattendance.Attendancemanager.ServiceImpl;

import group3.en.stuattendance.Attendancemanager.Repository.AttendanceRecordRepository;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DailyAbsenceReportServiceImplTest {

    @Mock
    private ClassroomRepository classroomRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SessionRepository sessionRepository;

    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;

    @InjectMocks
    private DailyAbsenceReportServiceImpl dailyAbsenceReportService;

    @BeforeEach
    void setUp() {
    }

    @Test
    void testGenerateDailyReport_Success() {
        // Given
        Integer classroomId = 1;
        LocalDate date = LocalDate.now();

        Classroom classroom = new Classroom();
        classroom.setClassId(classroomId);
        classroom.setName("Ing 3 ISI");

        when(classroomRepository.findById(classroomId)).thenReturn(Optional.of(classroom));
        when(userRepository.findByClassroomClassIdAndRolesName(classroomId, "STUDENT")).thenReturn(Collections.emptyList());
        when(sessionRepository.findByClassroomClassIdAndDateBetween(eq(classroomId), any(), any())).thenReturn(Collections.emptyList());

        // When
        ByteArrayInputStream pdfStream = dailyAbsenceReportService.generateDailyReport(classroomId, date);

        // Then
        assertNotNull(pdfStream, "The generated PDF stream should not be null");
        assertTrue(pdfStream.available() > 0, "The generated PDF stream should contain data");
    }
}
