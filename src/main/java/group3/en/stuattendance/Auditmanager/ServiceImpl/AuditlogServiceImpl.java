package group3.en.stuattendance.Auditmanager.ServiceImpl;

import group3.en.stuattendance.Auditmanager.DTO.AuditlogDto;
import group3.en.stuattendance.Auditmanager.Mapper.AuditlogMapper;
import group3.en.stuattendance.Auditmanager.Model.Auditlog;
import group3.en.stuattendance.Auditmanager.Repository.AuditlogRepository;
import group3.en.stuattendance.Auditmanager.Service.AuditlogService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
//@RequiredArgsConstructor
public class AuditlogServiceImpl implements AuditlogService {

    // Manually declare the logger to avoid the @Slf4j name clash
    // with our log() method defined in AuditlogService
    private static final Logger logger =
            LoggerFactory.getLogger(AuditlogServiceImpl.class);

    private final AuditlogRepository auditlogRepository;
    private final AuditlogMapper auditlogMapper;

    public AuditlogServiceImpl(AuditlogRepository auditlogRepository, AuditlogMapper auditlogMapper) {
        this.auditlogRepository = auditlogRepository;
        this.auditlogMapper = auditlogMapper;
    }

    // ── Fetch & Search ────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<AuditlogDto> getLogs(String keyword,
                                     String severity,
                                     LocalDateTime start,
                                     LocalDateTime end,
                                     int page,
                                     int size) {

        // Normalize blank strings to null so JPQL IS NULL checks work correctly
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        String sev = (severity != null && !severity.isBlank()) ? severity.trim() : null;

        Pageable pageable = PageRequest.of(page, size);

        return auditlogRepository
                .searchWithFilters(kw, sev, start, end, pageable)
                .map(auditlogMapper::toDto);
    }

    // ── Logging ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void log(String username,
                    String action,
                    String target,
                    String category,
                    String severity,
                    String userRole,
                    String ipAddress) {

        Auditlog entry = Auditlog.builder()
                .username(username)
                .action(action)
                .target(target)
                .category(category)
                .severity(severity)
                .userRole(userRole)
                .ipAddress(ipAddress)
                .build();

        auditlogRepository.save(entry);

        // Using 'logger' instead of 'log' to avoid clash with our log() method
        logger.debug("Audit saved: [{}] ({}) {} -> {} on {}",
                category, severity, username, action, target);
    }

    @Override
    @Transactional
    public void log(String username,
                    String action,
                    String target,
                    String category,
                    String severity,
                    String userRole) {
        log(username, action, target, category, severity, userRole, "N/A");
    }

    // ── Export ────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<AuditlogDto> exportAll() {
        return auditlogMapper.toDtoList(
                auditlogRepository.findAllByOrderByTimestampDesc()
        );
    }

    // ── Statistics ────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public long countTodayLogs() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        return auditlogRepository.countTodayLogs(startOfDay);
    }
}