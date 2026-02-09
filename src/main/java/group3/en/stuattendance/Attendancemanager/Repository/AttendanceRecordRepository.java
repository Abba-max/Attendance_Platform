package group3.en.stuattendance.Attendancemanager.Repository;

import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Integer> {
}