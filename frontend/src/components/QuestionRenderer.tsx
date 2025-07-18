import { 
  Box, 
  Text,
  VStack,
  HStack,
  Button,
  Alert,
  AlertIcon,
  useColorModeValue,
  Collapse
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { FaLightbulb } from 'react-icons/fa';
import { Exercise, Question } from '../types';
import { 
  MultipleChoiceQuestion,
  FillBlankQuestion,
  TrueFalseQuestion,
  SentenceCompletionQuestion,
  MatchingQuestion
} from './questions';

const MotionBox = motion(Box);

interface QuestionRendererProps {
  question: Exercise | Question;
  selectedAnswer: string;
  onAnswerChange: (answer: string) => void;
  isAnswered: boolean;
  isCorrect?: boolean | null;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  selectedAnswer,
  onAnswerChange,
  isAnswered,
  isCorrect
}) => {
  const [showHint, setShowHint] = useState(false);
  
  // Reset hint state when question changes
  useEffect(() => {
    setShowHint(false);
  }, [question.word, question.question]); // Reset when question changes
  
  const hintBg = useColorModeValue('blue.50', 'blue.900');
  const hintColor = useColorModeValue('blue.700', 'blue.200');
  const feedbackBg = useColorModeValue('green.50', 'green.900');
  const feedbackColor = useColorModeValue('green.700', 'green.200');

  const renderQuestionComponent = () => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            question={question}
            selectedAnswer={selectedAnswer}
            onAnswerChange={onAnswerChange}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
          />
        );
      case 'fill_blank':
        return (
          <FillBlankQuestion
            question={question}
            selectedAnswer={selectedAnswer}
            onAnswerChange={onAnswerChange}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
          />
        );
      case 'true_false':
        return (
          <TrueFalseQuestion
            question={question}
            selectedAnswer={selectedAnswer}
            onAnswerChange={onAnswerChange}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
          />
        );
      case 'sentence_completion':
        return (
          <SentenceCompletionQuestion
            question={question}
            selectedAnswer={selectedAnswer}
            onAnswerChange={onAnswerChange}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
          />
        );
      case 'matching':
        return (
          <MatchingQuestion
            question={question}
            selectedAnswer={selectedAnswer}
            onAnswerChange={onAnswerChange}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
          />
        );
      default:
        return null;
    }
  };

  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <VStack spacing={4} align="stretch">
        {/* Question */}
        <Text 
          fontSize={{ base: 'xl', md: '2xl' }}
          textAlign="center"
          fontWeight="bold"
          bgGradient="linear(to-r, blue.200, purple.200)"
          bgClip="text"
        >
          {question.question}
        </Text>

        {/* Hint Button */}
        {question.hint && !isAnswered && (
          <HStack justify="center">
            <Button
              leftIcon={<FaLightbulb />}
              variant="outline"
              colorScheme="blue"
              size="sm"
              onClick={() => setShowHint(!showHint)}
            >
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </Button>
          </HStack>
        )}

        {/* Hint Display */}
        {question.hint && !isAnswered && (
          <Collapse in={showHint} animateOpacity>
            <Alert status="info" borderRadius="lg" bg={hintBg}>
              <AlertIcon />
              <Text color={hintColor} fontSize="sm">
                💡 {question.hint}
              </Text>
            </Alert>
          </Collapse>
        )}

        {/* Question Component */}
        {renderQuestionComponent()}

        {/* Feedback Display */}
        {question.feedback && isAnswered && isCorrect && (
          <Alert status="success" borderRadius="lg" bg={feedbackBg}>
            <AlertIcon />
            <Text color={feedbackColor} fontSize="sm">
              🎉 {question.feedback}
            </Text>
          </Alert>
        )}
      </VStack>
    </MotionBox>
  );
};