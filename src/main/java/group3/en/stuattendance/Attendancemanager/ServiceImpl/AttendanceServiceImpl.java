package group3.en.stuattendance.Attendancemanager.ServiceImpl;

import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import group3.en.stuattendance.Attendancemanager.Mapper.AttendanceRecordMapper;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Attendancemanager.Repository.AttendanceRecordRepository;
import group3.en.stuattendance.Attendancemanager.Service.AttendanceService;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Repository.SessionRepository;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import group3.en.stuattendance.Auditmanager.Annotation.Auditable;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final AttendanceRecordMapper attendanceRecordMapper;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    private static java.time.LocalDateTime mockCurrentTime = null;

    public static void setMockCurrentTime(java.time.LocalDateTime time) {
        mockCurrentTime = time;
    }

    public static void resetMockCurrentTime() {
        mockCurrentTime = null;
    }

    private java.time.LocalDateTime getCurrentTime() {
        return mockCurrentTime != null ? mockCurrentTime : java.time.LocalDateTime.now();
    }

    public AttendanceServiceImpl(
            AttendanceRecordRepository attendanceRecordRepository,
            SessionRepository sessionRepository,
            UserRepository userRepository,
            AttendanceRecordMapper attendanceRecordMapper,
            org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate) {
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.attendanceRecordMapper = attendanceRecordMapper;
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    @Auditable(action = "ATTENDANCE_MARK", category = "ATTENDANCE", severity = "INFO")
    public AttendanceRecordDto markAttendance(AttendanceRecordDto dto) {
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + dto.getUserId()));
        Session session = sessionRepository.findById(dto.getSessionId())
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + dto.getSessionId()));

        AttendanceRecord record = resolveAttendanceRecord(user, session);

        record.setStatus(dto.getStatus());
        record.setTimestamp(getCurrentTime());
        record.setComments(dto.getComments());
        record.setVerifiedByTeacher(dto.getVerifiedByTeacher());

        // If teacher is verifying, set status to PRESENT if it wasn't set, or keep existing
        if (record.getStatus() == null) record.setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT);

        AttendanceRecord saved = attendanceRecordRepository.save(record);
        return attendanceRecordMapper.toDto(saved);
    }

    @Override
    public List<AttendanceRecordDto> getAttendanceBySession(Integer sessionId) {
        return attendanceRecordRepository.findBySession_SessionId(sessionId).stream()
                .map(attendanceRecordMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<group3.en.stuattendance.Attendancemanager.DTO.TeacherRollCallDto> getRollCallForSession(Integer sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        if (session.getClassroom() == null || session.getClassroom().getStudents() == null) {
            return java.util.Collections.emptyList();
        }

        // Fetch all existing attendance records for the session
        java.util.Map<Integer, AttendanceRecord> recordMap = attendanceRecordRepository.findBySession_SessionId(sessionId)
                .stream()
                .collect(Collectors.toMap(r -> r.getUser().getUserId(), r -> r));

        // Calculate total hours in session safely
        int totalHours = 1;
        if (session.getStartTime() != null && session.getEndTime() != null) {
            totalHours = Math.max(1, (int) java.time.Duration.between(session.getStartTime(), session.getEndTime()).toHours());
        }
        final int finalTotalHours = totalHours;

        java.util.Set<User> allStudents = new java.util.HashSet<>(session.getClassroom().getStudents());
        recordMap.values().forEach(r -> {
            if (r.getUser() != null) {
                allStudents.add(r.getUser());
            }
        });

        return allStudents.stream()
                .map(student -> {
                    AttendanceRecord record = recordMap.get(student.getUserId());

                    List<group3.en.stuattendance.Attendancemanager.DTO.AttendanceHourDto> hourDtoSlots =
                            (record != null && record.getHourSlots() != null) ?
                                    record.getHourSlots().stream()
                                            .map(h -> group3.en.stuattendance.Attendancemanager.DTO.AttendanceHourDto.builder()
                                                    .hourId(h.getHourId())
                                                    .hourIndex(h.getHourIndex())
                                                    .status(h.getStatus())
                                                    .verifiedByTeacher(h.getVerifiedByTeacher())
                                                    .timestamp(h.getTimestamp())
                                                    .build())
                                            .collect(Collectors.toList()) : new java.util.ArrayList<>();

                    return group3.en.stuattendance.Attendancemanager.DTO.TeacherRollCallDto.builder()
                            .userId(student.getUserId())
                            .firstName(student.getFirstName())
                            .lastName(student.getLastName())
                            .email(student.getEmail())
                            .matricule(student.getMatricule())
                            .attendanceId(record != null ? record.getAttendanceId() : null)
                            .status(record != null ? record.getStatus() : null)
                            .hoursAttended(record != null ? record.getHoursAttended() : 0)
                            .totalHours(finalTotalHours)
                            .hourSlots(hourDtoSlots)
                            .comments(record != null ? record.getComments() : null)
                            .isLive(record != null && (record.getQrValidated() || record.getGeoValidated() || record.getPinValidated()))
                            .build();
                })
                .sorted(java.util.Comparator.comparing(group3.en.stuattendance.Attendancemanager.DTO.TeacherRollCallDto::getLastName))
                .collect(Collectors.toList());
    }

    @Override
    public List<AttendanceRecordDto> getAttendanceByUser(Integer userId) {
        return attendanceRecordRepository.findByUser_UserId(userId).stream()
                .map(attendanceRecordMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public AttendanceRecordDto markTeacherPresence(Integer sessionId, Integer teacherId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new EntityNotFoundException("Teacher not found: " + teacherId));
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        // Create or update record for the teacher
        AttendanceRecord record = resolveAttendanceRecord(teacher, session);

        record.setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT);
        record.setTimestamp(getCurrentTime());
        record.setVerifiedByTeacher(true);
        record.setComments("Teacher self-marked presence.");

        AttendanceRecord saved = attendanceRecordRepository.save(record);
        return attendanceRecordMapper.toDto(saved);
    }

    @Override
    public void bulkMarkAbsent(Integer sessionId, List<Integer> studentIds, String comment) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        for (Integer studentId : studentIds) {
            User student = userRepository.findById(studentId)
                    .orElse(null);
            if (student == null) continue;

            AttendanceRecord record = resolveAttendanceRecord(student, session);

            record.setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT);
            record.setTimestamp(getCurrentTime());
            record.setComments(comment);
            record.setVerifiedByTeacher(true);

            attendanceRecordRepository.save(record);
        }
    }

    @Override
    public String generateSessionToken(Integer sessionId, String type) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        if (session.getAttendanceLaunchedAt() == null) {
            session.setAttendanceLaunchedAt(getCurrentTime());
        }

        if ("PIN".equalsIgnoreCase(type)) {
            String pin = String.format("%04d", (int) (Math.random() * 10000));
            session.setTempPin(pin);
            sessionRepository.save(session);
            return pin;
        } else {
            String oldQrCode = session.getQrCode();
            String qrToken = java.util.UUID.randomUUID().toString();
            if (oldQrCode != null) session.setPreviousQrCode(oldQrCode);
            session.setQrCode(qrToken);
            sessionRepository.save(session);
            return qrToken;
        }
    }

    @Override
    @Auditable(action = "STUDENT_CHECK_IN", category = "ATTENDANCE", severity = "INFO")
    public AttendanceRecordDto studentCheckIn(Integer sessionId, Integer userId, String qrCode, String pin, String location) {
        User student = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + userId));
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        if (session.getStatus() != group3.en.stuattendance.Timetablemanager.Enum.SessionStatus.IN_PROGRESS) {
            throw new IllegalStateException("Session is not currently in progress.");
        }

        // --- Geofence Check ---
        validateGeofence(student, location);

        AttendanceRecord record = resolveAttendanceRecord(student, session);

        // ── Validation: EITHER QR code OR PIN is required (not both) ──
        boolean qrValid = qrCode != null && !qrCode.isBlank()
                && (qrCode.equals(session.getQrCode()) || qrCode.equals(session.getPreviousQrCode()));
        boolean pinValid = pin != null && !pin.isBlank() && pin.equals(session.getTempPin());

        // Both provided → ambiguous, reject
        if (qrValid && pinValid) {
            throw new IllegalArgumentException("Veuillez utiliser soit le QR code soit le PIN, pas les deux.");
        }
        // Neither valid → reject
        if (!qrValid && !pinValid) {
            throw new IllegalArgumentException("QR code ou PIN invalide. Veuillez réessayer.");
        }

        if (qrValid) record.setQrValidated(true);
        if (pinValid) record.setPinValidated(true);
        record.setTimestamp(getCurrentTime());

        // Optional geo enrichment — does NOT affect validity
        if (location != null && !location.isBlank()) {
            record.setGeoValidated(true);
            record.setLocationAtCheckin(location);
        }

        // ── Mark hour slots PRESENT based on check-in timestamp and 15-minute deadlines ──
        java.time.LocalDateTime dtNow = getCurrentTime();
        java.time.LocalTime tNow = dtNow.toLocalTime();
        java.time.LocalTime sessionStart = session.getStartTime();
        java.time.LocalTime sessionEnd = session.getEndTime();

        int totalHours = 1;
        if (sessionStart != null && sessionEnd != null) {
            totalHours = (int) ChronoUnit.HOURS.between(sessionStart, sessionEnd);
        }
        if (totalHours < 1) totalHours = 1;

        // Step 1: Detect targeted slot index k
        int checkinSlotIndex = 0;
        if (sessionStart != null) {
            if (tNow.isBefore(sessionStart)) {
                // Early check-in targets the first slot
                checkinSlotIndex = 0;
            } else if (sessionEnd != null && (tNow.isAfter(sessionEnd) || tNow.equals(sessionEnd))) {
                // Late check-in targets the last slot
                checkinSlotIndex = totalHours - 1;
            } else {
                // In-class check-in: find the slot k where sessionStart + k <= tNow < sessionStart + k + 1
                for (int i = 0; i < totalHours; i++) {
                    java.time.LocalTime slotStart = sessionStart.plusHours(i);
                    java.time.LocalTime slotEnd = slotStart.plusHours(1);
                    if ((tNow.isAfter(slotStart) || tNow.equals(slotStart)) && tNow.isBefore(slotEnd)) {
                        checkinSlotIndex = i;
                        break;
                    }
                }
            }
        }

        // Step 2: Evaluate Deadline (Rule A) and Attendance Launch Grace Period (Rule B)
        boolean standardOnTime = true;
        boolean gracePeriodOnTime = false;

        if (sessionStart != null) {
            java.time.LocalTime slotStart = sessionStart.plusHours(checkinSlotIndex);
            java.time.LocalTime slotEnd = slotStart.plusHours(1);
            java.time.LocalTime slotDeadline = slotEnd.minusMinutes(15);

            // Rule A: Standard Deadline
            standardOnTime = tNow.isBefore(slotDeadline) || tNow.equals(slotDeadline);

            // Rule B: Teacher Attendance Launch Grace Period (+10m)
            java.time.LocalDateTime launchedAt = session.getAttendanceLaunchedAt();
            if (launchedAt != null) {
                java.time.LocalDateTime graceDeadline = launchedAt.plusMinutes(10);
                gracePeriodOnTime = dtNow.isBefore(graceDeadline) || dtNow.isEqual(graceDeadline);
            }
        }

        // Student is on-time for the active slot k if standard deadline OR grace period is satisfied
        boolean onTimeForActiveSlot = standardOnTime || gracePeriodOnTime;

        // Assign hour slots
        for (int i = 0; i < totalHours; i++) {
            group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus slotStatus;
            
            if (i < checkinSlotIndex) {
                // For preceding hours: 
                // If they checked in during the grace period of a late teacher launch, they get PRESENT for past hours.
                // Otherwise (they are just late), they get ABSENT for past hours.
                slotStatus = gracePeriodOnTime 
                        ? group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT 
                        : group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT;
            } else if (i == checkinSlotIndex) {
                // Active hour slot
                slotStatus = onTimeForActiveSlot 
                        ? group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT 
                        : group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT;
            } else {
                // Subsequent hours: Assume they stay for the rest of the session.
                slotStatus = group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT;
            }

            // Prevent downgrading a previously earned PRESENT status if the student re-scans later
            boolean shouldUpdate = true;
            if (record.getHourSlots() != null) {
                for (group3.en.stuattendance.Attendancemanager.Model.AttendanceHour h : record.getHourSlots()) {
                    if (h.getHourIndex() == i && h.getStatus() == group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT) {
                        shouldUpdate = false;
                        break;
                    }
                }
            }
            
            if (shouldUpdate) {
                updateHourSlot(record, i, slotStatus, false);
            }
        }

        updateRecordStatus(record);

        AttendanceRecord saved = attendanceRecordRepository.save(record);
        AttendanceRecordDto responseDto = attendanceRecordMapper.toDto(saved);
        // ── Real-time push to teacher's roll call ──
        messagingTemplate.convertAndSend("/topic/session/" + sessionId, responseDto);
        return responseDto;
    }

    @Override
    @Auditable(action = "TEACHER_VERIFY", category = "ATTENDANCE", severity = "INFO")
    public AttendanceRecordDto teacherVerify(Integer sessionId, Integer userId, Integer hourIndex) {
        User student = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + userId));
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        AttendanceRecord record = resolveAttendanceRecord(student, session);

        record.setVerifiedByTeacher(true);

        if (hourIndex != null) {
            updateHourSlot(record, hourIndex, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT, true);
        } else {
            int totalHours = 1;
            if (session.getStartTime() != null && session.getEndTime() != null) {
                totalHours = (int) ChronoUnit.HOURS.between(session.getStartTime(), session.getEndTime());
            }
            if (totalHours < 1) totalHours = 1;

            for (int i = 0; i < totalHours; i++) {
                updateHourSlot(record, i, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT, true);
            }
        }

        updateRecordStatus(record);

        AttendanceRecord saved = attendanceRecordRepository.save(record);
        AttendanceRecordDto responseDto = attendanceRecordMapper.toDto(saved);
        messagingTemplate.convertAndSend("/topic/session/" + sessionId, responseDto);
        return responseDto;
    }

    private void updateHourSlot(AttendanceRecord record, int hourIndex, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus status, boolean verified) {
        if (record.getHourSlots() == null) record.setHourSlots(new java.util.ArrayList<>());
        group3.en.stuattendance.Attendancemanager.Model.AttendanceHour hour = record.getHourSlots().stream()
                .filter(h -> h.getHourIndex() == hourIndex)
                .findFirst()
                .orElseGet(() -> {
                    group3.en.stuattendance.Attendancemanager.Model.AttendanceHour newHour = group3.en.stuattendance.Attendancemanager.Model.AttendanceHour.builder()
                            .attendanceRecord(record)
                            .hourIndex(hourIndex)
                            .status(status)
                            .verifiedByTeacher(verified)
                            .timestamp(getCurrentTime())
                            .build();
                    record.getHourSlots().add(newHour);
                    return newHour;
                });
        // Always update — ensures re-check-in works correctly
        hour.setStatus(status);
        hour.setVerifiedByTeacher(verified);
        hour.setTimestamp(getCurrentTime());
    }

    @Override
    public List<AttendanceRecordDto> getEnrollmentStatus(Integer sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        if (session.getClassroom() == null) {
            return getAttendanceBySession(sessionId);
        }

        List<User> classroomStudents = userRepository.findByClassroomClassIdAndRolesName(
                session.getClassroom().getClassId(), "STUDENT");

        return classroomStudents.stream()
                .map(student -> {
                    AttendanceRecord record = resolveAttendanceRecord(student, session);
                    if (record.getAttendanceId() != null) {
                        return attendanceRecordMapper.toDto(record);
                    } else {
                        return AttendanceRecordDto.builder()
                                .userId(student.getUserId())
                                .studentName(student.getFirstName() + " " + student.getLastName())
                                .studentMatricule(student.getMatricule())
                                .sessionId(sessionId)
                                .status(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT)
                                .build();
                    }
                })
                .collect(Collectors.toList());
    }

    private void updateRecordStatus(AttendanceRecord record) {
        if (record.getHourSlots() == null) record.setHourSlots(new java.util.ArrayList<>());

        long presentCount = record.getHourSlots().stream()
                .filter(h -> h != null && h.getStatus() == group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT)
                .count();
        long lateCount = record.getHourSlots().stream()
                .filter(h -> h != null && h.getStatus() == group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.LATE)
                .count();
        long excusedCount = record.getHourSlots().stream()
                .filter(h -> h != null && h.getStatus() == group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.EXCUSED)
                .count();

        record.setHoursAttended((int) (presentCount + lateCount));

        if (presentCount == 0 && lateCount == 0 && excusedCount == 0) {
            record.setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT);
        } else {
            // Keep existing non-absent status if already set (e.g. LATE), otherwise default to PRESENT
            if (record.getStatus() == group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.ABSENT || record.getStatus() == null) {
                record.setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT);
            }
            // If there are only excused slots, overall status becomes EXCUSED
            if (presentCount == 0 && lateCount == 0 && excusedCount > 0) {
                record.setStatus(group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.EXCUSED);
            }
        }
    }

    @Override
    @Auditable(action = "MARK_HOUR_STATUS", category = "ATTENDANCE", severity = "INFO")
    public void markHourStatus(Integer sessionId, Integer userId, Integer hourIndex, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus status) {
        User student = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + userId));
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        AttendanceRecord record = resolveAttendanceRecord(student, session);

        record.setVerifiedByTeacher(true);
        updateHourSlot(record, hourIndex, status, true);
        updateRecordStatus(record);

        attendanceRecordRepository.save(record);
    }

    @Override
    @Auditable(action = "MARK_SESSION_STATUS", category = "ATTENDANCE", severity = "INFO")
    public void markAllSessionStatus(Integer sessionId, group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus status) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));

        if (session.getClassroom() == null || session.getClassroom().getStudents() == null) return;

        int totalHours = 1;
        if (session.getStartTime() != null && session.getEndTime() != null) {
            totalHours = (int) java.time.Duration.between(session.getStartTime(), session.getEndTime()).toHours();
        }
        if (totalHours < 1) totalHours = 1;

        List<AttendanceRecord> recordsToSave = new ArrayList<>();
        for (User student : session.getClassroom().getStudents()) {
            AttendanceRecord record = resolveAttendanceRecord(student, session);

            if (record.getStatus() != status) {
                record.setStatus(status);
                record.setVerifiedByTeacher(true);
            }

            for (int i = 0; i < totalHours; i++) {
                updateHourSlot(record, i, status, true);
            }

            updateRecordStatus(record);
            recordsToSave.add(record);
        }

        if (!recordsToSave.isEmpty()) {
            attendanceRecordRepository.saveAll(recordsToSave);
        }
    }

    private AttendanceRecord resolveAttendanceRecord(User user, Session session) {
        List<AttendanceRecord> records = attendanceRecordRepository.findByUserAndSession(user, session);

        if (records.isEmpty()) {
            return AttendanceRecord.builder()
                    .user(user)
                    .session(session)
                    .hourSlots(new java.util.ArrayList<>())
                    .build();
        }

        if (records.size() == 1) {
            return records.get(0);
        }

        // Senior Dev Cleanup: We found duplicates! Keep the latest one.
        records.sort((a, b) -> {
            if (a.getAttendanceId() != null && b.getAttendanceId() != null) {
                return b.getAttendanceId().compareTo(a.getAttendanceId());
            }
            return 0;
        });

        AttendanceRecord latest = records.get(0);
        List<AttendanceRecord> toDelete = records.subList(1, records.size());

        // Atomic cleanup within the same transaction
        attendanceRecordRepository.deleteAll(toDelete);

        return latest;
    }
    private void validateGeofence(User student, String location) {
        group3.en.stuattendance.Institutionmanager.Model.Institution inst = student.getInstitution();
        
        // If student has no direct institution link, try through classroom hierarchy
        if (inst == null && student.getClassroom() != null 
            && student.getClassroom().getSpeciality() != null
            && student.getClassroom().getSpeciality().getDepartment() != null) {
            inst = student.getClassroom().getSpeciality().getDepartment().getInstitution();
        }

        if (inst == null || !Boolean.TRUE.equals(inst.getGeofencingEnabled()) || inst.getGeofenceData() == null || inst.getGeofenceData().isBlank()) {
            return;
        }

        if (location == null || location.isBlank()) {
            throw new IllegalArgumentException("Location services are required to check-in at " + inst.getName());
        }

        try {
            String[] parts = location.split(",");
            double lat = Double.parseDouble(parts[0]);
            double lng = Double.parseDouble(parts[1]);

            var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            double[][] polygon = mapper.readValue(inst.getGeofenceData(), double[][].class);

            if (polygon.length < 3) return;

            boolean isInside = isPointInPolygon(lat, lng, polygon);
            if (!isInside) {
                double minDistance = getMinDistanceToPolygon(lat, lng, polygon);
                if (minDistance > 20) { // 20m grace buffer
                    throw new IllegalArgumentException(String.format(
                        "Security Alert: You are outside the authorized campus perimeter (%.0fm away).", minDistance));
                }
            }
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            System.err.println("Geofence Data Error for " + inst.getName() + ": " + e.getMessage());
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            System.err.println("Unexpected Geofence Error: " + e.getMessage());
        }
    }

    private boolean isPointInPolygon(double x, double y, double[][] polygon) {
        boolean inside = false;
        for (int i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            double xi = polygon[i][0], yi = polygon[i][1];
            double xj = polygon[j][0], yj = polygon[j][1];
            boolean intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    private double getMinDistanceToPolygon(double lat, double lng, double[][] polygon) {
        double minDistance = Double.POSITIVE_INFINITY;
        for (int i = 0; i < polygon.length; i++) {
            double[] p1 = polygon[i];
            double[] p2 = polygon[(i + 1) % polygon.length];
            double dist = getDistanceToSegment(lat, lng, p1[0], p1[1], p2[0], p2[1]);
            if (dist < minDistance) minDistance = dist;
        }
        return minDistance;
    }

    private double getDistanceToSegment(double px, double py, double v1x, double v1y, double v2x, double v2y) {
        double l2 = dist2(v1x, v1y, v2x, v2y);
        if (l2 == 0) return Math.sqrt(dist2(px, py, v1x, v1y)) * 111320;
        double t = ((px - v1x) * (v2x - v1x) + (py - v1y) * (v2y - v1y)) / l2;
        t = Math.max(0, Math.min(1, t));
        double distDeg = Math.sqrt(dist2(px, py, v1x + t * (v2x - v1x), v1y + t * (v2y - v1y)));
        return distDeg * 111320;
    }

    private double dist2(double x1, double y1, double x2, double y2) {
        return Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
    }
}
