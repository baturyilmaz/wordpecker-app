import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Box, Button, Container, Flex, Heading, Input, Spinner, Stack, Text } from '@chakra-ui/react';
import { Link, useParams } from 'react-router-dom';
import type { LessonQuiz } from '../types';
import { quizApi } from '../services/quizApi';
import { LangsiftNav } from '../components/LangsiftNav';
import { ls } from '../theme/langsift';
import type { LessonQuizQuestion } from '../types';
import { LangsiftErrorState } from '../components/LangsiftErrorState';

export const LessonQuizPage = () => {
  const { id } = useParams();
  const [quiz, setQuiz] = useState<LessonQuiz>();
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<LessonQuizQuestion>();
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    quizApi.get(id).then(setQuiz).catch(() => setError('We could not load this quiz.'));
  }, [id, retryKey]);

  const current = useMemo(() => quiz?.questions.find((question) => !question.answeredAt), [quiz]);
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!quiz || !current || feedback || !answer.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const updated = await quizApi.answer(quiz.id, current.id, answer);
      setQuiz(updated);
      setFeedback(updated.questions.find((question) => question.id === current.id));
    } catch {
      setError('That answer could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!quiz && !error) return <QuizShell><Spinner color={ls.brand} /><Text mt={4}>Preparing your quiz…</Text></QuizShell>;
  if (error && !quiz) return <QuizShell><LangsiftErrorState message={error} onRetry={() => { setError(''); setRetryKey((value) => value + 1); }} /></QuizShell>;
  if (!quiz) return null;

  if (quiz.status === 'completed' && !feedback) {
    return (
      <QuizShell>
        <Text textTransform="uppercase" letterSpacing="0.12em" fontSize="xs" fontWeight="700" color={ls.brand}>Quiz complete</Text>
        <Heading mt={4} fontFamily="'Lora', serif" fontSize={{ base: '4xl', md: '6xl' }} letterSpacing="-0.05em">
          {quiz.correctCount} / {quiz.questionCount}
        </Heading>
        <Text mt={4} color={ls.textSecondary} fontSize="lg">Score: {quiz.score}%</Text>
        <Flex mt={9} gap={3} wrap="wrap">
          <Button as={Link} to="/vocabulary" bg={ls.brand} color={ls.surface} _hover={{ bg: ls.brandHover }}>Review Vocabulary</Button>
          <Button as={Link} to="/review" variant="outline" borderColor={ls.border}>Start Review</Button>
          <Button as={Link} to={`/lessons/${quiz.lessonId}`} variant="ghost">Back to Lesson</Button>
        </Flex>
      </QuizShell>
    );
  }

  const displayed = feedback || current;
  if (!displayed) return null;
  const optionStyle = (option: string) => {
    if (!feedback) return answer === option
      ? { borderColor: ls.brand, bg: ls.brandSubtle }
      : { borderColor: ls.border, bg: ls.surface };
    if (option === feedback.correctAnswer) return { borderColor: ls.success, bg: ls.successSurface };
    if (option === feedback.userAnswer && !feedback.isCorrect) return { borderColor: ls.danger, bg: ls.dangerSurface };
    return { borderColor: ls.border, bg: ls.surface };
  };
  return (
    <QuizShell>
      <Flex justify="space-between" align="baseline" gap={4}>
        <Text textTransform="uppercase" letterSpacing="0.12em" fontSize="xs" fontWeight="700" color={ls.brand}>Lesson quiz</Text>
        <Text color={ls.textMuted} fontSize="sm">{Math.min(quiz.totalCount + (feedback ? 0 : 1), quiz.questionCount)} / {quiz.questionCount}</Text>
      </Flex>
      <Heading mt={{ base: 6, md: 8 }} maxW="760px" fontFamily={ls.bodyFont} fontSize={{ base: '2xl', md: '3xl' }} lineHeight="1.3" letterSpacing="-0.02em">
        {displayed.prompt}
      </Heading>
      {displayed.type === 'multiple_choice' ? (
        <Stack mt={{ base: 7, md: 9 }} spacing={3} maxW="760px">
          {displayed.options.map((option) => (
            <Button key={option} onClick={() => { if (!feedback) setAnswer(option); }} aria-pressed={answer === option} justifyContent="flex-start" h="auto" minH="56px" py={4} px={5} whiteSpace="normal" textAlign="left" variant="outline" color={ls.textPrimary} fontWeight="600" lineHeight="1.5" {...optionStyle(option)} _hover={{ borderColor: feedback ? optionStyle(option).borderColor : ls.brand, bg: feedback ? optionStyle(option).bg : ls.brandSubtle }} _focusVisible={{ boxShadow: ls.focusRing, outline: '2px solid', outlineColor: ls.brand, outlineOffset: '2px' }}>
              {option}
            </Button>
          ))}
          {!feedback && <Button mt={3} minH="48px" onClick={() => void submit()} isDisabled={!answer || saving} bg={ls.brand} color={ls.surface} _hover={{ bg: ls.brandHover }} _disabled={{ bg: ls.disabled, color: ls.textSecondary, opacity: 1, cursor: 'not-allowed' }} _focusVisible={{ boxShadow: ls.focusRing }}>Submit answer</Button>}
        </Stack>
      ) : (
        <Box as="form" onSubmit={submit} mt={9} maxW="620px">
          <Input value={answer} onChange={(event) => setAnswer(event.target.value)} isReadOnly={!!feedback} placeholder="Type the missing word or phrase" h={14} bg={ls.surface} borderColor={feedback ? (feedback.isCorrect ? ls.success : ls.danger) : ls.border} color={ls.textPrimary} _placeholder={{ color: ls.textMuted }} _focusVisible={{ borderColor: ls.brand, boxShadow: ls.focusRing }} />
          {!feedback && <Button type="submit" mt={4} minH="48px" isDisabled={!answer.trim() || saving} bg={ls.brand} color={ls.surface} _hover={{ bg: ls.brandHover }} _disabled={{ bg: ls.disabled, color: ls.textSecondary, opacity: 1 }}>Submit answer</Button>}
        </Box>
      )}
      {feedback && (
        <Box mt={6} maxW="760px" p={5} bg={feedback.isCorrect ? ls.successSurface : ls.dangerSurface} borderRadius="12px" aria-live="polite">
          <Text color={feedback.isCorrect ? ls.success : ls.danger} fontWeight="800">{feedback.isCorrect ? 'Correct' : 'Not quite'}</Text>
          <Text mt={2} color={ls.textPrimary} fontWeight="700">{feedback.correctAnswer}</Text>
          {feedback.explanation && <Text mt={2} color={ls.textSecondary} lineHeight="1.65">{feedback.explanation}</Text>}
          <Button mt={4} minH="44px" onClick={() => { setFeedback(undefined); setAnswer(''); }} bg={ls.brand} color={ls.surface} _hover={{ bg: ls.brandHover }}>
            {quiz.status === 'completed' ? 'See results' : 'Next question'}
          </Button>
        </Box>
      )}
      {error && <Text mt={4} color={ls.danger}>{error}</Text>}
    </QuizShell>
  );
};

const QuizShell = ({ children }: { children: React.ReactNode }) => (
  <Box minH="100vh" bg={ls.background} color={ls.textPrimary} fontFamily={ls.bodyFont}>
    <LangsiftNav />
    <Container maxW="1080px" px={{ base: 5, md: 8 }} py={{ base: 12, md: 20 }}>{children}</Container>
  </Box>
);
