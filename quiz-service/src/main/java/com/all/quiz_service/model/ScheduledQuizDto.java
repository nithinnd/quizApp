package com.all.quiz_service.model;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ScheduledQuizDto {
    private String title;
    private String difficultyLevel;
    private Integer numQuestions;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}