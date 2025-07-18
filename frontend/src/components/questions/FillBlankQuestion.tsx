import { 
  Text, 
  Input, 
  VStack 
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { Exercise, Question } from '../../types';

interface FillBlankQuestionProps {
  question: Exercise | Question;
  selectedAnswer: string;
  onAnswerChange: (answer: string) => void;
  isAnswered: boolean;
  isCorrect?: boolean | null;
}

export const FillBlankQuestion: React.FC<FillBlankQuestionProps> = ({
  question,
  selectedAnswer,
  onAnswerChange,
  isAnswered,
  isCorrect
}) => {
  const [fillBlankAnswer, setFillBlankAnswer] = useState('');

  // Reset local state when selectedAnswer changes (new question)
  useEffect(() => {
    setFillBlankAnswer(selectedAnswer || '');
  }, [selectedAnswer, question.word]);

  const handleFillBlankChange = (value: string) => {
    setFillBlankAnswer(value);
    onAnswerChange(value);
  };

  return (
    <VStack spacing={4} align="stretch">
      <Text fontSize={{ base: 'lg', md: 'xl' }} textAlign="center">
        {question.question}
      </Text>
      <Input
        value={fillBlankAnswer}
        onChange={(e) => handleFillBlankChange(e.target.value)}
        placeholder="Type your answer here..."
        size="lg"
        textAlign="center"
        bg="slate.700"
        border="2px"
        borderColor={isAnswered ? (isCorrect ? 'green.500' : 'red.500') : 'slate.600'}
        _hover={{ borderColor: isAnswered ? undefined : 'slate.500' }}
        _focus={{ borderColor: 'blue.500' }}
        isDisabled={isAnswered}
      />
      {isAnswered && !isCorrect && (
        <Text color="green.400" textAlign="center" fontSize="md">
          Correct answer: {question.correctAnswer}
        </Text>
      )}
    </VStack>
  );
};