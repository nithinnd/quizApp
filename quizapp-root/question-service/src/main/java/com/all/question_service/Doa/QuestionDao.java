package com.all.question_service.Doa;


import com.all.question_service.model.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionDao extends JpaRepository<Question,Integer> {

    List<Question> findByDifficultyLevel(String difficultyLevel);

    @Query(value="SELECT q.id FROM question q WHERE q.difficulty_level=:difficultyLevel ORDER BY RANDOM() LIMIT :num",nativeQuery = true)
    List<Integer> findRandomQuestionsByDifficulty(String difficultyLevel, Integer num);

}
