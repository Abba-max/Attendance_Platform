package group3.en.stuattendance.Institutionmanager.Repository;

import group3.en.stuattendance.Institutionmanager.Model.AcademicYear;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AcademicYearRepository extends JpaRepository<AcademicYear, Long> {

    @Query("SELECT a FROM AcademicYear a WHERE a.isActive = true")
    Optional<AcademicYear> findActiveAcademicYear();

    Optional<AcademicYear> findByAcademicYear(String academicYear);
}
