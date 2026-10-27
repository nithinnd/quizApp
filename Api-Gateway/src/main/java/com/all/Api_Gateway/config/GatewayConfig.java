package com.all.Api_Gateway.config;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.cloud.gateway.server.mvc.filter.LoadBalancerFilterFunctions;
import org.springframework.cloud.gateway.server.mvc.filter.BeforeFilterFunctions;
import org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions;
import org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.function.HandlerFilterFunction;
import org.springframework.web.servlet.function.RequestPredicates;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerRequest;
import org.springframework.web.servlet.function.ServerResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

@Configuration
public class GatewayConfig {

    // @LoadBalanced lets this RestTemplate resolve "AUTH-SERVICE" via Eureka,
    // the same way the lb() filter does for routing.
    @Bean
    @LoadBalanced
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

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

    // ── AUTH FILTER ──────────────────────────────────────────────────────────
    // Calls the existing AuthController#validate endpoint for every request to
    // a protected route. Pass requiredRole = null to just require "logged in,
    // any role"; pass a role string (e.g. "ROLE_ADMIN") to require that exact role.
    private HandlerFilterFunction<ServerResponse, ServerResponse> requireRole(String requiredRole, RestTemplate restTemplate) {
        return (request, next) -> {
            String authHeader = request.headers().firstHeader(HttpHeaders.AUTHORIZATION);
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ServerResponse.status(HttpStatus.UNAUTHORIZED).body("Missing or invalid Authorization header");
            }

            Map<?, ?> validation;
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.set(HttpHeaders.AUTHORIZATION, authHeader);
                HttpEntity<Void> entity = new HttpEntity<>(headers);
                var response = restTemplate.exchange(
                        "http://AUTH-SERVICE/auth/validate", HttpMethod.GET, entity, Map.class);
                validation = response.getBody();
            } catch (RestClientException e) {
                return ServerResponse.status(HttpStatus.UNAUTHORIZED).body("Token validation failed");
            }

            if (validation == null || !Boolean.TRUE.equals(validation.get("valid"))) {
                return ServerResponse.status(HttpStatus.UNAUTHORIZED).body("Invalid or expired token");
            }

            if (requiredRole != null && !requiredRole.equals(validation.get("role"))) {
                return ServerResponse.status(HttpStatus.FORBIDDEN).body("You don't have permission to do that");
            }

            // Forward identity downstream — quiz-service (and others) can trust
            // these headers because they only exist if this filter set them,
            // and nothing downstream is reachable without passing through here.
            ServerRequest forwarded = ServerRequest.create(
                    withIdentityHeaders(request.servletRequest(), Map.of(
                            "X-Username", String.valueOf(validation.get("username")),
                            "X-Role", String.valueOf(validation.get("role"))
                    )),
                    request.messageConverters(),
                    request.apiVersionStrategy());
            forwarded.attributes().putAll(request.attributes());

