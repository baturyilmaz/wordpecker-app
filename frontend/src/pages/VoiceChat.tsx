import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Avatar,
  Flex,
  Badge,
  Card,
  CardBody,
  useColorModeValue,
  Divider,
  Progress,
  Tooltip,
  useToast,
  Spinner,
  ScaleFade,
} from '@chakra-ui/react';
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaRobot, 
  FaArrowLeft,
  FaVolumeUp,
  FaStop,
  FaPause,
  FaShare,
  FaTrophy,
  FaFire,
  FaHeart,
  FaStar,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVoiceAgent, VoiceAgentConfig, VoiceAgentStatus, ConversationMessage } from '../agents';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

// CSS animations defined as CSS strings for better compatibility
const floatAnimation = '3s ease-in-out infinite';

interface VoiceChatPageProps {}

interface LocationState {
  config: VoiceAgentConfig;
  listName: string;
}

const StatusDisplay: React.FC<{ status: VoiceAgentStatus; isConnected: boolean }> = ({ status, isConnected }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return { 
          color: 'gray.400', 
          text: 'Not Connected', 
          icon: FaMicrophoneSlash,
          bgColor: 'gray.100',
          textColor: 'gray.600',
          pulse: false
        };
      case 'connecting':
        return { 
          color: 'yellow.400', 
          text: 'Connecting...', 
          icon: Spinner,
          bgColor: 'yellow.100',
          textColor: 'yellow.700',
          pulse: true
        };
      case 'connected':
        return { 
          color: 'green.400', 
          text: 'Connected & Ready', 
          icon: FaVolumeUp,
          bgColor: 'green.100',
          textColor: 'green.700',
          pulse: false
        };
      case 'listening':
        return { 
          color: 'blue.400', 
          text: 'Listening to You...', 
          icon: FaMicrophone,
          bgColor: 'blue.100',
          textColor: 'blue.700',
          pulse: true
        };
      case 'speaking':
        return { 
          color: 'purple.400', 
          text: 'AI Speaking', 
          icon: FaVolumeUp,
          bgColor: 'purple.100',
          textColor: 'purple.700',
          pulse: true
        };
      case 'processing':
        return { 
          color: 'orange.400', 
          text: 'AI Thinking & Using Tools...', 
          icon: Spinner,
          bgColor: 'orange.100',
          textColor: 'orange.700',
          pulse: true
        };
      case 'error':
        return { 
          color: 'red.400', 
          text: 'Connection Error', 
          icon: FaMicrophoneSlash,
          bgColor: 'red.100',
          textColor: 'red.700',
          pulse: false
        };
      case 'disconnecting':
        return { 
          color: 'gray.400', 
          text: 'Disconnecting...', 
          icon: Spinner,
          bgColor: 'gray.100',
          textColor: 'gray.600',
          pulse: true
        };
      default:
        return { 
          color: 'gray.400', 
          text: 'Unknown State', 
          icon: FaMicrophone,
          bgColor: 'gray.100',
          textColor: 'gray.600',
          pulse: false
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <MotionBox
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500 }}
    >
      <Card 
        bg={config.bgColor}
        borderColor={config.color}
        borderWidth="2px"
        shadow="lg"
        style={config.pulse ? { animation: 'pulse 2s ease-in-out infinite' } : undefined}
      >
        <CardBody p={4}>
          <HStack spacing={3}>
            <Box color={config.color}>
              {IconComponent === Spinner ? (
                <Spinner size="sm" />
              ) : (
                <IconComponent />
              )}
            </Box>
            <VStack align="flex-start" spacing={0}>
              <Text 
                fontWeight="bold" 
                color={config.textColor}
                fontSize="sm"
              >
                {config.text}
              </Text>
              <Text 
                fontSize="xs" 
                color={config.textColor} 
                opacity={0.7}
              >
                {isConnected ? 'Session Active' : 'No Active Session'}
              </Text>
            </VStack>
          </HStack>
        </CardBody>
      </Card>
    </MotionBox>
  );
};

const MessageBubble: React.FC<{ message: ConversationMessage; index: number }> = ({ message, index }) => {
  // Since we're only showing assistant messages, we can simplify this
  return (
    <MotionBox
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 400
      }}
      w="full"
      mb={4}
    >
      <Flex 
        justify="flex-start" 
        align="flex-start"
      >
        <Avatar
          size="sm"
          icon={<FaRobot />}
          bgGradient="linear(to-r, green.400, teal.500)"
          color="white"
          mr={3}
          style={{ animation: floatAnimation }}
        />
        
        <MotionBox
          bgGradient="linear(to-r, green.400, teal.500)"
          color="white"
          px={6}
          py={4}
          borderRadius="2xl"
          maxW="85%"
          position="relative"
          shadow="lg"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Text fontSize="md" lineHeight="1.5" fontWeight="medium">
            {message.content}
          </Text>
          <Text fontSize="xs" opacity={0.8} mt={2}>
            {message.timestamp.toLocaleTimeString()}
          </Text>
          
          {/* Message tail */}
          <Box
            position="absolute"
            top="15px"
            left="-8px"
            w="0"
            h="0"
            borderTop="8px solid transparent"
            borderBottom="8px solid transparent"
            borderLeft="8px solid"
            borderColor="teal.500"
          />
        </MotionBox>
      </Flex>
    </MotionBox>
  );
};

