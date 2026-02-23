package group3.en.stuattendance.Institutionmanager.Repository;

import group3.en.stuattendance.Institutionmanager.Model.AcademicYearSchedule;
import group3.en.stuattendance.Institutionmanager.Model.AcademicYearStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AcademicYearScheduleRepository extends JpaRepository<AcademicYearSchedule, Long> {

    @Query("SELECT s FROM AcademicYearSchedule s WHERE s.status = 'ACTIVE' AND s.cycle IS NULL AND s.department IS NULL")
    Optional<AcademicYearSchedule> findDefaultActiveSchedule();

    @Query("SELECT s FROM AcademicYearSchedule s WHERE s.status = 'ACTIVE' AND s.cycle.cycleId = :cycleId")
    Optional<AcademicYearSchedule> findActiveScheduleByCycle(@Param("cycleId") Integer cycleId);

    @Query("SELECT s FROM AcademicYearSchedule s WHERE s.status = 'ACTIVE' AND s.department.departmentId = :deptId")
    Optional<AcademicYearSchedule> findActiveScheduleByDepartment(@Param("deptId") Integer deptId);

    @Query("SELECT s FROM AcademicYearSchedule s WHERE s.status = 'ACTIVE' AND s.classroom.classId = :classId")
    Optional<AcademicYearSchedule> findActiveScheduleByClassroom(@Param("classId") Integer classId);

    List<AcademicYearSchedule> findByAcademicYearId(Long academicYearId);

    @Query("SELECT s FROM AcademicYearSchedule s WHERE s.cycle.cycleId = :cycleId AND YEAR(s.startDate) = :year")
    List<AcademicYearSchedule> findSchedulesByCycleAndYear(@Param("cycleId") Integer cycleId, @Param("year") int year);

    @Query("SELECT s FROM AcademicYearSchedule s WHERE s.department.departmentId = :deptId AND YEAR(s.startDate) = :year")
    List<AcademicYearSchedule> findSchedulesByDepartmentAndYear(@Param("deptId") Integer deptId, @Param("year") int year);
    
    @Query("SELECT s FROM AcademicYearSchedule s WHERE s.classroom.classId = :classId AND YEAR(s.startDate) = :year")
    List<AcademicYearSchedule> findSchedulesByClassroomAndYear(@Param("classId") Integer classId, @Param("year") int year);

    @Query("SELECT s FROM AcademicYearSchedule s WHERE s.cycle IS NULL AND s.department IS NULL AND s.classroom IS NULL AND YEAR(s.startDate) = :year")
    List<AcademicYearSchedule> findDefaultSchedulesByYear(@Param("year") int year);
}
