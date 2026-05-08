package group3.en.stuattendance.Institutionmanager.Repository;

import group3.en.stuattendance.Institutionmanager.Model.AcademicYear;
import group3.en.stuattendance.Institutionmanager.Model.AcademicYearStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AcademicYearRepository extends JpaRepository<AcademicYear, Long> {

    // ── Année active ──────────────────────────────────────────────────────
    @Query("SELECT a FROM AcademicYear a WHERE a.status = " +
            "group3.en.stuattendance.Institutionmanager.Model.AcademicYearStatus.ACTIVE")
    Optional<AcademicYear> findActiveAcademicYear();

    // ── Recherche par nom ("2024/2025") ───────────────────────────────────
    Optional<AcademicYear> findByAcademicYear(String academicYear);

    // ── Prochaine année planifiée (N+1) ───────────────────────────────────
    // Retourne la première année avec statut PLANNED, triée par date de début
    @Query("SELECT a FROM AcademicYear a WHERE a.status = 'PLANNED' ORDER BY a.startDate ASC LIMIT 1")
    Optional<AcademicYear> findNextAcademicYear();

    // ── Toutes les années planifiées ──────────────────────────────────────
    @Query("SELECT a FROM AcademicYear a WHERE a.status = 'PLANNED' ORDER BY a.startDate ASC")
    List<AcademicYear> findAllPlannedYears();

    // ── Vérification : N+1 existe-t-elle déjà pour un nom donné ? ─────────
    boolean existsByAcademicYear(String academicYearName);

    // ── Vérifie qu'une année N+1 n'est PAS active ─────────────────────────
    // Utilisé comme garde-fou avant de l'utiliser comme cible de migration
    @Query("SELECT CASE WHEN a.status = 'PLANNED' THEN true ELSE false END " +
            "FROM AcademicYear a WHERE a.id = :id")
    Boolean isYearPlanned(@Param("id") Long id);

    // ── Toutes les années, triées par date de début ───────────────────────
    @Query("SELECT a FROM AcademicYear a ORDER BY a.startDate DESC")
    List<AcademicYear> findAllOrderByStartDateDesc();

    // ── Compte le nombre de migrations vers une année donnée ──────────────
    // Utilisé pour empêcher l'activation de N+1 s'il y a des migrations en attente
    @Query("SELECT COUNT(h) FROM StudentClassHistory h WHERE h.academicYear.id = :yearId")
    long countMigrationsByAcademicYearId(@Param("yearId") Long yearId);
}