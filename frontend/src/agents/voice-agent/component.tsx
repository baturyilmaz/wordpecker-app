import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Badge,
  IconButton,
  Input,
  Alert,
  AlertIcon,
  AlertDescription,
  Spinner,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Tooltip,
} from '@chakra-ui/react';
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaPlay, 
  FaStop, 
  FaPaperPlane,
  FaRobot,
  FaUser,
  FaVolumeUp
} from 'react-icons/fa';
import { useVoiceAgent } from './hooks';
import { VoiceAgentStatus, ConversationMessage, VoiceAgentProps } from './types';

const StatusIndicator: React.FC<{ status: VoiceAgentStatus }> = ({ status }) => {
  const getStatusConfig = (status: VoiceAgentStatus) => {
    switch (status) {
      case 'idle':
        return { color: 'gray', text: 'Ready to start', icon: <FaMicrophone /> };
      case 'connecting':
        return { color: 'yellow', text: 'Connecting...', icon: <Spinner size="sm" /> };
      case 'connected':
        return { color: 'green', text: 'Connected', icon: <FaVolumeUp /> };
      case 'listening':
        return { color: 'blue', text: 'Listening...', icon: <FaMicrophone /> };
      case 'speaking':
        return { color: 'purple', text: 'Speaking', icon: <FaVolumeUp /> };
      case 'processing':
        return { color: 'orange', text: 'Processing...', icon: <Spinner size="sm" /> };
      case 'error':
        return { color: 'red', text: 'Error', icon: <FaMicrophoneSlash /> };
      case 'disconnecting':
        return { color: 'gray', text: 'Disconnecting...', icon: <Spinner size="sm" /> };
      default:
        return { color: 'gray', text: 'Unknown', icon: <FaMicrophone /> };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge colorScheme={config.color} variant="solid" fontSize="sm" px={3} py={1}>
      <HStack spacing={2}>
        {config.icon}
        <Text>{config.text}</Text>
      </HStack>
    </Badge>
  );
};

const MessageBubble: React.FC<{ message: ConversationMessage }> = ({ message }) => {
  const isUser = message.type === 'user';
  const bgColor = useColorModeValue(
    isUser ? 'blue.500' : 'gray.100',
    isUser ? 'blue.600' : 'gray.700'
  );
  const textColor = useColorModeValue(
    isUser ? 'white' : 'gray.800',
    isUser ? 'white' : 'gray.200'
  );

  return (
    <HStack spacing={3} align="flex-start" w="full" justify={isUser ? 'flex-end' : 'flex-start'}>
      {!isUser && (
        <Box
          bg="green.500"
          borderRadius="full"
          p={2}
          color="white"
          flexShrink={0}
        >
          <FaRobot size={14} />
        </Box>
      )}
      
      <Box
        bg={bgColor}
        color={textColor}
        px={4}
        py={3}
        borderRadius="lg"
        maxW="70%"
        wordBreak="break-word"
      >
        <Text fontSize="sm" lineHeight="1.4">
          {message.content}
        </Text>
        <Text fontSize="xs" opacity={0.7} mt={1}>
          {message.timestamp.toLocaleTimeString()}
        </Text>
      </Box>

      {isUser && (
        <Box
          bg="blue.500"
          borderRadius="full"
          p={2}
          color="white"
          flexShrink={0}
        >
          <FaUser size={14} />
        </Box>
      )}
    </HStack>
  );
};

export const VoiceAgent: React.FC<VoiceAgentProps> = ({ config, isOpen, onClose }) => {
  const {
    status,
    conversation,
    isConnected,
    error,
    startConversation,
    endConversation,
    sendMessage,
    interrupt,
    clearError,
    clearConversation,
  } = useVoiceAgent();

  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Auto-start conversation when modal opens
  useEffect(() => {
    if (isOpen && status === 'idle') {
      handleStartConversation();
    }
  }, [isOpen]);

  const handleStartConversation = async () => {
    try {
      await startConversation(config);
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  const handleEndConversation = async () => {
    try {
      await endConversation();
      onClose();
    } catch (err) {
      console.error('Failed to end conversation:', err);
    }
  };

  const handleSendMessage = () => {
    if (textInput.trim() && isConnected) {
      sendMessage(textInput.trim());
      setTextInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent maxH="80vh">
        <ModalHeader>
          <HStack justify="space-between" align="center">
            <VStack align="flex-start" spacing={1}>
              <Text fontSize="lg" fontWeight="bold">
                Voice Learning Assistant
              </Text>
              <Text fontSize="sm" color="gray.500">
                {config.listName}
              </Text>
            </VStack>
            <StatusIndicator status={status} />
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody px={6} py={0}>
          <VStack spacing={4} h="50vh">
            {/* Error Display */}
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <AlertDescription flex={1}>{error}</AlertDescription>
                <Button size="sm" onClick={clearError}>
                  Dismiss
                </Button>
              </Alert>
            )}

            {/* Conversation Display */}
            <Card w="full" h="full" bg={cardBg} borderColor={borderColor}>
              <CardBody p={4}>
                <VStack
                  spacing={4}
                  align="stretch"
                  h="full"
                  overflowY="auto"
                  css={{
                    '&::-webkit-scrollbar': {
                      width: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                      width: '6px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#CBD5E0',
                      borderRadius: '24px',
                    },
                  }}
                >
                  {conversation.length === 0 && (status === 'idle' || status === 'connected') && (
                    <Box textAlign="center" py={8} color="gray.500">
                      <FaRobot size={32} style={{ margin: '0 auto 16px' }} />
                      <Text>Start speaking or type a message to begin!</Text>
                    </Box>
                  )}

                  {conversation.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  
                  <div ref={messagesEndRef} />
                </VStack>
              </CardBody>
            </Card>

            {/* Text Input */}
            {isConnected && (
              <HStack w="full" spacing={2}>
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message or just speak..."
                  variant="filled"
                  size="md"
                />
                <Tooltip label="Send message">
                  <IconButton
                    aria-label="Send message"
                    icon={<FaPaperPlane />}
                    onClick={handleSendMessage}
                    isDisabled={!textInput.trim()}
                    colorScheme="blue"
                    variant="solid"
                  />
                </Tooltip>
              </HStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} w="full" justify="space-between">
            <HStack spacing={2}>
              {conversation.length > 0 && (
                <Button size="sm" variant="ghost" onClick={clearConversation}>
                  Clear Chat
                </Button>
              )}
            </HStack>

            <HStack spacing={2}>
              {isConnected && status === 'speaking' && (
                <Tooltip label="Interrupt agent">
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="orange"
                    onClick={interrupt}
                  >
                    Interrupt
                  </Button>
                </Tooltip>
              )}
              
              {!isConnected && (
                <Button
                  leftIcon={<FaPlay />}
                  colorScheme="green"
                  onClick={handleStartConversation}
                  isLoading={status === 'connecting'}
                  loadingText="Connecting..."
                  isDisabled={status === 'disconnecting'}
                >
                  Start Chat
                </Button>
              )}

              {isConnected && (
                <Button
                  leftIcon={<FaStop />}
                  colorScheme="red"
                  variant="outline"
                  onClick={handleEndConversation}
                  isLoading={status === 'disconnecting'}
                  loadingText="Ending..."
                >
                  End Chat
                </Button>
              )}
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default VoiceAgent;