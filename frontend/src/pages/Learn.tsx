import { 
  Box, 
  Button, 
  Text, 
  Flex, 
  Progress, 
  Badge, 
  IconButton,
  useToast,
  Spinner,
  Center,
  VStack,
  HStack,
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
import { Exercise, WordList } from '../types';
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

export const Learn = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation();
  const toast = useToast();
  const hasInitializedRef = useRef(false);
  const isMountedRef = useRef(false);
  
  const [list] = useState<WordList | null>(state?.list || null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionService, setSessionService] = useState<SessionService | null>(null);
  const [sessionProgress, setSessionProgress] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [actualCorrectness, setActualCorrectness] = useState<boolean | null>(null);

  useEffect(() => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    const initLearn = async () => {
      if (!id || !list || hasInitializedRef.current) return;
      
      try {
        setIsLoading(true);
        
        // Start learning session
        const response = await apiService.startLearning(id);
        if (response && response.exercises) {
          setExercises(response.exercises);
          const service = new SessionService(response.exercises);
          setSessionService(service);
          setSessionProgress(service.getCurrentProgress());
          hasInitializedRef.current = true;
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error: any) {
        console.error('Error initializing learning session:', error);
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to start learning session',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate(`/lists/${id}`);
      } finally {
        setIsLoading(false);
      }
    };

    initLearn();
  }, [id, navigate, toast]);

  const loadMoreExercises = async () => {
    if (!id || !exercises.length) return false;
    
    try {
      setIsLoading(true);
      const response = await apiService.getExercises(id);
      
      if (response && response.exercises && response.exercises.length > 0) {
        const newExercises = [...exercises, ...response.exercises];
        setExercises(newExercises);
        // Create new session service with all exercises
        const service = new SessionService(newExercises);
        setSessionService(service);
        setCurrentExercise(exercises.length); // Start from the first new exercise
        setSelectedAnswer('');
        setIsAnswered(false);
        setIsCompleted(false);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error loading more exercises:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load more exercises',
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
    const exercise = exercises[currentExercise];
    
    try {
      let isValid = false;
      
      // Use async validation for all question types for consistency
      isValid = await validateAnswer(selectedAnswer, exercise, list?.context);
      
      // Store the actual correctness for UI display
      setActualCorrectness(isValid);
      setIsAnswered(true);
      
      if (sessionService) {
        // Use the actual validation result
        sessionService.answerQuestion(selectedAnswer, exercise, isValid);
        setSessionProgress(sessionService.getCurrentProgress());
      }
    } catch (error) {
      console.error('Error validating answer:', error);
      // Fallback to normal validation
      const fallbackCorrect = selectedAnswer === exercise.correctAnswer;
      setActualCorrectness(fallbackCorrect);
      setIsAnswered(true);
      
      if (sessionService) {
        sessionService.answerQuestion(selectedAnswer, exercise, fallbackCorrect);
        setSessionProgress(sessionService.getCurrentProgress());
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleNext = async () => {
    const isLastExercise = currentExercise === exercises.length - 1;
    
    if (isLastExercise) {
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
    
    setCurrentExercise(prev => prev + 1);
    setSelectedAnswer('');
    setIsAnswered(false);
    setActualCorrectness(null); // Reset validation result
  };

  if (isLoading) {
    return (
      <Center h="calc(100vh - 64px)">
        <Spinner size="xl" color="green.500" thickness="4px" />
      </Center>
    );
  }

  if (!list || !exercises.length) {
    return (
      <Box textAlign="center" py={10}>
        <Text mb={4}>No exercises available</Text>
        <Link to="/lists">
          <Button variant="solid">Back to Lists</Button>
        </Link>
      </Box>
    );
  }

  const exercise = exercises[currentExercise];
  const progress = ((currentExercise + 1) / exercises.length) * 100;
  const streak = sessionProgress?.stats.streak || 0;
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
            Learning: {list.name}
          </Text>
          <Flex 
            gap={4} 
            mt={2} 
            flexWrap="wrap" 
            justify={{ base: 'center', md: 'flex-start' }}
          >
            <Badge 
              colorScheme="green" 
              p={2} 
              borderRadius="full"
              style={streak > 0 ? { animation: 'pulse 1s ease infinite' } : undefined}
            >
              🔥 Streak: {streak}
            </Badge>
            <Badge colorScheme="blue" p={2} borderRadius="full">
              ✨ Progress: {Math.round(progress)}%
            </Badge>
            <Badge colorScheme="purple" p={2} borderRadius="full">
              ⭐ Score: {score}
            </Badge>
          </Flex>
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
        colorScheme="green"
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
        borderColor="green.500"
        px={{ base: 4, md: 8 }}
        py={6}
      >
        <QuestionRenderer
          question={exercise}
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
            bg={actualCorrectness ? 'green.500' : '#FF4D4F'}
            borderRadius="lg"
            textAlign="center"
          >
            <Text color="white" fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold">
              {actualCorrectness ? '🎉 Excellent!' : '💡 Keep Learning!'}
            </Text>
            <Text color="white" mt={2} fontSize={{ base: 'sm', md: 'md' }}>
              {actualCorrectness 
                ? sessionProgress?.stats?.streak > 1 ? `You're on fire! ${sessionProgress.stats.streak} correct in a row!` : 'Great job!'
                : exercise.type === 'fill_blank' || exercise.type === 'matching' 
                  ? 'Check the correct answer above'
                  : `The correct answer is: ${exercise.correctAnswer}`}
            </Text>
            
          </MotionBox>
        )}

        {/* Session Completion Card */}
        {isCompleted && sessionService && (
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            mt={6}
          >
            <Card 
              bg={useColorModeValue('white', 'gray.800')}
              borderColor={useColorModeValue('green.200', 'green.600')}
              borderWidth="2px"
              shadow="xl"
            >
              <CardHeader pb={2}>
                <HStack spacing={3} justify="center">
                  <Icon as={CheckCircleIcon} color="green.500" boxSize={8} />
                  <Text fontSize="2xl" fontWeight="bold" color={useColorModeValue('gray.800', 'white')}>
                    🎉 Session Complete!
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
                      Great job!
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
                      On fire! 🔥
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
                      <Badge key={index} colorScheme="blue" fontSize="sm" p={2} borderRadius="full">
                        {insight}
                      </Badge>
                    ))}
                  </HStack>
                  
                  <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')} textAlign="center" mt={2}>
                    Final Score: <Text as="span" fontWeight="bold" color="blue.500">{sessionProgress?.stats.score} points</Text>
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
                colorScheme="green"
                size="lg"
                onClick={() => navigate(`/lists/${id}`)}
                _hover={{
                  transform: 'translateY(-2px)',
                  shadow: 'lg'
                }}
                transition="all 0.2s"
              >
                Complete
              </Button>
              <Button
                variant="solid"
                colorScheme="blue"
                size="lg"
                onClick={loadMoreExercises}
                isLoading={isLoading}
                _hover={{
                  transform: 'translateY(-2px)',
                  shadow: 'lg'
                }}
                transition="all 0.2s"
              >
                Continue Learning
              </Button>
            </>
          ) : (
            <Button
              variant="solid"
              colorScheme="green"
              size="lg"
              onClick={handleNext}
              _hover={{
                transform: 'translateY(-2px)',
                shadow: 'lg'
              }}
              transition="all 0.2s"
            >
              {currentExercise === exercises.length - 1 ? 'Finish Session' : 'Next Exercise'}
            </Button>
          )}
        </Flex>
      </MotionBox>
    </MotionBox>
  );
}; 