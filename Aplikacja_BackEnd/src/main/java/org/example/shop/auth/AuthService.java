package org.example.shop.auth;

import org.example.shop.user.User;
import org.example.shop.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
        this.authenticationManager = authenticationManager;
    }

    public ResponseEntity<?> register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest()
                    .body(new AuthResponse(null, null, null, "Email already registered!"));
        }

        String hashedPassword = passwordEncoder.encode(request.getPassword());

        User user = new User(
                request.getUsername(),
                request.getEmail(),
                hashedPassword
        );

        userRepository.save(user);

        // Generate a simple token (in production use JWT)
        String token = generateToken();

        return ResponseEntity.ok()
                .body(new AuthResponse(token, user.getUsername(), user.getEmail(),
                        "User registered successfully!"));
    }

    public ResponseEntity<?> login(LoginRequest request) {
        try {
            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            // Get user details
            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Generate token
            String token = generateToken();

            return ResponseEntity.ok()
                    .body(new AuthResponse(token, user.getUsername(), user.getEmail(),
                            "Login successful!"));

        } catch (AuthenticationException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthResponse(null, null, null, "Invalid email or password!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new AuthResponse(null, null, null, "Login failed: " + e.getMessage()));
        }
    }

    private String generateToken() {
        // Simple token generation - in production use JWT
        return UUID.randomUUID().toString();
    }
}