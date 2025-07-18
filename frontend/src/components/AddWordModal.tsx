import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
  Text,
  Box,
  Flex,
  Icon
} from '@chakra-ui/react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaSearch } from 'react-icons/fa';


const MotionBox = motion(Box);

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWord: (word: string) => Promise<void>;
  listName?: string;
}

export const AddWordModal = ({ isOpen, onClose, onAddWord }: AddWordModalProps) => {
  const [word, setWord] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!word.trim()) {
      toast({
        title: 'Word is required',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      await onAddWord(word.trim());
      toast({
        title: '🪵 Word found!',
        description: 'Finding the perfect meaning for your word...',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      setWord('');
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to add word',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg="slate.800" borderWidth="1px" borderColor="slate.700">
        <MotionBox
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <ModalHeader color="white">
            <Flex align="center" gap={2}>
              <Icon 
                as={FaSearch} 
                boxSize={6} 
                color="orange.400"
                style={{ animation: 'sparkle 2s ease infinite' }}
              />
              <Text 
                bgGradient="linear(to-r, orange.400, brand.400)"
                bgClip="text"
                fontSize="2xl"
              >
                Find a New Word 🪵
              </Text>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color="gray.300">Word to Find</FormLabel>
                <Input
                  placeholder="Type a word to add to your tree..."
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  onKeyPress={handleKeyPress}
                  bg="slate.700"
                  borderColor="slate.600"
                  _hover={{ borderColor: 'slate.500' }}
                  _focus={{ borderColor: 'brand.400', boxShadow: 'none' }}
                  color="white"
                  size="lg"
                  autoFocus
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={onClose} color="gray.300">
              Cancel
            </Button>
            <Button
              variant="solid"
              colorScheme="orange"
              onClick={handleSubmit}
              isLoading={isLoading}
              loadingText="Finding word 🪵"
              leftIcon={<Icon as={FaSearch} boxSize={5} />}
              _hover={{
                transform: 'translateY(-2px)',
                animation: 'sparkle 1s ease infinite'
              }}
              transition="all 0.2s"
            >
              Find Word
            </Button>
          </ModalFooter>
        </MotionBox>
      </ModalContent>
    </Modal>
  );
}; 