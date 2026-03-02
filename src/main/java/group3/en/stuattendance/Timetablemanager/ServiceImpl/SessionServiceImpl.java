package group3.en.stuattendance.Timetablemanager.ServiceImpl;

import group3.en.stuattendance.Timetablemanager.DTO.SessionDto;
import group3.en.stuattendance.Timetablemanager.Mapper.SessionMapper;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Timetablemanager.Service.SessionService;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SessionServiceImpl implements SessionService {

    private final SessionRepository sessionRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final ClassroomRepository classroomRepository;
    private final SessionMapper sessionMapper;

    @Override
    public SessionDto createSession(SessionDto sessionDto) {
        Session session = sessionMapper.toEntity(sessionDto);

        if (sessionDto.getCourseId() != null) {
            Course course = courseRepository.findById(sessionDto.getCourseId())
                    .orElseThrow(() -> new EntityNotFoundException("Course not found with id: " + sessionDto.getCourseId()));
            session.setCourse(course);
        }

        if (sessionDto.getTeacherId() != null) {
            User teacher = userRepository.findById(sessionDto.getTeacherId())
                    .orElseThrow(() -> new EntityNotFoundException("Teacher not found with id: " + sessionDto.getTeacherId()));
            session.setTeacher(teacher);
        }

        if (sessionDto.getClassroomId() != null) {
            Classroom classroom = classroomRepository.findById(sessionDto.getClassroomId())
                    .orElseThrow(() -> new EntityNotFoundException("Classroom not found with id: " + sessionDto.getClassroomId()));
            session.setClassroom(classroom);
        }

        Session saved = sessionRepository.save(session);
        return sessionMapper.toDto(saved);
    }

    @Override
    public SessionDto updateSession(Integer id, SessionDto sessionDto) {
        Session existing = sessionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with id: " + id));

        existing.setDay(sessionDto.getDay());
        existing.setDate(sessionDto.getDate());
        existing.setStartTime(sessionDto.getStartTime());
        existing.setEndTime(sessionDto.getEndTime());
        existing.setWeek(sessionDto.getWeek());
        existing.setLocationGeographicalCoordinates(sessionDto.getLocationGeographicalCoordinates());
        existing.setQrCode(sessionDto.getQrCode());

        if (sessionDto.getCourseId() != null) {
            Course course = courseRepository.findById(sessionDto.getCourseId())
                    .orElseThrow(() -> new EntityNotFoundException("Course not found with id: " + sessionDto.getCourseId()));
            existing.setCourse(course);
        }

        if (sessionDto.getTeacherId() != null) {
            User teacher = userRepository.findById(sessionDto.getTeacherId())
                    .orElseThrow(() -> new EntityNotFoundException("Teacher not found with id: " + sessionDto.getTeacherId()));
            existing.setTeacher(teacher);
        }

        if (sessionDto.getClassroomId() != null) {
            Classroom classroom = classroomRepository.findById(sessionDto.getClassroomId())
                    .orElseThrow(() -> new EntityNotFoundException("Classroom not found with id: " + sessionDto.getClassroomId()));
            existing.setClassroom(classroom);
        }

        Session updated = sessionRepository.save(existing);
        return sessionMapper.toDto(updated);
    }

    @Override
    public void deleteSession(Integer id) {
        if (!sessionRepository.existsById(id)) {
            throw new EntityNotFoundException("Session not found with id: " + id);
        }
        sessionRepository.deleteById(id);
    }

    @Override
    public SessionDto getSessionById(Integer id) {
        Session session = sessionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with id: " + id));
        return sessionMapper.toDto(session);
    }

    @Override
    public List<SessionDto> getAllSessions() {
        return sessionRepository.findAll()
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByCourse(Integer courseId) {
        return sessionRepository.findByCourseCourseId(courseId)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByTeacher(Integer teacherId) {
        return sessionRepository.findByTeacherUserId(teacherId)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByClassroom(Integer classroomId) {
        return sessionRepository.findByClassroomClassId(classroomId)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByDate(LocalDate date) {
        return sessionRepository.findByDate(date)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByWeek(Integer week) {
        return sessionRepository.findByWeek(week)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByCourseAndWeek(Integer courseId, Integer week) {
        return sessionRepository.findByCourseCourseIdAndWeek(courseId, week)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SessionDto> getSessionsByTeacherAndDate(Integer teacherId, LocalDate date) {
        return sessionRepository.findByTeacherUserIdAndDate(teacherId, date)
                .stream()
                .map(sessionMapper::toDto)
                .collect(Collectors.toList());
    }
}