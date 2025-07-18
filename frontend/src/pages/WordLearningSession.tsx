import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardHeader,
  CardBody,
  useToast,
  Badge,
  Progress,
  Spinner,
  Center,
  useColorModeValue,
  Divider,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Select,
  FormControl,
  FormLabel,
  Checkbox,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheck, FaTimes, FaRobot, FaCamera, FaPlus, FaArrowLeft, FaRedo } from 'react-icons/fa';
import { apiService } from '../services/api';
import { VocabularyWord, WordList } from '../types';
import PronunciationButton from '../components/PronunciationButton';

export const WordLearningSession: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose: originalOnClose } = useDisclosure();
  
  const onClose = () => {
    // Reset modal state when closing
    setCreateNewList(false);
    originalOnClose();
  };
  
  const context = location.state?.context as string;
  const difficulty = location.state?.difficulty as 'basic' | 'intermediate' | 'advanced' || 'intermediate';
  
  const [vocabularyWords, setVocabularyWords] = useState<VocabularyWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentWordDetails, setCurrentWordDetails] = useState<VocabularyWord | null>(null);
  const [showWordDetails, setShowWordDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingWordDetails, setLoadingWordDetails] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ url: string; alt: string; source: 'ai' | 'stock' } | null>(null);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [addingToList, setAddingToList] = useState(false);
  const [createNewList, setCreateNewList] = useState(false);
  
  // Session stats
  const [wordsLearned, setWordsLearned] = useState(0);
  const [wordsKnown, setWordsKnown] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const toast = useToast();
  
  const cardBg = useColorModeValue('white', '#1E293B');
  const borderColor = useColorModeValue('gray.200', '#334155');
  const accentBg = useColorModeValue('#F0FDF4', '#1E293B');

  useEffect(() => {
    if (!context) {
      navigate('/learn-new-words');
      return;
    }
    
    // Prevent double initialization
    if (isInitialized) {
      return;
    }
    
    const initialize = async () => {
      setIsInitialized(true);
      setLoading(true);
      
      try {
        // Load word lists and generate vocabulary in parallel
        const [listsResponse, vocabResponse] = await Promise.all([
          apiService.getLists(),
          apiService.generateVocabularyWords(context, difficulty, 15)
        ]);
        
        setWordLists(listsResponse);
        if (listsResponse.length > 0) {
          setSelectedListId(listsResponse[0].id);
        }
        
        setVocabularyWords(vocabResponse.words);
        setCurrentWordIndex(0);
        
        toast({
          title: 'Learning Session Started!',
          description: `Generated ${vocabResponse.words.length} ${difficulty} level words for "${context}"${vocabResponse.excludedWords > 0 ? ` (excluded ${vocabResponse.excludedWords} words you already know)` : ''}`,
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
      } catch (error) {
        console.error('Failed to initialize session:', error);
        toast({
          title: 'Error',
          description: 'Failed to generate vocabulary words. Please try again.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        navigate('/learn-new-words');
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
  }, [context, difficulty, navigate, isInitialized, toast]);


  const currentWord = vocabularyWords[currentWordIndex];
  
  const handleKnowWord = () => {
    setWordsKnown(prev => prev + 1);
    moveToNextWord();
  };

  const handleDontKnowWord = async () => {
    if (!currentWord) return;
    
    setLoadingWordDetails(true);
    setShowWordDetails(true);
    
    try {
      const details = await apiService.getVocabularyWordDetails(currentWord.word, context);
      setCurrentWordDetails(details);
    } catch (error) {
      console.error('Failed to get word details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load word details',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingWordDetails(false);
    }
  };

  const moveToNextWord = () => {
    if (currentWordIndex < vocabularyWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
      setShowWordDetails(false);
      setGeneratedImage(null);
      setCurrentWordDetails(null);
    } else {
      // Session completed
      toast({
        title: 'Session Completed!',
        description: `Great job! You've completed all ${vocabularyWords.length} words.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      navigate('/learn-new-words');
    }
  };

  const handleGenerateImage = async (imageSource: 'ai' | 'stock') => {
    if (!currentWordDetails) return;
    
    setGeneratingImage(imageSource);
    try {
      const combinedPrompt = `${currentWordDetails.word} in ${context} context`;
      const data = await apiService.startDescriptionExercise(combinedPrompt, imageSource);
      
      setGeneratedImage({
        url: data.image.url,
        alt: data.image.alt,
        source: imageSource
      });
      
      toast({
        title: `${imageSource === 'ai' ? 'AI Image' : 'Stock Photo'} Generated!`,
        description: `Generated image for "${currentWordDetails.word}"`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error(`Error generating ${imageSource} image:`, error);
      toast({
        title: 'Error',
        description: `Failed to generate ${imageSource === 'ai' ? 'AI image' : 'stock photo'}`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setGeneratingImage(null);
    }
  };

  const handleAddToList = async () => {
    if (!currentWordDetails) {
      return;
    }

    if (!createNewList && !selectedListId) {
      toast({
        title: 'Error',
        description: 'Please select a word list',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setAddingToList(true);
    try {
      let targetListId = selectedListId;
      
      // Create new list if needed
      if (createNewList) {
        const listName = `📚 ${context}`;
        const newList = await apiService.createList({
          name: listName,
          description: `Vocabulary words learned from "${context}" context`,
          context: context
        });
        
        // Add the new list to state
        setWordLists(prev => [...prev, newList]);
        targetListId = newList.id;
        
        toast({
          title: 'List Created!',
          description: `Created new list: "${listName}"`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      }
      
      // Add word to the target list with existing meaning (saves tokens!)
      await apiService.addWord(targetListId, currentWordDetails.word, currentWordDetails.meaning);
      setWordsLearned(prev => prev + 1);
      
      toast({
        title: 'Word Added!',
        description: `"${currentWordDetails.word}" has been added to your word list`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onClose();
      moveToNextWord();
    } catch (error) {
      console.error('Failed to add word to list:', error);
      toast({
        title: 'Error',
        description: 'Failed to add word to your list',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setAddingToList(false);
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Center>
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text>Generating vocabulary words...</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  if (!currentWord) {
    return (
      <Container maxW="container.xl" py={8}>
        <Center>
          <Text>No words available. Please try again.</Text>
        </Center>
      </Container>
    );
  }

  const progress = ((currentWordIndex + 1) / vocabularyWords.length) * 100;

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', '#0F172A')}>
      <Container maxW="container.xl" py={8} px={{ base: 4, md: 8 }}>
        <VStack spacing={6} align="stretch">
          
          {/* Header with Progress */}
          <HStack justify="space-between" align="center">
            <Button
              leftIcon={<FaArrowLeft />}
              variant="ghost"
              onClick={() => navigate('/learn-new-words')}
              size="lg"
            >
              Back to Context Selection
            </Button>
            
            <VStack spacing={2} align="center" flex={1}>
              <HStack spacing={3}>
                <Text fontSize="lg" fontWeight="bold" color="blue.400">
                  Learning: {context}
                </Text>
                <Badge 
                  colorScheme={
                    difficulty === 'basic' ? 'green' :
                    difficulty === 'intermediate' ? 'orange' : 'red'
                  }
                  variant="solid"
                  fontSize="sm"
                >
                  {difficulty === 'basic' ? '🌱 Basic' :
                   difficulty === 'intermediate' ? '🌳 Intermediate' : '🦅 Advanced'}
                </Badge>
              </HStack>
              <Progress
                value={progress}
                colorScheme="blue"
                size="lg"
                width="300px"
                borderRadius="full"
              />
              <Text fontSize="sm" color="gray.500">
                {currentWordIndex + 1} of {vocabularyWords.length} words
              </Text>
            </VStack>

            <VStack align="end" spacing={1}>
              <Badge colorScheme="green" fontSize="sm">Known: {wordsKnown}</Badge>
              <Badge colorScheme="blue" fontSize="sm">Learned: {wordsLearned}</Badge>
            </VStack>
          </HStack>

          {/* Main Word Card */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth="2px" borderRadius="xl" shadow="lg">
            <CardHeader bg={accentBg} borderTopRadius="xl">
              <HStack justify="space-between" align="center">
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color="gray.600">
                    Word {currentWordIndex + 1}
                  </Text>
                  <Badge 
                    colorScheme={
                      currentWord.difficulty_level === 'basic' ? 'green' :
                      currentWord.difficulty_level === 'intermediate' ? 'orange' : 'red'
                    }
                    variant="solid"
                  >
                    {currentWord.difficulty_level === 'basic' ? '🌱 Basic' :
                     currentWord.difficulty_level === 'intermediate' ? '🌳 Intermediate' : '🦅 Advanced'}
                  </Badge>
                </VStack>
                
                <Button
                  leftIcon={<FaRedo />}
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/learn-new-words')}
                  isLoading={loading}
                >
                  New Session
                </Button>
              </HStack>
            </CardHeader>
            
            <CardBody>
              <VStack spacing={6} align="stretch">
                
                {/* Word Display */}
                <Box textAlign="center" py={8}>
                  <VStack spacing={4}>
                    <HStack spacing={4} justify="center" align="center">
                      <Text fontSize="4xl" fontWeight="bold" color="blue.500">
                        {currentWord.word}
                      </Text>
                      <PronunciationButton
                        text={currentWord.word}
                        type="word"
                        language="en"
                        size="lg"
                        colorScheme="blue"
                        tooltipText="Listen to word pronunciation"
                      />
                    </HStack>
                    
                    <Text fontSize="lg" color="gray.400" mb={4}>
                      Do you know this word?
                    </Text>
                  </VStack>
                  
                  <HStack spacing={6} justify="center">
                    <Button
                      leftIcon={<FaCheck />}
                      colorScheme="green"
                      size="xl"
                      onClick={handleKnowWord}
                      borderRadius="xl"
                      px={12}
                      py={6}
                      fontSize="lg"
                      _hover={{
                        transform: 'translateY(-2px)',
                        shadow: 'lg'
                      }}
                      transition="all 0.2s"
                    >
                      I Know This
                    </Button>
                    
                    <Button
                      leftIcon={<FaTimes />}
                      colorScheme="orange"
                      size="xl"
                      onClick={handleDontKnowWord}
                      isLoading={loadingWordDetails}
                      borderRadius="xl"
                      px={12}
                      py={6}
                      fontSize="lg"
                      _hover={{
                        transform: 'translateY(-2px)',
                        shadow: 'lg'
                      }}
                      transition="all 0.2s"
                    >
                      I Don't Know This
                    </Button>
                  </HStack>
                </Box>

                {/* Word Details Section */}
                {showWordDetails && currentWordDetails && (
                  <Box>
                    <Divider mb={6} />
                    
                    <VStack spacing={6} align="stretch">
                      <Box>
                        <HStack justify="space-between" align="center" mb={3}>
                          <Text fontSize="xl" fontWeight="bold" color="blue.400">
                            📖 Definition
                          </Text>
                          <PronunciationButton
                            text={currentWordDetails.word}
                            type="word"
                            language="en"
                            size="sm"
                            colorScheme="blue"
                            variant="outline"
                            tooltipText="Listen to word pronunciation"
                          />
                        </HStack>
                        <Box p={4} bg={useColorModeValue('gray.50', '#334155')} borderRadius="lg">
                          <Text fontSize="lg">
                            {currentWordDetails.meaning}
                          </Text>
                        </Box>
                      </Box>

                      <Box>
                        <HStack justify="space-between" align="center" mb={3}>
                          <Text fontSize="xl" fontWeight="bold" color="green.400">
                            💡 Example
                          </Text>
                          <PronunciationButton
                            text={currentWordDetails.example}
                            type="sentence"
                            language="en"
                            size="sm"
                            colorScheme="green"
                            variant="outline"
                            tooltipText="Listen to example sentence"
                          />
                        </HStack>
                        <Box p={4} bg={useColorModeValue('green.50', '#1E293B')} borderRadius="lg">
                          <Text fontSize="lg" fontStyle="italic">
                            "{currentWordDetails.example}"
                          </Text>
                        </Box>
                      </Box>

                      {/* Visual Learning Section */}
                      <Box>
                        <HStack justify="space-between" align="center" mb={4}>
                          <Text fontSize="xl" fontWeight="bold" color="purple.400">
                            🎨 Visual Learning
                          </Text>
                          <HStack spacing={3}>
                            <Button
                              leftIcon={<FaRobot />}
                              colorScheme="blue"
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateImage('ai')}
                              isLoading={generatingImage === 'ai'}
                              loadingText="Generating..."
                            >
                              Generate AI Image
                            </Button>
                            
                            <Button
                              leftIcon={<FaCamera />}
                              colorScheme="purple"
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateImage('stock')}
                              isLoading={generatingImage === 'stock'}
                              loadingText="Finding..."
                            >
                              Find Stock Photo
                            </Button>
                          </HStack>
                        </HStack>

                        {generatedImage && (
                          <Box mb={4}>
                            <Text fontSize="sm" color="gray.400" mb={3}>
                              Generated {generatedImage.source === 'ai' ? 'AI Image' : 'Stock Photo'} for "{currentWordDetails.word}":
                            </Text>
                            <Box borderRadius="lg" overflow="hidden" border="2px solid" borderColor="purple.200" shadow="md">
                              <Image
                                src={generatedImage.url}
                                alt={generatedImage.alt}
                                objectFit="contain"
                                w="100%"
                                maxW="400px"
                                mx="auto"
                              />
                            </Box>
                          </Box>
                        )}
                      </Box>

                      {/* Action Buttons */}
                      <HStack spacing={4} justify="center" pt={4}>
                        <Button
                          leftIcon={<FaPlus />}
                          colorScheme="blue"
                          size="lg"
                          onClick={onOpen}
                          borderRadius="lg"
                          _hover={{
                            transform: 'translateY(-2px)',
                            shadow: 'lg'
                          }}
                          transition="all 0.2s"
                        >
                          Add to My List
                        </Button>
                        
                        <Button
                          variant="outline"
                          colorScheme="gray"
                          size="lg"
                          onClick={moveToNextWord}
                          borderRadius="lg"
                          _hover={{
                            transform: 'translateY(-2px)',
                            shadow: 'md'
                          }}
                          transition="all 0.2s"
                        >
                          Skip for Now
                        </Button>
                      </HStack>
                    </VStack>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>

      {/* Add to List Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={2}>
              <Text fontSize="xl">📚</Text>
              <Text color="blue.700" fontWeight="bold">Add "{currentWordDetails?.word}" to List</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <FormControl display="flex" alignItems="center" mb={4}>
                  <Checkbox
                    isChecked={createNewList}
                    onChange={(e) => setCreateNewList(e.target.checked)}
                    colorScheme="blue"
                  >
                    Create new context-specific list
                  </Checkbox>
                </FormControl>
                
                {createNewList ? (
                  <Alert status="info" size="sm">
                    <AlertIcon />
                    <Text fontSize="sm">
                      Will create: "📚 {context.length > 30 ? context.substring(0, 27) + '...' : context}"
                    </Text>
                  </Alert>
                ) : (
                  <FormControl>
                    <FormLabel>Select Existing Word List</FormLabel>
                    <Select
                      value={selectedListId}
                      onChange={(e) => setSelectedListId(e.target.value)}
                      placeholder={wordLists.length === 0 ? "No lists available" : "Choose a list..."}
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
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleAddToList}
              isLoading={addingToList}
              leftIcon={<FaPlus />}
              isDisabled={!createNewList && !selectedListId}
            >
              Add Word
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};