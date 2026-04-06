package group3.en.stuattendance.SecurityManager;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Main endpoint for WebSocket connection
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Prefix for server-to-client messages
        // /topic for broadcasting, /queue for user-specific
        config.enableSimpleBroker("/topic", "/queue");
        
        // Prefix for client-to-server messages
        config.setApplicationDestinationPrefixes("/app");
        
        // Prefix for private user messages (Spring Security integration)
        config.setUserDestinationPrefix("/user");
    }
}
