package group3.en.stuattendance.Usermanager.Repository;

import group3.en.stuattendance.Usermanager.Model.Pedagog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@
Repository
public interface PedagogRepository extends JpaRepository<Pedagog, Integer> {
}