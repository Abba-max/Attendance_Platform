package group3.en.stuattendance.Attendancemanager.ServiceImpl;

import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import group3.en.stuattendance.Attendancemanager.Mapper.AttendanceRecordMapper;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceHour;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Attendancemanager.Repository.AttendanceRecordRepository;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AttendanceServiceImplTest {

    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private SessionRepository sessionRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AttendanceRecordMapper attendanceRecordMapper;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private AttendanceServiceImpl attendanceService;

    private User student;
    private Session session;
    private AttendanceRecord record;

    @BeforeEach
    void setUp() {
        student = new User();
        student.setUserId(1);
        student.setFirstName("John");
        student.setLastName("Doe");

        Course course = new Course();
        course.setCourseName("Java Programming");

        session = new Session();
        session.setSessionId(10);
        session.setDate(LocalDate.now());
        session.setStartTime(LocalTime.of(8, 0));
        session.setEndTime(LocalTime.of(10, 0)); // 2 hour session
        session.setStatus(group3.en.stuattendance.Timetablemanager.Enum.SessionStatus.IN_PROGRESS);
        session.setCourse(course);

        record = new AttendanceRecord();
        record.setAttendanceId(100);
        record.setUser(student);
        record.setSession(session);
        record.setHourSlots(new ArrayList<>());
    }

    @Test
    void testGenerateSessionToken_SetsLaunchedAtOnFirstCall() {
        // Arrange
        when(sessionRepository.findById(10)).thenReturn(Optional.of(session));
        assertNull(session.getAttendanceLaunchedAt());

        // Act
        attendanceService.generateSessionToken(10, "QR");

        // Assert
        assertNotNull(session.getAttendanceLaunchedAt());
        verify(sessionRepository, times(1)).save(session);
    }

    @Test
    void testStudentCheckIn_WithinSlotDeadline_TicksSlot() {
        // Arrange
        session.setAttendanceLaunchedAt(LocalDateTime.of(LocalDate.now(), LocalTime.of(8, 10)));
        
        when(sessionRepository.findById(10)).thenReturn(Optional.of(session));
        when(userRepository.findById(1)).thenReturn(Optional.of(student));
        when(attendanceRecordRepository.findByUserAndSession(student, session))
                .thenReturn(Collections.singletonList(record));
        
        // Mock token generation
        session.setQrCode("VALID_QR");
        
        when(attendanceRecordRepository.save(any(AttendanceRecord.class))).thenAnswer(i -> i.getArguments()[0]);
        when(attendanceRecordMapper.toDto(any(AttendanceRecord.class))).thenAnswer(i -> {
            AttendanceRecord r = (AttendanceRecord) i.getArguments()[0];
            return AttendanceRecordDto.builder()
                    .attendanceId(r.getAttendanceId())
                    .status(r.getStatus())
                    .hoursAttended(r.getHoursAttended())
                    .build();
        });

        // Act: Student checks in at 08:30 (standard Rule A deadline is 08:45 for Slot 1)
        // Since launch was at 08:10 and they check in at 08:30 (> 10m grace period), they are LATE overall, but present for slot 1
        AttendanceServiceImpl.setMockCurrentTime(LocalDateTime.of(LocalDate.now(), LocalTime.of(8, 30)));
        AttendanceRecordDto result = attendanceService.studentCheckIn(10, 1, "VALID_QR", null, null);

        // Assert
        assertNotNull(result);
        assertEquals(AttendanceStatus.LATE, result.getStatus());
        
        // Verify Slot 1 (index 0) is PRESENT
        Optional<AttendanceHour> slot0 = record.getHourSlots().stream()
                .filter(h -> h.getHourIndex() == 0).findFirst();
        assertTrue(slot0.isPresent());
        assertEquals(AttendanceStatus.PRESENT, slot0.get().getStatus());
        
        // Verify Slot 2 (index 1) is ABSENT since it hasn't arrived/been scanned
        Optional<AttendanceHour> slot1 = record.getHourSlots().stream()
                .filter(h -> h.getHourIndex() == 1).findFirst();
        assertTrue(slot1.isPresent());
        assertEquals(AttendanceStatus.ABSENT, slot1.get().getStatus());

        AttendanceServiceImpl.resetMockCurrentTime();
    }

    @Test
    void testStudentCheckIn_DuringSecondSlot_TicksBothSlots() {
        // Arrange
        session.setAttendanceLaunchedAt(LocalDateTime.of(LocalDate.now(), LocalTime.of(8, 5)));
        
        when(sessionRepository.findById(10)).thenReturn(Optional.of(session));
        when(userRepository.findById(1)).thenReturn(Optional.of(student));
        when(attendanceRecordRepository.findByUserAndSession(student, session))
                .thenReturn(Collections.singletonList(record));
        
        session.setQrCode("VALID_QR");
        
        when(attendanceRecordRepository.save(any(AttendanceRecord.class))).thenAnswer(i -> i.getArguments()[0]);
        when(attendanceRecordMapper.toDto(any(AttendanceRecord.class))).thenAnswer(i -> {
            AttendanceRecord r = (AttendanceRecord) i.getArguments()[0];
            return AttendanceRecordDto.builder()
                    .attendanceId(r.getAttendanceId())
                    .status(r.getStatus())
                    .hoursAttended(r.getHoursAttended())
                    .build();
        });

        // Act: Student checks in at 09:10 (Slot 1 deadline 08:45 is passed, Slot 2 deadline 09:45 is met)
        // Launched > 10m ago, so they are marked LATE overall but slot 2 and preceding slots are checked.
        AttendanceServiceImpl.setMockCurrentTime(LocalDateTime.of(LocalDate.now(), LocalTime.of(9, 10)));
        AttendanceRecordDto result = attendanceService.studentCheckIn(10, 1, "VALID_QR", null, null);

        // Assert
        assertNotNull(result);
        assertEquals(AttendanceStatus.LATE, result.getStatus());
        
        // Slot 1 (index 0, preceding) is marked PRESENT because student is checking in for Slot 2
        Optional<AttendanceHour> slot0 = record.getHourSlots().stream()
                .filter(h -> h.getHourIndex() == 0).findFirst();
        assertTrue(slot0.isPresent());
        assertEquals(AttendanceStatus.PRESENT, slot0.get().getStatus());
        
        // Slot 2 (index 1, active) is PRESENT (deadline is 09:45, scanned at 09:10)
        Optional<AttendanceHour> slot1 = record.getHourSlots().stream()
                .filter(h -> h.getHourIndex() == 1).findFirst();
        assertTrue(slot1.isPresent());
        assertEquals(AttendanceStatus.PRESENT, slot1.get().getStatus());

        AttendanceServiceImpl.resetMockCurrentTime();
    }

    @Test
    void testStudentCheckIn_WithinLaunchGracePeriod_MarksPresent() {
        // Arrange
        // Launch is at 08:40
        session.setAttendanceLaunchedAt(LocalDateTime.of(LocalDate.now(), LocalTime.of(8, 40)));
        
        when(sessionRepository.findById(10)).thenReturn(Optional.of(session));
        when(userRepository.findById(1)).thenReturn(Optional.of(student));
        when(attendanceRecordRepository.findByUserAndSession(student, session))
                .thenReturn(Collections.singletonList(record));
        
        session.setQrCode("VALID_QR");
        
        when(attendanceRecordRepository.save(any(AttendanceRecord.class))).thenAnswer(i -> i.getArguments()[0]);
        when(attendanceRecordMapper.toDto(any(AttendanceRecord.class))).thenAnswer(i -> {
            AttendanceRecord r = (AttendanceRecord) i.getArguments()[0];
            return AttendanceRecordDto.builder()
                    .attendanceId(r.getAttendanceId())
                    .status(r.getStatus())
                    .hoursAttended(r.getHoursAttended())
                    .build();
        });

        // Act: Student scans at 08:48 (8 mins after launch, within +10m grace period)
        // Standard Slot 1 deadline is 08:45, which is technically passed, but Rule B (Launch grace period) overrides it!
        AttendanceServiceImpl.setMockCurrentTime(LocalDateTime.of(LocalDate.now(), LocalTime.of(8, 48)));
        AttendanceRecordDto result = attendanceService.studentCheckIn(10, 1, "VALID_QR", null, null);

        // Assert
        assertNotNull(result);
        assertEquals(AttendanceStatus.PRESENT, result.getStatus());
        
        // Slot 1 (index 0) is ticked PRESENT due to launch grace period override!
        Optional<AttendanceHour> slot0 = record.getHourSlots().stream()
                .filter(h -> h.getHourIndex() == 0).findFirst();
        assertTrue(slot0.isPresent());
        assertEquals(AttendanceStatus.PRESENT, slot0.get().getStatus());

        AttendanceServiceImpl.resetMockCurrentTime();
    }
}
