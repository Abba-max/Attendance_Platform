package group3.en.stuattendance.repository;

import group3.en.stuattendance.model.Pedagog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PedagogRepository extends JpaRepository<Pedagog, Integer> {
}