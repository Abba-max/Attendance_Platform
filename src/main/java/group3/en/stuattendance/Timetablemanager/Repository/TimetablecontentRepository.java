package group3.en.stuattendance.Timetablemanager.Repository;

import group3.en.stuattendance.Timetablemanager.Model.Timetablecontent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TimetablecontentRepository extends JpaRepository<Timetablecontent, Integer> {

    Optional<Timetablecontent> findByClassroomClassIdAndWeek(Integer classroomId, Integer week);

    Optional<Timetablecontent> findByClassroomClassIdAndAcademicYearIdAndWeek(Integer classroomId, Long academicYearId, Integer week);

    boolean existsByClassroomClassIdAndWeek(Integer classroomId, Integer week);
}