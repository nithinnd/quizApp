package com.all.question_service.model;

import jakarta.persistence.*;
import lombok.Data;


@Data
@Entity
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String question;
    private String answer;
    private String option1;
    private String option2;
    private String option3;
    private String option4;

    @Column(name = "difficulty_level")
    private String difficultyLevel;

}
