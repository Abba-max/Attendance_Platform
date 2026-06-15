package group3.en.stuattendance.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Caffeine in-memory cache configuration.
 *
 * Cache strategy per region:
 *  - dashboardStats   : heavy aggregate counts (students, staff, dept) — 5 min TTL, evicted on mutation
 *  - classrooms       : rarely changed reference data — 30 min TTL
 *  - specialities     : rarely changed reference data — 30 min TTL
 *  - departments      : rarely changed reference data — 30 min TTL
 *  - academicYears    : rarely changed, loaded at startup — 60 min TTL
 *  - courses          : changes with timetable edits — 12 hours TTL, evicted on mutation
 *  - users            : individual user DTO lookups — 12 hours TTL, evicted on mutation
 *  - staff            : all-staff list — 12 hours TTL, evicted on any staff mutation
 *  - students         : per-classroom student lists — 12 hours TTL, evicted on student mutation
 *  - sessions         : session lookups by id/course/teacher/week — 30 min TTL, evicted on start/end/cancel/create/update/delete
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();

        // Heavy dashboard stats — evicted by @CacheEvict on any user/classroom mutation
        manager.registerCustomCache("dashboardStats",
                Caffeine.newBuilder()
                        .maximumSize(50)
                        .expireAfterWrite(5, TimeUnit.MINUTES)
                        .recordStats()
                        .build());

        // Reference data — changes infrequently
        manager.registerCustomCache("classrooms",
                Caffeine.newBuilder()
                        .maximumSize(200)
                        .expireAfterWrite(30, TimeUnit.MINUTES)
                        .build());

        manager.registerCustomCache("specialities",
                Caffeine.newBuilder()
                        .maximumSize(100)
                        .expireAfterWrite(30, TimeUnit.MINUTES)
                        .build());

        manager.registerCustomCache("departments",
                Caffeine.newBuilder()
                        .maximumSize(50)
                        .expireAfterWrite(30, TimeUnit.MINUTES)
                        .build());

        manager.registerCustomCache("academicYears",
                Caffeine.newBuilder()
                        .maximumSize(20)
                        .expireAfterWrite(60, TimeUnit.MINUTES)
                        .build());

        manager.registerCustomCache("courses",
                Caffeine.newBuilder()
                        .maximumSize(500)
                        .expireAfterWrite(12, TimeUnit.HOURS)
                        .build());

        // User data — evicted on any create/update/delete
        manager.registerCustomCache("users",
                Caffeine.newBuilder()
                        .maximumSize(1000)
                        .expireAfterWrite(12, TimeUnit.HOURS)
                        .build());

        manager.registerCustomCache("staff",
                Caffeine.newBuilder()
                        .maximumSize(500)
                        .expireAfterWrite(12, TimeUnit.HOURS)
                        .build());

        manager.registerCustomCache("students",
                Caffeine.newBuilder()
                        .maximumSize(2000)
                        .expireAfterWrite(12, TimeUnit.HOURS)
                        .build());

        // Sessions — short TTL since status changes frequently; also evicted on mutations
        manager.registerCustomCache("sessions",
                Caffeine.newBuilder()
                        .maximumSize(5000)
                        .expireAfterWrite(30, TimeUnit.MINUTES)
                        .build());

        return manager;
    }
}
