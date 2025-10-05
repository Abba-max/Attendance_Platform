package group3.en.stuattendance.repository;

import group3.en.stuattendance.model.Notification;
import group3.en.stuattendance.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Integer> {
    List<Notification> findByUser(User user);
    List<Notification> findByUserAndIsRead(User user, Boolean isRead);

    @Query("SELECT n FROM Notification n WHERE n.user.userId = :userId " +
            "ORDER BY n.createdAt DESC")
    Page<Notification> findByUserIdOrderByCreatedAtDesc(
            @Param("userId") Integer userId, Pageable pageable);
}
