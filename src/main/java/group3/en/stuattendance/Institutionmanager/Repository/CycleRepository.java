package group3.en.stuattendance.Institutionmanager.Repository;

import group3.en.stuattendance.Institutionmanager.Model.Cycle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CycleRepository extends JpaRepository<Cycle, Integer> {
    Optional<Cycle> findByName(String name);

    @Override
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"departments"})
    java.util.List<Cycle> findAll();
}
