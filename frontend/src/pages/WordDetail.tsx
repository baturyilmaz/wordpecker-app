import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Card,
  CardBody,
  VStack,
  HStack,
  Badge,
  Button,
  Divider,
  useColorModeValue,
  Alert,
  AlertIcon,
  Spinner,
  Center,
  IconButton,
  Flex,
  Progress,
  Collapse,
  useToast,
  Image,
  Checkbox,
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
  FormLabel
} from '@chakra-ui/react';
import { FaArrowLeft, FaLightbulb, FaBookOpen, FaEye, FaEyeSlash, FaCamera, FaRobot, FaExchangeAlt, FaPlus } from 'react-icons/fa';
import { apiService } from '../services/api';
import { WordDetail, SentenceExample, SimilarWordsResponse, WordList } from '../types';
import PronunciationButton from '../components/PronunciationButton';

export function WordDetailPage() {
  const { wordId } = useParams<{ wordId: string }>();
  const navigate = useNavigate();
  
  const [wordDetail, setWordDetail] = useState<WordDetail | null>(null);
  const [sentences, setSentences] = useState<SentenceExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentencesLoading, setSentencesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSentences, setShowSentences] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<{ url: string; alt: string; source: 'ai' | 'stock' } | null>(null);
  const [selectedContextIndex, setSelectedContextIndex] = useState<number>(0);
  const [similarWords, setSimilarWords] = useState<SimilarWordsResponse | null>(null);
  const [similarWordsLoading, setSimilarWordsLoading] = useState(false);
  const [showSimilarWords, setShowSimilarWords] = useState(false);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [createNewList, setCreateNewList] = useState(false);
  const [addingWords, setAddingWords] = useState(false);
  
  const { isOpen, onOpen, onClose: originalOnClose } = useDisclosure();
  
  const onClose = () => {
    // Reset modal state when closing
    setCreateNewList(false);
    originalOnClose();
  };
  
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'slate.800');
  const borderColor = useColorModeValue('gray.200', 'slate.600');

  useEffect(() => {
    loadWordDetail();
    loadWordLists();
  }, [wordId]);

  const loadWordDetail = async () => {
    if (!wordId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiService.getWordDetails(wordId);
      setWordDetail(data);
    } catch (err) {
      setError('Failed to load word details');
      console.error('Error loading word details:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSentences = async () => {
    if (!wordId || sentencesLoading) return;
    
    setSentencesLoading(true);
    
    try {
      // Pass the selected context index to generate examples for only that context
      const data = await apiService.generateWordSentences(wordId, selectedContextIndex);
      setSentences(data.examples);
      setShowSentences(true);
      
      const selectedContext = wordDetail?.contexts[selectedContextIndex];
      toast({
        title: 'Examples Generated!',
        description: selectedContext ? 
          `Generated examples for "${wordDetail?.value}" in ${selectedContext.listContext || selectedContext.listName} context` :
          `Generated examples for "${wordDetail?.value}"`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error loading sentences:', err);
      toast({
        title: 'Error',
        description: 'Failed to generate example sentences. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSentencesLoading(false);
    }
  };

  const loadSimilarWords = async () => {
    if (!wordId || similarWordsLoading) return;
    
    setSimilarWordsLoading(true);
    
    try {
      // Use the selected context index (for visual learning) for similar words generation
      const data = await apiService.generateSimilarWords(wordId, selectedContextIndex);
      setSimilarWords(data);
      setShowSimilarWords(true);
      
      toast({
        title: 'Similar Words Generated!',
        description: `Found ${data.similar_words?.synonyms?.length || 0} synonyms and ${data.similar_words?.interchangeable_words?.length || 0} interchangeable words`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error loading similar words:', err);
      toast({
        title: 'Error',
        description: 'Failed to generate similar words. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSimilarWordsLoading(false);
    }
  };

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

  const handleAddSelectedWords = async () => {
    if (!similarWords || selectedWords.length === 0) {
      toast({
        title: 'No Words Selected',
        description: 'Please select at least one word to add',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!createNewList && !selectedListId) {
      toast({
        title: 'No List Selected',
        description: 'Please select a word list or create a new one',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setAddingWords(true);
    try {
      let targetListId = selectedListId;
      
      // Create new list if needed
      if (createNewList) {
        const listName = `📚 ${similarWords.context}`;
        const newList = await apiService.createList({
          name: listName,
          description: `Similar words to "${similarWords.word}" in ${similarWords.context} context`,
          context: similarWords.context
        });
        
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

      // Get all words (synonyms + interchangeable) and filter selected ones
      const allWords = [
        ...similarWords.similar_words.synonyms,
        ...similarWords.similar_words.interchangeable_words
      ];
      
      const selectedWordObjects = allWords.filter(word => selectedWords.includes(word.word));
      
      // Add each selected word to the list
      let addedCount = 0;
      const failedWords: string[] = [];
      
      for (const wordObj of selectedWordObjects) {
        try {
          await apiService.addWord(targetListId, wordObj.word);
          addedCount++;
        } catch (error) {
          console.error(`Failed to add word ${wordObj.word}:`, error);
          failedWords.push(wordObj.word);
        }
      }
      
      if (addedCount > 0) {
        toast({
          title: 'Words Added!',
          description: `Added ${addedCount} word${addedCount > 1 ? 's' : ''} to your list${failedWords.length > 0 ? `. Failed to add: ${failedWords.join(', ')}` : ''}`,
          status: addedCount === selectedWordObjects.length ? 'success' : 'warning',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add any words to the list',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
      
      // Reset selection and close modal
      setSelectedWords([]);
      onClose();
    } catch (error) {
      console.error('Failed to add words to list:', error);
      toast({
        title: 'Error',
        description: 'Failed to add words to your list',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setAddingWords(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleGenerateWordImage = async (imageSource: 'ai' | 'stock') => {
    if (!wordDetail || !wordDetail.contexts[selectedContextIndex]) return;
    
    const selectedContext = wordDetail.contexts[selectedContextIndex];
    const contextName = selectedContext.listContext || selectedContext.listName;
    
    // Combine word and context for better image generation
    const combinedPrompt = `${wordDetail.value} in ${contextName} context`;
    
    setGeneratingImage(imageSource);
    try {
      // Use the combined word+context prompt for image generation
      const data = await apiService.startDescriptionExercise(combinedPrompt, imageSource);
      
      // Store the generated image to display below
      setGeneratedImage({
        url: data.image.url,
        alt: data.image.alt,
        source: imageSource
      });
      
      toast({
        title: `${imageSource === 'ai' ? 'AI Image' : 'Stock Photo'} Generated!`,
        description: `Generated image for "${wordDetail.value}" in ${contextName} context`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error(`Error generating ${imageSource} image:`, error);
      toast({
        title: 'Error',
        description: `Failed to generate ${imageSource === 'ai' ? 'AI image' : 'stock photo'}. Please try again.`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setGeneratingImage(null);
    }
  };

  const getProgressColor = (learnedPoint: number) => {
    if (learnedPoint >= 80) return 'green';
    if (learnedPoint >= 60) return 'blue';
    if (learnedPoint >= 40) return 'yellow';
    return 'red';
  };

  if (loading) {
    return (
      <Container maxW="4xl" py={8}>
        <Center>
          <Spinner size="xl" color="blue.500" />
        </Center>
      </Container>
    );
  }

  if (error || !wordDetail) {
    return (
      <Container maxW="4xl" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error || 'Word not found'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="4xl" py={8} px={{ base: 4, md: 8 }}>
      {/* Header */}
      <Flex mb={6} gap={4} align="center" wrap="wrap">
        <IconButton
          aria-label="Go back"
          icon={<FaArrowLeft />}
          onClick={handleBack}
          variant="ghost"
          size="sm"
          flexShrink={0}
        />
        <Heading 
          as="h1" 
          size={{ base: "xl", md: "2xl" }}
          color="blue.400" 
          wordBreak="break-word"
          flex="1"
          minW="0"
        >
          {wordDetail.value}
        </Heading>
        <PronunciationButton
          text={wordDetail.value}
          type="word"
          language="en" // TODO: Get from user preferences
          size="lg"
          colorScheme="blue"
          tooltipText={`Listen to pronunciation of "${wordDetail.value}"`}
        />
      </Flex>

      {/* Context Selection */}
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between" align="center" wrap="wrap">
          <VStack align="start" spacing={1}>
            <Heading as="h2" size={{ base: "md", md: "lg" }} color="blue.400">
              📚 Word Contexts
            </Heading>
            <Text fontSize="sm" color="gray.400">
              Appears in {wordDetail.contexts.length} list{wordDetail.contexts.length !== 1 ? 's' : ''}
            </Text>
          </VStack>
          
          {wordDetail.contexts.length > 1 && (
            <Text fontSize="sm" color="blue.300" fontWeight="medium">
              Selected context applies to examples and similar words
            </Text>
          )}
        </HStack>

        <VStack spacing={3} align="stretch">
          {wordDetail.contexts.map((context, index) => (
            <Card 
              key={index} 
              bg={selectedContextIndex === index ? useColorModeValue('blue.50', 'blue.900') : cardBg}
              borderColor={selectedContextIndex === index ? "blue.400" : borderColor}
              borderWidth={selectedContextIndex === index ? "2px" : "1px"}
              cursor="pointer"
              onClick={() => setSelectedContextIndex(index)}
              _hover={{
                borderColor: "blue.300",
                transform: 'translateY(-1px)',
                shadow: 'md'
              }}
              transition="all 0.2s"
            >
              <CardBody py={4}>
                <Flex direction={{ base: 'column', md: 'row' }} gap={4} align="start">
                  <VStack align="start" spacing={3} flex="1" minW="0">
                    <HStack spacing={3} w="full" flexWrap="wrap">
                      <Badge 
                        colorScheme="blue" 
                        variant={selectedContextIndex === index ? "solid" : "subtle"}
                        fontSize="sm"
                        px={3}
                        py={1}
                        borderRadius="full"
                      >
                        <HStack spacing={2}>
                          <FaBookOpen size="12" />
                          <Text fontWeight="medium">
                            {context.listName}
                          </Text>
                        </HStack>
                      </Badge>
                      
                      {context.listContext && (
                        <Badge 
                          colorScheme="green" 
                          variant={selectedContextIndex === index ? "solid" : "subtle"}
                          fontSize="sm"
                          px={3}
                          py={1}
                          borderRadius="full"
                        >
                          <Text fontWeight="medium">
                            {context.listContext}
                          </Text>
                        </Badge>
                      )}
                      
                      {selectedContextIndex === index && (
                        <Badge 
                          colorScheme="orange" 
                          variant="solid"
                          fontSize="xs"
                          px={2}
                          py={1}
                          borderRadius="full"
                        >
                          SELECTED
                        </Badge>
                      )}
                    </HStack>
                    
                    <Text fontSize="md" fontWeight="medium" wordBreak="break-word" lineHeight="1.6">
                      {context.meaning}
                    </Text>
                  </VStack>
                  
                  <VStack align="end" spacing={2} flexShrink={0}>
                    <Text fontSize="sm" color="gray.400" textAlign="right" fontWeight="medium">
                      Progress
                    </Text>
                    <VStack spacing={1} align="end">
                      <Text fontSize="sm" fontWeight="bold" color={getProgressColor(context.learnedPoint) + '.400'}>
                        {context.learnedPoint}/100
                      </Text>
                      <Progress
                        value={context.learnedPoint}
                        colorScheme={getProgressColor(context.learnedPoint)}
                        size="md"
                        width="120px"
                        borderRadius="full"
                      />
                    </VStack>
                  </VStack>
                </Flex>
              </CardBody>
            </Card>
          ))}
        </VStack>
        
        {wordDetail.contexts.length === 1 && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">
              This word appears in only one list. All generated examples and similar words will use this context.
            </Text>
          </Alert>
        )}
      </VStack>

      <Divider my={8} />

      {/* Sentence Examples Section */}
      <VStack align="stretch" spacing={4}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
          <HStack minW="0" flex="1">
            <FaLightbulb color="orange" />
            <Heading as="h2" size={{ base: "md", md: "lg" }} color="orange.300" wordBreak="break-word">
              Example Sentences
            </Heading>
          </HStack>
          <Button
            leftIcon={showSentences ? <FaEyeSlash /> : <FaEye />}
            onClick={() => showSentences ? setShowSentences(false) : loadSentences()}
            colorScheme="orange"
            variant="outline"
            size="sm"
            isLoading={sentencesLoading}
            loadingText="Generating..."
            flexShrink={0}
          >
            {showSentences ? 'Hide' : 'Generate'} Examples
          </Button>
        </Flex>

        <Collapse in={showSentences} animateOpacity>
          <VStack align="stretch" spacing={3}>
            {sentences.map((example, index) => (
              <Card key={index} bg={cardBg} borderColor={borderColor} borderWidth="1px">
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    {/* Example Sentence */}
                    <Box>
                      <HStack justify="space-between" align="center" mb={1}>
                        <Text fontSize="xs" fontWeight="bold" color="blue.400" textTransform="uppercase">
                          Example Sentence
                        </Text>
                        <PronunciationButton
                          text={example.sentence}
                          type="sentence"
                          language="en" // TODO: Get from user preferences
                          size="sm"
                          colorScheme="blue"
                          tooltipText="Listen to example sentence"
                        />
                      </HStack>
                      <Text fontSize="lg" fontStyle="italic" wordBreak="break-word" lineHeight="1.6" fontWeight="medium">
                        "{example.sentence}"
                      </Text>
                    </Box>
                    
                    {/* Translation */}
                    {example.translation && (
                      <Box>
                        <Text fontSize="xs" fontWeight="bold" color="green.400" mb={1} textTransform="uppercase">
                          Translation
                        </Text>
                        <Text fontSize="md" color="gray.300" wordBreak="break-word" lineHeight="1.5" fontWeight="medium">
                          🌐 {example.translation}
                        </Text>
                      </Box>
                    )}
                    
                    {/* Context Note */}
                    {(example.context_note || example.explanation) && (
                      <Box>
                        <Text fontSize="xs" fontWeight="bold" color="purple.400" mb={1} textTransform="uppercase">
                          Context & Usage
                        </Text>
                        <Text fontSize="sm" color="gray.400" wordBreak="break-word" lineHeight="1.5">
                          💡 {example.context_note || example.explanation}
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            ))}
            
            {sentences.length === 0 && showSentences && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                No examples available for this context.
              </Alert>
            )}
          </VStack>
        </Collapse>
      </VStack>

      <Divider my={8} />

      {/* Visual Learning Section */}
      <VStack align="stretch" spacing={4}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
          <HStack minW="0" flex="1">
            <FaCamera color="purple" />
            <Heading as="h2" size={{ base: "md", md: "lg" }} color="purple.300" wordBreak="break-word">
              Visual Learning
            </Heading>
          </HStack>
          <HStack spacing={3} flexShrink={0}>
            <Button
              leftIcon={<FaRobot />}
              onClick={() => handleGenerateWordImage('ai')}
              colorScheme="blue"
              variant="outline"
              size="sm"
              isLoading={generatingImage === 'ai'}
              loadingText="Generating..."
              flexShrink={0}
            >
              Generate AI Image
            </Button>
            
            <Button
              leftIcon={<FaCamera />}
              onClick={() => handleGenerateWordImage('stock')}
              colorScheme="purple"
              variant="outline"
              size="sm"
              isLoading={generatingImage === 'stock'}
              loadingText="Finding..."
              flexShrink={0}
            >
              Find Stock Photo
            </Button>
          </HStack>
        </Flex>

        {/* Generated Image Display */}
        {generatedImage && (
          <Box>
            <Text fontSize="sm" color="gray.400" mb={3}>
              Generated {generatedImage.source === 'ai' ? 'AI Image' : 'Stock Photo'} for "{wordDetail.value}":
            </Text>
            <Box borderRadius="lg" overflow="hidden" border="2px solid" borderColor="purple.200" shadow="md">
              <Image
                src={generatedImage.url}
                alt={generatedImage.alt}
                objectFit="contain"
                w="100%"
                maxW="500px"
                mx="auto"
              />
            </Box>
          </Box>
        )}
      </VStack>

      <Divider my={8} />

      {/* Similar Words Section */}
      <VStack align="stretch" spacing={4}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
          <HStack minW="0" flex="1">
            <FaExchangeAlt color="teal" />
            <Heading as="h2" size={{ base: "md", md: "lg" }} color="teal.300" wordBreak="break-word">
              Similar Words
            </Heading>
          </HStack>
          <Button
            leftIcon={showSimilarWords ? <FaEyeSlash /> : <FaExchangeAlt />}
            onClick={() => showSimilarWords ? setShowSimilarWords(false) : loadSimilarWords()}
            colorScheme="teal"
            variant="outline"
            size="sm"
            isLoading={similarWordsLoading}
            loadingText="Finding..."
            flexShrink={0}
          >
            {showSimilarWords ? 'Hide' : 'Get'} Similar Words
          </Button>
        </Flex>

        <Collapse in={showSimilarWords} animateOpacity>
          {similarWords && (
            <VStack align="stretch" spacing={6}>
              {/* Synonyms Section */}
              {similarWords.similar_words?.synonyms && similarWords.similar_words.synonyms.length > 0 && (
                <Box>
                  <Heading as="h3" size="md" color="teal.400" mb={4} display="flex" alignItems="center" gap={2}>
                    🔄 Synonyms
                    <Badge colorScheme="teal" variant="subtle" fontSize="sm">
                      {similarWords.similar_words.synonyms.length}
                    </Badge>
                  </Heading>
                  <Text fontSize="sm" color="gray.400" mb={3}>
                    Words with very similar meanings that can often replace "{wordDetail.value}"
                  </Text>
                  <VStack align="stretch" spacing={3}>
                    {similarWords.similar_words.synonyms.map((synonym, index) => (
                      <Card key={index} bg={cardBg} borderColor={borderColor} borderWidth="1px">
                        <CardBody py={3}>
                          <HStack align="start" spacing={3}>
                            <Checkbox
                              isChecked={selectedWords.includes(synonym.word)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedWords(prev => [...prev, synonym.word]);
                                } else {
                                  setSelectedWords(prev => prev.filter(w => w !== synonym.word));
                                }
                              }}
                              colorScheme="teal"
                              size="lg"
                              mt={1}
                            />
                            <VStack align="stretch" spacing={2} flex={1}>
                              <HStack justify="space-between" align="start">
                                <Text fontSize="lg" fontWeight="bold" color="teal.300" wordBreak="break-word">
                                  {synonym.word}
                                </Text>
                                <Badge colorScheme="teal" variant="outline" fontSize="xs" flexShrink={0}>
                                  Synonym
                                </Badge>
                              </HStack>
                              <Text fontSize="md" wordBreak="break-word" lineHeight="1.5">
                                {synonym.meaning}
                              </Text>
                              <Text fontSize="md" fontStyle="italic" wordBreak="break-word" lineHeight="1.5" color="gray.600">
                                "{synonym.example}"
                              </Text>
                              {synonym.usage_note && (
                                <Text fontSize="sm" color="gray.400" fontStyle="italic" wordBreak="break-word">
                                  💡 {synonym.usage_note}
                                </Text>
                              )}
                            </VStack>
                          </HStack>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* Interchangeable Words Section */}
              {similarWords.similar_words.interchangeable_words.length > 0 && (
                <Box>
                  <Heading as="h3" size="md" color="cyan.400" mb={4} display="flex" alignItems="center" gap={2}>
                    ↔️ Interchangeable Words
                    <Badge colorScheme="cyan" variant="subtle" fontSize="sm">
                      {similarWords.similar_words.interchangeable_words.length}
                    </Badge>
                  </Heading>
                  <Text fontSize="sm" color="gray.400" mb={3}>
                    Words that can be used instead of "{wordDetail.value}" in many contexts
                  </Text>
                  <VStack align="stretch" spacing={3}>
                    {similarWords.similar_words.interchangeable_words.map((word, index) => (
                      <Card key={index} bg={cardBg} borderColor={borderColor} borderWidth="1px">
                        <CardBody py={3}>
                          <HStack align="start" spacing={3}>
                            <Checkbox
                              isChecked={selectedWords.includes(word.word)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedWords(prev => [...prev, word.word]);
                                } else {
                                  setSelectedWords(prev => prev.filter(w => w !== word.word));
                                }
                              }}
                              colorScheme="cyan"
                              size="lg"
                              mt={1}
                            />
                            <VStack align="stretch" spacing={2} flex={1}>
                              <HStack justify="space-between" align="start">
                                <Text fontSize="lg" fontWeight="bold" color="cyan.300" wordBreak="break-word">
                                  {word.word}
                                </Text>
                                <Badge colorScheme="cyan" variant="outline" fontSize="xs" flexShrink={0}>
                                  Alternative
                                </Badge>
                              </HStack>
                              <Text fontSize="md" wordBreak="break-word" lineHeight="1.5">
                                {word.meaning}
                              </Text>
                              <Text fontSize="md" fontStyle="italic" wordBreak="break-word" lineHeight="1.5" color="gray.600">
                                "{word.example}"
                              </Text>
                              {word.usage_note && (
                                <Text fontSize="sm" color="gray.400" fontStyle="italic" wordBreak="break-word">
                                  💡 {word.usage_note}
                                </Text>
                              )}
                            </VStack>
                          </HStack>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* Add Selected Words Button */}
              {(similarWords.similar_words.synonyms.length > 0 || similarWords.similar_words.interchangeable_words.length > 0) && (
                <Box textAlign="center" pt={4}>
                  <Text fontSize="sm" color="gray.400" mb={3}>
                    {selectedWords.length > 0 ? (
                      `${selectedWords.length} word${selectedWords.length > 1 ? 's' : ''} selected`
                    ) : (
                      'Select words to add to your lists'
                    )}
                  </Text>
                  <Button
                    leftIcon={<FaPlus />}
                    onClick={onOpen}
                    colorScheme="teal"
                    size="lg"
                    isDisabled={selectedWords.length === 0}
                    borderRadius="lg"
                    _hover={{
                      transform: 'translateY(-2px)',
                      shadow: 'lg'
                    }}
                    transition="all 0.2s"
                  >
                    Add Selected Words to List
                  </Button>
                </Box>
              )}

              {/* Empty State */}
              {(!similarWords.similar_words.synonyms.length && !similarWords.similar_words.interchangeable_words.length) && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  No similar words found for this context. Try a different context or word.
                </Alert>
              )}
            </VStack>
          )}
        </Collapse>
      </VStack>

      {/* Word Metadata */}
      <Box mt={8} pt={4} borderTop="1px" borderColor={borderColor}>
        <HStack justify="space-between" fontSize="sm" color="gray.500">
          <Text>Word created: {new Date(wordDetail.created_at).toLocaleDateString()}</Text>
          <Text>Last updated: {new Date(wordDetail.updated_at).toLocaleDateString()}</Text>
        </HStack>
      </Box>

      {/* Add Words to List Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={2}>
              <Text fontSize="xl">📚</Text>
              <Text color="teal.700" fontWeight="bold">
                Add {selectedWords.length} Word{selectedWords.length > 1 ? 's' : ''} to List
              </Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Selected Words Preview */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" color="teal.600" mb={2}>
                  Selected Words:
                </Text>
                <Box p={3} bg={useColorModeValue('teal.50', 'teal.900')} borderRadius="md" border="1px solid" borderColor="teal.200">
                  <Text fontSize="sm" color={useColorModeValue('teal.800', 'teal.100')} fontWeight="medium">
                    {selectedWords.join(', ')}
                  </Text>
                </Box>
              </Box>

              <Box>
                <FormControl display="flex" alignItems="center" mb={4}>
                  <Checkbox
                    isChecked={createNewList}
                    onChange={(e) => setCreateNewList(e.target.checked)}
                    colorScheme="teal"
                  >
                    Create new context-specific list
                  </Checkbox>
                </FormControl>
                
                {createNewList ? (
                  <Alert status="info" size="sm">
                    <AlertIcon />
                    <Text fontSize="sm">
                      Will create: "📚 {similarWords?.context && similarWords.context.length > 30 ? similarWords.context.substring(0, 27) + '...' : similarWords?.context}"
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
              colorScheme="teal"
              onClick={handleAddSelectedWords}
              isLoading={addingWords}
              leftIcon={<FaPlus />}
              isDisabled={!createNewList && !selectedListId}
            >
              Add {selectedWords.length} Word{selectedWords.length > 1 ? 's' : ''}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}