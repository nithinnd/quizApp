package com.all.question_service.controler;


import com.all.question_service.model.Question;
import com.all.question_service.model.QuestionWrapper;
import com.all.question_service.model.Responce;
import com.all.question_service.service.QuestionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("question/")
public class QuestionControler {

    @Autowired
    QuestionService questionService;

    @RequestMapping("allq")
    public ResponseEntity<List<Question>> getAllQuestions(){
    return questionService.getAllQuestions() ;
    }

    @GetMapping("category/{difficultyLevel}")
    public ResponseEntity<List<Question>> getQuestionByDifficulty(@PathVariable String difficultyLevel){
        return questionService.getQuestionByDifficulty(difficultyLevel);
    }

    @PostMapping("add/")
    public ResponseEntity<String> addQuestion(@RequestBody Question question){
        return questionService.addQuestion(question);
    }

    @DeleteMapping("deleat/{id}")
    public String deleteQuestion(@PathVariable Integer id){

        return questionService.deleateQuestion(id);
    }

    @GetMapping("generate")
    public ResponseEntity<List<Integer>> getQuestionForQuiz(@RequestParam String difficultyLevel,@RequestParam Integer num){
        return questionService.getQuestionForQuiz(difficultyLevel,num);

    }

    @GetMapping("getQuestions")
    public ResponseEntity<List<QuestionWrapper>> getQuestions(@RequestParam List<Integer> id){
        return questionService.getQuestionsFromId(id);
    }

    @PostMapping("getScore")
    public ResponseEntity<Integer> getScore(@RequestBody List<Responce> responce){
     return questionService.getScore(responce);
    }


}
