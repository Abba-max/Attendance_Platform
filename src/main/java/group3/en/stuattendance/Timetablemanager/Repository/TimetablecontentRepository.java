package group3.en.stuattendance.Timetablemanager.Repository;

import group3.en.stuattendance.Timetablemanager.Model.Timetablecontent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TimetablecontentRepository extends JpaRepository<Timetablecontent, Integer> {

    Optional<Timetablecontent> findByClassroomClassIdAndAcademicYearIdAndWeekAndSemester(Integer classroomId, Long academicYearId, Integer week, Integer semester);

    boolean existsByClassroomClassIdAndAcademicYearIdAndWeekAndSemester(Integer classroomId, Long academicYearId, Integer week, Integer semester);
}