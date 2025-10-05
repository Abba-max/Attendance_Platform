package group3.en.stuattendance.repository;

import group3.en.stuattendance.model.User;
import group3.en.stuattendance.model.Institution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<User> findByInstitution(Institution institution);
    List<User> findByIsActive(Boolean isActive);
}