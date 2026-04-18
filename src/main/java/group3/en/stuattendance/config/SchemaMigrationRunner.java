package group3.en.stuattendance.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * One-time schema migration runner.
 *
 * Addresses legacy columns that Hibernate's ddl-auto=update cannot fix
 * (column nullability changes, orphaned FK constraints, etc.).
 *
 * Each statement is guarded so it is safe to run on every startup.
 */
@Component
public class SchemaMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaMigrationRunner.class);
    private final JdbcTemplate jdbc;

    public SchemaMigrationRunner(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        fixAttendanceRecordsStudentId();
    }

    /**
     * The `attendance_records.student_id` column was a NOT-NULL FK to a legacy
     * `students` table. We need it to be nullable so new inserts are not blocked.
     *
     * Step 1 – Drop the foreign key if it still exists.
     * Step 2 – Make the column nullable.
     */
    private void fixAttendanceRecordsStudentId() {
        try {
            // Check if the legacy FK still exists and drop it
            Integer fkCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS " +
                "WHERE TABLE_SCHEMA = DATABASE() " +
                "AND TABLE_NAME = 'attendance_records' " +
                "AND CONSTRAINT_NAME = 'FKb5ijilkgrgx66qn66iajdkyb9' " +
                "AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
                Integer.class);

            if (fkCount != null && fkCount > 0) {
                jdbc.execute("ALTER TABLE attendance_records DROP FOREIGN KEY FKb5ijilkgrgx66qn66iajdkyb9");
                log.info("[Migration] Dropped legacy FK FKb5ijilkgrgx66qn66iajdkyb9 from attendance_records.");
            }

            // Check if the column is still NOT NULL and fix it
            Integer notNullCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS " +
                "WHERE TABLE_SCHEMA = DATABASE() " +
                "AND TABLE_NAME = 'attendance_records' " +
                "AND COLUMN_NAME = 'student_id' " +
                "AND IS_NULLABLE = 'NO'",
                Integer.class);

            if (notNullCount != null && notNullCount > 0) {
                jdbc.execute("ALTER TABLE attendance_records MODIFY COLUMN student_id INT NULL");
                log.info("[Migration] Made attendance_records.student_id nullable.");
            }

        } catch (Exception e) {
            // Log but don't crash the application — migration might already be applied
            log.warn("[Migration] Could not apply attendance_records student_id migration: {}", e.getMessage());
        }
    }
}
