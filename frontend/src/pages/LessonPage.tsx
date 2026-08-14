import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { Article, KnowledgeStatus, Lesson, LessonItem } from '../types';
import { articleApi } from '../services/articleApi';
import { getLessonError, lessonApi } from '../services/lessonApi';
import { getLevelLabel } from '../services/levelPreference';
import { quizApi } from '../services/quizApi';
import { useNavigate } from 'react-router-dom';
import { LangsiftNav } from '../components/LangsiftNav';
import { useAuth } from '../auth/useAuth';
import { ls } from '../theme/langsift';
import { LangsiftErrorState } from '../components/LangsiftErrorState';

export const LessonPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const initialState = location.state as { lesson?: Lesson; article?: Article } | null;
  const [lesson, setLesson] = useState<Lesson | undefined>(initialState?.lesson);
  const [article, setArticle] = useState<Article | undefined>(initialState?.article);
  const [error, setError] = useState('');
  const [interactionError, setInteractionError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const { user, requestAuth } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: number | undefined;

    const loadLesson = async () => {
      try {
        const loaded = await lessonApi.get(id);
        if (cancelled) return;
        setLesson(loaded);
        if (loaded.status === 'generating') timer = window.setTimeout(loadLesson, 1800);
      } catch (requestError) {
        if (!cancelled) setError(getLessonError(requestError).message);
      }
    };

    void loadLesson();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [id, reloadKey]);

  useEffect(() => {
    if (!lesson?.articleId || article) return;
    articleApi.get(lesson.articleId).then(setArticle).catch(() => setInteractionError('We could not load the source article. The lesson is still available.'));
  }, [article, lesson?.articleId]);

  const updateInteraction = async (
    item: LessonItem,
    update: { knowledgeStatus?: KnowledgeStatus; saved?: boolean },
  ) => {
    if (!lesson) return;
    if (update.saved === true && !user) {
      requestAuth(
        { type: 'save_term', lessonId: lesson.id, itemId: item.id },
        () => setLesson((current) => current ? ({ ...current, items: current.items.map((candidate) => candidate.id === item.id ? { ...candidate, interaction: { ...candidate.interaction, saved: true } } : candidate) }) : current),
        () => setInteractionError('That term was not saved. Please try again.'),
      );
      return;
    }
    const previous = item.interaction;
    setInteractionError('');
    setLesson((current) => current ? ({
      ...current,
      items: current.items.map((candidate) => candidate.id === item.id
        ? { ...candidate, interaction: { ...candidate.interaction, ...update } }
        : candidate),
    }) : current);
    try {
      const persisted = await lessonApi.updateInteraction(lesson.id, item.id, update);
      setLesson((current) => current ? ({
        ...current,
        items: current.items.map((candidate) => candidate.id === item.id
          ? { ...candidate, interaction: persisted }
          : candidate),
      }) : current);
    } catch {
      setLesson((current) => current ? ({
        ...current,
        items: current.items.map((candidate) => candidate.id === item.id
          ? { ...candidate, interaction: previous }
          : candidate),
      }) : current);
      setInteractionError('That choice was not saved. Please try again.');
    }
  };

  const saveLesson = async () => {
    if (!lesson || lesson.savedAt || isSavingLesson) return;
    if (!user) {
      requestAuth(
        { type: 'save_lesson', lessonId: lesson.id },
        () => setLesson((current) => current ? { ...current, savedAt: new Date().toISOString() } : current),
        () => setInteractionError('This lesson was not saved. Please try again.'),
      );
      return;
    }
    setIsSavingLesson(true);
    try { setLesson(await lessonApi.save(lesson.id)); }
    catch { setInteractionError('This lesson was not saved. Please try again.'); }
    finally { setIsSavingLesson(false); }
  };

  const retryLesson = async () => {
    if (!lesson || isRetrying) return;
    setIsRetrying(true);
    setError('');
    try {
      const retried = await lessonApi.create(lesson.articleId, lesson.levelAtGeneration);
      setLesson(retried);
      if (retried.status === 'generating') setReloadKey((value) => value + 1);
    } catch (requestError) {
      setError(getLessonError(requestError).message);
    } finally {
      setIsRetrying(false);
    }
  };

  const startQuiz = async () => {
    if (!lesson || isStartingQuiz) return;
    setIsStartingQuiz(true);
    setError('');
    try {
      const quiz = await quizApi.create(lesson.id);
      navigate(`/lesson-quizzes/${quiz.id}`);
    } catch {
      setInteractionError('We could not start this quiz. Please try again.');
      setIsStartingQuiz(false);
    }
  };

  if (error) return <PageShell><LangsiftErrorState message={error} onRetry={() => { setError(''); setReloadKey((value) => value + 1); }} /><Box mt={5}><BackHome /></Box></PageShell>;
  if (!lesson || lesson.status === 'generating') {
    return (
      <PageShell>
        <Flex minH="55vh" direction="column" justify="center" align="flex-start" maxW="620px">
          <Spinner size="lg" color={ls.brand} thickness="3px" />
          <Heading mt={7} fontFamily="'Lora', serif" fontSize={{ base: '3xl', md: '5xl' }} letterSpacing="-0.04em">
            Sifting your article…
          </Heading>
          <Text mt={4} color={ls.textSecondary} fontSize="lg" lineHeight="1.7">
            Langsift is finding the words and expressions that are most useful for your level.
          </Text>
        </Flex>
      </PageShell>
    );
  }
  if (lesson.status === 'failed') {
    return (
      <PageShell>
        <Text color={ls.danger}>{lesson.failureMessage || "We couldn't create this lesson. Please try again."}</Text>
        <Button mt={5} onClick={retryLesson} isDisabled={isRetrying} bg={ls.brand} color={ls.surface}>
          {isRetrying ? <Flex align="center" gap={2}><Spinner size="sm" />Trying again…</Flex> : 'Try again'}
        </Button>
        <Box mt={5}><BackHome /></Box>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <BackHome />
      <Text mt={{ base: 10, md: 14 }} textTransform="uppercase" letterSpacing="0.12em" fontSize="xs" fontWeight="700" color={ls.brand}>
        {article?.source || 'Your article'}
      </Text>
      <Heading as="h1" mt={3} maxW="900px" fontFamily="'Lora', serif" fontSize={{ base: '3xl', md: '5xl' }} lineHeight="1.12" letterSpacing="-0.04em">
        {article?.title || 'Personalized English lesson'}
      </Heading>
      <Flex mt={4} gap={4} align="center" wrap="wrap">
        <Text color={ls.textSecondary} fontWeight="600">Generated for: {getLevelLabel(lesson.levelAtGeneration)}</Text>
        <Button size="sm" minH="44px" variant="outline" borderColor={ls.border} color={ls.textPrimary} onClick={() => void saveLesson()} isDisabled={!!lesson.savedAt || isSavingLesson} _disabled={{ color: ls.textSecondary, opacity: 1 }} _focusVisible={{ boxShadow: ls.focusRing }}>
          {lesson.savedAt ? 'Lesson saved' : isSavingLesson ? 'Saving…' : 'Save lesson'}
        </Button>
      </Flex>

      <Box mt={{ base: 10, md: 14 }} maxW="840px" py={{ base: 7, md: 9 }} borderTop="1px solid" borderBottom="1px solid" borderColor={ls.border}>
        <Text textTransform="uppercase" letterSpacing="0.12em" fontSize="xs" fontWeight="700" color={ls.brand}>Article overview</Text>
        <Text mt={4} fontFamily={ls.editorialFont} fontSize={{ base: 'lg', md: 'xl' }} lineHeight="1.8" color={ls.textPrimary}>{lesson.summary}</Text>
        <Stack mt={6} spacing={3} color={ls.textSecondary}>
          <Text><strong>Difficulty:</strong> {lesson.difficulty ? getLevelLabel(lesson.difficulty) : '—'}</Text>
          <Text><strong>Learning focus:</strong> {lesson.learningFocus}</Text>
        </Stack>
      </Box>

      <Flex mt={{ base: 12, md: 16 }} align={{ base: 'flex-start', md: 'end' }} justify="space-between" direction={{ base: 'column', md: 'row' }} gap={3}>
        <Box>
          <Text textTransform="uppercase" letterSpacing="0.12em" fontSize="xs" fontWeight="700" color={ls.brand}>Words &amp; expressions</Text>
          <Heading as="h2" mt={2} fontFamily="'Lora', serif" fontSize={{ base: '2xl', md: '4xl' }} letterSpacing="-0.035em">
            {lesson.items.length} things worth learning
          </Heading>
        </Box>
        <Text color={ls.textMuted} fontSize="sm">Your choices are saved automatically.</Text>
      </Flex>

      {lesson.contentDensity === 'low' && (
        <Text mt={5} maxW="760px" color={ls.textSecondary} fontSize="sm" lineHeight="1.65">
          This article has fewer useful learning items for your current level.
        </Text>
      )}

      {interactionError && <Text mt={5} color={ls.danger} aria-live="polite">{interactionError}</Text>}
      <Stack mt={7} spacing={5} maxW="900px">
        {lesson.items.map((item, index) => (
          <Box key={item.id} bg={ls.surface} border="1px solid" borderColor={ls.border} borderRadius="14px" p={{ base: 5, md: 7 }}>
            <Flex align="baseline" gap={3} wrap="wrap">
              <Text color={ls.brand} fontSize="xs" fontWeight="700">{String(index + 1).padStart(2, '0')}</Text>
              <Heading as="h3" fontFamily="'Lora', serif" fontSize={{ base: '2xl', md: '3xl' }} letterSpacing="-0.03em">{item.term}</Heading>
              <Text textTransform="uppercase" letterSpacing="0.08em" fontSize="xs" color={ls.textMuted}>{item.type}</Text>
            </Flex>
            <Text mt={3} fontSize="lg" fontWeight="700" color={ls.textPrimary}>{item.meaningEn || item.meaningZh}</Text>
            <Text mt={6} fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" color={ls.textMuted}>Original context</Text>
            <Text mt={2} p={4} bg={ls.surfaceMuted} borderRadius="10px" fontFamily={ls.bodyFont} fontSize="md" lineHeight="1.7" color={ls.textPrimary}>“{item.contextSentence}”</Text>
            <Text mt={5} color={ls.textSecondary} lineHeight="1.7"><strong>Explanation:</strong> {item.explanation}</Text>
            <Text mt={3} color={ls.textSecondary} lineHeight="1.7"><strong>Example:</strong> {item.exampleSentence}</Text>
            {item.meaningEn && <Text mt={4} color={ls.textMuted} fontSize="sm"><strong>中文辅助：</strong>{item.meaningZh}</Text>}
            <Flex mt={6} gap={2} wrap="wrap">
              <ActionButton active={item.interaction.knowledgeStatus === 'known'} onClick={() => updateInteraction(item, { knowledgeStatus: 'known' })}>I know this</ActionButton>
              <ActionButton active={item.interaction.knowledgeStatus === 'unknown'} onClick={() => updateInteraction(item, { knowledgeStatus: 'unknown' })}>I don&apos;t know this</ActionButton>
              <ActionButton active={item.interaction.saved} onClick={() => updateInteraction(item, { saved: !item.interaction.saved })}>
                {item.interaction.saved ? 'Saved' : 'Save'}
              </ActionButton>
            </Flex>
          </Box>
        ))}
      </Stack>

      <Box mt={12} maxW="900px" p={{ base: 5, md: 7 }} bg={ls.surfaceMuted} borderRadius="14px">
        <Text fontWeight="700">Lesson complete</Text>
        <Text mt={1} color={ls.textSecondary}>Practice up to ten of this lesson&apos;s most useful items.</Text>
        <Button mt={5} onClick={startQuiz} isDisabled={isStartingQuiz} h={12} px={6} bg={ls.brand} color={ls.surface} _hover={{ bg: ls.brandHover }} _focusVisible={{ boxShadow: ls.focusRing }}>
          {isStartingQuiz ? <Flex align="center" gap={2}><Spinner size="sm" />Preparing quiz…</Flex> : 'Continue to Quiz'}
        </Button>
      </Box>
    </PageShell>
  );
};

const ActionButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <Button
    size="sm"
    minH="44px"
    variant="outline"
    aria-pressed={active}
    borderColor={active ? ls.brand : ls.border}
    bg={active ? ls.brandSubtle : 'transparent'}
    color={ls.textPrimary}
    onClick={onClick}
    _hover={{ bg: ls.brandSubtle }}
    _focusVisible={{ boxShadow: ls.focusRing }}
  >{children}</Button>
);

const PageShell = ({ children }: { children: React.ReactNode }) => (
  <Box minH="100vh" bg={ls.background} color={ls.textPrimary} fontFamily={ls.bodyFont}>
    <LangsiftNav />
    <Container maxW="1080px" px={{ base: 5, md: 8 }} py={{ base: 8, md: 12 }}>{children}</Container>
  </Box>
);

const BackHome = () => (
  <Text as={Link} to="/" display="inline-block" color={ls.brand} fontWeight="700" _hover={{ color: ls.brandHover }} _focusVisible={{ boxShadow: ls.focusRing }}>
    ← Start another article
  </Text>
);
