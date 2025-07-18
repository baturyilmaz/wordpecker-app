import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Icon,
  Text,
  VStack,
  Badge,
  SimpleGrid,
  useToast,
  Spinner,
  Center,
  Input,
  Select,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  HStack,
  Wrap,
  WrapItem,
  Divider
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { GiBookshelf, GiFeather } from 'react-icons/gi';
import { FaSearch, FaClone, FaStar, FaFilter, FaTags } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Template } from '../types';
import { apiService } from '../services/api';

const MotionBox = motion(Box);

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

// const getDifficultyColor = (difficulty: string) => {
//   switch (difficulty) {
//     case 'beginner': return 'green';
//     case 'intermediate': return 'orange';
//     case 'advanced': return 'red';
//     default: return 'gray';
//   }
// };

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'business': return '💼';
    case 'academic': return '🎓';
    case 'science': return '🔬';
    case 'travel': return '✈️';
    case 'health': return '🏥';
    case 'general': return '💬';
    default: return '📚';
  }
};

export const TemplateLibrary = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloning, setIsCloning] = useState(false);
  const [customName, setCustomName] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [showFeatured, setShowFeatured] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesData, categoriesData] = await Promise.all([
          apiService.getTemplates(),
          apiService.getCategories()
        ]);
        setTemplates(templatesData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error loading templates',
          description: 'Please try again later',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;
    const matchesFeatured = !showFeatured || template.featured;
    
    return matchesSearch && matchesCategory && matchesDifficulty && matchesFeatured;
  });

  const handleViewTemplate = async (template: Template) => {
    try {
      const fullTemplate = await apiService.getTemplate(template.id);
      setSelectedTemplate(fullTemplate);
      setCustomName(`${fullTemplate.name} (Copy)`);
      onOpen();
    } catch (error) {
      console.error('Error fetching template details:', error);
      toast({
        title: 'Error loading template',
        description: 'Please try again later',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCloneTemplate = async () => {
    if (!selectedTemplate) return;
    
    setIsCloning(true);
    try {
      const newList = await apiService.cloneTemplate(selectedTemplate.id, customName);
      toast({
        title: 'Template cloned successfully!',
        description: `"${newList.name}" has been added to your lists`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      onClose();
      navigate(`/lists/${newList.id}`);
    } catch (error) {
      console.error('Error cloning template:', error);
      toast({
        title: 'Error cloning template',
        description: 'Please try again later',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsCloning(false);
    }
  };

  if (isLoading) {
    return (
      <Center h="calc(100vh - 64px)">
        <Spinner size="xl" color="blue.500" thickness="4px" />
      </Center>
    );
  }

  return (
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
              color="#1890FF"
              display="flex"
              alignItems="center"
              gap={3}
            >
              <Icon 
                as={GiBookshelf} 
                boxSize={10} 
                color="#1890FF"
                style={{ animation: 'sparkle 3s ease infinite' }}
              />
              Template Library
            </Heading>
            <Text mt={2} color="gray.400" fontSize="lg">
              Discover and clone professionally curated vocabulary lists! 📚
            </Text>
          </Box>
        </Flex>

        {/* Filters */}
        <Box 
          bg="slate.800" 
          p={6} 
          borderRadius="xl"
          borderWidth="1px"
          borderColor="slate.700"
        >
          <VStack spacing={4}>
            <Flex 
              w="full" 
              gap={4} 
              direction={{ base: 'column', md: 'row' }}
              align="center"
            >
              <Icon as={FaFilter} color="blue.400" />
              <InputGroup flex={1}>
                <InputLeftElement pointerEvents="none">
                  <Icon as={FaSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search templates, descriptions, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  bg="slate.700"
                  border="none"
                  _focus={{ boxShadow: '0 0 0 2px rgba(66, 153, 225, 0.6)' }}
                />
              </InputGroup>
            </Flex>
            
            <Flex 
              w="full" 
              gap={4} 
              direction={{ base: 'column', sm: 'row' }}
              align="center"
            >
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                bg="slate.700"
                border="none"
                flex={1}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getCategoryIcon(category)} {category}
                  </option>
                ))}
              </Select>
              
              <Select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                bg="slate.700"
                border="none"
                flex={1}
              >
                <option value="all">All Difficulties</option>
                <option value="beginner">🌱 Beginner</option>
                <option value="intermediate">🌿 Intermediate</option>
                <option value="advanced">🌳 Advanced</option>
              </Select>
              
              <Button
                leftIcon={<Icon as={FaStar} />}
                colorScheme={showFeatured ? "yellow" : "gray"}
                variant={showFeatured ? "solid" : "outline"}
                onClick={() => setShowFeatured(!showFeatured)}
                size="md"
              >
                Featured
              </Button>
            </Flex>
          </VStack>
        </Box>

        {/* Results Summary */}
        <Flex justify="space-between" align="center">
          <Text color="gray.400">
            Found {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
          </Text>
          {filteredTemplates.length > 0 && (
            <Text color="gray.500" fontSize="sm">
              Total words: {filteredTemplates.reduce((sum, t) => sum + (t.wordCount || 0), 0)}
            </Text>
          )}
        </Flex>

        {/* Templates Grid */}
        <SimpleGrid
          columns={{ base: 1, md: 2, lg: 3 }}
          spacing={6}
          as={motion.div}
          variants={container}
          initial="hidden"
          animate="show"
        >
          {filteredTemplates.map((template) => (
            <MotionBox
              key={template.id}
              variants={item}
              whileHover={{ 
                y: -5,
                transition: { duration: 0.2 }
              }}
            >
              <Box
                layerStyle="card"
                h="full"
                position="relative"
                overflow="hidden"
                borderWidth="1px"
                borderColor="slate.600"
                _hover={{
                  borderColor: "slate.500",
                  shadow: "lg"
                }}
                transition="all 0.3s"
                p={5}
                borderRadius="xl"
                cursor="pointer"
                onClick={() => handleViewTemplate(template)}
                minH="320px"
              >
                <VStack spacing={4} h="full" align="stretch">
                  {/* Header Section */}
                  <Box>
                    <Flex justify="space-between" align="flex-start" mb={3}>
                      <Flex align="center" gap={2} flex={1} pr={3}>
                        <Text fontSize="2xl">{getCategoryIcon(template.category)}</Text>
                        <VStack align="flex-start" spacing={1} flex={1}>
                          <Text 
                            fontWeight="bold"
                            fontSize="lg"
                            color="white"
                            noOfLines={1}
                            lineHeight="1.2"
                          >
                            {template.name}
                          </Text>
                          <Badge 
                            bg="slate.600"
                            color="gray.300"
                            variant="solid"
                            size="sm"
                          >
                            {template.category}
                          </Badge>
                        </VStack>
                      </Flex>
                      
                      {/* Stats in top right */}
                      <VStack spacing={1} align="flex-end" flexShrink={0} w="100px">
                        <Badge 
                          bg="slate.600"
                          color="gray.300"
                          variant="solid"
                          fontSize="xs"
                          px={2}
                          py={1}
                          w="full"
                          textAlign="center"
                        >
                          {template.wordCount} words
                        </Badge>
                        <Badge 
                          bg="slate.600"
                          color="gray.300"
                          variant="solid"
                          fontSize="xs"
                          px={2}
                          py={1}
                          w="full"
                          textAlign="center"
                        >
                          {template.difficulty}
                        </Badge>
                      </VStack>
                    </Flex>
                    
                    {/* Description */}
                    <Text 
                      color="gray.400" 
                      fontSize="sm"
                      noOfLines={3}
                      lineHeight="1.4"
                      mb={3}
                    >
                      {template.description}
                    </Text>
                  </Box>

                  {/* Tags Section */}
                  <Box flex={1}>
                    {template.tags.length > 0 && (
                      <Wrap spacing={1}>
                        {template.tags.slice(0, 4).map(tag => (
                          <WrapItem key={tag}>
                            <Badge 
                              size="sm" 
                              bg="slate.600"
                              color="gray.300"
                              variant="solid"
                              fontSize="xs"
                            >
                              {tag}
                            </Badge>
                          </WrapItem>
                        ))}
                        {template.tags.length > 4 && (
                          <WrapItem>
                            <Badge size="sm" bg="slate.600" color="gray.300" variant="solid" fontSize="xs">
                              +{template.tags.length - 4}
                            </Badge>
                          </WrapItem>
                        )}
                      </Wrap>
                    )}
                  </Box>
                  
                  {/* Footer */}
                  <Box mt="auto" pt={2} borderTop="1px" borderColor="slate.700">
                    <Flex justify="space-between" align="center">
                      <Flex align="center" gap={1}>
                        <Icon as={FaClone} color="gray.500" boxSize={3} />
                        <Text color="gray.500" fontSize="xs">
                          {template.cloneCount} clones
                        </Text>
                      </Flex>
                      <Text color="gray.500" fontSize="xs">
                        Click to preview
                      </Text>
                    </Flex>
                  </Box>
                </VStack>
              </Box>
            </MotionBox>
          ))}
        </SimpleGrid>

        {filteredTemplates.length === 0 && (
          <Center py={12}>
            <VStack spacing={4}>
              <Icon as={GiFeather} boxSize={12} color="gray.400" />
              <Text color="gray.400" fontSize="lg" textAlign="center">
                No templates found matching your criteria
              </Text>
              <Button
                colorScheme="blue"
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                  setShowFeatured(false);
                }}
              >
                Clear Filters
              </Button>
            </VStack>
          </Center>
        )}
      </VStack>

      {/* Template Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg="slate.800" color="white">
          <ModalHeader>
            <Flex align="center" gap={3}>
              <Text fontSize="2xl">{selectedTemplate && getCategoryIcon(selectedTemplate.category)}</Text>
              <Box>
                <Text>{selectedTemplate?.name}</Text>
                <HStack spacing={2} mt={1}>
                  <Badge bg="slate.600" color="gray.300">
                    {selectedTemplate?.difficulty}
                  </Badge>
                  <Badge bg="slate.600" color="gray.300">
                    {selectedTemplate?.category}
                  </Badge>
                </HStack>
              </Box>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text color="gray.300">
                {selectedTemplate?.description}
              </Text>
              
              {selectedTemplate?.context && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Context:</Text>
                  <Text color="gray.400" fontSize="sm">
                    {selectedTemplate.context}
                  </Text>
                </Box>
              )}

              <Divider />

              <Box>
                <Text fontWeight="bold" mb={2}>
                  <Icon as={FaTags} mr={2} />
                  Tags:
                </Text>
                <Wrap spacing={2}>
                  {selectedTemplate?.tags.map(tag => (
                    <WrapItem key={tag}>
                      <Badge bg="slate.600" color="gray.300">
                        {tag}
                      </Badge>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>

              <Divider />

              <Box>
                <Text fontWeight="bold" mb={3}>
                  Words ({selectedTemplate?.words?.length}):
                </Text>
                <Box maxH="200px" overflowY="auto">
                  <VStack spacing={2} align="stretch">
                    {selectedTemplate?.words?.map((word, index) => (
                      <Box key={index} p={3} bg="slate.700" borderRadius="md">
                        <Text fontWeight="bold" color="blue.300">
                          {word.value}
                        </Text>
                        <Text color="gray.400" fontSize="sm">
                          {word.meaning}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Text fontWeight="bold" mb={2}>Custom List Name:</Text>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter custom name for your cloned list"
                  bg="slate.700"
                  border="none"
                />
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              leftIcon={<Icon as={FaClone} />}
              onClick={handleCloneTemplate}
              isLoading={isCloning}
              loadingText="Cloning..."
            >
              Clone Template
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};