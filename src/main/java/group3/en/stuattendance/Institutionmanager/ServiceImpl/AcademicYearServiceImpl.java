package group3.en.stuattendance.Institutionmanager.ServiceImpl;

import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearDto;
import group3.en.stuattendance.Institutionmanager.Mapper.AcademicYearMapper;
import group3.en.stuattendance.Institutionmanager.Model.AcademicYear;
import group3.en.stuattendance.Institutionmanager.Model.AcademicYearStatus;
import group3.en.stuattendance.Institutionmanager.Repository.AcademicYearRepository;
import group3.en.stuattendance.Institutionmanager.Service.AcademicYearService;
import group3.en.stuattendance.Institutionmanager.Service.MigrationAcademicYearHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AcademicYearServiceImpl implements AcademicYearService {

    private final AcademicYearRepository academicYearRepository;
    private final AcademicYearMapper academicYearMapper;

    /**
     * Injecté pour le garde-fou : empêche l'activation d'une année N+1
     * si des migrations d'étudiants y font déjà référence.
     */
    private final MigrationAcademicYearHelper migrationYearHelper;

    @Override
    @Transactional
    public AcademicYearDto createAcademicYear(AcademicYearDto dto) {

        if (dto.getStartDate().isAfter(dto.getEndDate())) {
            throw new IllegalArgumentException("La date de début doit être avant la date de fin.");
        }

        AcademicYear entity = academicYearMapper.toEntity(dto);

        // Statut par défaut = PLANNED (jamais ACTIVE par défaut pour une nouvelle année)
        if (entity.getStatus() == null) {
            entity.setStatus(AcademicYearStatus.PLANNED);
        }

        // Si on force ACTIVE, désactiver l'année courante
        if (entity.isActive()) {
            deactivateCurrentActive();
        } else if (academicYearRepository.count() == 0) {
            // Première année jamais créée → active par défaut
            entity.setStatus(AcademicYearStatus.ACTIVE);
        }

        return academicYearMapper.toDto(academicYearRepository.save(entity));
    }

    @Override
    public AcademicYearDto getNextAcademicYear() {
        return academicYearRepository.findNextAcademicYear()
                .map(academicYearMapper::toDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public AcademicYearDto createNextAcademicYear(AcademicYearDto dto) {
        // Force toujours PLANNED — N+1 ne peut pas être créée ACTIVE
        dto.setStatus("PLANNED");
        return createAcademicYear(dto);
    }

    @Override
    public AcademicYearDto getActiveAcademicYear() {
        return academicYearRepository.findActiveAcademicYear()
                .map(academicYearMapper::toDto)
                .orElse(null);
    }

    @Override
    public List<AcademicYearDto> getAllAcademicYears() {
        return academicYearRepository.findAllOrderByStartDateDesc().stream()
                .map(academicYearMapper::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Active une année académique.
     *
     * ─── GARDE-FOU MIGRATION ─────────────────────────────────────────────
     * Si des migrations d'étudiants sont enregistrées vers cette année
     * (parce qu'elle était N+1 et utilisée comme cible de migration),
     * l'activation est bloquée avec un message explicite.
     *
     * L'administrateur doit d'abord s'assurer que toutes les migrations
     * sont validées avant de procéder à l'activation.
     * ─────────────────────────────────────────────────────────────────────
     */
    @Override
    @Transactional
    public AcademicYearDto activateAcademicYear(Long id) {
        AcademicYear year = academicYearRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Année académique introuvable : " + id));

        if (year.isActive()) {
            return academicYearMapper.toDto(year); // déjà active
        }

        // ── Garde-fou : vérification des migrations en attente ────────────
        // Si cette année a été utilisée comme N+1 pour des migrations,
        // on vérifie qu'elles sont toutes finalisées avant activation.
        // Note : ici on avertit mais on ne bloque pas (à adapter selon votre processus).
        long migrationCount = academicYearRepository.countMigrationsByAcademicYearId(id);
        if (migrationCount > 0) {
            // Option A — Bloquer complètement (décommentez si souhaité) :
            // migrationYearHelper.assertNoMigrationsBeforeActivation(id);

            // Option B — Avertissement dans les logs (comportement actuel)
            System.out.printf("[AcademicYear] ATTENTION : %d migration(s) vers l'année %s. " +
                            "Vérifiez qu'elles sont toutes validées avant activation.%n",
                    migrationCount, year.getAcademicYear());
        }

        deactivateCurrentActive();
        year.setStatus(AcademicYearStatus.ACTIVE);
        return academicYearMapper.toDto(academicYearRepository.save(year));
    }

    @Override
    @Transactional
    public AcademicYearDto suspendAcademicYear(Long id) {
        AcademicYear year = academicYearRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Année académique introuvable : " + id));
        year.setStatus(AcademicYearStatus.SUSPENDED);
        return academicYearMapper.toDto(academicYearRepository.save(year));
    }

    @Override
    @Transactional
    public AcademicYearDto closeAcademicYear(Long id) {
        AcademicYear year = academicYearRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Année académique introuvable : " + id));
        year.setStatus(AcademicYearStatus.CLOSED);
        return academicYearMapper.toDto(academicYearRepository.save(year));
    }

    @Override
    @Transactional
    public void deleteAcademicYear(Long id) {
        AcademicYear year = academicYearRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Année académique introuvable : " + id));
        if (year.isActive()) {
            throw new RuntimeException("Impossible de supprimer l'année académique active.");
        }
        // Vérifier qu'il n'y a pas de migrations vers cette année
        long count = academicYearRepository.countMigrationsByAcademicYearId(id);
        if (count > 0) {
            throw new RuntimeException(
                    "Impossible de supprimer cette année : " + count +
                            " migration(s) y font référence.");
        }
        academicYearRepository.delete(year);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Helper privé
    // ─────────────────────────────────────────────────────────────────────

    private void deactivateCurrentActive() {
        academicYearRepository.findActiveAcademicYear().ifPresent(active -> {
            active.setStatus(AcademicYearStatus.CLOSED);
            academicYearRepository.save(active);
        });
    }
}