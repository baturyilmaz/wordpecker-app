import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  FormControl,
  FormLabel,
  Switch,
  useToast,
  Card,
  CardHeader,
  CardBody,
  Text,
  Button,
  HStack,
  useColorModeValue,
  Alert,
  AlertIcon,
  Spinner,
  Center,
  Input,
  FormHelperText,
  Badge
} from '@chakra-ui/react';
import { apiService } from '../services/api';
import { ExerciseTypePreferences, UserPreferences } from '../types';

const exerciseTypeLabels = {
  multiple_choice: 'Multiple Choice',
  fill_blank: 'Fill in the Blank',
  matching: 'Matching',
  true_false: 'True/False',
  sentence_completion: 'Sentence Completion'
};

const exerciseTypeDescriptions = {
  multiple_choice: 'Choose the correct definition from multiple options',
  fill_blank: 'Fill in the missing word in a sentence',
  matching: 'Match words with their definitions',
  true_false: 'Determine if statements about words are true or false',
  sentence_completion: 'Complete sentences with the correct word'
};

export const Settings: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    exerciseTypes: {
      multiple_choice: true,
      fill_blank: true,
      matching: true,
      true_false: true,
      sentence_completion: true
    },
    baseLanguage: 'en',
    targetLanguage: 'en'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseLanguageInput, setBaseLanguageInput] = useState('English');
  const [targetLanguageInput, setTargetLanguageInput] = useState('English');
  const [baseLanguageValidation, setBaseLanguageValidation] = useState<{
    isValid: boolean;
    languageCode: string | null;
    standardizedName: string | null;
    parameters: Array<{
      type: 'script' | 'dialect' | 'formality' | 'region' | 'learning_focus';
      value: string;
      description: string;
    }> | null;
    explanation: string | null;
  } | null>(null);
  const [targetLanguageValidation, setTargetLanguageValidation] = useState<{
    isValid: boolean;
    languageCode: string | null;
    standardizedName: string | null;
    parameters: Array<{
      type: 'script' | 'dialect' | 'formality' | 'region' | 'learning_focus';
      value: string;
      description: string;
    }> | null;
    explanation: string | null;
  } | null>(null);
  const [validatingBaseLanguage, setValidatingBaseLanguage] = useState(false);
  const [validatingTargetLanguage, setValidatingTargetLanguage] = useState(false);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await apiService.getPreferences();
      setPreferences(data);
      // Initialize input fields with current language names
      const baseLangName = getLanguageDisplayName(data.baseLanguage);
      const targetLangName = getLanguageDisplayName(data.targetLanguage);
      setBaseLanguageInput(baseLangName);
      setTargetLanguageInput(targetLangName);
      
      // Set validation states as valid for existing saved languages
      setBaseLanguageValidation({
        isValid: true,
        languageCode: data.baseLanguage,
        standardizedName: baseLangName,
        parameters: null,
        explanation: null
      });
      setTargetLanguageValidation({
        isValid: true,
        languageCode: data.targetLanguage,
        standardizedName: targetLangName,
        parameters: null,
        explanation: null
      });
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load preferences. Using default settings.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const getLanguageDisplayName = (code: string): string => {
    // Common language mappings for display
    const commonLanguages: Record<string, string> = {
      'en': 'English',
      'tr': 'Turkish',
      'es': 'Spanish',
      'de': 'German',
      'fr': 'French',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'pl': 'Polish',
      'sv': 'Swedish',
      'sw': 'Swahili',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'he': 'Hebrew',
      'ur': 'Urdu',
      'bn': 'Bengali',
      'ta': 'Tamil',
      'te': 'Telugu',
      'mr': 'Marathi',
      'gu': 'Gujarati',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'pa': 'Punjabi',
      'ne': 'Nepali',
      'si': 'Sinhala',
      'my': 'Myanmar',
      'km': 'Khmer',
      'lo': 'Lao',
      'ka': 'Georgian',
      'am': 'Amharic',
      'is': 'Icelandic',
      'mt': 'Maltese',
      'eu': 'Basque',
      'cy': 'Welsh',
      'ga': 'Irish',
      'gd': 'Scottish Gaelic',
      'br': 'Breton',
      'co': 'Corsican',
      'eo': 'Esperanto',
      'la': 'Latin',
      'sa': 'Sanskrit'
    };
    return commonLanguages[code] || code.toUpperCase();
  };

  const validateLanguage = async (language: string, type: 'base' | 'target') => {
    if (!language.trim()) return;
    
    const setValidating = type === 'base' ? setValidatingBaseLanguage : setValidatingTargetLanguage;
    const setValidation = type === 'base' ? setBaseLanguageValidation : setTargetLanguageValidation;
    
    setValidating(true);
    try {
      const result = await apiService.validateLanguage(language.trim());
      setValidation(result);
      
      // If valid, update the preference
      if (result.isValid && result.languageCode) {
        if (type === 'base') {
          setPreferences(prev => ({ ...prev, baseLanguage: result.languageCode! }));
        } else {
          setPreferences(prev => ({ ...prev, targetLanguage: result.languageCode! }));
        }
      }
    } catch (error) {
      console.error('Failed to validate language:', error);
      setValidation({
        isValid: false,
        languageCode: null,
        standardizedName: null,
        parameters: null,
        explanation: 'Failed to validate language. Please try again.'
      });
    } finally {
      setValidating(false);
    }
  };

  const handleBaseLanguageChange = (value: string) => {
    setBaseLanguageInput(value);
    setBaseLanguageValidation(null);
  };

  const handleTargetLanguageChange = (value: string) => {
    setTargetLanguageInput(value);
    setTargetLanguageValidation(null);
  };

  const handleValidateBaseLanguage = () => {
    if (baseLanguageInput.trim()) {
      validateLanguage(baseLanguageInput, 'base');
    }
  };

  const handleValidateTargetLanguage = () => {
    if (targetLanguageInput.trim()) {
      validateLanguage(targetLanguageInput, 'target');
    }
  };

  const handleToggle = (type: keyof ExerciseTypePreferences) => {
    const newExerciseTypes = { ...preferences.exerciseTypes, [type]: !preferences.exerciseTypes[type] };
    
    // Ensure at least one exercise type is enabled
    const enabledCount = Object.values(newExerciseTypes).filter(Boolean).length;
    if (enabledCount === 0) {
      toast({
        title: 'Warning',
        description: 'At least one exercise type must be enabled.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setPreferences({ ...preferences, exerciseTypes: newExerciseTypes });
  };


  const savePreferences = async () => {
    // Check if languages are valid before saving
    const isBaseLanguageValid = baseLanguageValidation?.isValid ?? false;
    const isTargetLanguageValid = targetLanguageValidation?.isValid ?? false;
    
    if (!isBaseLanguageValid || !isTargetLanguageValid) {
      // Try to validate current inputs if validation state is missing
      if (!baseLanguageValidation && baseLanguageInput.trim()) {
        await validateLanguage(baseLanguageInput, 'base');
      }
      if (!targetLanguageValidation && targetLanguageInput.trim()) {
        await validateLanguage(targetLanguageInput, 'target');
      }
      
      // Check again after validation
      const finalBaseValid = baseLanguageValidation?.isValid ?? false;
      const finalTargetValid = targetLanguageValidation?.isValid ?? false;
      
      if (!finalBaseValid || !finalTargetValid) {
        toast({
          title: 'Invalid Languages',
          description: 'Please ensure both languages are valid before saving.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
    }
    
    setSaving(true);
    try {
      await apiService.updatePreferences(preferences);
      toast({
        title: 'Success',
        description: 'Preferences saved successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = Object.values(preferences.exerciseTypes).filter(Boolean).length;

  if (loading) {
    return (
      <Container maxW="container.md" py={8}>
        <Center>
          <Spinner size="lg" color="blue.500" />
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8} px={{ base: 4, md: 8 }}>
      <VStack spacing={8} align="stretch">
        <Box mb={6}>
          <HStack spacing={3} mb={2}>
            <Text fontSize="2xl">⚙️</Text>
            <Heading size="xl" color="blue.500">
              Settings
            </Heading>
          </HStack>
          <Text color="gray.600" fontSize="lg">
            Customize your learning experience
          </Text>
        </Box>

        {/* Language Settings */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" shadow="2xl">
          <CardHeader pb={4}>
            <VStack align="start" spacing={3}>
              <HStack spacing={3}>
                <Text fontSize="2xl">🌍</Text>
                <Heading size="md" color="blue.500">Language Settings</Heading>
              </HStack>
              <Text color={useColorModeValue('gray.700', 'gray.300')} fontSize="md" lineHeight="1.6">
                Choose your native language and the language you want to learn. This affects how vocabulary definitions and explanations are presented.
              </Text>
              <Alert status="info" borderRadius="md" py={3}>
                <AlertIcon />
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" fontWeight="medium" color={useColorModeValue('blue.800', 'blue.200')}>
                    Changes will apply immediately to new vocabulary words and exercises.
                  </Text>
                  <Text fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>
                    💡 You can specify variants like "Japanese with Hiragana", "Simplified Chinese", "Brazilian Portuguese", "American English", etc.
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </CardHeader>
          <CardBody pt={2} px={{ base: 4, md: 8 }} py={6}>
            <VStack spacing={6} align="stretch">
              <Box p={4} bg={useColorModeValue('blue.50', 'blue.900')} borderRadius="lg" borderWidth="1px" borderColor={useColorModeValue('blue.200', 'blue.700')}>
                <FormControl isInvalid={baseLanguageValidation?.isValid === false}>
                  <FormLabel fontWeight="semibold" fontSize="md" color={useColorModeValue('blue.700', 'blue.200')}>
                    🏠 Your Native Language (Base Language)
                  </FormLabel>
                  <HStack spacing={3}>
                    <Input
                      value={baseLanguageInput}
                      onChange={(e) => handleBaseLanguageChange(e.target.value)}
                      placeholder="e.g., English, American English, Turkish, etc."
                      bg={useColorModeValue('white', 'gray.800')}
                      flex={1}
                      borderColor={useColorModeValue('blue.300', 'blue.600')}
                      _hover={{ borderColor: useColorModeValue('blue.400', 'blue.500') }}
                      _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                    />
                    <Button
                      onClick={handleValidateBaseLanguage}
                      isLoading={validatingBaseLanguage}
                      loadingText="Validating"
                      colorScheme="cyan"
                      variant="solid"
                      size="md"
                      isDisabled={!baseLanguageInput.trim()}
                      minW="100px"
                    >
                      Validate
                    </Button>
                  </HStack>
                  {baseLanguageValidation?.isValid && (
                    <Box mt={3} p={3} bg={useColorModeValue('blue.100', 'blue.800')} borderRadius="md" borderWidth="1px" borderColor={useColorModeValue('blue.300', 'blue.600')}>
                      <HStack spacing={2}>
                        <Text color={useColorModeValue('blue.800', 'blue.100')} fontWeight="semibold" fontSize="sm">
                          ✓ {baseLanguageValidation.standardizedName}
                        </Text>
                      </HStack>
                      {baseLanguageValidation.parameters && baseLanguageValidation.parameters.length > 0 && (
                        <HStack wrap="wrap" spacing={1} mt={2}>
                          {baseLanguageValidation.parameters.map((param, index) => (
                            <Badge key={index} colorScheme="blue" variant="subtle" fontSize="xs">
                              {param.description}
                            </Badge>
                          ))}
                        </HStack>
                      )}
                    </Box>
                  )}
                  {baseLanguageValidation?.isValid === false && (
                    <Box mt={3} p={3} bg={useColorModeValue('red.50', 'red.900')} borderRadius="md" borderWidth="1px" borderColor={useColorModeValue('red.200', 'red.700')}>
                      <Text color={useColorModeValue('red.700', 'red.200')} fontSize="sm">
                        {baseLanguageValidation.explanation}
                      </Text>
                    </Box>
                  )}
                  <FormHelperText mt={3} color={useColorModeValue('gray.600', 'gray.400')}>
                    Definitions and explanations will be provided in this language
                  </FormHelperText>
                </FormControl>
              </Box>

              <Box p={4} bg={useColorModeValue('green.50', 'green.900')} borderRadius="lg" borderWidth="1px" borderColor={useColorModeValue('green.200', 'green.700')}>
                <FormControl isInvalid={targetLanguageValidation?.isValid === false}>
                  <FormLabel fontWeight="semibold" fontSize="md" color={useColorModeValue('green.700', 'green.200')}>
                    🎯 Language You're Learning (Target Language)
                  </FormLabel>
                  <HStack spacing={3}>
                    <Input
                      value={targetLanguageInput}
                      onChange={(e) => handleTargetLanguageChange(e.target.value)}
                      placeholder="e.g., Japanese with Hiragana, Simplified Chinese, Brazilian Portuguese, etc."
                      bg={useColorModeValue('white', 'gray.800')}
                      flex={1}
                      borderColor={useColorModeValue('green.300', 'green.600')}
                      _hover={{ borderColor: useColorModeValue('green.400', 'green.500') }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px green.500' }}
                    />
                    <Button
                      onClick={handleValidateTargetLanguage}
                      isLoading={validatingTargetLanguage}
                      loadingText="Validating"
                      colorScheme="green"
                      variant="solid"
                      size="md"
                      isDisabled={!targetLanguageInput.trim()}
                      minW="100px"
                    >
                      Validate
                    </Button>
                  </HStack>
                  {targetLanguageValidation?.isValid && (
                    <Box mt={3} p={3} bg={useColorModeValue('green.100', 'green.800')} borderRadius="md" borderWidth="1px" borderColor={useColorModeValue('green.300', 'green.600')}>
                      <HStack spacing={2}>
                        <Text color={useColorModeValue('green.800', 'green.100')} fontWeight="semibold" fontSize="sm">
                          ✓ {targetLanguageValidation.standardizedName}
                        </Text>
                      </HStack>
                      {targetLanguageValidation.parameters && targetLanguageValidation.parameters.length > 0 && (
                        <HStack wrap="wrap" spacing={1} mt={2}>
                          {targetLanguageValidation.parameters.map((param, index) => (
                            <Badge key={index} colorScheme="green" variant="subtle" fontSize="xs">
                              {param.description}
                            </Badge>
                          ))}
                        </HStack>
                      )}
                    </Box>
                  )}
                  {targetLanguageValidation?.isValid === false && (
                    <Box mt={3} p={3} bg={useColorModeValue('red.50', 'red.900')} borderRadius="md" borderWidth="1px" borderColor={useColorModeValue('red.200', 'red.700')}>
                      <Text color={useColorModeValue('red.700', 'red.200')} fontSize="sm">
                        {targetLanguageValidation.explanation}
                      </Text>
                    </Box>
                  )}
                  <FormHelperText mt={3} color={useColorModeValue('gray.600', 'gray.400')}>
                    Vocabulary words and example sentences will be in this language
                  </FormHelperText>
                </FormControl>
              </Box>

              {preferences.baseLanguage === preferences.targetLanguage && (
                <Alert status="warning" borderRadius="md" py={3}>
                  <AlertIcon />
                  <Text fontSize="sm">
                    You've selected the same language for both base and target. This is fine for monolingual practice!
                  </Text>
                </Alert>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Exercise Types */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" shadow="2xl">
          <CardHeader pb={4}>
            <VStack align="start" spacing={3}>
              <HStack spacing={3}>
                <Text fontSize="2xl">🎯</Text>
                <Heading size="md" color="blue.500">Exercise Types</Heading>
              </HStack>
              <Text color={useColorModeValue('gray.700', 'gray.300')} fontSize="md" lineHeight="1.6">
                Choose which types of exercises you want to practice. You can enable or disable specific question formats.
              </Text>
              <Alert status="info" borderRadius="md" py={3}>
                <AlertIcon />
                <Text fontSize="sm" fontWeight="medium" color={useColorModeValue('blue.800', 'blue.200')}>
                  Changes will apply to new learning sessions and quizzes.
                </Text>
              </Alert>
            </VStack>
          </CardHeader>
          <CardBody pt={2} px={{ base: 4, md: 8 }} py={6}>
            <VStack spacing={4} align="stretch">
              {Object.entries(exerciseTypeLabels).map(([type, label]) => (
                <Box 
                  key={type} 
                  p={4} 
                  borderWidth="1px" 
                  borderRadius="lg" 
                  borderColor={borderColor}
                  bg={preferences.exerciseTypes[type as keyof ExerciseTypePreferences] 
                    ? useColorModeValue('purple.50', 'purple.900') 
                    : useColorModeValue('gray.50', 'gray.800')}
                  transition="all 0.2s"
                  _hover={{ 
                    borderColor: useColorModeValue('purple.300', 'purple.600'),
                    transform: 'translateY(-2px)',
                    shadow: 'md'
                  }}
                >
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={2} flex={1}>
                      <HStack spacing={2}>
                        <Text fontSize="lg">
                          {type === 'multiple_choice' && '🔤'}
                          {type === 'fill_blank' && '📝'}
                          {type === 'matching' && '🔗'}
                          {type === 'true_false' && '✅'}
                          {type === 'sentence_completion' && '💬'}
                        </Text>
                        <Text fontWeight="semibold" fontSize="md">{label}</Text>
                      </HStack>
                      <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')} lineHeight="1.5">
                        {exerciseTypeDescriptions[type as keyof typeof exerciseTypeDescriptions]}
                      </Text>
                    </VStack>
                    <FormControl display="flex" alignItems="center" width="auto">
                      <Switch
                        id={type}
                        isChecked={preferences.exerciseTypes[type as keyof ExerciseTypePreferences]}
                        onChange={() => handleToggle(type as keyof ExerciseTypePreferences)}
                        colorScheme="purple"
                        size="lg"
                      />
                    </FormControl>
                  </HStack>
                </Box>
              ))}
              
              <Box 
                mt={6} 
                p={4} 
                bg={useColorModeValue('gray.50', 'gray.700')} 
                borderRadius="lg"
                borderWidth="1px"
                borderColor={useColorModeValue('gray.200', 'gray.600')}
              >
                <HStack justify="space-between" align="center">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" fontWeight="semibold" color={useColorModeValue('gray.700', 'gray.200')}>
                      Active Exercise Types
                    </Text>
                    <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                      {enabledCount} of {Object.keys(exerciseTypeLabels).length} types enabled
                    </Text>
                  </VStack>
                  <Box>
                    <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                      {enabledCount}/{Object.keys(exerciseTypeLabels).length}
                    </Text>
                  </Box>
                </HStack>
              </Box>

              <Button
                colorScheme="blue"
                onClick={savePreferences}
                isLoading={saving}
                loadingText="Saving..."
                size="lg"
                w="full"
                py={6}
                fontSize="md"
                fontWeight="semibold"
                _hover={{
                  transform: 'translateY(-2px)',
                  shadow: 'lg'
                }}
                transition="all 0.2s"
              >
                💾 Save Preferences
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};