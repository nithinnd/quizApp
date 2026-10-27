package com.all.quiz_service.model;

import lombok.Data;

@Data
public class QuizDto {
    String difficultyLevel;
    Integer numQuestions;
    String title;
}
