package com.all.quiz_service.Doa;

import com.all.quiz_service.model.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizAttemptDao extends JpaRepository<QuizAttempt, Integer> {
    List<QuizAttempt> findByUsernameOrderByTakenAtDesc(String username);
}