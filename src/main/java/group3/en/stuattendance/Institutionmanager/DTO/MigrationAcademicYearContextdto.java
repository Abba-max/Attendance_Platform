package group3.en.stuattendance.Institutionmanager.DTO;

import java.time.LocalDate;

/**
 * Contexte des années académiques pour le module migration.
 *
 * Retourné par GET /api/migration/academic-year-context
 * Utilisé par le frontend pour afficher :
 *   - L'année N active (source des étudiants)
 *   - L'année N+1 planifiée (destination pour LEVEL_PROMOTION et TRONC_COMMUN)
 *   - Un avertissement si N+1 n'existe pas encore
 */
public class MigrationAcademicYearContextdto {

    // ── Année N (active) ──────────────────────────────────────────────────
    private Long activeYearId;
    private String activeYearName;       // ex : "2024/2025"
    private LocalDate activeYearStart;
    private LocalDate activeYearEnd;

    // ── Année N+1 (planifiée) ─────────────────────────────────────────────
    private Long nextYearId;             // null si inexistante
    private String nextYearName;         // ex : "2025/2026"
    private LocalDate nextYearStart;
    private LocalDate nextYearEnd;
    private boolean nextYearExists;      // false → sera auto-créée au premier besoin

    /**
     * Indique si N+1 est prête pour recevoir des migrations.
     * true  → nextYearExists = true ET statut = PLANNED
     * false → sera créée automatiquement lors de la première migration
     */
    private boolean nextYearReadyForMigration;

    /**
     * Type de migration et l'année académique qu'elle cible :
     *   LEVEL_PROMOTION   → cible N+1 (PLANNED)
     *   TRONC_COMMUN      → cible N+1 (PLANNED)
     *   SPECIALITY_CHANGE → cible N   (ACTIVE)
     */
    private String migrationTargetYearForPromotion;   // nextYearName ou message
    private String migrationTargetYearForSpeciality;  // activeYearName

    // ── Getters / Setters ────────────────────────────────────────────────

    public Long getActiveYearId() { return activeYearId; }
    public void setActiveYearId(Long activeYearId) { this.activeYearId = activeYearId; }

    public String getActiveYearName() { return activeYearName; }
    public void setActiveYearName(String activeYearName) { this.activeYearName = activeYearName; }

    public LocalDate getActiveYearStart() { return activeYearStart; }
    public void setActiveYearStart(LocalDate activeYearStart) { this.activeYearStart = activeYearStart; }

    public LocalDate getActiveYearEnd() { return activeYearEnd; }
    public void setActiveYearEnd(LocalDate activeYearEnd) { this.activeYearEnd = activeYearEnd; }

    public Long getNextYearId() { return nextYearId; }
    public void setNextYearId(Long nextYearId) { this.nextYearId = nextYearId; }

    public String getNextYearName() { return nextYearName; }
    public void setNextYearName(String nextYearName) { this.nextYearName = nextYearName; }

    public LocalDate getNextYearStart() { return nextYearStart; }
    public void setNextYearStart(LocalDate nextYearStart) { this.nextYearStart = nextYearStart; }

    public LocalDate getNextYearEnd() { return nextYearEnd; }
    public void setNextYearEnd(LocalDate nextYearEnd) { this.nextYearEnd = nextYearEnd; }

    public boolean isNextYearExists() { return nextYearExists; }
    public void setNextYearExists(boolean nextYearExists) { this.nextYearExists = nextYearExists; }

    public boolean isNextYearReadyForMigration() { return nextYearReadyForMigration; }
    public void setNextYearReadyForMigration(boolean nextYearReadyForMigration) {
        this.nextYearReadyForMigration = nextYearReadyForMigration;
    }

    public String getMigrationTargetYearForPromotion() { return migrationTargetYearForPromotion; }
    public void setMigrationTargetYearForPromotion(String y) { this.migrationTargetYearForPromotion = y; }

    public String getMigrationTargetYearForSpeciality() { return migrationTargetYearForSpeciality; }
    public void setMigrationTargetYearForSpeciality(String y) { this.migrationTargetYearForSpeciality = y; }
}