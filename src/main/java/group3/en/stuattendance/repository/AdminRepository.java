package group3.en.stuattendance.repository;

import group3.en.stuattendance.model.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdminRepository extends JpaRepository<Admin, Integer> {
    List<Admin> findByRole(String role);
}