import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Text,
  Flex,
  IconButton,
  VStack,
  HStack,
  Badge,
  Card,
  CardBody,
  useColorModeValue,
  Spinner,
  Center,
  Divider,
  useToast,
  Portal
} from '@chakra-ui/react';
import { FaArrowLeft, FaBookOpen, FaClock, FaUser, FaTrophy } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { LightReading } from '../types';
import PronunciationButton from '../components/PronunciationButton';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

// CSS animations defined as CSS strings for better compatibility
const floatAnimation = '3s ease-in-out infinite';

export function ReadingPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  
  const [reading, setReading] = useState<LightReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredWord, setHoveredWord] = useState<{ word: string; definition: string; x: number; y: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const bgGradient = useColorModeValue(
    'linear(to-br, gray.50, blue.50, purple.50)',
    'linear(to-br, gray.900, blue.900, purple.900)'
  );

  useEffect(() => {
    // Get reading data from navigation state
    const state = location.state as { reading?: LightReading; list?: any; level?: string };
    
    if (state?.reading) {
      setReading(state.reading);
      setLoading(false);
    } else {
      // If no state, redirect back to list
      toast({
        title: 'No reading data found',
        description: 'Please generate a new reading from the word list.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      navigate(`/lists/${listId}`);
    }
  }, [location.state, listId, navigate, toast]);

  useEffect(() => {
    if (reading && contentRef.current) {
      // Add event listeners for highlighted words
      const highlightedElements = contentRef.current.querySelectorAll('.highlighted-word');
      const cleanupFunctions: (() => void)[] = [];
      
      highlightedElements.forEach((element) => {
        const handleMouseEnter = (e: Event) => {
          // Clear any existing timeout
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
          
          const target = e.target as HTMLElement;
          const rect = target.getBoundingClientRect();
          const definition = target.getAttribute('data-definition') || '';
          const word = target.textContent || '';
          
          setHoveredWord({
            word,
            definition,
            x: rect.left + rect.width / 2,
            y: rect.top - 10
          });
        };

        const handleMouseLeave = () => {
          // Clear any existing timeout
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
          
          // Add a small delay before hiding tooltip
          hoverTimeoutRef.current = setTimeout(() => {
            setHoveredWord(null);
          }, 100);
        };

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);

        // Store cleanup function
        cleanupFunctions.push(() => {
          element.removeEventListener('mouseenter', handleMouseEnter);
          element.removeEventListener('mouseleave', handleMouseLeave);
        });
      });

      // Return cleanup function that cleans up all listeners
      return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
        // Clear any pending timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
      };
    }
  }, [reading?.text]); // Only re-run when the text content changes

  const renderHighlightedContent = () => {
    if (!reading) return '';
    
    let processedText = reading.text;
    
    // Sort highlighted words by length (longest first) to avoid partial replacements
    const sortedWords = [...reading.highlighted_words].sort((a, b) => b.word.length - a.word.length);
    
    sortedWords.forEach((hw) => {
      const wordRegex = new RegExp(`\\b${hw.word}\\b`, 'gi');
      processedText = processedText.replace(wordRegex, (match) => 
        `<mark class="highlighted-word" data-definition="${hw.definition}">${match}</mark>`
      );
    });
    
    return processedText;
  };

  const handleBack = () => {
    navigate(`/lists/${listId}`);
  };

  if (loading) {
    return (
      <Container maxW="4xl" py={8}>
        <Center>
          <Spinner size="xl" color="purple.500" />
        </Center>
      </Container>
    );
  }

  if (!reading) {
    return (
      <Container maxW="4xl" py={8}>
        <Text>No reading data available</Text>
      </Container>
    );
  }

  return (
    <Box h="100vh" bgGradient={bgGradient} position="relative" overflow="hidden">
      {/* Floating Background Elements */}
      <Box
        position="absolute"
        top="10%"
        left="5%"
        w="200px"
        h="200px"
        opacity={0.1}
        style={{ animation: floatAnimation }}
      >
        <img src="/wordpecker-moscot.png" alt="WordPecker" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </Box>
      <Box
        position="absolute"
        top="60%"
        right="10%"
        w="80px"
        h="80px"
        borderRadius="full"
        bg="purple.200"
        opacity={0.1}
        style={{ animation: floatAnimation }}
      />
      <Box
        position="absolute"
        bottom="20%"
        left="15%"
        w="150px"
        h="150px"
        opacity={0.08}
        style={{ animation: floatAnimation }}
      >
        <img src="/wordpecker-moscot.png" alt="WordPecker" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </Box>

      <Container maxW="container.lg" py={4} h="100vh">
        <VStack spacing={6} h="full">
          {/* Header */}
          <MotionFlex
            w="full"
            justify="space-between"
            align="center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HStack spacing={4}>
              <IconButton
                aria-label="Go back"
                icon={<FaArrowLeft />}
                variant="ghost"
                size="lg"
                onClick={handleBack}
                _hover={{ transform: 'translateX(-2px)' }}
                transition="all 0.2s"
              />
              <VStack align="flex-start" spacing={1}>
                <Text 
                  fontSize="2xl" 
                  fontWeight="bold" 
                  color="purple.600"
                  textShadow="2px 2px 4px rgba(0,0,0,0.1)"
                >
                  {reading.title}
                </Text>
                <Text 
                  fontSize="md" 
                  color="gray.700" 
                  fontWeight="medium"
                  textShadow="1px 1px 2px rgba(0,0,0,0.1)"
                >
                  {reading.theme}
                </Text>
              </VStack>
            </HStack>

            <HStack spacing={2}>
              <Badge colorScheme="purple" variant="subtle" px={3} py={1}>
                <HStack spacing={1}>
                  <FaBookOpen />
                  <Text>Reading</Text>
                </HStack>
              </Badge>
              <Badge colorScheme="blue" variant="subtle" px={3} py={1}>
                <HStack spacing={1}>
                  <FaUser />
                  <Text>{reading.difficulty_level.charAt(0).toUpperCase() + reading.difficulty_level.slice(1)}</Text>
                </HStack>
              </Badge>
              <Badge colorScheme="green" variant="subtle" px={3} py={1}>
                <HStack spacing={1}>
                  <FaClock />
                  <Text>{Math.max(1, Math.ceil(reading.word_count / 200))} min</Text>
                </HStack>
              </Badge>
            </HStack>
          </MotionFlex>

          {/* Main Reading Area */}
          <MotionBox
            flex={1}
            w="full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            overflow="hidden"
          >
            <Card h="full" shadow="2xl" borderRadius="3xl" overflow="hidden">
              <CardBody p={0} h="full" display="flex" flexDirection="column">
                <VStack h="full" spacing={0} flex={1}>
                  {/* Reading Content */}
                  <Box 
                    flex={1} 
                    w="full" 
                    overflowY="auto"
                    overflowX="hidden"
                    px={6}
                    py={4}
                    css={{
                      '&::-webkit-scrollbar': {
                        width: '4px',
                      },
                      '&::-webkit-scrollbar-track': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'linear-gradient(to bottom, #9F7AEA, #805AD5)',
                        borderRadius: '24px',
                      },
                    }}
                  >
                    {/* Instructions */}
                    <MotionBox
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      mb={6}
                      p={4}
                      bg="purple.50"
                      borderRadius="md"
                      borderLeft="4px solid"
                      borderColor="purple.400"
                    >
                      <Text fontSize="sm" color="purple.700">
                        💡 <strong>How to read:</strong> Highlighted words are from your vocabulary list. 
                        Hover over them to see their definitions and practice recognizing them in context.
                      </Text>
                    </MotionBox>

                    {/* Reading Text */}
                    <MotionBox
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <HStack justify="space-between" align="center" mb={4}>
                        <Text fontSize="lg" fontWeight="semibold" color="purple.400">
                          📖 Reading Text
                        </Text>
                        <PronunciationButton
                          text={reading.text}
                          type="sentence"
                          language="en"
                          size="sm"
                          colorScheme="blue"
                          tooltipText="Listen to the full reading"
                        />
                      </HStack>
                      <Box
                        ref={contentRef}
                        fontSize={{ base: "md", md: "lg" }}
                        lineHeight="1.8"
                        color={useColorModeValue('gray.800', 'gray.200')}
                        sx={{
                          '.highlighted-word': {
                            backgroundColor: 'purple.200',
                            color: 'purple.800',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            fontWeight: 'semibold',
                            cursor: 'help',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: 'purple.300',
                              transform: 'scale(1.05)'
                            }
                          }
                        }}
                        dangerouslySetInnerHTML={{ __html: renderHighlightedContent() }}
                      />
                    </MotionBox>
                  </Box>

                  <Divider />

                  {/* Stats Area */}
                  <Box w="full" p={6} flexShrink={0}>
                    <VStack spacing={4}>
                      {/* Reading Stats */}
                      <MotionBox
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        w="full"
                      >
                        <VStack spacing={2}>
                          <HStack justify="space-between" w="full">
                            <Text fontSize="sm" color="gray.600">
                              Reading Progress
                            </Text>
                            <HStack spacing={1}>
                              <FaTrophy color="#9F7AEA" />
                              <Text fontSize="sm" color="gray.600">
                                {reading.highlighted_words.length} vocabulary words
                              </Text>
                            </HStack>
                          </HStack>
                          <HStack justify="space-around" w="full">
                            <VStack spacing={1}>
                              <Text fontSize="xl" fontWeight="bold" color="purple.400">
                                {reading.highlighted_words.length}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                Vocabulary
                              </Text>
                            </VStack>
                            <VStack spacing={1}>
                              <Text fontSize="xl" fontWeight="bold" color="blue.400">
                                {reading.word_count}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                Total Words
                              </Text>
                            </VStack>
                            <VStack spacing={1}>
                              <Text fontSize="xl" fontWeight="bold" color="green.400">
                                {Math.max(1, Math.ceil(reading.word_count / 200))}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                Minutes
                              </Text>
                            </VStack>
                          </HStack>
                        </VStack>
                      </MotionBox>
                    </VStack>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </MotionBox>
        </VStack>
      </Container>

      {/* Custom Tooltip */}
      {hoveredWord && (
        <Portal>
          <Box
            position="fixed"
            left={`${hoveredWord.x}px`}
            top={`${hoveredWord.y}px`}
            transform="translateX(-50%)"
            bg="gray.800"
            color="white"
            px={3}
            py={2}
            borderRadius="md"
            fontSize="sm"
            zIndex={9999}
            maxW="280px"
            textAlign="center"
            boxShadow="lg"
            pointerEvents="none"
          >
            <VStack spacing={2}>
              <Text fontWeight="bold">
                {hoveredWord.word}
              </Text>
              <Text fontSize="xs">
                {hoveredWord.definition}
              </Text>
            </VStack>
          </Box>
        </Portal>
      )}
    </Box>
  );
}