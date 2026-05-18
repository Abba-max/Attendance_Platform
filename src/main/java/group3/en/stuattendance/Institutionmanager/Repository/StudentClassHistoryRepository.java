package group3.en.stuattendance.Institutionmanager.Repository;

import group3.en.stuattendance.Institutionmanager.Model.StudentClassHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentClassHistoryRepository extends JpaRepository<StudentClassHistory, Integer> {

    // Get full migration history of a specific student with fetch joins
    @Query("SELECT h FROM StudentClassHistory h " +
           "JOIN FETCH h.student s " +
           "JOIN FETCH h.fromClassroom fc " +
           "JOIN FETCH h.toClassroom tc " +
           "LEFT JOIN FETCH h.migratedBy mb " +
           "LEFT JOIN FETCH h.academicYear ay " +
           "WHERE s.userId = :studentId ORDER BY h.migratedAt DESC")
    List<StudentClassHistory> findByStudent_UserIdOrderByMigratedAtDesc(@Param("studentId") Integer studentId);

    // Get all migrations that happened FROM a specific classroom
    List<StudentClassHistory> findByFromClassroom_ClassId(Integer classroomId);

    // Get all migrations that happened TO a specific classroom
    List<StudentClassHistory> findByToClassroom_ClassId(Integer classroomId);

    // Get all migrations performed by a specific admin/staff
    List<StudentClassHistory> findByMigratedBy_UserId(Integer migratedById);

    // Historical enrollment: students who LEFT a classroom in a specific academic year
    @Query("SELECT h FROM StudentClassHistory h " +
           "JOIN FETCH h.student s " +
           "JOIN FETCH h.fromClassroom fc " +
           "JOIN FETCH h.academicYear ay " +
           "WHERE fc.classId = :classroomId AND ay.id = :academicYearId")
    List<StudentClassHistory> findByFromClassroom_ClassIdAndAcademicYear_Id(
            @Param("classroomId") Integer classroomId, @Param("academicYearId") Long academicYearId);

    // Historical enrollment: students who ARRIVED in a classroom in a specific academic year
    @Query("SELECT h FROM StudentClassHistory h " +
           "JOIN FETCH h.student s " +
           "JOIN FETCH h.toClassroom tc " +
           "JOIN FETCH h.academicYear ay " +
           "WHERE tc.classId = :classroomId AND ay.id = :academicYearId")
    List<StudentClassHistory> findByToClassroom_ClassIdAndAcademicYear_Id(
            @Param("classroomId") Integer classroomId, @Param("academicYearId") Long academicYearId);
}