export const VoiceChat: React.FC<VoiceChatPageProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // const { listId } = useParams<{ listId: string }>(); // Available if needed for direct API calls
  const toast = useToast();
  
  const state = location.state as LocationState;
  const config = state?.config;
  const listName = state?.listName;

  const {
    status,
    conversation,
    isConnected,
    error,
    startConversation,
    endConversation,
    interrupt,
    clearError,
  } = useVoiceAgent();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Use only assistant messages (hide user messages)
  const assistantMessages = useMemo(() => {
    return conversation.filter(message => message.type === 'assistant');
  }, [conversation]);
  
  const bgGradient = useColorModeValue(
    'linear(to-br, gray.50, blue.50, purple.50)',
    'linear(to-br, gray.900, blue.900, purple.900)'
  );

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Remove auto-start - user should control when to begin

  // Handle missing config
  if (!config) {
    return (
      <Container maxW="container.md" py={8}>
        <VStack spacing={6}>
          <Text fontSize="xl" color="red.500">
            Voice chat configuration missing
          </Text>
          <Button onClick={() => navigate(-1)} leftIcon={<FaArrowLeft />}>
            Go Back
          </Button>
        </VStack>
      </Container>
    );
  }

  const handleStartChat = async () => {
    // Prevent rapid clicks or multiple starts
    if (isStarting || isConnected || status === 'connecting') {
      console.warn('Start chat already in progress or connected');
      return;
    }

    setIsStarting(true);
    if (!hasStartedOnce) {
      setHasStartedOnce(true);
    }
    
    try {
      await startConversation(config);
    } catch (err) {
      console.error('Failed to start conversation:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndChat = async () => {
    await endConversation();
    setHasStartedOnce(false);
    navigate(-1);
  };

  const handleInterrupt = () => {
    interrupt();
    toast({
      title: 'Interrupted',
      description: 'AI has been interrupted',
      status: 'info',
      duration: 2000,
    });
  };

  const shareProgress = () => {
    toast({
      title: 'Share feature coming soon!',
      description: 'Share your learning progress with friends',
      status: 'info',
      duration: 3000,
    });
  };

  return (
    <Box minH="100vh" bgGradient={bgGradient} position="relative" overflow="hidden">
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
                onClick={() => navigate(-1)}
                _hover={{ transform: 'translateX(-2px)' }}
                transition="all 0.2s"
              />
              <VStack align="flex-start" spacing={1}>
                <Text 
                  fontSize="2xl" 
                  fontWeight="bold" 
                  color="teal.600"
                  textShadow="2px 2px 4px rgba(0,0,0,0.1)"
                >
                  Voice Learning
                </Text>
                <Text 
                  fontSize="md" 
                  color="gray.700" 
                  fontWeight="medium"
                  textShadow="1px 1px 2px rgba(0,0,0,0.1)"
                >
                  {listName || config.listName}
                </Text>
              </VStack>
            </HStack>

            <HStack spacing={3}>
              <Tooltip label="Share your progress">
                <IconButton
                  aria-label="Share"
                  icon={<FaShare />}
                  variant="ghost"
                  colorScheme="blue"
                  onClick={shareProgress}
                />
              </Tooltip>
              <StatusDisplay status={status} isConnected={isConnected} />
            </HStack>
          </MotionFlex>

          {/* Main Chat Area */}
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
                  {/* Messages Area */}
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
                        background: 'linear-gradient(to bottom, #48BB78, #38B2AC)',
                        borderRadius: '24px',
                      },
                    }}
                  >
                    <AnimatePresence>
                      {/* Show welcome screen when no messages */}
                      {assistantMessages.length === 0 && (
                        <MotionBox
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          textAlign="center"
                          py={20}
                        >
                          <VStack spacing={6}>
                            <MotionBox
                              style={{ animation: floatAnimation }}
                              w="180px"
                              h="180px"
                            >
                              <img 
                                src="/wordpecker-moscot.png" 
                                alt="WordPecker Assistant" 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            </MotionBox>
                            <VStack spacing={2}>
                              <Text 
                                fontSize="2xl" 
                                fontWeight="bold" 
                                color="teal.600"
                                textShadow="2px 2px 4px rgba(0,0,0,0.1)"
                              >
                                AI Voice Learning Assistant
                              </Text>
                              <Text 
                                color="white" 
                                fontSize="lg" 
                                textAlign="center" 
                                maxW="md" 
                                fontWeight="medium"
                                textShadow="1px 1px 3px rgba(0,0,0,0.3)"
                              >
                                {!isConnected 
                                  ? "Click 'Start Conversation' to begin your voice learning session!"
                                  : "I'm ready to help you practice vocabulary! Start speaking when you're ready."
                                }
                              </Text>
                            </VStack>
                            <HStack spacing={2}>
                              <Badge colorScheme="green" variant="subtle" px={3} py={1}>
                                <HStack spacing={1}>
                                  <FaFire />
                                  <Text>Voice Interactive</Text>
                                </HStack>
                              </Badge>
                              <Badge colorScheme="blue" variant="subtle" px={3} py={1}>
                                <HStack spacing={1}>
                                  <FaStar />
                                  <Text>AI Powered</Text>
                                </HStack>
                              </Badge>
                              <Badge colorScheme="purple" variant="subtle" px={3} py={1}>
                                <HStack spacing={1}>
                                  <FaTrophy />
                                  <Text>Progress Tracking</Text>
                                </HStack>
                              </Badge>
                            </HStack>
                          </VStack>
                        </MotionBox>
                      )}
                      
                      {/* Show only assistant messages */}
                      {assistantMessages.map((message, index) => (
                        <MessageBubble 
                          key={message.id} 
                          message={message} 
                          index={index}
                        />
                      ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </Box>

                  <Divider />

                  {/* Controls Area */}
                  <Box w="full" p={6} flexShrink={0}>
                    <VStack spacing={4}>
                      {/* Error Display */}
                      {error && (
                        <ScaleFade initialScale={0.9} in={!!error}>
                          <Card bg="red.50" borderColor="red.200" borderWidth="1px" w="full">
                            <CardBody p={4}>
                              <HStack justify="space-between">
                                <Text color="red.700" fontSize="sm">
                                  {error}
                                </Text>
                                <Button size="sm" variant="ghost" onClick={clearError}>
                                  Dismiss
                                </Button>
                              </HStack>
                            </CardBody>
                          </Card>
                        </ScaleFade>
                      )}

                      {/* Main Controls */}
                      <VStack spacing={4} w="full">
                        {/* Start/Connection Controls */}
                        {!isConnected && (
                          <MotionBox
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              leftIcon={<FaMicrophone />}
                              colorScheme="green"
                              size="xl"
                              borderRadius="full"
                              px={12}
                              py={8}
                              fontSize="lg"
                              onClick={handleStartChat}
                              isLoading={isStarting || status === 'connecting'}
                              loadingText="Connecting..."
                              isDisabled={isConnected}
                              shadow="2xl"
                              _hover={{
                                transform: 'translateY(-4px)',
                                shadow: '3xl'
                              }}
                              transition="all 0.3s"
                            >
                              Start Conversation
                            </Button>
                          </MotionBox>
                        )}

                        {/* Active Session Controls */}
                        {isConnected && (
                          <HStack spacing={4} justify="center">
                            {/* Interrupt Button */}
                            {status === 'speaking' && (
                              <MotionBox
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                              >
                                <Tooltip label="Interrupt AI">
                                  <IconButton
                                    aria-label="Interrupt"
                                    icon={<FaPause />}
                                    size="lg"
                                    borderRadius="full"
                                    colorScheme="orange"
                                    variant="outline"
                                    onClick={handleInterrupt}
                                    _hover={{ transform: 'scale(1.1)' }}
                                  />
                                </Tooltip>
                              </MotionBox>
                            )}

                            {/* End Chat Button */}
                            <MotionBox
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                leftIcon={<FaStop />}
                                colorScheme="red"
                                variant="outline"
                                onClick={handleEndChat}
                                size="lg"
                                borderRadius="full"
                                px={8}
                                isLoading={status === 'disconnecting'}
                                loadingText="Ending..."
                              >
                                End Chat
                              </Button>
                            </MotionBox>
                          </HStack>
                        )}
                      </VStack>

                      {/* Progress Indicator */}
                      {assistantMessages.length > 0 && (
                        <MotionBox
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          w="full"
                        >
                          <VStack spacing={2}>
                            <HStack justify="space-between" w="full">
                              <Text fontSize="sm" color="gray.600">
                                Conversation Progress
                              </Text>
                              <HStack spacing={1}>
                                <FaHeart color="#E53E3E" />
                                <Text fontSize="sm" color="gray.600">
                                  {assistantMessages.length} AI responses
                                </Text>
                              </HStack>
                            </HStack>
                            <Progress 
                              value={Math.min(assistantMessages.length * 15, 100)} 
                              colorScheme="green" 
                              size="sm" 
                              w="full" 
                              borderRadius="full"
                            />
                          </VStack>
                        </MotionBox>
                      )}
                    </VStack>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </MotionBox>
        </VStack>
      </Container>
    </Box>
  );
};