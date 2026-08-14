import { useEffect, useState } from 'react';
import { Box, Button, Container, Flex, Heading, SimpleGrid, Spinner, Stack, Text } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { LangsiftNav } from '../components/LangsiftNav';
import { dashboardApi } from '../services/dashboardApi';
import { getLevelLabel } from '../services/levelPreference';
import type { DashboardData } from '../types';
import { ls } from '../theme/langsift';
import { LangsiftErrorState } from '../components/LangsiftErrorState';

export const DashboardPage = () => {
  const { user, loading: authLoading, requestAuth } = useAuth();
  const [data, setData] = useState<DashboardData>();
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (authLoading) return;
    if (!user) { requestAuth({ type: 'open_dashboard' }); return; }
    setLoading(true);
    setError('');
    dashboardApi.get().then(setData).catch(() => setError('We could not load your dashboard.')).finally(() => setLoading(false));
  }, [authLoading, requestAuth, retryKey, user]);
  return (
    <PageShell>
      <Flex align={{ base: 'flex-start', md: 'end' }} justify="space-between" direction={{ base: 'column', md: 'row' }} gap={5}>
        <Box><Text {...eyebrow}>Your learning</Text><Heading mt={3} {...title}>Welcome back{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}.</Heading></Box>
        <Button as={Link} to="/" bg={ls.brand} color={ls.surface} h={12} px={6} _hover={{ bg: ls.brandHover }}>Create New Lesson</Button>
      </Flex>
      {(authLoading || loading) && <Spinner mt={12} color={ls.brand} />}
      {error && <Box mt={10}><LangsiftErrorState message={error} onRetry={() => setRetryKey((value) => value + 1)} retrying={loading} /></Box>}
      {data && <>
        <SimpleGrid mt={10} columns={{ base: 1, md: 3 }} gap={5}>
          <Card title="Continue Learning"><Text color={ls.textSecondary}>{data.continueLearning ? 'Your unfinished quiz is ready.' : 'Start a lesson whenever you’re ready.'}</Text>{data.continueLearning && <Button as={Link} to={`/lesson-quizzes/${data.continueLearning.id}`} mt={5} variant="outline" color={ls.textPrimary} borderColor={ls.border}>Continue Quiz</Button>}</Card>
          <Card title="Review Today"><Text fontSize="3xl" fontFamily={ls.editorialFont}>{data.reviewDueCount}</Text><Button as={Link} to="/review" mt={4} variant="outline" color={ls.textPrimary} borderColor={ls.border}>Start Review</Button></Card>
          <Card title="Vocabulary"><Flex gap={5}><Metric label="Total" value={data.vocabularyCounts.totalEligible} /><Metric label="Unknown" value={data.vocabularyCounts.unknown} /><Metric label="Saved" value={data.vocabularyCounts.saved} /></Flex><Button as={Link} to="/vocabulary" mt={4} variant="outline" color={ls.textPrimary} borderColor={ls.border}>Open Vocabulary</Button></Card>
        </SimpleGrid>
        <Box mt={14}><Text {...eyebrow}>Recent lessons</Text><Heading mt={2} fontFamily="'Lora', serif" fontSize={{ base: '2xl', md: '4xl' }}>Pick up where you left off.</Heading>
          {!data.recentLessons.length && <Text mt={6} color={ls.textSecondary}>Your recent lessons will appear here.</Text>}
          <Stack mt={6} spacing={0} divider={<Box borderBottom="1px solid" borderColor={ls.border} />}>
            {data.recentLessons.map((lesson) => <Flex key={lesson.id} as={Link} to={`/lessons/${lesson.id}`} py={5} justify="space-between" gap={5} direction={{ base: 'column', sm: 'row' }}><Box><Text fontFamily={ls.editorialFont} fontSize="xl" fontWeight="700">{lesson.articleTitle}</Text><Text mt={1} color={ls.textSecondary} fontSize="sm">{lesson.source} · {getLevelLabel(lesson.level)}</Text></Box><Text color={ls.textMuted} fontSize="sm">{new Date(lesson.createdAt).toLocaleDateString()} · {lesson.quizState.replace('_', ' ')}</Text></Flex>)}
          </Stack>
        </Box>
      </>}
    </PageShell>
  );
};

const Card = ({ title: cardTitle, children }: { title: string; children: React.ReactNode }) => <Box border="1px solid" borderColor={ls.border} borderRadius="14px" bg={ls.surface} p={6}><Heading fontFamily={ls.editorialFont} fontSize="xl" mb={4}>{cardTitle}</Heading>{children}</Box>;
const Metric = ({ label, value }: { label: string; value: number }) => <Box><Text fontSize="2xl" fontWeight="700">{value}</Text><Text color={ls.textMuted} fontSize="xs">{label}</Text></Box>;
const eyebrow = { textTransform: 'uppercase' as const, letterSpacing: '0.12em', fontSize: 'xs', fontWeight: '700', color: ls.brand };
const title = { fontFamily: ls.editorialFont, fontSize: { base: '3xl', md: '5xl' }, letterSpacing: '-0.035em' };
const PageShell = ({ children }: { children: React.ReactNode }) => <Box minH="100vh" bg={ls.background} color={ls.textPrimary} fontFamily={ls.bodyFont}><LangsiftNav /><Container maxW="1080px" px={{ base: 5, md: 8 }} py={{ base: 10, md: 16 }}>{children}</Container></Box>;
