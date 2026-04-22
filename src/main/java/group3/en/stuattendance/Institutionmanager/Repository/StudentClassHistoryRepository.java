package group3.en.stuattendance.Institutionmanager.Repository;

import group3.en.stuattendance.Institutionmanager.Model.StudentClassHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentClassHistoryRepository extends JpaRepository<StudentClassHistory, Integer> {

    // Get full migration history of a specific student
    List<StudentClassHistory> findByStudent_UserIdOrderByMigratedAtDesc(Integer studentId);

    // Get all migrations that happened FROM a specific classroom
    List<StudentClassHistory> findByFromClassroom_ClassId(Integer classroomId);

    // Get all migrations that happened TO a specific classroom
    List<StudentClassHistory> findByToClassroom_ClassId(Integer classroomId);

    // Get all migrations performed by a specific admin/staff
    List<StudentClassHistory> findByMigratedBy_UserId(Integer migratedById);
}