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

export const ArticlePreview = () => {
  const { id } = useParams();
  const location = useLocation();
  const initialArticle = (location.state as { article?: Article } | null)?.article;
  const [article, setArticle] = useState<Article | undefined>(initialArticle);
  const [error, setError] = useState('');
  const [level, setLevel] = useState<LessonLevel>(() => getLevelPreference());
  const [isGenerating, setIsGenerating] = useState(false);
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
  }, [article, id]);

  if (error) {
    return <PreviewShell><Text color="#b23c2d">{error}</Text><BackLink /></PreviewShell>;
  }
  if (!article) {
    return <PreviewShell><Flex align="center" gap={3}><Spinner color="#2d765c" /><Text>Loading your article…</Text></Flex></PreviewShell>;
  }

  const previewText = article.content.slice(0, 1800);

  return (
    <PreviewShell>
      <BackLink />
      <Text mt={{ base: 10, md: 16 }} textTransform="uppercase" letterSpacing="0.16em" fontSize="xs" fontWeight="700" color="#d55539">
        {article.source}
      </Text>
      <Heading as="h1" mt={4} maxW="900px" fontFamily="'Lora', serif" fontSize={{ base: '3xl', md: '5xl' }} lineHeight="1.12" letterSpacing="-0.04em" color="#18322a">
        {article.title}
      </Heading>
      <Flex mt={5} gap={3} wrap="wrap" color="#647b72" fontSize="sm">
        {article.author && <Text>{article.author}</Text>}
        {article.author && <Text aria-hidden="true">·</Text>}
        <Text>{article.wordCount.toLocaleString()} words</Text>
      </Flex>
      {article.excerpt && <Text mt={8} maxW="760px" fontSize="xl" lineHeight="1.7" color="#405f54">{article.excerpt}</Text>}
      <Box mt={10} maxW="760px" pt={8} borderTop="1px solid #d9dfda">
        <Text whiteSpace="pre-line" fontFamily="'Lora', serif" fontSize={{ base: 'lg', md: 'xl' }} lineHeight="1.9" color="#29483d">
          {previewText}{article.content.length > previewText.length ? '…' : ''}
        </Text>
      </Box>
      <Box mt={12} p={{ base: 5, md: 7 }} maxW="760px" bg="#edf1e7" borderRadius="16px">
        <Text fontWeight="700" color="#29483d">Article ready</Text>
        <Text mt={1} mb={5} color="#647b72">Choose the level Langsift should use for this lesson.</Text>
        <LevelSelector value={level} onChange={changeLevel} isDisabled={isGenerating} />
        <Button
          mt={4}
          h={12}
          px={6}
          bg="#ee6c4d"
          color="#fffaf3"
          isDisabled={isGenerating}
          onClick={createLesson}
          _hover={{ bg: '#d95b3d' }}
        >
          {isGenerating ? <Flex align="center" gap={3}><Spinner size="sm" />Creating your lesson…</Flex> : 'Create personalized lesson'}
        </Button>
        {isGenerating && <Text mt={3} fontSize="sm" color="#647b72">This usually takes under a minute. Keep this page open.</Text>}
      </Box>
    </PreviewShell>
  );
};

const PreviewShell = ({ children }: { children: React.ReactNode }) => (
  <Box minH="100vh" bg="#f7f5ee" color="#18322a" fontFamily="'DM Sans', sans-serif">
    <LangsiftNav />
    <Container maxW="1080px" px={{ base: 5, md: 8 }} py={{ base: 8, md: 12 }}>{children}</Container>
  </Box>
);

const BackLink = () => (
  <Text as={Link} to="/" display="inline-block" color="#2d765c" fontWeight="700" _hover={{ color: '#1f5844' }}>
    ← Read another article
  </Text>
);
