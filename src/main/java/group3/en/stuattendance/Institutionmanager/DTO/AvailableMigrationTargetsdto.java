package group3.en.stuattendance.Institutionmanager.DTO;

import java.util.List;

/**
 * Réponse de l'endpoint /api/migration/available-targets
 * Contient les classes cibles disponibles pour un type de migration donné,
 * ainsi que des méta-données utiles au frontend.
 */
public class AvailableMigrationTargetsdto {

    /** Type de migration demandé */
    private MigrationTypedto migrationType;

    /** Vrai si l'assistant pédagogique gère au moins un Tronc Commun */
    private boolean pedagHasTroncCommun;

    /** Salles source gérées par le pédagogue (pour le dropdown "Classe source") */
    private List<ClassroomSummaryDto> sourceClassrooms;

    /** Salles cibles disponibles selon le type de migration */
    private List<ClassroomSummaryDto> targetClassrooms;

    // ─── Nested summary ──────────────────────────────────
    public static class ClassroomSummaryDto {
        private Integer classId;
        private String name;
        private Integer level;
        private String specialityName;
        private Integer availableSlots;
        private boolean isTroncCommun;

        public ClassroomSummaryDto() {}

        public ClassroomSummaryDto(Integer classId, String name, Integer level,
                                   String specialityName, Integer availableSlots,
                                   boolean isTroncCommun) {
            this.classId = classId;
            this.name = name;
            this.level = level;
            this.specialityName = specialityName;
            this.availableSlots = availableSlots;
            this.isTroncCommun = isTroncCommun;
        }

        public Integer getClassId() { return classId; }
        public void setClassId(Integer classId) { this.classId = classId; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public Integer getLevel() { return level; }
        public void setLevel(Integer level) { this.level = level; }
        public String getSpecialityName() { return specialityName; }
        public void setSpecialityName(String specialityName) { this.specialityName = specialityName; }
        public Integer getAvailableSlots() { return availableSlots; }
        public void setAvailableSlots(Integer availableSlots) { this.availableSlots = availableSlots; }
        public boolean isTroncCommun() { return isTroncCommun; }
        public void setTroncCommun(boolean troncCommun) { isTroncCommun = troncCommun; }
    }

    // ─── Getters / Setters ───────────────────────────────
    public MigrationTypedto getMigrationType() { return migrationType; }
    public void setMigrationType(MigrationTypedto migrationType) { this.migrationType = migrationType; }
    public boolean isPedagHasTroncCommun() { return pedagHasTroncCommun; }
    public void setPedagHasTroncCommun(boolean pedagHasTroncCommun) { this.pedagHasTroncCommun = pedagHasTroncCommun; }
    public List<ClassroomSummaryDto> getSourceClassrooms() { return sourceClassrooms; }
    public void setSourceClassrooms(List<ClassroomSummaryDto> sourceClassrooms) { this.sourceClassrooms = sourceClassrooms; }
    public List<ClassroomSummaryDto> getTargetClassrooms() { return targetClassrooms; }
    public void setTargetClassrooms(List<ClassroomSummaryDto> targetClassrooms) { this.targetClassrooms = targetClassrooms; }
}