            return next.handle(forwarded);
        };
    }

    // ── ROUTES ────────────────────────────────────────────────────────────────
    // IMPORTANT: more specific routes (add/deleat) are registered as separate,
    // earlier beans so they take precedence over the general /question/** route.

    private HttpServletRequest withIdentityHeaders(HttpServletRequest request, Map<String, String> identityHeaders) {
        return new HttpServletRequestWrapper(request) {
            private String matchingHeader(String name) {
                return identityHeaders.keySet().stream()
                        .filter(key -> key.equalsIgnoreCase(name))
                        .findFirst()
                        .orElse(null);
            }

            @Override
            public String getHeader(String name) {
                if (HttpHeaders.TRANSFER_ENCODING.equalsIgnoreCase(name)) {
                    return null;
                }
                String key = matchingHeader(name);
                return key != null ? identityHeaders.get(key) : super.getHeader(name);
            }

            @Override
            public Enumeration<String> getHeaders(String name) {
                if (HttpHeaders.TRANSFER_ENCODING.equalsIgnoreCase(name)) {
                    return Collections.emptyEnumeration();
                }
                String key = matchingHeader(name);
                return key != null
                        ? Collections.enumeration(Collections.singleton(identityHeaders.get(key)))
                        : super.getHeaders(name);
            }

            @Override
            public Enumeration<String> getHeaderNames() {
                Set<String> names = new LinkedHashSet<>(Collections.list(super.getHeaderNames()));
                names.removeIf(HttpHeaders.TRANSFER_ENCODING::equalsIgnoreCase);
                names.addAll(identityHeaders.keySet());
                return Collections.enumeration(names);
            }
        };
    }

    @Bean
    public RouterFunction<ServerResponse> questionAdminRoute(RestTemplate restTemplate) {
        return GatewayRouterFunctions.route("QUESTION-SERVICE-ADMIN")
                .route(RequestPredicates.path("/question/add/**")
                                .or(RequestPredicates.path("/question/deleat/**")),
                        HandlerFunctions.http())
                .filter(requireRole("ROLE_ADMIN", restTemplate))
                .filter(LoadBalancerFilterFunctions.lb("QUESTION-SERVICE"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> questionServiceRoute(RestTemplate restTemplate) {
        // Any other /question/** call just needs to be logged in (any role) —
        // e.g. fetching questions to take a quiz.
        return GatewayRouterFunctions.route("QUESTION-SERVICE")
                .route(RequestPredicates.path("/question/**"),
                        HandlerFunctions.http())
                .filter(requireRole(null, restTemplate))
                .filter(LoadBalancerFilterFunctions.lb("QUESTION-SERVICE"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> scheduledQuizAdminRoute(RestTemplate restTemplate) {
        return GatewayRouterFunctions.route("QUIZ-SERVICE-SCHEDULED-ADMIN")
                .route(RequestPredicates.path("/quiz/scheduled/create"),
                        HandlerFunctions.http())
                .filter(requireRole("ROLE_ADMIN", restTemplate))
                .filter(LoadBalancerFilterFunctions.lb("QUIZ-SERVICE"))
                .build();
    }

    /*
     * HandlerFunctions.http() streams a downstream response. With the current
     * MVC gateway/HTTP client combination, quiz submissions fail after the quiz
     * service has completed them because its chunked response cannot be relayed.
     * Buffer the small score response instead, then return a normal JSON value.
     */
    private ServerResponse submitQuiz(ServerRequest request, RestTemplate restTemplate) throws Exception {
        String requestBody = request.body(String.class);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(request.headers().contentType().orElse(org.springframework.http.MediaType.APPLICATION_JSON));

        String username = request.headers().firstHeader("X-Username");
        String role = request.headers().firstHeader("X-Role");
        if (username != null) headers.set("X-Username", username);
        if (role != null) headers.set("X-Role", role);

        try {
            ResponseEntity<Integer> response = restTemplate.exchange(
                    "http://QUIZ-SERVICE" + request.path(),
                    HttpMethod.POST,
                    new HttpEntity<>(requestBody, headers),
                    Integer.class);
            return ServerResponse.status(response.getStatusCode())
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(response.getBody());
        } catch (RestClientException e) {
            return ServerResponse.status(HttpStatus.BAD_GATEWAY)
                    .body("Quiz service could not process the submission");
        }
    }

    @Bean
    public RouterFunction<ServerResponse> quizSubmissionRoute(RestTemplate restTemplate) {
        return GatewayRouterFunctions.route("QUIZ-SERVICE-SUBMIT")
                .route(RequestPredicates.POST("/quiz/submit/**")
                                .or(RequestPredicates.POST("/quiz/scheduled/{id}/submit")),
                        request -> submitQuiz(request, restTemplate))
                .filter(requireRole(null, restTemplate))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> quizServiceRoute(RestTemplate restTemplate) {
        return GatewayRouterFunctions.route("QUIZ-SERVICE")
                .route(RequestPredicates.path("/quiz/**"),
                        HandlerFunctions.http())
                // RestClient creates its own transfer encoding when it streams a
                // request body. Forwarding the browser's hop-by-hop value causes
                // an invalid duplicate "chunked" encoding on quiz submissions.
                .before(BeforeFilterFunctions.removeRequestHeader(HttpHeaders.TRANSFER_ENCODING))
                .filter(requireRole(null, restTemplate))
                .filter(LoadBalancerFilterFunctions.lb("QUIZ-SERVICE"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> authServiceRoute() {
        // Deliberately unprotected — this is where tokens are obtained in the
        // first place (login/register), so it can't require one.
        return GatewayRouterFunctions.route("AUTH-SERVICE")
                .route(RequestPredicates.path("/auth/**"),
                        HandlerFunctions.http())
                .filter(LoadBalancerFilterFunctions.lb("AUTH-SERVICE"))
                .build();
    }
}
