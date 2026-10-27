package com.all.quiz_service.controler;

import com.all.quiz_service.model.QuestionWrapper;
import com.all.quiz_service.model.QuizAttempt;
import com.all.quiz_service.model.QuizDto;
import com.all.quiz_service.model.Responce;
import com.all.quiz_service.service.QuizService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("quiz")
public class QuizControler {
    @Autowired
    QuizService quizService;

    @PostMapping("/create")
    public ResponseEntity<Integer> createquiz(@RequestBody QuizDto quizDto) { // data transfer object

        return quizService.createQuiz(quizDto.getDifficultyLevel(),quizDto.getNumQuestions(),quizDto.getTitle());
    }



    @GetMapping("getq/{id}")
    public ResponseEntity<List<QuestionWrapper>> getquizQuestions(@PathVariable Integer id ){
        return quizService.getQuizQuestions(id);
    }

    // Now takes quizId in the path so we can record which quiz this attempt
    // belongs to. X-Username is set by the gateway after JWT validation —
    // this service never needs to parse a token itself.
    @PostMapping("submit/{quizId}")
    public ResponseEntity<Integer> submitQuiz(@PathVariable Integer quizId,
                                              @RequestHeader(value = "X-Username", required = false) String username,
                                              @RequestBody List<Responce> responces){
        return quizService.calculateResult(quizId, username, responces);
    }

    @GetMapping("history")
    public ResponseEntity<List<QuizAttempt>> getHistory(@RequestHeader(value = "X-Username", required = false) String username){
        return quizService.getHistory(username);
    }

}