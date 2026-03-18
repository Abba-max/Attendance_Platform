package group3.en.stuattendance.Timetablemanager.ServiceImpl;

import group3.en.stuattendance.Institutionmanager.Model.AcademicYear;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import group3.en.stuattendance.Timetablemanager.Mapper.TimetablecontentMapper;
import group3.en.stuattendance.Timetablemanager.Model.Timetablecontent;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Timetablemanager.Repository.TimetablecontentRepository;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimetablecontentServiceImplTest {

    @Mock
    private TimetablecontentRepository timetablecontentRepository;
    @Mock
    private TimetablecontentMapper timetablecontentMapper;

    @InjectMocks
    private TimetablecontentServiceImpl timetablecontentService;

    private Integer classroomId = 1;
    private Long academicYearId = 1L;
    private Integer week = 10;
    private Integer semester = 1;

    @Test
    void testGetWeeklyTimetable_QuadriadLookup() {
        Timetablecontent timetable = new Timetablecontent();
        timetable.setTimetableId(1);
        
        when(timetablecontentRepository.findByClassroomClassIdAndAcademicYearIdAndWeekAndSemester(classroomId, academicYearId, week, semester))
                .thenReturn(Optional.of(timetable));
        
        TimetablecontentDto expectedDto = new TimetablecontentDto();
        when(timetablecontentMapper.toDto(timetable)).thenReturn(expectedDto);

        TimetablecontentDto result = timetablecontentService.getWeeklyTimetable(classroomId, academicYearId, week, semester);

        assertNotNull(result);
        verify(timetablecontentRepository).findByClassroomClassIdAndAcademicYearIdAndWeekAndSemester(classroomId, academicYearId, week, semester);
    }
}
