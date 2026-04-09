package com.all.Api_Gateway.config;

import org.springframework.cloud.gateway.server.mvc.filter.LoadBalancerFilterFunctions;
import org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions;
import org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.function.RequestPredicates;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

@Configuration
public class GatewayConfig {

    // ── CORS ──────────────────────────────────────────────────────────────────
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins(
                                "http://localhost:5173",
                                "http://localhost:3000"
                        )
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }

    // ── ROUTES ────────────────────────────────────────────────────────────────
    // http() takes NO arguments in Gateway MVC
    // lb("SERVICE-NAME") filter resolves the service via Eureka

    @Bean
    public RouterFunction<ServerResponse> questionServiceRoute() {
        return GatewayRouterFunctions.route("QUESTION-SERVICE")
                .route(RequestPredicates.path("/question/**"),
                        HandlerFunctions.http())
                .filter(LoadBalancerFilterFunctions.lb("QUESTION-SERVICE"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> quizServiceRoute() {
        return GatewayRouterFunctions.route("QUIZ-SERVICE")
                .route(RequestPredicates.path("/quiz/**"),
                        HandlerFunctions.http())
                .filter(LoadBalancerFilterFunctions.lb("QUIZ-SERVICE"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> authServiceRoute() {
        return GatewayRouterFunctions.route("AUTH-SERVICE")
                .route(RequestPredicates.path("/auth/**"),
                        HandlerFunctions.http())
                .filter(LoadBalancerFilterFunctions.lb("AUTH-SERVICE"))
                .build();
    }
}
