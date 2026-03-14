package group3.en.stuattendance.Usermanager.Authentication;

import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Model.Permission;
import group3.en.stuattendance.Usermanager.Model.Role;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    // Original method kept for backward compatibility
    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // New method with full dashboard info
    public String generateToken(User user, Long academicYearId) {

        // Collect role names
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());

        // Collect effective permission names
        Set<Permission> allPermissions = user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .collect(Collectors.toSet());
        allPermissions.addAll(user.getAdditionalPermissions());
        Set<Integer> deniedIds = user.getDeniedPermissions().stream()
                .map(Permission::getPermissionId)
                .collect(Collectors.toSet());
        List<String> permissions = allPermissions.stream()
                .filter(p -> !deniedIds.contains(p.getPermissionId()))
                .map(Permission::getName)
                .collect(Collectors.toList());

        // Collect role ids
        List<Integer> roleIds = user.getRoles().stream()
                .map(Role::getRoleId)
                .collect(Collectors.toList());

        return Jwts.builder()
                .setSubject(user.getUsername())
                // User info
                .claim("userId", user.getUserId())
                .claim("email", user.getEmail())
                .claim("isActive", user.getIsActive())
                // Role info
                .claim("roles", roles)
                .claim("roleIds", roleIds)
                // Permission info
                .claim("permissions", permissions)
                // Academic year info
                .claim("academicYearId", academicYearId)
                // Classroom info
                .claim("classroomId", user.getClassroom() != null ? user.getClassroom().getClassId() : null)
                // Speciality level info
                .claim("level", user.getClassroom() != null ? user.getClassroom().getLevel() : null)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public Claims extractAllClaims(String token) {
        return parseClaims(token);
    }

    public Integer extractUserId(String token) {
        return parseClaims(token).get("userId", Integer.class);
    }

    public List<String> extractRoles(String token) {
        return parseClaims(token).get("roles", List.class);
    }

    public List<String> extractPermissions(String token) {
        return parseClaims(token).get("permissions", List.class);
    }

    public Long extractAcademicYearId(String token) {
        return parseClaims(token).get("academicYearId", Long.class);
    }

    public Integer extractClassroomId(String token) {
        return parseClaims(token).get("classroomId", Integer.class);
    }

    public Integer extractLevel(String token) {
        return parseClaims(token).get("level", Integer.class);
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            System.out.println("JWT expiré : " + e.getMessage());
        } catch (UnsupportedJwtException e) {
            System.out.println("JWT non supporté : " + e.getMessage());
        } catch (MalformedJwtException e) {
            System.out.println("JWT malformé : " + e.getMessage());
        } catch (IllegalArgumentException e) {
            System.out.println("JWT vide : " + e.getMessage());
        }
        return false;
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}