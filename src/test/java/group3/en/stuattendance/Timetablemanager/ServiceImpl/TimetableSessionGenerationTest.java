package group3.en.stuattendance.Timetablemanager.ServiceImpl;

import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Timetablemanager.DTO.TimetableEntryDto;
import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import group3.en.stuattendance.Timetablemanager.Enum.SessionStatus;
import group3.en.stuattendance.Timetablemanager.Mapper.TimetablecontentMapper;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.Timetablecontent;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Timetablemanager.Repository.TimetablecontentRepository;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TimetableSessionGenerationTest {

    @Mock
    private TimetablecontentRepository timetablecontentRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private ClassroomRepository classroomRepository;
    @Mock
    private AcademicYearRepository academicYearRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SessionRepository sessionRepository;
    @Mock
    private TimetablecontentMapper timetablecontentMapper;

    @InjectMocks
    private TimetablecontentServiceImpl timetablecontentService;

    @Test
    void testSaveWeeklyTimetable_GeneratesSessions() {
        // Arrange
        TimetablecontentDto dto = TimetablecontentDto.builder()
                .classroomId(1)
                .week(10)
                .semester(1)
                .startDate(LocalDate.of(2023, 10, 9)) // A Monday
                .entries(Arrays.asList(
                        TimetableEntryDto.builder()
                                .dayOfWeek(0) // Monday
                                .startTime(LocalTime.of(8, 0))
                                .endTime(LocalTime.of(10, 0))
                                .courseId(101)
                                .isEvent(false)
                                .build(),
                        TimetableEntryDto.builder()
                                .dayOfWeek(2) // Wednesday
                                .startTime(LocalTime.of(14, 0))
                                .endTime(LocalTime.of(16, 0))
                                .courseId(102)
                                .isEvent(false)
                                .build()
                ))
                .build();

        Classroom classroom = new Classroom();
        classroom.setClassId(1);
        when(classroomRepository.findById(1)).thenReturn(Optional.of(classroom));
        when(academicYearRepository.findActiveAcademicYear()).thenReturn(Optional.empty());
        
        Course course1 = new Course();
        course1.setCourseId(101);
        when(courseRepository.findById(101)).thenReturn(Optional.of(course1));
        
        Course course2 = new Course();
        course2.setCourseId(102);
        when(courseRepository.findById(102)).thenReturn(Optional.of(course2));

        when(timetablecontentRepository.save(any(Timetablecontent.class))).thenAnswer(i -> i.getArguments()[0]);
        
        // Act
        timetablecontentService.saveWeeklyTimetable(dto);

        // Assert
        // 1. Verify Cleanup was called
        verify(sessionRepository).deleteByClassroomClassIdAndWeekAndStatus(1, 10, SessionStatus.SCHEDULED);
        
        // 2. Verify Session generation (2 entries -> 2 sessions)
        verify(sessionRepository, times(2)).save(any(group3.en.stuattendance.Timetablemanager.Model.Session.class));
        
        // Verify specific session dates (Monday +0, Wednesday +2)
        verify(sessionRepository).save(argThat(session -> 
            session.getDate().equals(LocalDate.of(2023, 10, 9)) && session.getCourse().getCourseId() == 101));
        verify(sessionRepository).save(argThat(session -> 
            session.getDate().equals(LocalDate.of(2023, 10, 11)) && session.getCourse().getCourseId() == 102));
    }
}
