package com.lostandfound.backend.controller;

import com.lostandfound.backend.model.PasswordResetToken;
import com.lostandfound.backend.model.User;
import com.lostandfound.backend.repository.PasswordResetTokenRepository;
import com.lostandfound.backend.repository.UserRepository;
import com.lostandfound.backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class PasswordResetController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private EmailService emailService;

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");

        // Check if user exists
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No account found with this email"));
        }

        // Generate 6-digit OTP
        String otp = String.format("%06d", new Random().nextInt(999999));

        // Delete existing tokens for this email
        tokenRepository.deleteByEmail(email);

        // Save new token
        PasswordResetToken token = new PasswordResetToken(email, otp);
        tokenRepository.save(token);

        // Send OTP via email
        try {
            emailService.sendOtpEmail(email, otp);
            return ResponseEntity.ok(Map.of("message", "OTP sent to your email"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to send email: " + e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");

        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByEmailAndOtpAndUsedFalse(email, otp);

        if (tokenOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid OTP"));
        }

        PasswordResetToken token = tokenOpt.get();
        if (token.isExpired()) {
            return ResponseEntity.badRequest().body(Map.of("error", "OTP expired. Please request a new one."));
        }

        return ResponseEntity.ok(Map.of("message", "OTP verified successfully"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");

        // Verify OTP again
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByEmailAndOtpAndUsedFalse(email, otp);

        if (tokenOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid OTP"));
        }

        PasswordResetToken token = tokenOpt.get();
        if (token.isExpired()) {
            return ResponseEntity.badRequest().body(Map.of("error", "OTP expired"));
        }

        // Update password
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }

        User user = userOpt.get();
        user.setPassword(newPassword); // In production, hash this!
        userRepository.save(user);

        // Mark token as used
        token.setUsed(true);
        tokenRepository.save(token);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }
}
