package com.all.quiz_service.service;

import com.all.quiz_service.Doa.QuizAttemptDao;
import com.all.quiz_service.Doa.ScheduledQuizDao;
import com.all.quiz_service.QuizInterface;
import com.all.quiz_service.model.QuestionWrapper;
import com.all.quiz_service.model.QuizAttempt;
import com.all.quiz_service.model.Responce;
import com.all.quiz_service.model.ScheduledQuiz;
import com.all.quiz_service.model.ScheduledQuizDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ScheduledQuizService {

    @Autowired
    ScheduledQuizDao scheduledQuizDao;
    @Autowired
    QuizAttemptDao quizAttemptDao;
    @Autowired
    QuizInterface quizInterface;

    // Role is already enforced at the gateway (ROLE_ADMIN required on this
    // route) — createdBy here is just for record-keeping, not an auth check.
    public ResponseEntity<Integer> createScheduledQuiz(ScheduledQuizDto dto, String createdBy) {
        List<Integer> questionIds = quizInterface.getQuestionForQuiz(dto.getDifficultyLevel(), dto.getNumQuestions()).getBody();

        ScheduledQuiz sq = new ScheduledQuiz();
        sq.setTitle(dto.getTitle());
        sq.setDifficultyLevel(dto.getDifficultyLevel());
        sq.setQuestionIds(questionIds);
        sq.setStartTime(dto.getStartTime());
        sq.setEndTime(dto.getEndTime());
        sq.setCreatedBy(createdBy);

        ScheduledQuiz saved = scheduledQuizDao.save(sq);
        return new ResponseEntity<>(saved.getId(), HttpStatus.CREATED);
    }

    public ResponseEntity<List<ScheduledQuiz>> getAvailable() {
        LocalDateTime now = LocalDateTime.now();
        return ResponseEntity.ok(
                scheduledQuizDao.findByStartTimeLessThanEqualAndEndTimeGreaterThanEqual(now, now));
    }

    public ResponseEntity<List<QuestionWrapper>> getScheduledQuizQuestions(Integer id) {
        Optional<ScheduledQuiz> sqOpt = scheduledQuizDao.findById(id);
        if (sqOpt.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        ScheduledQuiz sq = sqOpt.get();
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(sq.getStartTime()) || now.isAfter(sq.getEndTime())) {
            // Outside its active window — don't hand out questions early or late.
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }

        ResponseEntity<List<QuestionWrapper>> questions = quizInterface.getQuestions(sq.getQuestionIds());
        List<QuestionWrapper> body = new ArrayList<>(questions.getBody());
        return ResponseEntity.ok(body);
    }

    public ResponseEntity<Integer> submitScheduledQuiz(Integer id, String username, List<Responce> responses) {
        ResponseEntity<Integer> scoreResponse = quizInterface.getScore(responses);
        Integer score = scoreResponse.getBody();

        if (username != null) {
            try {
                Optional<ScheduledQuiz> sqOpt = scheduledQuizDao.findById(id);
                if (sqOpt.isPresent()) {
                    ScheduledQuiz sq = sqOpt.get();
                    QuizAttempt attempt = new QuizAttempt();
                    attempt.setUsername(username);
                    attempt.setTitle(sq.getTitle() + " (Scheduled)");
                    attempt.setDifficultyLevel(sq.getDifficultyLevel());
                    attempt.setScore(score);
                    attempt.setTotal(sq.getQuestionIds() != null ? sq.getQuestionIds().size() : responses.size());
                    attempt.setTakenAt(LocalDateTime.now());
                    quizAttemptDao.save(attempt);
                }
            } catch (Exception e) {
                System.out.println("!!!!!!!!!! FAILED TO SAVE QUIZ HISTORY !!!!!!!!!!");
                e.printStackTrace();
            }
        }

        return scoreResponse;
    }
}