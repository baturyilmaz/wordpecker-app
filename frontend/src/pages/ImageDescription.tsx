import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Flex,
  Text,
  Image,
  Textarea,
  Button,
  Input,
  FormControl,
  FormLabel,
  useToast,
  Card,
  CardHeader,
  CardBody,
  Divider,
  Badge,
  Alert,
  AlertIcon,
  useColorModeValue,
  Select,
  Wrap,
  WrapItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Checkbox,
  RadioGroup,
  Radio
} from '@chakra-ui/react';
import { FaRandom } from 'react-icons/fa';
import { apiService } from '../services/api';
import { ImageDescriptionAnalysis, WordList } from '../types';
import PronunciationButton from '../components/PronunciationButton';

type ExerciseState = 'setup' | 'describing' | 'results';

export const ImageDescription: React.FC = () => {
  const [state, setState] = useState<ExerciseState>('setup');
  const [context, setContext] = useState('');
  const [sessionContext, setSessionContext] = useState(''); // Track the current session context
  const [image, setImage] = useState<{ url: string; alt: string; id: string } | null>(null);
  const [instructions, setInstructions] = useState('');
  const [userDescription, setUserDescription] = useState('');
  const [analysis, setAnalysis] = useState<ImageDescriptionAnalysis | null>(null);
  const [exerciseId, setExerciseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [createNewList, setCreateNewList] = useState(false);
  const [imageSource, setImageSource] = useState<'ai' | 'stock'>('ai');
  const [generatingContext, setGeneratingContext] = useState(false);
  
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const cardBg = useColorModeValue('white', '#1E293B');
  const borderColor = useColorModeValue('gray.200', '#334155');
  const accentBg = useColorModeValue('#F6FFED', '#1E293B');
  const feedbackBg = useColorModeValue('#F6FFED', '#1E293B');
  const vocabCardBg = useColorModeValue('white', '#1E293B');

  useEffect(() => {
    loadWordLists();
  }, []);

  const loadWordLists = async () => {
    try {
      const lists = await apiService.getLists();
      setWordLists(lists);
      if (lists.length > 0) {
        setSelectedListId(lists[0].id);
      }
    } catch (error) {
      console.error('Failed to load word lists:', error);
    }
  };

  const handleGenerateRandomContext = async () => {
    setGeneratingContext(true);
    try {
      const suggestions = await apiService.getContextSuggestions();
      if (suggestions.suggestions.length > 0) {
        const randomContext = suggestions.suggestions[0];
        setContext(randomContext);
        toast({
          title: 'Random Context Generated!',
          description: `Generated context: "${randomContext}"`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Failed to generate random context:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate random context',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setGeneratingContext(false);
    }
  };

  const startExercise = async (useSessionContext = false) => {
    // Use session context if continuing, otherwise use input context
    const exerciseContext = useSessionContext ? sessionContext : (context.trim() || undefined);

    setLoading(true);
    try {
      const data = await apiService.startDescriptionExercise(exerciseContext, imageSource);
      setImage(data.image);
      setInstructions(data.instructions);
      
      // Set session context if starting new session
      if (!useSessionContext) {
        setSessionContext(data.context);
      }
      
      setState('describing');
      
      toast({
        title: useSessionContext ? 'New Image Generated!' : (exerciseContext ? 'Custom Image Generated!' : 'Random Image Generated!'),
        description: useSessionContext ? `Continuing with context: ${sessionContext}` : 'Now describe what you see in this image.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to start exercise:', error);
      toast({
        title: 'Error',
        description: 'Failed to load image. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const submitDescription = async () => {
    if (!userDescription.trim() || userDescription.trim().length < 10) {
      toast({
        title: 'Description Too Short',
        description: 'Please write at least 10 characters describing the image.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!image) return;

    setAnalyzing(true);
    try {
      const data = await apiService.submitDescription({
        context: sessionContext,
        imageUrl: image.url,
        imageAlt: image.alt,
        userDescription: userDescription.trim()
      });
      
      setAnalysis(data.analysis);
      setExerciseId(data.exerciseId);
      setState('results');
      
      toast({
        title: 'Analysis Complete!',
        description: 'Check out your personalized feedback and vocabulary recommendations.',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to analyze description:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze your description. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const addWordsToList = async () => {
    if (!analysis || selectedWords.length === 0) {
      toast({
        title: 'No Words Selected',
        description: 'Please select at least one word to add to your list.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!createNewList && !selectedListId) {
      toast({
        title: 'No List Selected',
        description: 'Please select a word list or choose to create a new one.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const wordsToAdd = analysis.recommendations
        .filter(rec => selectedWords.includes(rec.word))
        .map(rec => ({ word: rec.word, meaning: rec.meaning }));

      const data = await apiService.addWordsToList({
        exerciseId,
        listId: createNewList ? undefined : selectedListId,
        selectedWords: wordsToAdd,
        createNewList
      });

      toast({
        title: createNewList ? 'New List Created!' : 'Words Added!',
        description: data.message,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      
      // If we created a new list, update our local list
      if (data.createdNewList) {
        await loadWordLists();
      }
      
      onClose();
      setSelectedWords([]);
      setCreateNewList(false);
    } catch (error) {
      console.error('Failed to add words:', error);
      toast({
        title: 'Error',
        description: 'Failed to add words to your list. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const resetExercise = () => {
    setState('setup');
    setContext('');
    setSessionContext('');
    setImage(null);
    setUserDescription('');
    setAnalysis(null);
    setExerciseId('');
    setSelectedWords([]);
    setCreateNewList(false);
  };

  const continueSession = () => {
    setUserDescription('');
    setAnalysis(null);
    setExerciseId('');
    setState('setup'); // Reset to setup state to show loading properly
    startExercise(true); // Use session context
  };

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', '#0F172A')}>
      <Container maxW="container.xl" py={8} px={{ base: 4, md: 8 }}>
        <VStack spacing={8} align="stretch">
          <Flex 
            justify="space-between" 
            align={{ base: 'flex-start', md: 'center' }}
            direction={{ base: 'column', md: 'row' }}
            gap={4}
          >
            <Box>
              <Heading 
                as="h1" 
                size="2xl"
                color="green.500"
                display="flex"
                alignItems="center"
                gap={3}
              >
                <Flex align="center" gap={2}>
                  <Text fontSize="4xl">🌳</Text>
                  <Text fontSize="3xl">🐦</Text>
                </Flex>
                Vision Garden
              </Heading>
              <Text mt={2} color="gray.400" fontSize="lg">
                Grow your vocabulary by exploring images! Describe what you see, and let our wordpecker guide help you discover new words.
              </Text>
            </Box>
          </Flex>

        {/* Setup Phase */}
        {state === 'setup' && (
          <Card bg={cardBg} borderColor={borderColor} borderWidth="2px" borderRadius="xl" shadow="lg">
            <CardHeader bg={accentBg} borderTopRadius="xl">
              <HStack spacing={2}>
                <Text fontSize="xl">🌱</Text>
                <Heading size="md" color={useColorModeValue('green.600', '#38A169')}>Plant Your Learning Seed</Heading>
              </HStack>
              <Text fontSize="sm" color={useColorModeValue('gray.600', '#94A3B8')} mt={2} fontWeight="medium">
                Choose a vocabulary context to explore, or let our wordpecker guide you to a random adventure!
              </Text>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel color="green.400" fontSize="lg" fontWeight="semibold">
                    ✍️ Create Custom Context
                  </FormLabel>
                  <HStack spacing={3}>
                    <Input
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="e.g., Business English vocabulary (or leave empty for random)"
                      size="lg"
                      borderColor={context ? "green.400" : borderColor}
                      borderWidth="2px"
                      _focus={{
                        borderColor: "green.400",
                        boxShadow: "0 0 0 1px var(--chakra-colors-green-400)"
                      }}
                    />
                    <Button
                      leftIcon={<FaRandom />}
                      onClick={handleGenerateRandomContext}
                      colorScheme="purple"
                      variant="outline"
                      size="lg"
                      isLoading={generatingContext}
                      loadingText="Generating..."
                      flexShrink={0}
                      _hover={{
                        transform: 'translateY(-2px)',
                        bg: useColorModeValue('purple.50', 'purple.800'),
                        borderColor: useColorModeValue('purple.400', 'purple.300')
                      }}
                      transition="all 0.2s"
                    >
                      AI Generate
                    </Button>
                  </HStack>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Leave empty to get a surprise random context!
                  </Text>
                </FormControl>

                <FormControl>
                  <FormLabel fontWeight="semibold">Image Source</FormLabel>
                  <RadioGroup 
                    value={imageSource} 
                    onChange={(value) => setImageSource(value as 'ai' | 'stock')}
                    colorScheme="green"
                  >
                    <VStack align="start" spacing={3}>
                      <Radio value="ai" size="lg">
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium">🤖 AI Generated Images</Text>
                          <Text fontSize="sm" color="gray.500">
                            Create unique, custom images using DALL-E AI
                          </Text>
                        </VStack>
                      </Radio>
                      <Radio value="stock" size="lg">
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium">📷 Stock Images</Text>
                          <Text fontSize="sm" color="gray.500">
                            Use real-world photographs from Pexels
                          </Text>
                        </VStack>
                      </Radio>
                    </VStack>
                  </RadioGroup>
                </FormControl>

                {wordLists.length > 0 && wordLists.filter(list => list.context).length > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Text fontSize="lg" fontWeight="semibold" color="blue.400" mb={4}>
                        📚 Your Existing Contexts
                      </Text>
                      <Wrap spacing={3}>
                        {wordLists
                          .filter(list => list.context) // Only show lists with contexts
                          .map((list) => (
                          <WrapItem key={list.id}>
                            <Button
                              size="md"
                              variant="outline"
                              onClick={() => setContext(list.context || '')}
                              colorScheme="blue"
                              borderWidth="2px"
                              _hover={{
                                transform: 'translateY(-2px)',
                                bg: useColorModeValue('blue.50', 'blue.800'),
                                borderColor: useColorModeValue('blue.400', 'blue.300')
                              }}
                              transition="all 0.2s"
                            >
                              <Text fontWeight="medium" fontSize="sm">
                                {list.context}
                              </Text>
                            </Button>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  </>
                )}

                <Divider />

                <HStack spacing={4}>
                  <Button
                    colorScheme="green"
                    size="lg"
                    onClick={() => startExercise()}
                    isLoading={loading}
                    loadingText={context.trim() ? "🌱 Growing your image..." : "🎲 Finding random adventure..."}
                    flex={1}
                    borderRadius="lg"
                    leftIcon={context.trim() ? <Text>🌿</Text> : <Text>🎲</Text>}
                    _hover={{
                      transform: 'translateY(-2px)',
                      bg: 'green.600'
                    }}
                    transition="all 0.2s"
                  >
                    {context.trim() ? "Grow My Garden" : "Random Adventure"}
                  </Button>
                  {context.trim() && (
                    <Button
                      variant="outline"
                      colorScheme="green"
                      size="lg"
                      onClick={() => {
                        setContext('');
                        startExercise();
                      }}
                      isLoading={loading}
                      loadingText="🎲 Finding random adventure..."
                      borderRadius="lg"
                      leftIcon={<Text>🎲</Text>}
                      _hover={{
                        transform: 'translateY(-2px)',
                        bg: 'green.50',
                        borderColor: 'green.500'
                      }}
                      transition="all 0.2s"
                    >
                      Random Instead
                    </Button>
                  )}
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Describing Phase */}
        {state === 'describing' && image && (
          <VStack spacing={6} align="stretch">
            <Card bg={cardBg} borderColor={borderColor} borderWidth="2px" borderRadius="xl" shadow="lg">
              <CardHeader bg={accentBg} borderTopRadius="xl">
                <VStack align="start" spacing={2}>
                  <HStack spacing={2}>
                    <Text fontSize="xl">🔍</Text>
                    <Heading size="md" color="green.700">Explore Your Visual Garden</Heading>
                  </HStack>
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="green.600" fontWeight="medium">
                      Growing in:
                    </Text>
                    <Badge colorScheme="green" variant="solid" borderRadius="full" px={3}>
                      🌿 {sessionContext}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color="green.600" fontStyle="italic">
                    {instructions}
                  </Text>
                </VStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={6}>
                  <Box borderRadius="xl" overflow="hidden" border="3px solid" borderColor="green.200" shadow="md">
                    <Image
                      src={image.url}
                      alt={image.alt}
                      objectFit="contain"
                      w="100%"
                      maxW="100%"
                    />
                  </Box>

                  <FormControl>
                    <FormLabel color="green.700" fontWeight="semibold" fontSize="md">
                      🌱 Plant Your Words Here
                    </FormLabel>
                    <Textarea
                      value={userDescription}
                      onChange={(e) => setUserDescription(e.target.value)}
                      placeholder="Describe everything you see: objects, people, colors, emotions, atmosphere..."
                      minH="150px"
                      size="lg"
                      borderColor="green.200"
                      borderWidth="2px"
                      borderRadius="lg"
                      _focus={{
                        borderColor: "green.400",
                        boxShadow: "0 0 0 1px var(--chakra-colors-green-400)"
                      }}
                      bg={useColorModeValue('gray.50', '#1E293B')}
                      _placeholder={{ color: useColorModeValue('gray.500', '#94A3B8') }}
                    />
                    <Text fontSize="sm" color={useColorModeValue('gray.600', '#94A3B8')} mt={2} fontWeight="medium">
                      🌿 {userDescription.length} words planted (minimum 10 characters to grow)
                    </Text>
                  </FormControl>

                  <HStack spacing={4} justify="center">
                    <Button
                      colorScheme="green"
                      size="lg"
                      onClick={submitDescription}
                      isLoading={analyzing}
                      loadingText="🔍 Our wordpecker is analyzing..."
                      isDisabled={userDescription.trim().length < 10}
                      borderRadius="lg"
                      leftIcon={<Text>🐦</Text>}
                      px={8}
                      _hover={{
                        transform: 'translateY(-2px)',
                        bg: useColorModeValue('green.600', 'green.500')
                      }}
                      transition="all 0.2s"
                    >
                      Get Wordpecker's Analysis
                    </Button>
                    <Button 
                      variant="outline" 
                      colorScheme="green"
                      onClick={resetExercise}
                      borderRadius="lg"
                      leftIcon={<Text>🔄</Text>}
                      _hover={{
                        transform: 'translateY(-2px)',
                        bg: useColorModeValue('green.50', 'green.800'),
                        borderColor: useColorModeValue('green.500', 'green.400')
                      }}
                      transition="all 0.2s"
                    >
                      Start Over
                    </Button>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        )}

        {/* Results Phase */}
        {state === 'results' && analysis && image && (
          <VStack spacing={8} align="stretch">
            {/* Show the image again for reference */}
            <Card bg={cardBg} borderColor={borderColor} borderWidth="2px" borderRadius="xl" shadow="md">
              <CardHeader bg={accentBg} borderTopRadius="xl">
                <VStack align="start" spacing={2}>
                  <HStack spacing={2}>
                    <Text fontSize="xl">📸</Text>
                    <Heading size="md" color="green.700">Your Visual Garden</Heading>
                  </HStack>
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="green.600" fontWeight="medium">
                      Grown in:
                    </Text>
                    <Badge colorScheme="green" variant="solid" borderRadius="full" px={3}>
                      🌿 {sessionContext}
                    </Badge>
                  </HStack>
                </VStack>
              </CardHeader>
              <CardBody>
                <Box borderRadius="xl" overflow="hidden" border="3px solid" borderColor="green.200" shadow="md">
                  <Image
                    src={image.url}
                    alt={image.alt}
                    objectFit="contain"
                    w="100%"
                    maxW="100%"
                    mx="auto"
                  />
                </Box>
              </CardBody>
            </Card>

            <Card bg={cardBg} borderColor={borderColor} borderWidth="2px" borderRadius="xl" shadow="lg">
              <CardHeader bg={feedbackBg} borderTopRadius="xl">
                <HStack spacing={2}>
                  <Text fontSize="xl">🐦</Text>
                  <Heading size="md" color="emerald.700">Wordpecker's Garden Report</Heading>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={6} align="stretch">

                  {/* Feedback */}
                  <Box>
                    <HStack spacing={2} mb={3}>
                      <Text fontSize="xl">💭</Text>
                      <Heading size="sm" color={useColorModeValue('green.600', '#38A169')}>Wordpecker's Thoughts</Heading>
                    </HStack>
                    <Box p={5} bg={useColorModeValue('gray.50', '#1E293B')} borderRadius="xl" border="1px solid" borderColor={borderColor} shadow="sm">
                      <Text fontSize="md" lineHeight="tall" color={useColorModeValue('gray.700', '#F8FAFC')} fontWeight="medium">
                        {analysis.feedback}
                      </Text>
                    </Box>
                  </Box>

                  {/* Strengths */}
                  {analysis.user_strengths.length > 0 && (
                    <Box>
                      <HStack spacing={2} mb={3}>
                        <Text fontSize="xl">🌟</Text>
                        <Heading size="sm" color={useColorModeValue('green.600', '#38A169')}>Seeds Well Planted</Heading>
                      </HStack>
                      <Wrap spacing={3}>
                        {analysis.user_strengths.map((strength, index) => (
                          <WrapItem key={index}>
                            <Badge 
                              colorScheme="green" 
                              variant="solid" 
                              px={3} 
                              py={1} 
                              borderRadius="full"
                              fontSize="sm"
                            >
                              ✨ {strength}
                            </Badge>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}

                  {/* Missed Concepts */}
                  {analysis.missed_concepts.length > 0 && (
                    <Box>
                      <HStack spacing={2} mb={3}>
                        <Text fontSize="xl">🔍</Text>
                        <Heading size="sm" color={useColorModeValue('orange.600', '#FB923C')}>Areas to Explore</Heading>
                      </HStack>
                      <Box p={4} bg={useColorModeValue('orange.50', '#1E293B')} borderRadius="lg" border="1px solid" borderColor={useColorModeValue('orange.200', '#FB923C')}>
                        <VStack align="start" spacing={2}>
                          {analysis.missed_concepts.map((concept, index) => (
                            <HStack key={index} align="start" spacing={2}>
                              <Text fontSize="sm" color={useColorModeValue('orange.600', '#FB923C')}>•</Text>
                              <Text fontSize="sm" color={useColorModeValue('orange.700', '#FDBA74')} lineHeight="1.5">
                                {concept}
                              </Text>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                      <Text fontSize="xs" color={useColorModeValue('gray.500', '#94A3B8')} mt={2} fontStyle="italic">
                        💡 These details could make your descriptions even richer!
                      </Text>
                    </Box>
                  )}

                  {/* Vocabulary Recommendations */}
                  <Box>
                    <HStack spacing={2} mb={4}>
                      <Text fontSize="xl">🌱</Text>
                      <Heading size="sm" color={useColorModeValue('green.600', '#38A169')}>New Words to Grow</Heading>
                    </HStack>
                    <VStack spacing={4} align="stretch">
                      {analysis.recommendations.map((rec, index) => (
                        <Box 
                          key={index} 
                          p={5} 
                          bg={vocabCardBg}
                          borderWidth="2px" 
                          borderRadius="xl" 
                          borderColor="green.200"
                          shadow="md"
                          _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
                          transition="all 0.2s"
                        >
                          <VStack align="start" spacing={3}>
                            <HStack justify="space-between" w="100%">
                              <HStack spacing={3}>
                                <Text fontSize="lg">🌿</Text>
                                <Text fontWeight="bold" fontSize="xl" color={useColorModeValue('green.600', '#38A169')}>
                                  {rec.word}
                                </Text>
                                <PronunciationButton
                                  text={rec.word}
                                  type="word"
                                  language="en"
                                  size="sm"
                                  colorScheme="green"
                                  tooltipText="Listen to word pronunciation"
                                />
                                {rec.difficulty_level && (
                                  <Badge
                                    colorScheme={
                                      rec.difficulty_level === 'basic' ? 'green' :
                                      rec.difficulty_level === 'intermediate' ? 'orange' : 'red'
                                    }
                                    variant="solid"
                                    borderRadius="full"
                                    px={3}
                                    py={1}
                                  >
                                    {rec.difficulty_level === 'basic' ? '🌱 Basic' :
                                     rec.difficulty_level === 'intermediate' ? '🌳 Intermediate' : '🦅 Advanced'}
                                  </Badge>
                                )}
                              </HStack>
                            </HStack>
                            <Box bg={useColorModeValue('gray.50', '#1E293B')} p={3} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                              <Text fontSize="md" color={useColorModeValue('gray.700', '#F8FAFC')} fontWeight="medium" lineHeight="tall">
                                {rec.meaning}
                              </Text>
                            </Box>
                            <Box bg={useColorModeValue('blue.50', '#1E293B')} p={3} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                              <HStack justify="space-between" align="start">
                                <Text fontSize="sm" color={useColorModeValue('gray.600', '#94A3B8')} fontWeight="medium" flex="1">
                                  💡 Example: <Text as="span" fontStyle="italic">{rec.example}</Text>
                                </Text>
                                <PronunciationButton
                                  text={rec.example}
                                  type="sentence"
                                  language="en"
                                  size="sm"
                                  colorScheme="blue"
                                  tooltipText="Listen to example sentence"
                                />
                              </HStack>
                            </Box>
                          </VStack>
                        </Box>
                      ))}
                    </VStack>
                  </Box>

                  {/* Action Buttons */}
                  <VStack spacing={5} pt={4}>
                    <Box textAlign="center" w="full">
                      <Button
                        colorScheme="orange"
                        size="xl"
                        onClick={onOpen}
                        isDisabled={analysis.recommendations.length === 0}
                        borderRadius="xl"
                        px={12}
                        py={6}
                        fontSize="lg"
                        fontWeight="bold"
                        leftIcon={<Text fontSize="2xl">🌱</Text>}
                        shadow="lg"
                        _hover={{ 
                          shadow: "xl", 
                          transform: "translateY(-3px)",
                          bg: useColorModeValue("orange.600", "orange.500")
                        }}
                        _active={{
                          transform: "translateY(-1px)"
                        }}
                        transition="all 0.3s"
                        w={{ base: "full", md: "auto" }}
                        minW="280px"
                      >
                        🌿 Plant Words in My Garden 🌿
                      </Button>
                    </Box>
                    
                    <Divider borderColor="green.200" />
                    
                    <HStack spacing={4} justify="center">
                      <Button
                        colorScheme="green"
                        onClick={() => continueSession()}
                        isLoading={loading}
                        loadingText="🌱 Growing new garden..."
                        borderRadius="lg"
                        leftIcon={<Text>🔄</Text>}
                        size="md"
                        _hover={{
                          transform: 'translateY(-2px)',
                          bg: useColorModeValue('green.600', 'green.500')
                        }}
                        transition="all 0.2s"
                      >
                        New Garden (Same Context)
                      </Button>
                      <Button
                        variant="outline"
                        colorScheme="green"
                        onClick={resetExercise}
                        borderRadius="lg"
                        leftIcon={<Text>🆕</Text>}
                        size="md"
                        _hover={{
                          transform: 'translateY(-2px)',
                          bg: useColorModeValue('green.50', 'green.800'),
                          borderColor: useColorModeValue('green.500', 'green.400')
                        }}
                        transition="all 0.2s"
                      >
                        New Context
                      </Button>
                    </HStack>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        )}
      </VStack>

      {/* Add Words Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent borderRadius="xl" bg={useColorModeValue('white', 'gray.800')}>
          <ModalHeader bg={useColorModeValue('green.50', 'green.900')} borderTopRadius="xl">
            <HStack spacing={3}>
              <Text fontSize="2xl">🌱</Text>
              <Text color={useColorModeValue('green.700', 'green.200')} fontWeight="bold" fontSize="xl">
                Plant Words in Your Garden
              </Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={6} align="stretch">
              {/* List Selection */}
              <Box>
                <FormControl display="flex" alignItems="center" mb={4}>
                  <Checkbox
                    isChecked={createNewList}
                    onChange={(e) => setCreateNewList(e.target.checked)}
                    colorScheme="green"
                    size="lg"
                  >
                    <Text fontSize="md" fontWeight="medium">
                      Create new list for this context
                    </Text>
                  </Checkbox>
                </FormControl>
                
                {createNewList ? (
                  <Alert status="info" borderRadius="lg">
                    <AlertIcon />
                    <Text fontSize="sm">
                      New list: "{sessionContext}"
                    </Text>
                  </Alert>
                ) : (
                  <FormControl>
                    <FormLabel fontWeight="medium" color={useColorModeValue('gray.700', 'gray.200')}>
                      Add to existing list
                    </FormLabel>
                    <Select
                      value={selectedListId}
                      onChange={(e) => setSelectedListId(e.target.value)}
                      size="lg"
                      bg={useColorModeValue('white', 'gray.700')}
                    >
                      {wordLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>

              {/* Word Selection */}
              {analysis && (
                <Box>
                  <Text fontSize="md" fontWeight="semibold" mb={4} color={useColorModeValue('gray.700', 'gray.200')}>
                    Select words to add ({selectedWords.length} selected)
                  </Text>
                  <VStack align="stretch" spacing={3} maxH="400px" overflowY="auto">
                    {analysis.recommendations.map((rec) => (
                      <Box
                        key={rec.word}
                        p={4}
                        bg={selectedWords.includes(rec.word) 
                          ? useColorModeValue('green.50', 'green.900') 
                          : useColorModeValue('gray.50', 'gray.700')}
                        borderWidth="2px"
                        borderColor={selectedWords.includes(rec.word) 
                          ? useColorModeValue('green.300', 'green.600') 
                          : useColorModeValue('gray.200', 'gray.600')}
                        borderRadius="lg"
                        cursor="pointer"
                        onClick={() => {
                          if (selectedWords.includes(rec.word)) {
                            setSelectedWords(selectedWords.filter(w => w !== rec.word));
                          } else {
                            setSelectedWords([...selectedWords, rec.word]);
                          }
                        }}
                        transition="all 0.2s"
                        _hover={{
                          borderColor: useColorModeValue('green.400', 'green.500'),
                          shadow: "sm"
                        }}
                      >
                        <HStack spacing={4} align="start">
                          <Checkbox 
                            isChecked={selectedWords.includes(rec.word)}
                            colorScheme="green"
                            size="lg"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedWords([...selectedWords, rec.word]);
                              } else {
                                setSelectedWords(selectedWords.filter(w => w !== rec.word));
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <VStack align="start" spacing={1} flex={1}>
                            <HStack spacing={2} align="center">
                              <Text fontWeight="bold" fontSize="lg" color={useColorModeValue('green.700', 'green.300')}>
                                {rec.word}
                              </Text>
                              <PronunciationButton
                                text={rec.word}
                                type="word"
                                language="en"
                                size="sm"
                                colorScheme="green"
                                variant="ghost"
                                tooltipText="Listen to word pronunciation"
                              />
                            </HStack>
                            <Text color={useColorModeValue('gray.600', 'gray.400')} fontSize="sm" lineHeight="1.4">
                              {rec.meaning}
                            </Text>
                          </VStack>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter bg={useColorModeValue('gray.50', 'gray.700')} borderBottomRadius="xl">
            <HStack spacing={3}>
              <Button 
                variant="outline" 
                colorScheme="gray" 
                onClick={onClose} 
                size="lg"
              >
                Cancel
              </Button>
              <Button 
                colorScheme="green" 
                onClick={addWordsToList} 
                leftIcon={<Text>🌱</Text>}
                size="lg"
                fontWeight="bold"
                _hover={{
                  transform: "translateY(-1px)"
                }}
                transition="all 0.2s"
                isDisabled={selectedWords.length === 0}
              >
                Plant {selectedWords.length} Word{selectedWords.length !== 1 ? 's' : ''}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
      </Container>
    </Box>
  );
};