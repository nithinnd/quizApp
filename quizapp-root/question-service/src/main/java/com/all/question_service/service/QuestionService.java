package com.all.question_service.service;


import com.all.question_service.Doa.QuestionDao;
import com.all.question_service.model.Question;
import com.all.question_service.model.QuestionWrapper;
import com.all.question_service.model.Responce;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class QuestionService {
    @Autowired
    QuestionDao questionDao;
    public ResponseEntity<List<Question>> getAllQuestions() {
        try {
            return new ResponseEntity<>(questionDao.findAll(), HttpStatus.OK) ;

        }
        catch (Exception e){
            e.printStackTrace();
        }
        return new ResponseEntity<>(new ArrayList<>(), HttpStatus.BAD_REQUEST) ;

    }

    public ResponseEntity<List<Question>> getQuestionByDifficulty(String difficultyLevel) {
        try {
            return new ResponseEntity<>(questionDao.findByDifficultyLevel(difficultyLevel), HttpStatus.OK);
        }
        catch (Exception e){
            return new ResponseEntity<>(new ArrayList<>(), HttpStatus.BAD_REQUEST) ;
        }
    }

    public ResponseEntity<String> addQuestion(Question question){
       try {
           questionDao.save(question);
           return new ResponseEntity<>("Successfull", HttpStatus.CREATED);
       }
       catch (Exception e){
           return new ResponseEntity<>("Failed", HttpStatus.BAD_REQUEST);
       }

    }

    public String deleateQuestion(Integer id) {
        questionDao.deleteById(id);
        return "Successfully deleted" ;
    }


    public ResponseEntity<List<Integer>> getQuestionForQuiz(String difficultyLevel, Integer num) {


        List<Integer> questions= questionDao.findRandomQuestionsByDifficulty(difficultyLevel,num);
        return new ResponseEntity<>(questions, HttpStatus.OK);

    }

    public ResponseEntity<List<QuestionWrapper>> getQuestionsFromId(List<Integer> id) {
        List<QuestionWrapper> questionWrappers = new ArrayList<>();
        List<Question> questions = new ArrayList<>();
        for (Integer i : id) {
            questions.add(
                    questionDao.findById(i)
                            .orElseThrow(() -> new RuntimeException("Question not found: " + i))
            );

        }
        for (Question question : questions) {
            QuestionWrapper wrapper= new QuestionWrapper();
            wrapper.setId(question.getId());
            wrapper.setQuestion(question.getQuestion());
            wrapper.setOption1(question.getOption1());
            wrapper.setOption2(question.getOption2());
            wrapper.setOption3(question.getOption3());
            wrapper.setOption4(question.getOption4());
            questionWrappers.add(wrapper);
        }
        return new ResponseEntity<>(questionWrappers, HttpStatus.OK);
    }

    public ResponseEntity<Integer> getScore(List<Responce> responces) {

        int right=0;

        for (Responce responce : responces) {
            Question question = questionDao.findById(responce.getId()).get();
            if(responce.getResponse().equals(question.getAnswer())){
                right++;
            }

        }
        return new ResponseEntity<>(right,HttpStatus.OK);
    }
}
