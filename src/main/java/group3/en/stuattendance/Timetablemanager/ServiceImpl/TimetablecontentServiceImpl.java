package group3.en.stuattendance.Timetablemanager.ServiceImpl;

import group3.en.stuattendance.Institutionmanager.Model.AcademicYear;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import group3.en.stuattendance.Timetablemanager.Mapper.TimetablecontentMapper;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.TimetableEntry;
import group3.en.stuattendance.Timetablemanager.Model.Timetablecontent;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Timetablemanager.Repository.TimetablecontentRepository;
import group3.en.stuattendance.Timetablemanager.Service.TimetablecontentService;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TimetablecontentServiceImpl implements TimetablecontentService {

    private final TimetablecontentRepository timetablecontentRepository;
    private final CourseRepository courseRepository;
    private final ClassroomRepository classroomRepository;
    private final AcademicYearRepository academicYearRepository;
    private final UserRepository userRepository;
    private final TimetablecontentMapper timetablecontentMapper;

    @Override
    public TimetablecontentDto saveWeeklyTimetable(TimetablecontentDto dto) {
        Classroom classroom = classroomRepository.findById(dto.getClassroomId())
                .orElseThrow(() -> new EntityNotFoundException("Classroom not found with id: " + dto.getClassroomId()));

        AcademicYear academicYear;
        if (dto.getAcademicYearId() == null) {
            academicYear = academicYearRepository.findActiveAcademicYear().orElse(null);
        } else {
            academicYear = academicYearRepository.findById(dto.getAcademicYearId())
                    .orElseThrow(() -> new EntityNotFoundException("Academic Year not found with id: " + dto.getAcademicYearId()));
        }

        // Check if a timetable already exists for this classroom, academic year, week, and semester
        Timetablecontent existingTimetable = timetablecontentRepository
                .findFirstByClassroomClassIdAndAcademicYearIdAndWeekAndSemesterAndIsActiveTrueOrderByVersionDesc(dto.getClassroomId(), academicYear.getId(), dto.getWeek(), dto.getSemester())
                .orElse(null);

        Integer newVersion = 1;
        if (existingTimetable != null) {
            // Archive the existing one instead of modifying it
            existingTimetable.setIsActive(false);
            timetablecontentRepository.save(existingTimetable);
            newVersion = (existingTimetable.getVersion() != null ? existingTimetable.getVersion() : 0) + 1;
        }

        // Create a completely new instance for the updated timetable
        Timetablecontent timetablecontent = new Timetablecontent();
        timetablecontent.setClassroom(classroom);
        timetablecontent.setAcademicYear(academicYear);
        timetablecontent.setWeek(dto.getWeek());
        timetablecontent.setSemester(dto.getSemester());
        timetablecontent.setStartDate(dto.getStartDate());
        timetablecontent.setEndDate(dto.getEndDate());
        timetablecontent.setVersion(newVersion);
        timetablecontent.setIsActive(true);
        timetablecontent.setEntries(new java.util.ArrayList<>());

        if (dto.getEntries() != null) {
            for (var entryDto : dto.getEntries()) {
                java.time.LocalTime start = entryDto.getStartTime();
                java.time.LocalTime end = entryDto.getEndTime();

                // Validation: 8 AM - 6 PM window
                if (start.isBefore(java.time.LocalTime.of(8, 0)) || end.isAfter(java.time.LocalTime.of(18, 0))) {
                    throw new IllegalArgumentException("Time slot " + start + "-" + end + " is outside the allowed window (8 AM - 6 PM)");
                }

                if (!start.isBefore(end)) {
                    throw new IllegalArgumentException("Start time (" + start + ") must be before end time (" + end + ")");
                }

                // Validation: Integer multiples of 1 hour
                long durationMinutes = java.time.Duration.between(start, end).toMinutes();
                if (durationMinutes % 60 != 0) {
                    throw new IllegalArgumentException("Entry duration must be a multiple of 1 hour (found " + durationMinutes + " minutes)");
                }

                TimetableEntry entry = new TimetableEntry();

                // Resolve the day name: prefer explicit 'day' from DTO; fall back to deriving from dayOfWeek index
                String dayName = entryDto.getDay();
                if ((dayName == null || dayName.isBlank()) && entryDto.getDayOfWeek() != null) {
                    dayName = group3.en.stuattendance.Timetablemanager.Mapper.TimetablecontentMapper.dayIndexToName(entryDto.getDayOfWeek());
                }
                entry.setDay(dayName != null ? dayName.toUpperCase() : "MONDAY");
                entry.setDayOfWeek(entryDto.getDayOfWeek());
                entry.setStartTime(start);
                entry.setEndTime(end);
                entry.setColor(entryDto.getColor());
                entry.setTimetablecontent(timetablecontent);

                // Handle Custom Events vs Standard Courses
                if (Boolean.TRUE.equals(entryDto.getIsEvent()) && entryDto.getEventName() != null && !entryDto.getEventName().trim().isEmpty()) {
                    entry.setIsEvent(true);
                    entry.setEventName(entryDto.getEventName().trim());
                    // Events don't strictly require a course or a teacher
                } else {
                    entry.setIsEvent(false);
                    if (entryDto.getCourseId() == null) {
                        throw new IllegalArgumentException("Standard entries must be tied to a Course. Missing course_id.");
                    }
                    Course course = courseRepository.findById(entryDto.getCourseId())
                            .orElseThrow(() -> new EntityNotFoundException("Course not found with id: " + entryDto.getCourseId()));
                    entry.setCourse(course);

                    if (entryDto.getTeacherId() != null) {
                        User teacher = userRepository.findById(entryDto.getTeacherId())
                                .orElseThrow(() -> new EntityNotFoundException("Teacher not found with id: " + entryDto.getTeacherId()));
                        entry.setTeacher(teacher);
                    } else {
                        entry.setTeacher(course.getTeachers().stream().findFirst().orElse(null)); // Fallback to course default (first) teacher
                    }
                }
                
                timetablecontent.getEntries().add(entry);
            }
        }

        Timetablecontent saved = timetablecontentRepository.save(timetablecontent);
        return timetablecontentMapper.toDto(saved);
    }

    @Override
    public TimetablecontentDto getWeeklyTimetable(Integer classroomId, Long academicYearId, Integer week, Integer semester) {
        Long yearId = academicYearId;
        if (yearId == null) {
            yearId = academicYearRepository.findActiveAcademicYear()
                     .map(group3.en.stuattendance.Institutionmanager.Model.AcademicYear::getId)
                     .orElseThrow(() -> new EntityNotFoundException("No active academic year found"));
        }
        
        final Long finalYearId = yearId;
        Timetablecontent timetablecontent = timetablecontentRepository
                .findFirstByClassroomClassIdAndAcademicYearIdAndWeekAndSemesterAndIsActiveTrueOrderByVersionDesc(classroomId, finalYearId, week, semester)
                .orElseThrow(() -> new EntityNotFoundException("Active Timetable not found for classroom " + classroomId + ", year " + finalYearId + ", week " + week + " and semester " + semester));
        return timetablecontentMapper.toDto(timetablecontent);
    }

    @Override
    public List<TimetablecontentDto> getTimetableHistory(Integer classroomId, Long academicYearId, Integer week, Integer semester) {
        Long yearId = academicYearId;
        if (yearId == null) {
            yearId = academicYearRepository.findActiveAcademicYear()
                     .map(group3.en.stuattendance.Institutionmanager.Model.AcademicYear::getId)
                     .orElseThrow(() -> new EntityNotFoundException("No active academic year found"));
        }
        
        final Long finalYearId = yearId;
        return timetablecontentRepository
                .findAllByClassroomClassIdAndAcademicYearIdAndWeekAndSemesterOrderByVersionDesc(classroomId, finalYearId, week, semester)
                .stream()
                .map(timetablecontentMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteWeeklyTimetable(Integer classroomId, Long academicYearId, Integer week, Integer semester) {
        timetablecontentRepository.findFirstByClassroomClassIdAndAcademicYearIdAndWeekAndSemesterAndIsActiveTrueOrderByVersionDesc(classroomId, academicYearId, week, semester)
                .ifPresent(timetablecontentRepository::delete);
    }

    @Override
    public List<TimetablecontentDto> getAllTimetablecontents() {
        return timetablecontentRepository.findAll().stream()
                .map(timetablecontentMapper::toDto)
                .collect(Collectors.toList());
    }
}
