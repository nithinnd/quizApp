package com.example.controler;


import com.example.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    // POST /auth/register
    // body: { "username": "john", "email": "john@email.com", "password": "secret" }
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        return authService.register(
                body.get("username"),
                body.get("email"),
                body.get("password")
        );
    }

    // POST /auth/login
    // body: { "username": "john", "password": "secret" }
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        return authService.login(
                body.get("username"),
                body.get("password")
        );
    }

    // GET /auth/validate
    // header: Authorization: Bearer <token>
    // Called internally by the gateway to validate every request
    @GetMapping("/validate")
    public ResponseEntity<?> validate(@RequestHeader(value = "Authorization", required = false) String authHeader) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("Invalid or missing Authorization header");
        }

        String token = authHeader.substring(7);

        if (token.isEmpty()) {
            return ResponseEntity.status(401).body("Token is missing");
        }

        return authService.validate(token);
    }
}
