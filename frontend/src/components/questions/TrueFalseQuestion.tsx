import { 
  Text, 
  Radio, 
  RadioGroup, 
  Stack, 
  Flex 
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Exercise, Question } from '../../types';

const MotionFlex = motion(Flex);

interface TrueFalseQuestionProps {
  question: Exercise | Question;
  selectedAnswer: string;
  onAnswerChange: (answer: string) => void;
  isAnswered: boolean;
  isCorrect?: boolean | null;
}

export const TrueFalseQuestion: React.FC<TrueFalseQuestionProps> = ({
  question,
  selectedAnswer,
  onAnswerChange,
  isAnswered
}) => {
  const getBorderColor = (label: string) => {
    if (!isAnswered) return 'transparent';
    
    // Find the correct label for the correct answer
    const correctLabel = question.options && question.optionLabels 
      ? question.optionLabels[question.options.indexOf(question.correctAnswer)]
      : question.correctAnswer;
    
    if (label === correctLabel) return 'green.500';
    if (selectedAnswer === label && selectedAnswer !== correctLabel) return 'red.500';
    
    return 'transparent';
  };

  const getBackgroundColor = (label: string) => {
    if (!isAnswered) return 'slate.700';
    
    // Find the correct label for the correct answer
    const correctLabel = question.options && question.optionLabels 
      ? question.optionLabels[question.options.indexOf(question.correctAnswer)]
      : question.correctAnswer;
    
    if (label === correctLabel) return 'green.900';
    if (selectedAnswer === label && selectedAnswer !== correctLabel) return 'red.900';
    
    return 'slate.700';
  };

  // Use options and optionLabels if available, fall back to regular true/false for backward compatibility
  const optionsToRender = question.options && question.optionLabels
    ? question.options.map((option, index) => ({
        label: question.optionLabels![index],
        text: option
      }))
    : [
        { label: 'A', text: 'True' },
        { label: 'B', text: 'False' }
      ];

  return (
    <RadioGroup 
      value={selectedAnswer} 
      onChange={onAnswerChange} 
      isDisabled={isAnswered}
    >
      <Stack spacing={4}>
        {optionsToRender.map((option) => (
          <MotionFlex
            key={option.label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            w="100%"
          >
            <Radio
              value={option.label}
              size="lg"
              w="100%"
              p={4}
              borderWidth={2}
              borderRadius="lg"
              borderColor={getBorderColor(option.label)}
              bg={getBackgroundColor(option.label)}
              _hover={{
                bg: isAnswered ? undefined : "slate.600"
              }}
            >
              <Text ml={2} fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold">
                <Text as="span" fontWeight="bold" mr={2}>{option.label}.</Text>
                {option.text.toUpperCase()}
              </Text>
            </Radio>
          </MotionFlex>
        ))}
      </Stack>
    </RadioGroup>
  );
};