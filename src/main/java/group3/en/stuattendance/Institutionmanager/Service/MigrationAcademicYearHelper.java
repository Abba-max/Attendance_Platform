package group3.en.stuattendance.Institutionmanager.Service;

import group3.en.stuattendance.Institutionmanager.DTO.MigrationAcademicYearContextdto;
import group3.en.stuattendance.Institutionmanager.DTO.MigrationTypedto;
import group3.en.stuattendance.Institutionmanager.Model.AcademicYear;
import group3.en.stuattendance.Institutionmanager.Model.AcademicYearStatus;
import group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MigrationAcademicYearHelper
 *
 * Responsabilité unique : résoudre et valider l'année académique
 * correcte à utiliser pour chaque type de migration.
 *
 * Règles métier :
 * ┌────────────────────────────────────────────────────────────┐
 * │ LEVEL_PROMOTION → Année N+1 (statut PLANNED) │
 * │ TRONC_COMMUN → Année N+1 (statut PLANNED) │
 * │ SPECIALITY_CHANGE → Année N (statut ACTIVE) │
 * └────────────────────────────────────────────────────────────┘
 *
 * L'année N+1 ne doit JAMAIS être ACTIVE lors des migrations.
 * Si elle n'existe pas encore → elle est créée automatiquement (PLANNED).
 * ═══════════════════════════════════════════════════════════════════════════
 */
@Service
public class MigrationAcademicYearHelper {

    private final AcademicYearRepository academicYearRepository;

    public MigrationAcademicYearHelper(AcademicYearRepository academicYearRepository) {
        this.academicYearRepository = academicYearRepository;
    }

    // ─────────────────────────────────────────────────────────────────────
    // API PRINCIPALE — résoudre l'année académique selon le type de migration
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Retourne l'année académique à utiliser pour la migration.
     * - SPECIALITY_CHANGE → année ACTIVE (N)
     * - LEVEL_PROMOTION / TRONC_COMMUN → année PLANNED (N+1, auto-créée si absente)
     *
     * @throws IllegalStateException si aucune année active n'existe
     * @throws IllegalStateException si N+1 existe mais a déjà été activée
     */
    @Transactional
    public AcademicYear resolveForMigration(MigrationTypedto type) {

        if (type == MigrationTypedto.SPECIALITY_CHANGE) {
            // Changement de spécialité → même année active
            return getActiveYear();
        }

        // LEVEL_PROMOTION et TRONC_COMMUN → année suivante PLANNED
        return getOrCreateNextPlannedYear();
    }

    // ─────────────────────────────────────────────────────────────────────
    // CONTEXTE COMPLET — pour l'affichage frontend
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Retourne le contexte complet des années académiques pour l'interface
     * de migration du pédagogue.
     */
    public MigrationAcademicYearContextdto buildContext() {

        AcademicYear active = getActiveYear();
        // Cherche N+1 sans la créer (juste pour l'affichage)
        AcademicYear next = academicYearRepository.findNextAcademicYear().orElse(null);

        String expectedNextName = generateNextYearName(active.getAcademicYear());

        MigrationAcademicYearContextdto ctx = new MigrationAcademicYearContextdto();

        // Année N
        ctx.setActiveYearId(active.getId());
        ctx.setActiveYearName(active.getAcademicYear());
        ctx.setActiveYearStart(active.getStartDate());
        ctx.setActiveYearEnd(active.getEndDate());

        // Année N+1
        if (next != null) {
            ctx.setNextYearId(next.getId());
            ctx.setNextYearName(next.getAcademicYear());
            ctx.setNextYearStart(next.getStartDate());
            ctx.setNextYearEnd(next.getEndDate());
            ctx.setNextYearExists(true);
            // Prête si et seulement si statut PLANNED (pas ACTIVE, pas CLOSED)
            ctx.setNextYearReadyForMigration(next.getStatus() == AcademicYearStatus.PLANNED);
        } else {
            // N+1 pas encore créée → sera auto-créée lors de la première migration
            ctx.setNextYearExists(false);
            ctx.setNextYearName(expectedNextName);
            ctx.setNextYearReadyForMigration(true); // sera créée automatiquement
        }

        // Labels pour le frontend (indiquent vers quelle année chaque migration pointe)
        ctx.setMigrationTargetYearForPromotion(
                next != null ? next.getAcademicYear() : expectedNextName + " (sera créée automatiquement)");
        ctx.setMigrationTargetYearForSpeciality(active.getAcademicYear());

        return ctx;
    }

