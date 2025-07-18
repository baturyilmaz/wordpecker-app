import { 
  Box, 
  Button, 
  Text, 
  Flex, 
  Progress, 
  HStack, 
  Badge, 
  IconButton,
  useToast,
  Spinner,
  Center,
  VStack,
  Divider,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Icon,
  useColorModeValue
} from '@chakra-ui/react';
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Question, WordList } from '../types';
import { ArrowBackIcon, CloseIcon, CheckCircleIcon, InfoIcon, StarIcon } from '@chakra-ui/icons';
import { apiService } from '../services/api';
import { QuestionRenderer } from '../components/QuestionRenderer';
import { SessionService } from '../services/sessionService';
import { validateAnswer } from '../utils/answerValidation';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};


const MotionBox = motion(Box);

export const Quiz = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation();
  const toast = useToast();
  const hasInitializedRef = useRef(false);
  const isMountedRef = useRef(false);
  
  const [list] = useState<WordList | null>(state?.list || null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [lives, setLives] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [sessionService, setSessionService] = useState<SessionService | null>(null);
  const [sessionProgress, setSessionProgress] = useState<any>(null);
  const [gameOver, setGameOver] = useState(false);
  const [quizResults, setQuizResults] = useState<Array<{wordId: string, correct: boolean}>>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [actualCorrectness, setActualCorrectness] = useState<boolean | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);

  useEffect(() => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    const initQuiz = async () => {
      if (!id || !list || hasInitializedRef.current) return;
      
      try {
        setIsLoading(true);
        
        // Start quiz session
        const response = await apiService.startQuiz(id);
        if (response && response.questions && response.total_questions) {
          setQuestions(response.questions);
          setTotalQuestions(response.total_questions);
          const service = new SessionService(response.questions);
          setSessionService(service);
          setSessionProgress(service.getCurrentProgress());
          hasInitializedRef.current = true;
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error: any) {
        console.error('Error initializing quiz:', error);
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to start quiz',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate(`/lists/${id}`);
      } finally {
        setIsLoading(false);
      }
    };

    initQuiz();
  }, [id, navigate, toast]);
  
  const updateLearnedPoints = async () => {
    if (!id || quizResults.length === 0) {
      navigate(`/lists/${id}`);
      return;
    }
    
    setIsUpdatingPoints(true);
    try {
      await apiService.updateLearnedPoints(id, quizResults);
      toast({
        title: 'Progress Saved!',
        description: `Updated learning progress for ${quizResults.length} words`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error updating learned points:', error);
      toast({
        title: 'Progress Save Failed',
        description: 'Your quiz results were recorded but progress update failed',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingPoints(false);
      navigate(`/lists/${id}`);
    }
  };

  const loadMoreQuestions = async () => {
    if (!id || !questions.length) return false;
    
    setIsLoading(true);
    try {
      const response = await apiService.getQuestions(id);
      
      if (response && response.questions && response.questions.length > 0) {
        setQuestions(prev => [...prev, ...response.questions]);
        setIsCompleted(false);
        setCurrentQuestion(questions.length);
        setSelectedAnswer('');
        setIsAnswered(false);
        setActualCorrectness(null);
        return !response.completed;
      }
      return false;
    } catch (error: any) {
      console.error('Error loading more questions:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load more questions',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async () => {
    if (isValidating) return; // Prevent multiple submissions
    
    setIsValidating(true);
    const question = questions[currentQuestion];
    
    try {
      let isValid = false;
      
      // Use async validation for all question types for consistency
      isValid = await validateAnswer(selectedAnswer, question, list?.context);
      
      // Store the actual correctness for UI display
      setActualCorrectness(isValid);
      setIsAnswered(true);
      
      if (sessionService) {
        // Use the actual validation result
        sessionService.answerQuestion(selectedAnswer, question, isValid);
        setSessionProgress(sessionService.getCurrentProgress());
        
        // Track quiz results for learnedPoint updates
        setQuizResults(prev => [...prev, {
          wordId: question.wordId || question.word,
          correct: isValid
        }]);
        
        if (!isValid) {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameOver(true);
            }
            return newLives;
          });
        }
      }
    } catch (error) {
      console.error('Error validating answer:', error);
      // Fallback to session service validation
      if (sessionService) {
        const fallbackCorrect = sessionService.answerQuestion(selectedAnswer, question);
        setActualCorrectness(fallbackCorrect);
        setIsAnswered(true);
        setSessionProgress(sessionService.getCurrentProgress());
        
        // Track quiz results for learnedPoint updates
        setQuizResults(prev => [...prev, {
          wordId: question.wordId || question.word,
          correct: fallbackCorrect
        }]);
        
        if (!fallbackCorrect) {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameOver(true);
            }
            return newLives;
          });
        }
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleNext = async () => {
    if (gameOver) {
      setIsCompleted(true);
      if (sessionService) {
        sessionService.completeSession();
      }
      return;
    }
    
    const isLastQuestion = currentQuestion === questions.length - 1;
    if (isLastQuestion && currentQuestion + 1 < totalQuestions) {
      // Load more questions before proceeding
      setIsLoading(true);
      const hasMoreQuestions = await loadMoreQuestions();
      if (!hasMoreQuestions && currentQuestion + 1 >= questions.length) {
        setIsCompleted(true);
        if (sessionService) {
          sessionService.completeSession();
        }
        return;
      }
    }
    
    if (currentQuestion + 1 >= totalQuestions) {
      setIsCompleted(true);
      if (sessionService) {
        sessionService.completeSession();
      }
      return;
    }
    
    if (sessionService) {
      sessionService.nextQuestion();
      setSessionProgress(sessionService.getCurrentProgress());
    }
    
    setCurrentQuestion(prev => prev + 1);
    setSelectedAnswer('');
    setIsAnswered(false);
    setActualCorrectness(null); // Reset validation result
  };

  if (isLoading) {
    return (
      <Center h="calc(100vh - 64px)">
        <Spinner size="xl" color="purple.400" thickness="4px" />
      </Center>
    );
  }

  if (!list || !questions.length) {
    return (
      <Box textAlign="center" py={10}>
        <Text mb={4}>No questions available</Text>
        <Link to="/lists">
          <Button variant="solid">Back to Lists</Button>
        </Link>
      </Box>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;
  const combo = sessionProgress?.stats.streak || 0;
  const score = sessionProgress?.stats.score || 0;

  return (
    <MotionBox
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      transition={{ duration: 0.5 }}
      p={4}
    >
      <Flex mb={4}>
        <IconButton
          aria-label="Go back"
          icon={<ArrowBackIcon />}
          variant="ghost"
          onClick={() => navigate(-1)}
          size="lg"
        />
      </Flex>

      <Flex 
        justify="space-between" 
        align="center" 
        mb={6}
        direction={{ base: 'column', md: 'row' }}
        gap={4}
      >
        <Box>
          <Text 
            textStyle="h1"
            color="white"
            fontSize={{ base: '3xl', md: '4xl' }}
          >
            Quiz: {list.name}
          </Text>
          <HStack spacing={4} mt={2} flexWrap="wrap" justify={{ base: 'center', md: 'flex-start' }}>
            <Badge 
              colorScheme="purple" 
              p={2} 
              borderRadius="full"
              style={combo > 2 ? { animation: 'sparkle 1s ease infinite' } : undefined}
            >
              ⚡ Combo x{combo}
            </Badge>
            <Badge 
              colorScheme="yellow" 
              p={2} 
              borderRadius="full"
              style={score > 0 ? { animation: 'bounce 1s ease infinite' } : undefined}
            >
              🏆 Score: {score}
            </Badge>
            <Badge 
              colorScheme="red" 
              p={2} 
              borderRadius="full"
            >
              {"❤️".repeat(Math.max(0, lives))}
            </Badge>
          </HStack>
        </Box>
        <Link to={`/lists/${id}`}>
          <IconButton
            aria-label="Exit"
            icon={<CloseIcon />}
            variant="ghost"
            size="lg"
          />
        </Link>
      </Flex>

      <Progress 
        value={progress} 
        mb={8} 
        rounded="full" 
        size="sm"
        colorScheme="purple"
        hasStripe
        isAnimated
      />

      <MotionBox
        layerStyle="card"
        maxW="800px"
        mx="auto"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        boxShadow="2xl"
        borderWidth="1px"
        borderColor="purple.800"
        px={{ base: 4, md: 8 }}
        py={6}
      >
        <QuestionRenderer
          question={question}
          selectedAnswer={selectedAnswer}
          onAnswerChange={setSelectedAnswer}
          isAnswered={isAnswered}
          isCorrect={actualCorrectness}
        />

        {isAnswered && (
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            mt={6}
            p={4}
            bg={actualCorrectness ? 'purple.900' : 'red.900'}
            borderRadius="lg"
            textAlign="center"
          >
            <Text color="white" fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold">
              {actualCorrectness
                ? `🎉 Correct! ${combo > 2 ? '⚡ Perfect combo!' : combo > 1 ? '⚡ Great combo!' : ''}`
                : '❌ Incorrect. Try again!'}
            </Text>
            
            {(gameOver || currentQuestion + 1 >= totalQuestions) && sessionService && (
              <VStack mt={4} spacing={2}>
                <Divider />
                <Text color="white" fontSize="lg" fontWeight="bold">
                  {gameOver ? '💀 Game Over!' : '🎊 Quiz Complete!'}
                </Text>
                <HStack spacing={4}>
                  <Text color="green.500">✅ Correct: {sessionProgress?.stats.correct}</Text>
                  <Text color="red.300">❌ Incorrect: {sessionProgress?.stats.incorrect}</Text>
                  <Text color="purple.300">🔥 Best Streak: {sessionProgress?.stats.maxStreak}</Text>
                </HStack>
                <Text color="yellow.300" fontSize="sm">
                  {sessionService.getInsights().join(' ')}
                </Text>
              </VStack>
            )}
          </MotionBox>
        )}

        {/* Quiz Completion Card */}
        {isCompleted && sessionService && (
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            mt={6}
          >
            <Card 
              bg={useColorModeValue('white', 'gray.800')}
              borderColor={useColorModeValue('purple.200', 'purple.600')}
              borderWidth="2px"
              shadow="xl"
            >
              <CardHeader pb={2}>
                <HStack spacing={3} justify="center">
                  <Icon as={CheckCircleIcon} color="purple.500" boxSize={8} />
                  <Text fontSize="2xl" fontWeight="bold" color={useColorModeValue('gray.800', 'white')}>
                    🎉 Quiz Complete!
                  </Text>
                </HStack>
              </CardHeader>
              <CardBody pt={2}>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={4}>
                  <Stat textAlign="center">
                    <StatLabel color={useColorModeValue('gray.600', 'gray.400')}>
                      <HStack justify="center" spacing={1}>
                        <CheckCircleIcon color="green.500" />
                        <Text>Correct</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber color="green.500" fontSize="3xl">
                      {sessionProgress?.stats.correct}
                    </StatNumber>
                    <StatHelpText color={useColorModeValue('gray.500', 'gray.400')}>
                      Well done!
                    </StatHelpText>
                  </Stat>
                  
                  <Stat textAlign="center">
                    <StatLabel color={useColorModeValue('gray.600', 'gray.400')}>
                      <HStack justify="center" spacing={1}>
                        <InfoIcon color="orange.500" />
                        <Text>Incorrect</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber color="orange.500" fontSize="3xl">
                      {sessionProgress?.stats.incorrect}
                    </StatNumber>
                    <StatHelpText color={useColorModeValue('gray.500', 'gray.400')}>
                      Learning opportunity
                    </StatHelpText>
                  </Stat>
                  
                  <Stat textAlign="center">
                    <StatLabel color={useColorModeValue('gray.600', 'gray.400')}>
                      <HStack justify="center" spacing={1}>
                        <StarIcon color="purple.500" />
                        <Text>Best Streak</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber color="purple.500" fontSize="3xl">
                      {sessionProgress?.stats.maxStreak}
                    </StatNumber>
                    <StatHelpText color={useColorModeValue('gray.500', 'gray.400')}>
                      Amazing! 🔥
                    </StatHelpText>
                  </Stat>
                </SimpleGrid>
                
                <Divider mb={4} />
                
                <VStack spacing={2}>
                  <Text fontSize="lg" fontWeight="semibold" color={useColorModeValue('gray.700', 'gray.200')}>
                    Performance Insights
                  </Text>
                  <HStack spacing={2} wrap="wrap" justify="center">
                    {sessionService.getInsights().map((insight, index) => (
                      <Badge key={index} colorScheme="purple" fontSize="sm" p={2} borderRadius="full">
                        {insight}
                      </Badge>
                    ))}
                  </HStack>
                  
                  <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')} textAlign="center" mt={2}>
                    Final Score: <Text as="span" fontWeight="bold" color="purple.500">{sessionProgress?.stats.score} points</Text>
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </MotionBox>
        )}

        <Flex justify="center" mt={8} gap={4}>
          {!isAnswered ? (
            <Button
              variant="solid"
              colorScheme="blue"
              size="lg"
              onClick={handleAnswer}
              isDisabled={!selectedAnswer || isValidating}
              isLoading={isValidating}
              loadingText="Validating..."
              _hover={{
                transform: 'translateY(-2px)',
                shadow: 'lg'
              }}
              transition="all 0.2s"
            >
              Check Answer
            </Button>
          ) : isCompleted ? (
            <>
              <Button
                variant="outline"
                colorScheme="purple"
                size="lg"
                onClick={updateLearnedPoints}
                isLoading={isUpdatingPoints}
                loadingText="Saving Progress..."
                _hover={{
                  transform: 'translateY(-2px)',
                  shadow: 'lg'
                }}
                transition="all 0.2s"
              >
                Save & Finish
              </Button>
              <Button
                variant="solid"
                colorScheme="blue"
                size="lg"
                onClick={loadMoreQuestions}
                isLoading={isLoading}
                loadingText="Loading Questions..."
                _hover={{
                  transform: 'translateY(-2px)',
                  shadow: 'lg'
                }}
                transition="all 0.2s"
              >
                Continue Quiz
              </Button>
            </>
          ) : (
            <Button
              variant="solid"
              colorScheme="purple"
              size="lg"
              onClick={handleNext}
              isLoading={isLoading}
              loadingText="Loading..."
              _hover={{
                transform: 'translateY(-2px)',
                shadow: 'lg'
              }}
              transition="all 0.2s"
            >
              {currentQuestion + 1 >= totalQuestions ? 'Finish Quiz' : 'Next Question'}
            </Button>
          )}
        </Flex>
      </MotionBox>
    </MotionBox>
  );
}; 