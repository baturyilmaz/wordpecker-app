import { useEffect, useState } from 'react';
import { Box, Button, Container, Flex, Heading, Spinner, Text } from '@chakra-ui/react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { Article } from '../types';
import { articleApi, getArticleError } from '../services/articleApi';
import { LevelSelector } from '../components/LevelSelector';
import { getLevelPreference, saveLevelPreference } from '../services/levelPreference';
import type { LessonLevel } from '../types';
import { getLessonError, lessonApi } from '../services/lessonApi';
import { useNavigate } from 'react-router-dom';
import { LangsiftNav } from '../components/LangsiftNav';
import { ls } from '../theme/langsift';
import { LangsiftErrorState } from '../components/LangsiftErrorState';

export const ArticlePreview = () => {
  const { id } = useParams();
  const location = useLocation();
  const initialArticle = (location.state as { article?: Article } | null)?.article;
  const [article, setArticle] = useState<Article | undefined>(initialArticle);
  const [error, setError] = useState('');
  const [level, setLevel] = useState<LessonLevel>(() => getLevelPreference());
  const [isGenerating, setIsGenerating] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const navigate = useNavigate();

  const changeLevel = (nextLevel: LessonLevel) => {
    setLevel(nextLevel);
    saveLevelPreference(nextLevel);
  };

  const createLesson = async () => {
    if (!article || isGenerating) return;
    setError('');
    setIsGenerating(true);
    try {
      const lesson = await lessonApi.create(article.id, level);
      navigate(`/lessons/${lesson.id}`, { state: { lesson, article } });
    } catch (requestError) {
      setError(getLessonError(requestError).message);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (article || !id) return;
    articleApi.get(id).then(setArticle).catch((requestError: unknown) => setError(getArticleError(requestError).message));
  }, [article, id, retryKey]);

  if (error && !article) {
    return <PreviewShell><LangsiftErrorState message={error} onRetry={() => { setError(''); setRetryKey((value) => value + 1); }} /><Box mt={5}><BackLink /></Box></PreviewShell>;
  }
  if (!article) {
    return <PreviewShell><Flex align="center" gap={3}><Spinner color={ls.brand} /><Text>Loading your article…</Text></Flex></PreviewShell>;
  }

  const previewText = article.content.slice(0, 1800);

  return (
    <PreviewShell>
      <BackLink />
      <Text mt={{ base: 10, md: 16 }} textTransform="uppercase" letterSpacing="0.12em" fontSize="xs" fontWeight="700" color={ls.brand}>
        {article.source}
      </Text>
      <Heading as="h1" mt={4} maxW="900px" fontFamily={ls.editorialFont} fontSize={{ base: '3xl', md: '5xl' }} lineHeight="1.12" letterSpacing="-0.035em" color={ls.textPrimary}>
        {article.title}
      </Heading>
      <Flex mt={5} gap={3} wrap="wrap" color={ls.textSecondary} fontSize="sm">
        {article.author && <Text>{article.author}</Text>}
        {article.author && <Text aria-hidden="true">·</Text>}
        <Text>{article.wordCount.toLocaleString()} words</Text>
      </Flex>
      {article.excerpt && <Text mt={8} maxW="760px" fontSize="xl" lineHeight="1.7" color={ls.textPrimary}>{article.excerpt}</Text>}
      <Box mt={10} maxW="760px" pt={8} borderTop="1px solid" borderColor={ls.border}>
        <Text whiteSpace="pre-line" fontFamily={ls.editorialFont} fontSize={{ base: 'lg', md: 'xl' }} lineHeight="1.9" color={ls.textPrimary}>
          {previewText}{article.content.length > previewText.length ? '…' : ''}
        </Text>
      </Box>
      <Box mt={12} p={{ base: 5, md: 7 }} maxW="760px" bg={ls.surfaceMuted} borderRadius="14px">
        <Text fontWeight="700" color={ls.textPrimary}>Article ready</Text>
        <Text mt={1} mb={5} color={ls.textSecondary}>Choose the level Langsift should use for this lesson.</Text>
        <LevelSelector value={level} onChange={changeLevel} isDisabled={isGenerating} />
        <Button
          mt={4}
          h={12}
          px={6}
          bg={ls.brand}
          color={ls.surface}
          isDisabled={isGenerating}
          onClick={createLesson}
          _hover={{ bg: ls.brandHover }}
        >
          {isGenerating ? <Flex align="center" gap={3}><Spinner size="sm" />Creating your lesson…</Flex> : 'Create personalized lesson'}
        </Button>
        {isGenerating && <Text mt={3} fontSize="sm" color={ls.textSecondary}>This usually takes under a minute. Keep this page open.</Text>}
        {error && <Box mt={4}><LangsiftErrorState message={error} onRetry={() => void createLesson()} retrying={isGenerating} /></Box>}
      </Box>
    </PreviewShell>
  );
};

const PreviewShell = ({ children }: { children: React.ReactNode }) => (
  <Box minH="100vh" bg={ls.background} color={ls.textPrimary} fontFamily={ls.bodyFont}>
    <LangsiftNav />
    <Container maxW="1080px" px={{ base: 5, md: 8 }} py={{ base: 8, md: 12 }}>{children}</Container>
  </Box>
);

const BackLink = () => (
  <Text as={Link} to="/" display="inline-block" color={ls.brand} fontWeight="700" _hover={{ color: ls.brandHover }} _focusVisible={{ boxShadow: ls.focusRing }}>
    ← Read another article
  </Text>
);
