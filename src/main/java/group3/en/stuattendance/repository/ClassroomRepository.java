
package group3.en.stuattendance.repository;

import group3.en.stuattendance.model.Classroom;
import group3.en.stuattendance.model.Institution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, Integer> {
    List<Classroom> findByInstitution(Institution institution);
    List<Classroom> findByFieldAndLevel(String field, String level);

    @Query("SELECT c FROM Classroom c WHERE c.capacity > SIZE(c.students)")
    List<Classroom> findAvailableClassrooms();
}