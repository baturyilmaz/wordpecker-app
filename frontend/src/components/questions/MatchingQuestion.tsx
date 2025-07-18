import { 
  Text, 
  Button, 
  VStack, 
  Box,
  Stack,
  Grid,
  GridItem
} from '@chakra-ui/react';
import { useState, useEffect, useMemo } from 'react';
import { Exercise, Question } from '../../types';

interface MatchingQuestionProps {
  question: Exercise | Question;
  selectedAnswer: string;
  onAnswerChange: (answer: string) => void;
  isAnswered: boolean;
  isCorrect?: boolean | null;
}

export const MatchingQuestion: React.FC<MatchingQuestionProps> = ({
  question,
  selectedAnswer,
  onAnswerChange,
  isAnswered
}) => {
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>({});
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  // Shuffle function for randomizing arrays
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Clean function to remove labels like A., B., 1., 2., etc. from text
  const cleanText = (text: string): string => {
    return text
      .replace(/^[A-Za-z]\.\s*/, '') // Remove A., B., C., etc. at the beginning
      .replace(/^[0-9]+\.\s*/, '') // Remove 1., 2., 3., etc. at the beginning
      .replace(/^\([A-Za-z]\)\s*/, '') // Remove (A), (B), (C), etc. at the beginning
      .replace(/^\([0-9]+\)\s*/, '') // Remove (1), (2), (3), etc. at the beginning
      .replace(/^[A-Za-z]\)\s*/, '') // Remove A), B), C), etc. at the beginning
      .replace(/^[0-9]+\)\s*/, '') // Remove 1), 2), 3), etc. at the beginning
      .trim();
  };

  // Memoize shuffled arrays to prevent re-shuffling on every render
  const { shuffledWords, shuffledDefinitions } = useMemo(() => {
    if (!question.pairs || question.pairs.length === 0) {
      return { shuffledWords: [], shuffledDefinitions: [] };
    }
    
    const words = question.pairs.map(p => cleanText(p.word));
    const definitions = question.pairs.map(p => cleanText(p.definition));
    
    return {
      shuffledWords: shuffleArray(words),
      shuffledDefinitions: shuffleArray(definitions)
    };
  }, [question.pairs]);

  // Reset local state when selectedAnswer changes (new question)
  useEffect(() => {
    setSelectedWord(null); // Reset selected word
    if (!selectedAnswer) {
      setMatchingAnswers({});
    } else {
      const answers = selectedAnswer.split('|').reduce((acc, pair) => {
        const [word, definition] = pair.split(':');
        if (word && definition) acc[word] = definition;
        return acc;
      }, {} as Record<string, string>);
      setMatchingAnswers(answers);
    }
  }, [selectedAnswer, question.word]);

  const handleMatchingChange = (word: string, definition: string) => {
    const newAnswers = { ...matchingAnswers };
    
    // Remove any existing mapping for this definition
    Object.keys(newAnswers).forEach(key => {
      if (newAnswers[key] === definition) {
        delete newAnswers[key];
      }
    });
    
    // Add new mapping
    newAnswers[word] = definition;
    setMatchingAnswers(newAnswers);
    
    // Convert to string format for parent component
    const answerString = Object.entries(newAnswers)
      .map(([w, d]) => `${w}:${d}`)
      .join('|');
    onAnswerChange(answerString);
  };

  if (!question.pairs || question.pairs.length === 0) {
    return <Text>No matching pairs available</Text>;
  }

  return (
    <VStack spacing={4} align="stretch">
      <Text fontSize="lg" textAlign="center" mb={4}>
        Match each word with its definition:
      </Text>
      <Text fontSize="sm" color="gray.400" textAlign="center">
        Step 1: Click a word. Step 2: Click its matching definition.
      </Text>
      
      <Grid templateColumns="1fr 1fr" gap={6}>
        <GridItem>
          <Text fontWeight="bold" mb={3} color="blue.300">Words:</Text>
          <Stack spacing={2}>
            {shuffledWords.map((word) => {
              const isSelected = selectedWord === word;
              const isMatched = matchingAnswers[word];
              return (
                <Button
                  key={word}
                  variant={isSelected ? "solid" : "outline"}
                  size="md"
                  p={3}
                  bg={isMatched ? 'green.600' : isSelected ? 'blue.600' : 'slate.700'}
                  borderColor={isMatched ? 'green.500' : isSelected ? 'blue.500' : 'slate.600'}
                  color="white"
                  fontSize="md"
                  textAlign="center"
                  onClick={() => {
                    if (!isAnswered && !isMatched) {
                      setSelectedWord(isSelected ? null : word);
                    }
                  }}
                  isDisabled={isAnswered || !!isMatched}
                  _hover={{
                    bg: isAnswered || isMatched ? undefined : isSelected ? "blue.500" : "slate.600"
                  }}
                  cursor={isAnswered || isMatched ? "default" : "pointer"}
                >
                  {word}
                  {isMatched && " ✓"}
                </Button>
              );
            })}
          </Stack>
        </GridItem>
        
        <GridItem>
          <Text fontWeight="bold" mb={3} color="green.300">Definitions:</Text>
          <Stack spacing={2}>
            {shuffledDefinitions.map((definition) => {
              const isMatched = Object.values(matchingAnswers).includes(definition);
              const matchedWord = Object.keys(matchingAnswers).find(key => matchingAnswers[key] === definition);
              
              return (
                <Button
                  key={definition}
                  variant="outline"
                  size="md"
                  p={3}
                  whiteSpace="normal"
                  height="auto"
                  bg={isMatched ? 'green.600' : 'slate.700'}
                  borderColor={isMatched ? 'green.500' : 'slate.600'}
                  color="white"
                  onClick={() => {
                    if (selectedWord && !isAnswered && !isMatched) {
                      handleMatchingChange(selectedWord, definition);
                      setSelectedWord(null);
                    }
                  }}
                  isDisabled={isAnswered || isMatched || !selectedWord}
                  _hover={{
                    bg: isAnswered || isMatched || !selectedWord ? undefined : "slate.600"
                  }}
                  cursor={isAnswered || isMatched || !selectedWord ? "default" : "pointer"}
                >
                  <VStack spacing={1} align="stretch">
                    <Text fontSize="sm">{definition}</Text>
                    {isMatched && matchedWord && (
                      <Text fontSize="xs" color="green.200">
                        ✓ Matched with: {matchedWord}
                      </Text>
                    )}
                  </VStack>
                </Button>
              );
            })}
          </Stack>
        </GridItem>
      </Grid>
      
      {selectedWord && (
        <Box p={3} bg="blue.800" borderRadius="md" textAlign="center">
          <Text color="blue.200">
            Selected: <strong>{selectedWord}</strong> - Now click its definition →
          </Text>
        </Box>
      )}
      
      {isAnswered && (
        <Box mt={4} p={4} bg="slate.800" borderRadius="md">
          <Text fontWeight="bold" mb={2}>Correct matches:</Text>
          {question.pairs?.map((pair, idx) => (
            <Text key={idx} fontSize="sm" color="green.300">
              {pair.word} → {pair.definition}
            </Text>
          ))}
        </Box>
      )}
    </VStack>
  );
};