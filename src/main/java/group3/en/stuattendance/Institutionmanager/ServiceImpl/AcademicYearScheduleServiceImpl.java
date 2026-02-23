package group3.en.stuattendance.Institutionmanager.ServiceImpl;

import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearScheduleDto;
import group3.en.stuattendance.Institutionmanager.Mapper.AcademicYearScheduleMapper;
import group3.en.stuattendance.Institutionmanager.Model.*;
import group3.en.stuattendance.Institutionmanager.Repository.*;
import group3.en.stuattendance.Institutionmanager.Service.AcademicYearScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AcademicYearScheduleServiceImpl implements AcademicYearScheduleService {

    private final AcademicYearScheduleRepository scheduleRepository;
    private final AcademicYearRepository academicYearRepository;
    private final CycleRepository cycleRepository;
    private final DepartmentRepository departmentRepository;
    private final ClassroomRepository classroomRepository;
    private final AcademicYearScheduleMapper scheduleMapper;

    @Override
    @Transactional
    public AcademicYearScheduleDto createSchedule(AcademicYearScheduleDto dto) {
        if (dto.getStartDate() == null || dto.getEndDate() == null) {
            throw new IllegalArgumentException("Start and end dates are required.");
        }
        if (dto.getStartDate().isAfter(dto.getEndDate())) {
            throw new IllegalArgumentException("Start date must be before end date.");
        }

        AcademicYear academicYear;
        if (dto.getAcademicYearId() != null) {
            academicYear = academicYearRepository.findById(dto.getAcademicYearId())
                    .orElseThrow(() -> new RuntimeException("Academic year not found (ID: " + dto.getAcademicYearId() + ")"));
        } else if (dto.getAcademicYearName() != null && !dto.getAcademicYearName().isBlank()) {
            academicYear = academicYearRepository.findByAcademicYear(dto.getAcademicYearName())
                    .orElseGet(() -> {
                        AcademicYear newYear = AcademicYear.builder()
                                .academicYear(dto.getAcademicYearName())
                                .startDate(dto.getStartDate())
                                .endDate(dto.getEndDate())
                                .status(AcademicYearStatus.ACTIVE)
                                .build();
                        return academicYearRepository.save(newYear);
                    });
        } else {
            throw new IllegalArgumentException("Either academicYearId or academicYearName must be provided.");
        }

        Cycle cycle = null;
        Department department = null;
        Classroom classroom = null;
        int startYear = dto.getStartDate().getYear();

        if (dto.getClassroomId() != null) {
            // Classroom-scoped schedule
            classroom = classroomRepository.findById(dto.getClassroomId())
                    .orElseThrow(() -> new RuntimeException("Classroom not found"));
            List<AcademicYearSchedule> conflicts = scheduleRepository.findSchedulesByClassroomAndYear(classroom.getClassId(), startYear);
            if (!conflicts.isEmpty()) {
                throw new IllegalStateException(
                    "Classroom '" + classroom.getName() + "' already has a schedule starting in " + startYear + ". An entity cannot start in two different academic years within the same calendar year."
                );
            }
        } else if (dto.getDepartmentId() != null) {
            // Department-scoped schedule
            department = departmentRepository.findById(dto.getDepartmentId())
                    .orElseThrow(() -> new RuntimeException("Department not found"));
            List<AcademicYearSchedule> conflicts = scheduleRepository.findSchedulesByDepartmentAndYear(department.getDepartmentId(), startYear);
            if (!conflicts.isEmpty()) {
                throw new IllegalStateException(
                    "Department '" + department.getName() + "' already has a schedule starting in " + startYear + ". An entity cannot start in two different academic years within the same calendar year."
                );
            }
        } else if (dto.getCycleId() != null) {
            // Cycle-scoped schedule
            cycle = cycleRepository.findById(dto.getCycleId())
                    .orElseThrow(() -> new RuntimeException("Cycle not found"));
            List<AcademicYearSchedule> conflicts = scheduleRepository.findSchedulesByCycleAndYear(cycle.getCycleId(), startYear);
            if (!conflicts.isEmpty()) {
                throw new IllegalStateException(
                    "Cycle '" + cycle.getName() + "' already has a schedule starting in " + startYear + ". An entity cannot start in two different academic years within the same calendar year."
                );
            }
        } else {
            // Institution-wide default
            List<AcademicYearSchedule> conflicts = scheduleRepository.findDefaultSchedulesByYear(startYear);
            if (!conflicts.isEmpty()) {
                throw new IllegalStateException(
                    "A default institutional schedule already exists for year " + startYear + "."
                );
            }
        }

        AcademicYearSchedule schedule = AcademicYearSchedule.builder()
                .academicYear(academicYear)
                .cycle(cycle)
                .department(department)
                .classroom(classroom)
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .status(AcademicYearStatus.ACTIVE)
                .build();

        return scheduleMapper.toDto(scheduleRepository.save(schedule));
    }

    @Override
    @Transactional
    public AcademicYearScheduleDto activateSchedule(Long scheduleId) {
        AcademicYearSchedule schedule = getScheduleOrThrow(scheduleId);
        if (schedule.isActive()) return scheduleMapper.toDto(schedule);

        // Deactivate any other ACTIVE schedule for the same scope
        deactivateScopeConflict(schedule);

        schedule.setStatus(AcademicYearStatus.ACTIVE);
        return scheduleMapper.toDto(scheduleRepository.save(schedule));
    }

    @Override
    @Transactional
    public AcademicYearScheduleDto suspendSchedule(Long scheduleId) {
        AcademicYearSchedule schedule = getScheduleOrThrow(scheduleId);
        schedule.setStatus(AcademicYearStatus.SUSPENDED);
        return scheduleMapper.toDto(scheduleRepository.save(schedule));
    }

    @Override
    @Transactional
    public AcademicYearScheduleDto closeSchedule(Long scheduleId) {
        AcademicYearSchedule schedule = getScheduleOrThrow(scheduleId);
        schedule.setStatus(AcademicYearStatus.CLOSED);
        return scheduleMapper.toDto(scheduleRepository.save(schedule));
    }

    @Override
    @Transactional
    public void deleteSchedule(Long scheduleId) {
        AcademicYearSchedule schedule = getScheduleOrThrow(scheduleId);
        if (schedule.isActive()) {
            throw new IllegalStateException("Cannot delete an active schedule. Suspend or close it first.");
        }
        scheduleRepository.delete(schedule);
    }

    @Override
    public List<AcademicYearScheduleDto> getSchedulesByAcademicYear(Long academicYearId) {
        return scheduleRepository.findByAcademicYearId(academicYearId)
                .stream()
                .map(scheduleMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public AcademicYearScheduleDto resolveActiveScheduleForDepartment(Integer departmentId) {
        Department dept = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new RuntimeException("Department not found"));

        return findActiveInHierarchy(dept);
    }

    @Override
    public AcademicYearScheduleDto resolveActiveScheduleForClassroom(Integer classroomId) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));

        // 1) Specific Classroom schedule
        return scheduleRepository.findActiveScheduleByClassroom(classroomId)
                .map(scheduleMapper::toDto)
                .orElseGet(() -> {
                    // 2) Fallback to Department hierarchy
                    if (classroom.getDepartment() != null) {
                        return findActiveInHierarchy(classroom.getDepartment());
                    }
                    return resolveDefault();
                });
    }

    private AcademicYearScheduleDto findActiveInHierarchy(Department dept) {
        // 1) Specific Department schedule
        return scheduleRepository.findActiveScheduleByDepartment(dept.getDepartmentId())
                .map(scheduleMapper::toDto)
                .orElseGet(() -> {
                    // 2) Parent Cycle schedule
                    if (dept.getCycle() != null) {
                        return scheduleRepository.findActiveScheduleByCycle(dept.getCycle().getCycleId())
                                .map(scheduleMapper::toDto)
                                .orElseGet(() -> resolveDefault());
                    }
                    return resolveDefault();
                });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private AcademicYearScheduleDto resolveDefault() {
        return scheduleRepository.findDefaultActiveSchedule()
                .map(scheduleMapper::toDto)
                .orElse(null);
    }

    private AcademicYearSchedule getScheduleOrThrow(Long id) {
        return scheduleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Schedule not found with id: " + id));
    }

    /**
     * When activating a schedule, close the previously active schedule for the same scope.
     */
    private void deactivateScopeConflict(AcademicYearSchedule incoming) {
        if (incoming.getClassroom() != null) {
            scheduleRepository.findActiveScheduleByClassroom(incoming.getClassroom().getClassId())
                    .ifPresent(existing -> {
                        existing.setStatus(AcademicYearStatus.CLOSED);
                        scheduleRepository.save(existing);
                    });
        } else if (incoming.getDepartment() != null) {
            scheduleRepository.findActiveScheduleByDepartment(incoming.getDepartment().getDepartmentId())
                    .ifPresent(existing -> {
                        existing.setStatus(AcademicYearStatus.CLOSED);
                        scheduleRepository.save(existing);
                    });
        } else if (incoming.getCycle() != null) {
            scheduleRepository.findActiveScheduleByCycle(incoming.getCycle().getCycleId())
                    .ifPresent(existing -> {
                        existing.setStatus(AcademicYearStatus.CLOSED);
                        scheduleRepository.save(existing);
                    });
        } else {
            scheduleRepository.findDefaultActiveSchedule()
                    .ifPresent(existing -> {
                        existing.setStatus(AcademicYearStatus.CLOSED);
                        scheduleRepository.save(existing);
                    });
        }
    }
}
