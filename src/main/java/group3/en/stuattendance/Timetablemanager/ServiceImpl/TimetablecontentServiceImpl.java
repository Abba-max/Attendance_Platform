package group3.en.stuattendance.Timetablemanager.ServiceImpl;

import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import group3.en.stuattendance.Timetablemanager.Mapper.TimetablecontentMapper;
import group3.en.stuattendance.Timetablemanager.Model.Timetablecontent;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.TimetablecontentRepository;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Timetablemanager.Service.TimetablecontentService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimetablecontentServiceImpl implements TimetablecontentService {

    private final TimetablecontentRepository timetablecontentRepository;
    private final CourseRepository courseRepository;
    private final SessionRepository sessionRepository;
    private final TimetablecontentMapper timetablecontentMapper;

    @Override
    public TimetablecontentDto createTimetablecontent(TimetablecontentDto timetablecontentDto) {
        Timetablecontent timetablecontent = timetablecontentMapper.toEntity(timetablecontentDto);

        if (timetablecontentDto.getCourseId() != null) {
            Course course = courseRepository.findById(timetablecontentDto.getCourseId())
                    .orElseThrow(() -> new EntityNotFoundException("Course not found with id: " + timetablecontentDto.getCourseId()));
            timetablecontent.setCourse(course);
        }

        if (timetablecontentDto.getSessionId() != null) {
            Session session = sessionRepository.findById(timetablecontentDto.getSessionId())
                    .orElseThrow(() -> new EntityNotFoundException("Session not found with id: " + timetablecontentDto.getSessionId()));
            timetablecontent.setSession(session);
        }

        Timetablecontent saved = timetablecontentRepository.save(timetablecontent);
        return timetablecontentMapper.toDto(saved);
    }

    @Override
    public TimetablecontentDto updateTimetablecontent(Integer id, TimetablecontentDto timetablecontentDto) {
        Timetablecontent existing = timet