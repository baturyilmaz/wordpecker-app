import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Box, Button, Container, Flex, Heading, Input, Spinner, Stack, Text } from '@chakra-ui/react';
import { Link, useParams } from 'react-router-dom';
import type { LessonQuiz } from '../types';
import { quizApi } from '../services/quizApi';
import { LangsiftNav } from '../components/LangsiftNav';

export const LessonQuizPage = () => {
  const { id } = useParams();
  const [quiz, setQuiz] = useState<LessonQuiz>();
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    quizApi.get(id).then(setQuiz).catch(() => setError('We could not load this quiz.'));
  }, [id]);

  const current = useMemo(() => quiz?.questions.find((question) => !question.answeredAt), [quiz]);
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!quiz || !current || !answer.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      setQuiz(await quizApi.answer(quiz.id, current.id, answer));
      setAnswer('');
    } catch {
      setError('That answer could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!quiz && !error) return <QuizShell><Spinner color="#ee6c4d" /><Text mt={4}>Preparing your quiz…</Text></QuizShell>;
  if (error && !quiz) return <QuizShell><Text color="#b23c2d">{error}</Text></QuizShell>;
  if (!quiz) return null;

  if (quiz.status === 'completed') {
    return (
      <QuizShell>
        <Text textTransform="uppercase" letterSpacing="0.15em" fontSize="xs" fontWeight="700" color="#d55539">Quiz complete</Text>
        <Heading mt={4} fontFamily="'Lora', serif" fontSize={{ base: '4xl', md: '6xl' }} letterSpacing="-0.05em">
          {quiz.correctCount} / {quiz.questionCount}
        </Heading>
        <Text mt={4} color="#557067" fontSize="lg">Score: {quiz.score}%</Text>
        <Flex mt={9} gap={3} wrap="wrap">
          <Button as={Link} to="/vocabulary" bg="#ee6c4d" color="#fffaf3">Review Vocabulary</Button>
          <Button as={Link} to="/review" variant="outline" borderColor="#9fb2a8">Start Review</Button>
          <Button as={Link} to={`/lessons/${quiz.lessonId}`} variant="ghost">Back to Lesson</Button>
        </Flex>
      </QuizShell>
    );
  }

  if (!current) return null;
  return (
    <QuizShell>
      <Flex justify="space-between" align="baseline" gap={4}>
        <Text textTransform="uppercase" letterSpacing="0.15em" fontSize="xs" fontWeight="700" color="#d55539">Lesson quiz</Text>
        <Text color="#71847d" fontSize="sm">{quiz.totalCount + 1} / {quiz.questionCount}</Text>
      </Flex>
      <Heading mt={8} maxW="780px" fontFamily="'Lora', serif" fontSize={{ base: '2xl', md: '4xl' }} lineHeight="1.35" letterSpacing="-0.03em">
        {current.prompt}
      </Heading>
      {current.type === 'multiple_choice' ? (
        <Stack mt={9} spacing={3} maxW="720px">
          {current.options.map((option) => (
            <Button key={option} onClick={() => { setAnswer(option); }} onDoubleClick={() => void submit()} justifyContent="flex-start" h="auto" minH="52px" py={3} px={5} whiteSpace="normal" variant="outline" borderColor={answer === option ? '#2d765c' : '#c7d1ca'} bg={answer === option ? '#e3eee7' : '#fffdf7'}>
              {option}
            </Button>
          ))}
          <Button mt={3} onClick={() => void submit()} isDisabled={!answer || saving} bg="#ee6c4d" color="#fffaf3">Submit answer</Button>
        </Stack>
      ) : (
        <Box as="form" onSubmit={submit} mt={9} maxW="620px">
          <Input value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type the missing word or phrase" h={14} bg="#fffdf7" borderColor="#c7d1ca" />
          <Button type="submit" mt={4} isDisabled={!answer.trim() || saving} bg="#ee6c4d" color="#fffaf3">Submit answer</Button>
        </Box>
      )}
      {error && <Text mt={4} color="#b23c2d">{error}</Text>}
    </QuizShell>
  );
};

const QuizShell = ({ children }: { children: React.ReactNode }) => (
  <Box minH="100vh" bg="#f7f5ee" color="#18322a" fontFamily="'DM Sans', sans-serif">
    <LangsiftNav />
    <Container maxW="1080px" px={{ base: 5, md: 8 }} py={{ base: 12, md: 20 }}>{children}</Container>
  </Box>
);
