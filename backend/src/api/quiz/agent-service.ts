import { run } from '@openai/agents';
import { exerciseAgent } from '../../agents';
import { ExerciseResultType, ExerciseWithId } from '../../agents/exercise-agent/schemas';

export class QuizAgentService {
  async generateQuestions(
    words: Array<{id: string, value: string, meaning: string}>, 
    context: string, 
    questionTypes: string[]
  ): Promise<ExerciseWithId[]> {
    const wordsContext = words.map(w => `${w.value}: ${w.meaning}`).join('\n');
    const prompt = `Create quiz questions for these vocabulary words:

${wordsContext}

Learning Context: "${context}"

Use these question types: ${questionTypes.join(', ')}
Create exactly ${words.length} questions (one per word).`;
    
    const response = await run(exerciseAgent, prompt);
    const result = response.finalOutput as ExerciseResultType;
    
    // Map the returned exercises back to include word IDs
    const questionsWithIds = result.exercises.map(exercise => {
      const matchingWord = words.find(w => w.value === exercise.word);
      return {
        ...exercise,
        wordId: matchingWord?.id || null
      };
    });
    
    return questionsWithIds;
  }
}

export const quizAgentService = new QuizAgentService();