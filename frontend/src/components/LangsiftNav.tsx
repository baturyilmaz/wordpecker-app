import { Box, Container, Flex, Text } from '@chakra-ui/react';
import { Link, NavLink } from 'react-router-dom';

const links = [['New Lesson', '/'], ['Vocabulary', '/vocabulary'], ['Review', '/review']] as const;

export const LangsiftNav = () => (
  <Box as="header" borderBottom="1px solid #d9dfda" bg="#f7f5ee">
    <Container maxW="1080px" px={{ base: 5, md: 8 }}>
      <Flex minH="72px" align="center" justify="space-between" gap={5}>
        <Text as={Link} to="/" fontFamily="'Lora', serif" fontSize="xl" fontWeight="700" color="#18322a">
          Langsift<span style={{ color: '#ee6c4d' }}>.</span>
        </Text>
        <Flex as="nav" gap={{ base: 4, md: 7 }} align="center">
          {links.map(([label, to]) => (
            <Text
              key={to}
              as={NavLink}
              to={to}
              fontSize="sm"
              fontWeight="700"
              color="#557067"
              _activeLink={{ color: '#d55539' }}
              _hover={{ color: '#29483d' }}
            >{label}</Text>
          ))}
        </Flex>
      </Flex>
    </Container>
  </Box>
);
