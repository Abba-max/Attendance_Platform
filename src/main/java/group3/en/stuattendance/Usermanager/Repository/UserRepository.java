package group3.en.stuattendance.Usermanager.Repository;

import group3.en.stuattendance.Usermanager.Model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByMatricule(String matricule);

    Optional<User> findByJoinCode(String joinCode);

    Page<User> findAll(Pageable pageable);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name != 'STUDENT'")
    Page<User> findAllStaff(Pageable pageable);
}