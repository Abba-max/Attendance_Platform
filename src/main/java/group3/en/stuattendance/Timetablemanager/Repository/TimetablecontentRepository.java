package group3.en.stuattendance.Timetablemanager.Repository;

import group3.en.stuattendance.Timetablemanager.Model.Timetablecontent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TimetablecontentRepository extends JpaRepository<Timetablecontent, Integer> {
}