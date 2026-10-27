package com.all.quiz_service.Doa;

import com.all.quiz_service.model.ScheduledQuiz;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ScheduledQuizDao extends JpaRepository<ScheduledQuiz, Integer> {
    // "Available now" = current time falls between startTime and endTime inclusive.
    List<ScheduledQuiz> findByStartTimeLessThanEqualAndEndTimeGreaterThanEqual(LocalDateTime start, LocalDateTime end);
}