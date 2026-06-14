package group3.en.stuattendance.Institutionmanager.Repository;

import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, Integer> {

    List<Classroom> findBySpeciality_SpecialityId(Integer specialityId);

    List<Classroom> findBySpecialityIn(List<group3.en.stuattendance.Institutionmanager.Model.Speciality> specialities);

    Optional<Classroom> findFirstBySpeciality_SpecialityIdAndLevel(Integer specialityId, Integer level);

    List<Classroom> findBySpeciality_SpecialityIdAndLevel(Integer specialityId, Integer level);

    // ─────────────────────────────────────────────────────────────────────
    // Migration : Tronc Commun → Spécialité
    // Cherche toutes les classes de niveau {level} qui NE sont PAS Tronc Commun
    // i.e., dont le nom de spécialité ne contient pas "tronc" (insensible à la casse)
    // ─────────────────────────────────────────────────────────────────────
    @Query("SELECT c FROM Classroom c JOIN c.speciality s " +
            "WHERE c.level = :level " +
            "AND LOWER(s.name) NOT LIKE '%tronc%' " +
            "AND LOWER(s.name) NOT LIKE '%commun%'")
    List<Classroom> findAllSpecialityClassroomsAtLevel(@Param("level") Integer level);

    // ─────────────────────────────────────────────────────────────────────
    // Migration : Changement de Spécialité (même niveau, spécialité différente)
    // ─────────────────────────────────────────────────────────────────────
    @Query("SELECT c FROM Classroom c " +
            "WHERE c.level = :level " +
            "AND c.speciality.specialityId <> :excludeSpecialityId")
    List<Classroom> findByLevelAndSpecialityNot(
            @Param("level") Integer level,
            @Param("excludeSpecialityId") Integer excludeSpecialityId);

    // ─────────────────────────────────────────────────────────────────────
    // Toutes les classes gérées par un pédagogue (via staff_classrooms)
    // ─────────────────────────────────────────────────────────────────────
    @Query("SELECT c FROM Classroom c JOIN c.staff u WHERE u.userId = :userId")
    List<Classroom> findByStaffUserId(@Param("userId") Integer userId);
}