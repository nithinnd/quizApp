package com.all.quiz_service.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
public class ScheduledQuiz {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String title;
    private String difficultyLevel;

    // Fixed for everyone who takes this quiz, so scores are directly comparable.
    @ElementCollection
    @CollectionTable(
            name = "scheduled_quiz_questions",
            joinColumns = @JoinColumn(name = "scheduled_quiz_id")
    )
    @Column(name = "question_id")
    private List<Integer> questionIds;

    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String createdBy;
}