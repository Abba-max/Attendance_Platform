package group3.en.stuattendance.Institutionmanager.Repository;

import group3.en.stuattendance.Institutionmanager.Model.Institution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InstitutionRepository extends JpaRepository<Institution, Integer> {
}