    // ─────────────────────────────────────────────────────────────────────
    // GARDE-FOU : vérification avant activation de N+1
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Vérifie qu'il n'y a aucune migration enregistrée vers l'année N+1
     * avant de permettre son activation.
     * Appelé depuis AcademicYearServiceImpl.activateAcademicYear().
     *
     * @throws IllegalStateException si des migrations référencent cette année
     */
    public void assertNoMigrationsBeforeActivation(Long yearId) {
        long count = academicYearRepository.countMigrationsByAcademicYearId(yearId);
        if (count > 0) {
            throw new IllegalStateException(
                    "Impossible d'activer cette année académique : " + count +
                            " migration(s) d'étudiants y font référence. " +
                            "Vérifiez et validez les migrations avant l'activation.");
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Méthodes privées
    // ─────────────────────────────────────────────────────────────────────

    /** Retourne l'année active ou lève une exception. */
    private AcademicYear getActiveYear() {
        return academicYearRepository.findActiveAcademicYear()
                .orElseThrow(() -> new IllegalStateException(
                        "Aucune année académique active. " +
                                "Veuillez activer une année académique avant de lancer des migrations."));
    }

    /**
     * Retourne l'année N+1 planifiée.
     * Si elle n'existe pas, la crée avec statut PLANNED.
     * Lève une exception si N+1 est déjà ACTIVE (incohérence).
     */
    @Transactional
    public AcademicYear getOrCreateNextPlannedYear() {
        AcademicYear active = getActiveYear();

        // Chercher une année PLANNED existante
        AcademicYear next = academicYearRepository.findNextAcademicYear().orElse(null);

        if (next != null) {
            // ── Garde-fou : N+1 ne doit pas être ACTIVE ──────────────────
            if (next.getStatus() == AcademicYearStatus.ACTIVE) {
                throw new IllegalStateException(
                        "L'année académique suivante (" + next.getAcademicYear() + ") est déjà ACTIVE. " +
                                "Les migrations de passage de niveau ne sont possibles que vers une année PLANNED. " +
                                "Veuillez vérifier la configuration des années académiques.");
            }
            return next;
        }

        // ── Auto-création de N+1 ──────────────────────────────────────────
        String nextName = generateNextYearName(active.getAcademicYear());

        // Double vérification par nom (au cas où elle existe avec un autre statut)
        if (academicYearRepository.existsByAcademicYear(nextName)) {
            // Elle existe avec un statut non-PLANNED (ex: CLOSED) — lever une erreur
            // explicite
            AcademicYear existing = academicYearRepository.findByAcademicYear(nextName)
                    .orElseThrow();
            throw new IllegalStateException(
                    "L'année académique " + nextName + " existe déjà avec le statut " +
                            existing.getStatus() + ". " +
                            "Seule une année PLANNED peut être utilisée comme cible de migration.");
        }

        AcademicYear created = new AcademicYear();
        created.setAcademicYear(nextName);
        created.setStartDate(active.getEndDate().plusDays(1));
        created.setEndDate(active.getEndDate().plusYears(1));
        created.setStatus(AcademicYearStatus.PLANNED); // ← JAMAIS ACTIVE

        AcademicYear saved = academicYearRepository.save(created);

        // Log en console pour traçabilité
        System.out.printf("[Migration] Année académique N+1 auto-créée : %s (PLANNED)%n",
                saved.getAcademicYear());

        return saved;
    }

    /**
     * Génère le nom de l'année suivante.
     * "2024/2025" → "2025/2026"
     * "2025-2026" → "2026-2027"
     */
    private String generateNextYearName(String current) {
        if (current == null) {
            throw new IllegalArgumentException("L'année académique courante ne peut pas être null.");
        }
        String separator = "/";
        if (current.contains("-")) {
            separator = "-";
        }
        String[] parts = current.split(separator);
        if (parts.length != 2) {
            throw new IllegalArgumentException(
                    "Format d'année académique invalide : " + current +
                            " (attendu : YYYY/YYYY ou YYYY-YYYY)");
        }
        try {
            int start = Integer.parseInt(parts[0].trim());
            return (start + 1) + separator + (start + 2);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(
                    "Format d'année académique invalide : " + current +
                            " (les années doivent être des entiers)");
        }
    }
}
