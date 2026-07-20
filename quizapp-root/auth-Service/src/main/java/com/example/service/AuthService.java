package com.example.service;


import com.example.dao.UserDao;
import com.example.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserDao userDao;

    @Autowired
    private JwtService jwtService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public ResponseEntity<?> register(String username, String email, String password) {
        if (userDao.existsByUsername(username)) {
            return new ResponseEntity<>("Username already taken", HttpStatus.CONFLICT);
        }
        if (userDao.existsByEmail(email)) {
            return new ResponseEntity<>("Email already registered", HttpStatus.CONFLICT);
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password)); // always hash passwords!
        user.setRole("ROLE_USER");
        userDao.save(user);

        String token = jwtService.generateToken(username, "ROLE_USER");
        return new ResponseEntity<>(Map.of(
                "token", token,
                "username", username,
                "role", "ROLE_USER"
        ), HttpStatus.CREATED);
    }

    public ResponseEntity<?> login(String username, String password) {
        Optional<User> userOpt = userDao.findByUsername(username);

        if (userOpt.isEmpty()) {
            return new ResponseEntity<>("User not found", HttpStatus.UNAUTHORIZED);
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return new ResponseEntity<>("Invalid password", HttpStatus.UNAUTHORIZED);
        }

        String token = jwtService.generateToken(username, user.getRole());
        return new ResponseEntity<>(Map.of(
                "token", token,
                "username", username,
                "role", user.getRole()
        ), HttpStatus.OK);
    }

    // Called by gateway to validate token
    public ResponseEntity<?> validate(String token) {
        if (jwtService.isTokenValid(token)) {
            return new ResponseEntity<>(Map.of(
                    "valid", true,
                    "username", jwtService.extractUsername(token),
                    "role", jwtService.extractRole(token)
            ), HttpStatus.OK);
        }
        return new ResponseEntity<>(Map.of("valid", false), HttpStatus.UNAUTHORIZED);
    }
}
