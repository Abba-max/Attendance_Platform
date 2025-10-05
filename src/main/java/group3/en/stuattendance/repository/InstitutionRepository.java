package group3.en.stuattendance.repository;

import group3.en.stuattendance.model.Institution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InstitutionRepository extends JpaRepository<Institution, Integer> {
    Optional<Institution> findByName(String name);
    List<Institution> findByLocationContaining(String location);
}

