import { FormEvent, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  SimpleGrid,
  Spinner,
  Text,
  VisuallyHidden,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { articleApi, getArticleError } from '../services/articleApi';
import { LevelSelector } from '../components/LevelSelector';
import { getLevelPreference, saveLevelPreference } from '../services/levelPreference';
import type { LessonLevel } from '../types';
import { LangsiftNav } from '../components/LangsiftNav';
import { useAuth } from '../auth/useAuth';
import { authApi } from '../services/authApi';
import { ls } from '../theme/langsift';

const benefits = [
  ['01', 'Learn from what you already read', 'Bring the ideas you care about into every lesson.'],
  ['02', 'AI picks what matters', 'Focus on language worth noticing, not endless word lists.'],
  ['03', 'Remember it later', 'Build knowledge that stays with you after the tab closes.'],
] as const;

export const Landing = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [level, setLevel] = useState<LessonLevel>(() => getLevelPreference());
  const { user, updateUser } = useAuth();

  useEffect(() => {
    if (user?.levelPreference) {
      setLevel(user.levelPreference);
      saveLevelPreference(user.levelPreference);
    }
  }, [user?.levelPreference]);

  const changeLevel = (nextLevel: LessonLevel) => {
    setLevel(nextLevel);
    saveLevelPreference(nextLevel);
    if (user) void authApi.updateLevel(nextLevel).then(({ user: updated }) => updateUser(updated));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!url.trim() || isLoading) return;

    setError('');
    setIsLoading(true);
    try {
      const article = await articleApi.extract(url.trim());
      navigate(`/articles/${article.id}`, { state: { article } });
    } catch (requestError) {
      setError(getArticleError(requestError).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg={ls.background} color={ls.textPrimary} fontFamily={ls.bodyFont}>
      <LangsiftNav />
      <Container maxW="1180px" px={{ base: 5, md: 8 }}>
        <Box as="main" pt={{ base: 14, md: 24 }} pb={{ base: 20, md: 28 }}>
          <Box maxW="850px">
            <Text textTransform="uppercase" letterSpacing="0.12em" fontSize="xs" fontWeight="700" color={ls.brand} mb={5}>
              Your reading, made learnable
            </Text>
            <Heading
              as="h1"
              fontFamily={ls.editorialFont}
              fontSize={{ base: 'clamp(2.75rem, 12vw, 4.2rem)', md: 'clamp(4.2rem, 7vw, 6.6rem)' }}
              lineHeight={{ base: 1.02, md: 0.98 }}
              letterSpacing="-0.035em"
              fontWeight="600"
              maxW="820px"
            >
              Turn anything you read into an English lesson.
            </Heading>
            <Text mt={{ base: 6, md: 8 }} maxW="590px" fontSize={{ base: 'lg', md: 'xl' }} lineHeight="1.7" color={ls.textSecondary}>
              Paste a public English article. Langsift clears away the noise and prepares the reading for your next lesson.
            </Text>
          </Box>

          <Box mt={{ base: 9, md: 11 }}>
            <LevelSelector value={level} onChange={changeLevel} isDisabled={isLoading} />
          </Box>

          <Box as="form" onSubmit={submit} mt={{ base: 4, md: 5 }} maxW="900px">
            <FormControl isInvalid={Boolean(error)}>
              <VisuallyHidden><FormLabel htmlFor="article-url">Article URL</FormLabel></VisuallyHidden>
              <Flex
                direction={{ base: 'column', md: 'row' }}
                bg={ls.surface}
                border="1px solid"
                borderColor={error ? ls.danger : ls.border}
                borderRadius="16px"
                p={{ base: 2, md: 2 }}
                gap={2}
                _focusWithin={{ borderColor: ls.brand, boxShadow: ls.focusRing }}
              >
                <Input
                  id="article-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="Paste an article URL…"
                  autoComplete="url"
                  h={{ base: 14, md: 16 }}
                  px={{ base: 4, md: 5 }}
                  fontSize={{ base: 'md', md: 'lg' }}
                  border="0"
                  bg="transparent"
                  color={ls.textPrimary}
                  _placeholder={{ color: ls.textMuted }}
                  _focusVisible={{ boxShadow: 'none' }}
                  isDisabled={isLoading}
                />
                <Button
                  type="submit"
                  isDisabled={!url.trim() || isLoading}
                  h={{ base: 14, md: 16 }}
                  minW={{ md: '190px' }}
                  borderRadius="12px"
                  bg={ls.brand}
                  color={ls.surface}
                  fontSize="md"
                  fontWeight="700"
                  _hover={{ bg: ls.brandHover }}
                  _disabled={{ bg: ls.disabled, color: ls.textSecondary, cursor: 'not-allowed', opacity: 1 }}
                  _focusVisible={{ boxShadow: ls.focusRing }}
                >
                  {isLoading ? <Flex align="center" gap={3}><Spinner size="sm" /> Extracting article</Flex> : error ? 'Try again' : 'Create Lesson'}
                </Button>
              </Flex>
              <Box minH="28px" pt={2} px={2} aria-live="polite">
                {error && <Text color={ls.danger} fontSize="sm">{error}</Text>}
              </Box>
            </FormControl>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 8, md: 12 }} mt={{ base: 14, md: 20 }} pt={10} borderTop="1px solid" borderColor={ls.border}>
            {benefits.map(([number, title, copy]) => (
              <Box key={number}>
                <Text fontSize="xs" fontWeight="700" letterSpacing="0.1em" color={ls.brand}>{number}</Text>
                <Heading as="h2" mt={3} fontFamily={ls.editorialFont} fontSize="xl" letterSpacing="-0.025em">{title}</Heading>
                <Text mt={2} color={ls.textSecondary} lineHeight="1.65">{copy}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      </Container>
    </Box>
  );
};
