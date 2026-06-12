package group3.en.stuattendance.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * Exposes the uploads directory as a static resource under /uploads/**.
 * This allows browsers to fetch justification documents directly via URL.
 *
 * Security note: only authenticated users can reach the justification endpoints
 * that expose document URLs, so the upload path itself is not a public leak.
 */
@Configuration
public class FileServingConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Resolve the absolute path of the upload directory
        String absolutePath = Paths.get(uploadDir).toAbsolutePath().toUri().toString();

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(absolutePath)
                .setCachePeriod(0); // No cache — documents may change
    }
}
