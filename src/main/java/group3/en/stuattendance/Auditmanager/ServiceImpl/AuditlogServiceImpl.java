package group3.en.stuattendance.Auditmanager.Service.impl;

import group3.en.stuattendance.Auditmanager.DTO.AuditlogDto;
import group3.en.stuattendance.Auditmanager.Model.Auditlog;
import group3.en.stuattendance.Auditmanager.Repository.AuditlogRepository;
import group3.en.stuattendance.Auditmanager.Service.AuditlogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditlogServiceImpl implements AuditlogService {

    private final AuditlogRepository auditlogRepository;

    // ── Fetch & Search ────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<AuditlogDto> getLogs(String keyword,
                                     LocalDateTime start,
                                     LocalDateTime end,
                                     int page,
                                     int size) {

        // Normalize blank strings to null so JPQL IS NULL checks work correctly
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;

        Pageable pageable = PageRequest.of(page, size);

        return auditlogRepository
                .searchWithFilters(kw, start, end, pageable)
                .map(AuditlogDto::fromEntity);
    }

    // ── Logging ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void log(String username,
                    String action,
                    String target,
                    String category,
                    String ipAddress) {

        Auditlog entry = Auditlog.builder()
                .username(username)
                .action(action)
                .target(target)
                .category(category)
                .ipAddress(ipAddress)
                .build();

        auditlogRepository.save(entry);
        log.debug("Audit saved: [{}] {} -> {} on {}", category, username, action, target);
    }

    @Override
    @Transactional
    public void log(String username,
                    String action,
                    String target,
                    String category) {
        log(username, action, target, category, "N/A");
    }

    // ── Export ────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<AuditlogDto> exportAll() {
        return auditlogRepository.findAllByOrderByTimestampDesc()
                .stream()
                .map(AuditlogDto::fromEntity)
                .collect(Collectors.toList());
    }

    // ── Statistics ────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public long countTodayLogs() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        return auditlogRepository.countTodayLogs(startOfDay);
    }
}