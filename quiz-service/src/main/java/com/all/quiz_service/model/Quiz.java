package com.all.quiz_service.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.List;
@Data
@Entity
public class Quiz {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String title;

    // Was previously received by createQuiz() but never actually saved here —
    // needed now as the authoritative source for quiz history (don't trust the
    // client's copy of difficulty at submit time).
    private String difficultyLevel;

    @ElementCollection
    @CollectionTable(
            name = "quiz_questions",
            joinColumns = @JoinColumn(name = "quiz_id")
    )
    @Column(name = "questions_id")
    private List<Integer> questionIds;


}