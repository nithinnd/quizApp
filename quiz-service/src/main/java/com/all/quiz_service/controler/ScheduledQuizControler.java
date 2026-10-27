package com.all.quiz_service.controler;

import com.all.quiz_service.model.QuestionWrapper;
import com.all.quiz_service.model.Responce;
import com.all.quiz_service.model.ScheduledQuiz;
import com.all.quiz_service.model.ScheduledQuizDto;
import com.all.quiz_service.service.ScheduledQuizService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("quiz/scheduled")
public class ScheduledQuizControler {

    @Autowired
    ScheduledQuizService scheduledQuizService;

    // Admin-only — enforced at the API Gateway (same pattern as question/add),
    // not here. This service trusts that only admins can reach this route.
    @PostMapping("/create")
    public ResponseEntity<Integer> create(@RequestBody ScheduledQuizDto dto,
                                          @RequestHeader(value = "X-Username", required = false) String username) {
        return scheduledQuizService.createScheduledQuiz(dto, username);
    }

    // Any logged-in user — only returns quizzes currently inside their time window.
    @GetMapping("/available")
    public ResponseEntity<List<ScheduledQuiz>> available() {
        return scheduledQuizService.getAvailable();
    }

    @GetMapping("/{id}/questions")
    public ResponseEntity<List<QuestionWrapper>> questions(@PathVariable Integer id) {
        return scheduledQuizService.getScheduledQuizQuestions(id);
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<Integer> submit(@PathVariable Integer id,
                                          @RequestHeader(value = "X-Username", required = false) String username,
                                          @RequestBody List<Responce> responses) {
        return scheduledQuizService.submitScheduledQuiz(id, username, responses);
    }
}