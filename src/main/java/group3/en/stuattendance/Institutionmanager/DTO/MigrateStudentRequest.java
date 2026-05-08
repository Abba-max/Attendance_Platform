package group3.en.stuattendance.Institutionmanager.DTO;

public class MigrateStudentRequest {

    private Integer studentId;
    private Integer toClassroomId;
    private Long academicYearId;         // optionnel — ignoré si migrationType est fourni
    private String reason;
    private Boolean useNextAcademicYear = false; // legacy — préférer migrationType

    /**
     * Type de migration — détermine automatiquement l'année académique cible :
     *   LEVEL_PROMOTION   → N+1 (PLANNED)
     *   TRONC_COMMUN      → N+1 (PLANNED)
     *   SPECIALITY_CHANGE → N   (ACTIVE)
     */
    private MigrationTypedto migrationType = MigrationTypedto.LEVEL_PROMOTION;

    public MigrateStudentRequest() {}

    public Integer getStudentId() { return studentId; }
    public void setStudentId(Integer studentId) { this.studentId = studentId; }

    public Integer getToClassroomId() { return toClassroomId; }
    public void setToClassroomId(Integer toClassroomId) { this.toClassroomId = toClassroomId; }

    public Long getAcademicYearId() { return academicYearId; }
    public void setAcademicYearId(Long academicYearId) { this.academicYearId = academicYearId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Boolean getUseNextAcademicYear() { return useNextAcademicYear; }
    public void setUseNextAcademicYear(Boolean v) { this.useNextAcademicYear = v; }

    public MigrationTypedto getMigrationType() { return migrationType; }
    public void setMigrationType(MigrationTypedto migrationType) { this.migrationType = migrationType; }
}