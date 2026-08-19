import { Box, Container, Heading, ListItem, Text, UnorderedList } from '@chakra-ui/react';
import { LangsiftNav } from '../components/LangsiftNav';
import { ls } from '../theme/langsift';
import { CONTACT_EMAIL } from '../config/contact';

export const PrivacyPage = () => (
  <Box minH="100vh" bg={ls.background} color={ls.textPrimary} fontFamily={ls.bodyFont}>
    <LangsiftNav />
    <Container as="main" maxW="760px" px={{ base: 5, md: 8 }} py={{ base: 10, md: 16 }}>
      <Text textTransform="uppercase" letterSpacing="0.12em" fontSize="xs" fontWeight="700" color={ls.brand}>
        Small Beta
      </Text>
      <Heading as="h1" mt={3} fontFamily={ls.editorialFont} fontSize={{ base: '3xl', md: '5xl' }}>
        Privacy Notice
      </Heading>
      <Text mt={6} color={ls.textSecondary} lineHeight="1.8">
        Langsift is a small Beta learning tool. This notice explains the data used to create and preserve your personalized English lessons.
      </Text>

      <Heading as="h2" mt={10} fontFamily={ls.editorialFont} fontSize="2xl">What Langsift stores</Heading>
      <UnorderedList mt={4} pl={5} spacing={3} color={ls.textSecondary} lineHeight="1.75">
        <ListItem>Google sign-in identity information, including your email and optional name or avatar.</ListItem>
        <ListItem>The URLs and extracted article content you submit so Langsift can create a personal Lesson.</ListItem>
        <ListItem>Your Lessons, Quiz activity, saved Vocabulary, Review history, and limited product-usage events.</ListItem>
      </UnorderedList>

      <Heading as="h2" mt={10} fontFamily={ls.editorialFont} fontSize="2xl">How the data is used</Heading>
      <Text mt={4} color={ls.textSecondary} lineHeight="1.8">
        Submitted content is sent to an AI provider only as needed to generate learning material. Stored data supports Langsift’s learning features, reliability checks, and product improvement. Langsift does not sell user data.
      </Text>

      <Heading as="h2" mt={10} fontFamily={ls.editorialFont} fontSize="2xl">Your choices</Heading>
      <Text mt={4} color={ls.textSecondary} lineHeight="1.8">
        You can sign out at any time. During the Small Beta, ask the person who shared the Beta link with you to arrange deletion of your account and associated learning data.
      </Text>

      <Heading as="h2" mt={10} fontFamily={ls.editorialFont} fontSize="2xl">Contact</Heading>
      <Text mt={4} color={ls.textSecondary} lineHeight="1.8">
        Privacy, feedback, and deletion requests:{' '}
        <Text as="a" href={`mailto:${CONTACT_EMAIL}`} color={ls.brand} textDecoration="underline">
          {CONTACT_EMAIL}
        </Text>
      </Text>
      <Text mt={10} color={ls.textMuted} fontSize="sm">Last updated: August 19, 2026</Text>
    </Container>
  </Box>
);
