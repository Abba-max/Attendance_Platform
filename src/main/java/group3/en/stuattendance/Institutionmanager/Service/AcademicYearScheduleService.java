package group3.en.stuattendance.Institutionmanager.Service;

import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearScheduleDto;
import java.util.List;

public interface AcademicYearScheduleService {
    /** Create a new scoped schedule (Institution-wide, Cycle, or Department) */
    AcademicYearScheduleDto createSchedule(AcademicYearScheduleDto dto);

    /** Activate a schedule (deactivates any other active schedule for the same scope) */
    AcademicYearScheduleDto activateSchedule(Long scheduleId);

    /** Suspend a schedule without closing it */
    AcademicYearScheduleDto suspendSchedule(Long scheduleId);

    /** Close/archive a schedule permanently */
    AcademicYearScheduleDto closeSchedule(Long scheduleId);

    /** Delete a schedule (only if not ACTIVE) */
    void deleteSchedule(Long scheduleId);

    /** Get all schedules for a given Academic Year */
    List<AcademicYearScheduleDto> getSchedulesByAcademicYear(Long academicYearId);

    /**
     * Resolve the active schedule for a specific Department.
     * Priority: Department schedule > Cycle schedule > Default schedule.
     */
    AcademicYearScheduleDto resolveActiveScheduleForDepartment(Integer departmentId);

    /**
     * Resolve the active schedule for a specific Speciality.
     * Priority: Speciality schedule > Department schedule > Cycle schedule > Default schedule.
     */
    AcademicYearScheduleDto resolveActiveScheduleForSpeciality(Integer specialityId);
}
