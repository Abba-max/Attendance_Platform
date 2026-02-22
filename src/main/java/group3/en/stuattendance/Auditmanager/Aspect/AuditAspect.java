package group3.en.stuattendance.Auditmanager.Aspect;

import group3.en.stuattendance.Auditmanager.Annotation.Auditable;
import group3.en.stuattendance.Auditmanager.Service.AuditlogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;

@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditlogService auditlogService;

    @AfterReturning(pointcut = "@annotation(auditable)", returning = "result")
    public void auditAction(JoinPoint joinPoint, Auditable auditable, Object result) {
        String username = getCurrentUsername();
        String userRole = getCurrentUserRole();
        String ipAddress = getClientIp();

        String action = auditable.action();
        String category = auditable.category();
        String severity = auditable.severity();
        String target = extractTarget(joinPoint);

        auditlogService.log(username, action, target, category, severity, userRole, ipAddress);
    }

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null) ? auth.getName() : "Anonymous";
    }

    private String getCurrentUserRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && !auth.getAuthorities().isEmpty()) {
            return auth.getAuthorities().iterator().next().getAuthority();
        }
        return "N/A";
    }

    private String getClientIp() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                return xForwardedFor.split(",")[0];
            }
            return request.getRemoteAddr();
        }
        return "Unknown";
    }

    private String extractTarget(JoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        if (args != null && args.length > 0) {
            // Heuristic: Use the first argument as target if it's a primitive or String,
            // or use its toString() if it's a simple DTO.
            Object firstArg = args[0];
            if (firstArg == null) return "N/A";
            String target = firstArg.toString();
            return target.length() > 255 ? target.substring(0, 252) + "..." : target;
        }
        return "N/A";
    }
}
