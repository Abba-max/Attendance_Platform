package group3.en.stuattendance.Usermanager.Authentication;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String username, Integer userId, String firstName, String lastName, Long activeAcademicYearId, java.util.List<Integer> assignedCourseIds) {
        return Jwts.builder()
                .setSubject(username)
                .claim("userId", userId)
                .claim("firstName", firstName)
                .claim("lastName", lastName)
                .claim("academicYearId", activeAcademicYearId)
                .claim("assignedCourseIds", assignedCourseIds)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.error("JWT expiré : {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("JWT non supporté : {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.error("JWT malformé : {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT vide : {}", e.getMessage());
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