package group3.en.stuattendance.Institutionmanager.DTO;

import java.util.List;

public class MigrateBulkStudentsRequest {

    private List<Integer> studentIds;   // Étudiants sélectionnés
    private Integer fromClassroomId;    // Classe source
    private Integer toClassroomId;      // Classe cible (si non auto-résolu)
    private boolean autoNextLevel;      // Si true, système cherche niveau suivant automatiquement
    private Long academicYearId;        // Année académique cible
    private String reason;              // Motif (optionnel)
    private Boolean useNextAcademicYear = false;

    /**
     * Type de migration :
     *   LEVEL_PROMOTION   → même spécialité, niveau N → N+1
     *   SPECIALITY_CHANGE → même niveau, spécialité différente (même année)
     *   TRONC_COMMUN      → Tronc Commun niveau 2 → spécialité niveau 3
     */
    private MigrationTypedto migrationType = MigrationTypedto.LEVEL_PROMOTION;

    public MigrateBulkStudentsRequest() {}

    public List<Integer> getStudentIds() { return studentIds; }
    public void setStudentIds(List<Integer> studentIds) { this.studentIds = studentIds; }

    public Integer getFromClassroomId() { return fromClassroomId; }
    public void setFromClassroomId(Integer fromClassroomId) { this.fromClassroomId = fromClassroomId; }

    public Integer getToClassroomId() { return toClassroomId; }
    public void setToClassroomId(Integer toClassroomId) { this.toClassroomId = toClassroomId; }

    public boolean isAutoNextLevel() { return autoNextLevel; }
    public void setAutoNextLevel(boolean autoNextLevel) { this.autoNextLevel = autoNextLevel; }

    public Long getAcademicYearId() { return academicYearId; }
    public void setAcademicYearId(Long academicYearId) { this.academicYearId = academicYearId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Boolean getUseNextAcademicYear() { return useNextAcademicYear; }
    public void setUseNextAcademicYear(Boolean useNextAcademicYear) { this.useNextAcademicYear = useNextAcademicYear; }

    public MigrationTypedto getMigrationType() { return migrationType; }
    public void setMigrationType(MigrationTypedto migrationType) { this.migrationType = migrationType; }
}