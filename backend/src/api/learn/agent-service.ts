import { run } from '@openai/agents';
import { exerciseAgent } from '../../agents';
import { ExerciseResultType, ExerciseType } from '../../agents/exercise-agent/schemas';

export class LearnAgentService {
  async generateExercises(
    words: Array<{id: string, value: string, meaning: string}>, 
    context: string, 
    exerciseTypes: string[], 
    baseLanguage: string, 
    targetLanguage: string
  ): Promise<ExerciseType[]> {
    const wordsContext = words.map(w => `${w.value}: ${w.meaning}`).join('\n');
    const prompt = `Create learning exercises for these ${targetLanguage} vocabulary words for ${baseLanguage}-speaking learners:

${wordsContext}

Learning Context: "${context}"

Use these exercise types: ${exerciseTypes.join(', ')}
Create exactly ${words.length} exercises (one per word).`;
    
    const response = await run(exerciseAgent, prompt);
    const result = response.finalOutput as ExerciseResultType;
    return result.exercises;
  }
}

export const learnAgentService = new LearnAgentService();