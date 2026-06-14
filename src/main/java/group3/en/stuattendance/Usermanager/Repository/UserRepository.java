package group3.en.stuattendance.Usermanager.Repository;

import group3.en.stuattendance.Usermanager.Model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
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

    List<User> findByRolesName(String roleName);

    List<User> findByClassroomClassIdAndRolesName(Integer classroomId, String roleName);

    List<User> findByClassroomClassId(Integer classroomId);

    long countByClassroomClassIdAndIsDelegateTrue(Integer classroomId);

    List<User> findByClassroomClassIdAndIsDelegateTrue(Integer classroomId);

    long countByRolesName(String roleName);

    long countByRolesNameIn(List<String> roleNames);

    List<User> findByRolesNameIn(List<String> roleNames);

    List<User> findByClassroomIn(List<group3.en.stuattendance.Institutionmanager.Model.Classroom> classrooms);

    List<User> findByClassroomInAndRolesName(List<group3.en.stuattendance.Institutionmanager.Model.Classroom> classrooms, String roleName);
}