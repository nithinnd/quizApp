package com.all.quiz_service;

import com.all.quiz_service.model.QuestionWrapper;
import com.all.quiz_service.model.Responce;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient("QUESTION-SERVICE")

public interface QuizInterface {
    @GetMapping("question/generate")
    public ResponseEntity<List<Integer>> getQuestionForQuiz(@RequestParam String difficultyLevel, @RequestParam Integer num);

    @GetMapping("question/getQuestions")
    public ResponseEntity<List<QuestionWrapper>> getQuestions(@RequestParam List<Integer> id);
    @PostMapping("question/getScore")
    public ResponseEntity<Integer> getScore(@RequestBody List<Responce> response);

}

