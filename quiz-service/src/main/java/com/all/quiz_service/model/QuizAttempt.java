package com.all.quiz_service.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
public class QuizAttempt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String username;
    private String title;
    private String difficultyLevel;
    private Integer score;
    private Integer total;
    private LocalDateTime takenAt;
}