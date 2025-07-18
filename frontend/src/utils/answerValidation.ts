import { Exercise, Question } from '../types';
import { apiService } from '../services/api';

export const validateAnswer = async (
  userAnswer: string, 
  question: Exercise | Question, 
  context?: string
): Promise<boolean> => {
  if (!userAnswer || !question.correctAnswer) return false;

  // Handle different question types
  switch (question.type) {
    case 'multiple_choice':
    case 'sentence_completion':
    case 'true_false':
      // Use option labels if available, fall back to correct answer
      if (question.optionLabels && question.options) {
        const answerIndex = question.options.indexOf(question.correctAnswer);
        const correctLabel = answerIndex >= 0 ? question.optionLabels[answerIndex] : question.correctAnswer;
        return userAnswer === correctLabel;
      }
      return userAnswer === question.correctAnswer;
    
    case 'matching':
      // For matching, parse and validate the pairs
      try {
        const userAnswers = userAnswer.split('|').reduce((acc, pair) => {
          const [word, definition] = pair.split(':');
          if (word && definition) acc[word] = definition;
          return acc;
        }, {} as Record<string, string>);
        
        const correctPairs = question.pairs || [];
        return correctPairs.every(pair => userAnswers[pair.word] === pair.definition);
      } catch (error) {
        console.error('Error validating matching answer:', error);
        return false;
      }
    
    case 'fill_blank':
      // Use backend LLM validation for fill-in-the-blank
      try {
        const result = await apiService.validateFillBlankAnswer(
          userAnswer,
          question.correctAnswer,
          question.question,
          context
        );
        return result.isValid;
      } catch (error) {
        console.error('Error validating fill-blank answer:', error);
        // Fallback to simple comparison
        return userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
      }
    
    default:
      return userAnswer === question.correctAnswer;
  }
};

export const isCorrectAnswer = (userAnswer: string, question: Exercise | Question): boolean => {
  if (!userAnswer || !question.correctAnswer) return false;

  // Use option labels if available, fall back to correct answer
  if (question.optionLabels && question.options) {
    const answerIndex = question.options.indexOf(question.correctAnswer);
    const correctLabel = answerIndex >= 0 ? question.optionLabels[answerIndex] : question.correctAnswer;
    return userAnswer === correctLabel;
  }
  return userAnswer === question.correctAnswer;
};