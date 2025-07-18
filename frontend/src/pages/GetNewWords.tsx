import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  Card,
  CardBody,
  useToast,
  Badge,
  Wrap,
  WrapItem,
  Spinner,
  Center,
  useColorModeValue,
  Divider,
  RadioGroup,
  Radio,
  Flex
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FaRandom, FaArrowRight } from 'react-icons/fa';
import { apiService } from '../services/api';
import { WordList } from '../types';

export const GetNewWords: React.FC = () => {
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [customContext, setCustomContext] = useState('');
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'basic' | 'intermediate' | 'advanced'>('intermediate');
  const [loading, setLoading] = useState(true);
  const [generatingContext, setGeneratingContext] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  
  const navigate = useNavigate();
  const toast = useToast();
  
  const cardBg = useColorModeValue('white', '#1E293B');
  const borderColor = useColorModeValue('gray.200', '#334155');

  useEffect(() => {
    loadWordLists();
  }, []);

  const loadWordLists = async () => {
    try {
      const lists = await apiService.getLists();
      setWordLists(lists);
    } catch (error) {
      console.error('Failed to load word lists:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your word lists',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRandomContext = async () => {
    setGeneratingContext(true);
    try {
      const suggestions = await apiService.getContextSuggestions();
      if (suggestions.suggestions.length > 0) {
        const randomContext = suggestions.suggestions[0];
        setSelectedContext(randomContext);
        setCustomContext(randomContext);
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

  const handleStartLearning = async () => {
    const contextToUse = selectedContext || customContext.trim();
    
    if (!contextToUse) {
      toast({
        title: 'No Context Selected',
        description: 'Please select a context or enter a custom one',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setStartingSession(true);
    try {
      // Navigate to the learning session with the selected context and difficulty
      navigate('/learn-new-words/session', { 
        state: { 
          context: contextToUse,
          difficulty: selectedDifficulty
        }
      });
    } catch (error) {
      console.error('Failed to start learning session:', error);
      toast({
        title: 'Error',
        description: 'Failed to start learning session',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setStartingSession(false);
    }
  };

  const handleContextSelect = (context: string) => {
    setSelectedContext(context);
    setCustomContext(context);
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Center>
          <Spinner size="xl" color="blue.500" />
        </Center>
      </Container>
    );
  }

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', '#0F172A')}>
      <Container maxW="container.xl" py={8} px={{ base: 4, md: 8 }}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
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
                  <Text fontSize="4xl">📚</Text>
                  <Text fontSize="3xl">🎓</Text>
                </Flex>
                Get New Words
              </Heading>
              <Text mt={2} color="gray.400" fontSize="lg">
                Discover and learn new vocabulary words in your preferred context. Choose from existing contexts or create your own!
              </Text>
            </Box>
          </Flex>

          {/* Context Selection */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth="2px" borderRadius="xl" shadow="lg">
            <CardBody>
              <VStack spacing={6} align="stretch">
                
                {/* Existing List Contexts */}
                {wordLists.filter(list => list.context).length > 0 && (
                  <Box>
                    <Text fontSize="lg" fontWeight="semibold" color="blue.400" mb={4}>
                      📚 Your Existing Contexts
                    </Text>
                    <Wrap spacing={3}>
                      {wordLists
                        .filter(list => list.context)
                        .map((list) => (
                          <WrapItem key={list.id}>
                            <Button
                              variant={selectedContext === list.context ? "solid" : "outline"}
                              colorScheme="blue"
                              onClick={() => handleContextSelect(list.context!)}
                              size="md"
                              borderRadius="lg"
                              _hover={{
                                transform: 'translateY(-2px)',
                                shadow: 'md'
                              }}
                              transition="all 0.2s"
                            >
                              <Text fontSize="sm" fontWeight="bold">
                                {list.context}
                              </Text>
                            </Button>
                          </WrapItem>
                        ))}
                    </Wrap>
                  </Box>
                )}

                <Divider />

                {/* Custom Context Input */}
                <Box>
                  <FormControl>
                    <FormLabel color="green.400" fontSize="lg" fontWeight="semibold">
                      ✍️ Create Custom Context
                    </FormLabel>
                    <HStack spacing={3}>
                      <Input
                        value={customContext}
                        onChange={(e) => {
                          setCustomContext(e.target.value);
                          setSelectedContext(e.target.value);
                        }}
                        placeholder="e.g., Space exploration, Medieval history, Cooking techniques..."
                        size="lg"
                        borderColor={selectedContext === customContext ? "green.400" : borderColor}
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
                    <Text fontSize="sm" color="gray.500" mt={2}>
                      Enter any learning context or topic you're interested in exploring
                    </Text>
                  </FormControl>
                </Box>

                <Divider />

                {/* Difficulty Selection */}
                <Box>
                  <FormControl>
                    <FormLabel color="purple.400" fontSize="lg" fontWeight="semibold">
                      🎯 Choose Difficulty Level
                    </FormLabel>
                    <RadioGroup 
                      value={selectedDifficulty} 
                      onChange={(value) => setSelectedDifficulty(value as 'basic' | 'intermediate' | 'advanced')}
                      colorScheme="purple"
                    >
                      <VStack align="start" spacing={3}>
                        <Radio value="basic" size="lg">
                          <VStack align="start" spacing={1}>
                            <HStack>
                              <Text fontWeight="medium">🌱 Basic</Text>
                              <Badge colorScheme="green" variant="subtle">Beginner</Badge>
                            </HStack>
                            <Text fontSize="sm" color="gray.500">
                              Common, everyday words that beginners should know
                            </Text>
                          </VStack>
                        </Radio>
                        <Radio value="intermediate" size="lg">
                          <VStack align="start" spacing={1}>
                            <HStack>
                              <Text fontWeight="medium">🌳 Intermediate</Text>
                              <Badge colorScheme="orange" variant="subtle">Developing</Badge>
                            </HStack>
                            <Text fontSize="sm" color="gray.500">
                              More sophisticated words for developing learners
                            </Text>
                          </VStack>
                        </Radio>
                        <Radio value="advanced" size="lg">
                          <VStack align="start" spacing={1}>
                            <HStack>
                              <Text fontWeight="medium">🦅 Advanced</Text>
                              <Badge colorScheme="red" variant="subtle">Proficient</Badge>
                            </HStack>
                            <Text fontSize="sm" color="gray.500">
                              Complex, nuanced words for proficient learners
                            </Text>
                          </VStack>
                        </Radio>
                      </VStack>
                    </RadioGroup>
                    <Text fontSize="sm" color="gray.500" mt={3}>
                      AI will generate words you don't already have in similar contexts
                    </Text>
                  </FormControl>
                </Box>

                <Divider />

                {/* Start Learning Button */}
                <Box textAlign="center">
                  <Text fontSize="md" color="gray.400" mb={4}>
                    {selectedContext ? (
                      <>
                        Ready to learn new words in: <Text as="span" fontWeight="bold" color="blue.400">"{selectedContext}"</Text>
                      </>
                    ) : (
                      'Select or enter a context to start learning'
                    )}
                  </Text>
                  
                  <Button
                    rightIcon={<FaArrowRight />}
                    onClick={handleStartLearning}
                    colorScheme="blue"
                    size="xl"
                    isDisabled={!selectedContext && !customContext.trim()}
                    isLoading={startingSession}
                    loadingText="Starting Session..."
                    borderRadius="xl"
                    px={12}
                    py={6}
                    fontSize="lg"
                    fontWeight="bold"
                    shadow="lg"
                    _hover={{ 
                      shadow: "xl", 
                      transform: "translateY(-3px)"
                    }}
                    _active={{
                      transform: "translateY(-1px)"
                    }}
                    transition="all 0.3s"
                  >
                    Start Learning New Words
                  </Button>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
};