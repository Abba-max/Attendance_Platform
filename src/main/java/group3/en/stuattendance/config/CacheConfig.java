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
 *  - courses          : changes with timetable edits — 10 min TTL
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
                        .expireAfterWrite(10, TimeUnit.MINUTES)
                        .build());

        return manager;
    }
}
