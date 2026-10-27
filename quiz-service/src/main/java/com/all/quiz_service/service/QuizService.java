package com.all.quiz_service.service;


import com.all.quiz_service.Doa.QuizAttemptDao;
import com.all.quiz_service.Doa.QuizDao;

import com.all.quiz_service.QuizInterface;
import com.all.quiz_service.model.QuestionWrapper;

import com.all.quiz_service.model.Quiz;
import com.all.quiz_service.model.QuizAttempt;
import com.all.quiz_service.model.Responce;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class QuizService {
    @Autowired
    QuizDao quizdao;
    @Autowired
    QuizAttemptDao quizAttemptDao;
    @Autowired
    QuizInterface quizInterface;


    public ResponseEntity<Integer> createQuiz(String difficultyLevel,Integer num,String title){
        List<Integer> questions=quizInterface.getQuestionForQuiz(difficultyLevel,num).getBody();
        Quiz quiz=new Quiz();
        quiz.setQuestionIds(questions);
        quiz.setTitle(title);
        quiz.setDifficultyLevel(difficultyLevel); // previously received but never saved
        Quiz savedquiz= quizdao.save(quiz);
        return new ResponseEntity<>(savedquiz.getId(),HttpStatus.OK);
    }

    public ResponseEntity<List<QuestionWrapper>> getQuizQuestions(Integer id) {
        Optional<Quiz> quiz = quizdao.findById(id);

        List<Integer> questionIds = quiz.get().getQuestionIds();
        System.out.println(questionIds);

        // ✅ Extract the body and wrap in a fresh ResponseEntity
        ResponseEntity<List<QuestionWrapper>> questions = quizInterface.getQuestions(questionIds);
        List<QuestionWrapper> body = new ArrayList<>(questions.getBody());

        return ResponseEntity.ok(body); // ✅ fresh response, no chunked encoding
    }

    // Submits a quiz attempt and records it in history (if we know who submitted it —
    // username comes from the gateway's X-Username header, set after JWT validation).
    public ResponseEntity<Integer> calculateResult(Integer quizId, String username, List<Responce> responses) {
        ResponseEntity<Integer> scoreResponse = quizInterface.getScore(responses);
        Integer score = scoreResponse.getBody();

        // History-saving is a side effect, not the core operation — if it fails for
        // any reason (missing table, bad data, etc.) the user should still get their
        // score rather than a 500. The exception is printed loudly so it's easy to
        // spot in the console instead of silently disappearing.
        if (username != null && quizId != null) {
            try {
                Optional<Quiz> quizOpt = quizdao.findById(quizId);
                if (quizOpt.isPresent()) {
                    Quiz quiz = quizOpt.get();
                    QuizAttempt attempt = new QuizAttempt();
                    attempt.setUsername(username);
                    attempt.setTitle(quiz.getTitle());
                    attempt.setDifficultyLevel(quiz.getDifficultyLevel());
                    attempt.setScore(score);
                    attempt.setTotal(quiz.getQuestionIds() != null ? quiz.getQuestionIds().size() : responses.size());
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

    public ResponseEntity<List<QuizAttempt>> getHistory(String username) {
        if (username == null) {
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
        }
        return ResponseEntity.ok(quizAttemptDao.findByUsernameOrderByTakenAtDesc(username));
    }

}