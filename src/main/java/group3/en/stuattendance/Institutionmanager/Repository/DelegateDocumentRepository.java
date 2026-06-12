package group3.en.stuattendance.Institutionmanager.Repository;

import group3.en.stuattendance.Institutionmanager.Model.DelegateDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DelegateDocumentRepository extends JpaRepository<DelegateDocument, Integer> {

    @Query("SELECT d FROM DelegateDocument d WHERE d.classroom.classId = :classroomId " +
           "AND (:teacherId IS NULL OR d.teacher.userId = :teacherId) " +
           "AND (:courseId IS NULL OR d.course.courseId = :courseId) " +
           "AND (:search IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (cast(:startDate as timestamp) IS NULL OR d.uploadDate >= :startDate) " +
           "AND (cast(:endDate as timestamp) IS NULL OR d.uploadDate <= :endDate) " +
           "ORDER BY d.uploadDate DESC")
    List<DelegateDocument> findDocuments(
            @Param("classroomId") Integer classroomId,
            @Param("teacherId") Integer teacherId,
            @Param("courseId") Integer courseId,
            @Param("search") String search,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    List<DelegateDocument> findByTeacher_UserId(Integer teacherId);
}
