package group3.en.stuattendance.Justificationmanager.ServiceImpl;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceHour;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Attendancemanager.Repository.AttendanceRecordRepository;
import group3.en.stuattendance.Attendancemanager.Service.AttendanceService;
import group3.en.stuattendance.Justificationmanager.DTO.JustificationResponseDto;
import group3.en.stuattendance.Justificationmanager.Enum.JustificationStatus;
import group3.en.stuattendance.Justificationmanager.Mapper.JustificationMapper;
import group3.en.stuattendance.Justificationmanager.Model.Justification;
import group3.en.stuattendance.Justificationmanager.Repository.JustificationRepository;
import group3.en.stuattendance.Notificationmanager.Service.NotificationService;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class JustificationServiceImplTest {

    @Mock
    private JustificationRepository justificationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private JustificationMapper justificationMapper;
    @Mock
    private NotificationService notificationService;
    @Mock
    private AttendanceService attendanceService;

    @InjectMocks
    private JustificationServiceImpl justificationService;

    private User student;
    private Session session;
    private AttendanceRecord record;
    private Justification justification;

    @BeforeEach
    void setUp() {
        student = new User();
        student.setUserId(1);

        Course course = new Course();
        course.setCourseName("Web Development");

        session = new Session();
        session.setSessionId(20);
        session.setDate(LocalDate.now());
        session.setStartTime(LocalTime.of(8, 0));
        session.setEndTime(LocalTime.of(10, 0)); // 2 hours
        session.setCourse(course);

        record = new AttendanceRecord();
        record.setAttendanceId(100);
        record.setUser(student);
        record.setSession(session);
        record.setHourSlots(new ArrayList<>());

        // Add 2 absent slots initially
        AttendanceHour h1 = new AttendanceHour();
        h1.setHourIndex(0);
        h1.setStatus(AttendanceStatus.ABSENT);
        record.getHourSlots().add(h1);

        AttendanceHour h2 = new AttendanceHour();
        h2.setHourIndex(1);
        h2.setStatus(AttendanceStatus.ABSENT);
        record.getHourSlots().add(h2);

        justification = new Justification();
        justification.setJustificationId(500);
        justification.setUser(student);
        justification.setAttendanceRecord(record);
        justification.setStatus(JustificationStatus.PENDING);
        justification.setReason("Sick");
    }

    @Test
    void testSubmitJustification_ForSpecificHourIndex_SavesSuccessfully() {
        // Arrange
        when(attendanceRecordRepository.findById(100)).thenReturn(Optional.of(record));
        when(justificationRepository.existsByAttendanceRecordAttendanceIdAndHourIndex(100, 1)).thenReturn(false);
        when(userRepository.getReferenceById(1)).thenReturn(student);
        
        when(justificationRepository.save(any(Justification.class))).thenAnswer(i -> {
            Justification j = (Justification) i.getArguments()[0];
            j.setJustificationId(500);
            return j;
        });

        // Act
        JustificationResponseDto response = justificationService.submitJustification(1, 100, null, "Sick", 1);

        // Assert
        assertNotNull(response);
        assertEquals(500, response.getJustificationId());
        assertEquals(1, response.getHourIndex());
        assertEquals(JustificationStatus.PENDING, response.getStatus());

        verify(justificationRepository, times(1)).save(any(Justification.class));
    }

    @Test
    void testSubmitJustification_ForNonAbsentHourSlot_ThrowsException() {
        // Arrange
        // Make Hour index 1 PRESENT
        record.getHourSlots().get(1).setStatus(AttendanceStatus.PRESENT);
        when(attendanceRecordRepository.findById(100)).thenReturn(Optional.of(record));

        // Act & Assert
        Exception exception = assertThrows(RuntimeException.class, () -> {
            justificationService.submitJustification(1, 100, null, "Sick", 1);
        });

        assertEquals("Justification can only be submitted for ABSENT hour slots.", exception.getMessage());
        verify(justificationRepository, never()).save(any(Justification.class));
    }

    @Test
    void testApproveJustification_ForSpecificHourIndex_UpdatesTargetSlotToExcused() {
        // Arrange
        justification.setHourIndex(1);
        when(justificationRepository.findById(500)).thenReturn(Optional.of(justification));
        
        when(justificationRepository.save(any(Justification.class))).thenAnswer(i -> i.getArguments()[0]);
        when(justificationMapper.toDto(any(Justification.class))).thenReturn(new group3.en.stuattendance.Justificationmanager.DTO.JustificationDto());

        // Act
        justificationService.approveJustification(500);

        // Assert
        assertEquals(JustificationStatus.ACCEPTED, justification.getStatus());
        
        // Verifies that only index 1 is marked EXCUSED via the attendance service
        verify(attendanceService, times(1)).markHourStatus(20, 1, 1, AttendanceStatus.EXCUSED);
        // Index 0 was not touched
        verify(attendanceService, never()).markHourStatus(20, 1, 0, AttendanceStatus.EXCUSED);

        verify(notificationService, times(1)).sendNotification(
                eq(1), eq("JUSTIFICATION_APPROVED"), anyString());
    }

    @Test
    void testApproveJustification_ForEntireSession_UpdatesAllAbsentSlotsToExcused() {
        // Arrange
        justification.setHourIndex(null); // All hours target
        
        // Mark one of the slots as PRESENT, so only slot index 0 remains ABSENT
        record.getHourSlots().get(1).setStatus(AttendanceStatus.PRESENT);

        when(justificationRepository.findById(500)).thenReturn(Optional.of(justification));
        when(justificationRepository.save(any(Justification.class))).thenAnswer(i -> i.getArguments()[0]);
        when(justificationMapper.toDto(any(Justification.class))).thenReturn(new group3.en.stuattendance.Justificationmanager.DTO.JustificationDto());

        // Act
        justificationService.approveJustification(500);

        // Assert
        assertEquals(JustificationStatus.ACCEPTED, justification.getStatus());
        
        // Verifies that only slot index 0 (which was ABSENT) is excused
        verify(attendanceService, times(1)).markHourStatus(20, 1, 0, AttendanceStatus.EXCUSED);
        // Slot index 1 (which was PRESENT) is skipped
        verify(attendanceService, never()).markHourStatus(20, 1, 1, AttendanceStatus.EXCUSED);

        verify(notificationService, times(1)).sendNotification(
                eq(1), eq("JUSTIFICATION_APPROVED"), anyString());
    }
}
