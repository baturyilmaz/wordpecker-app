import { useEffect, useState } from 'react';
import { Box, Button, Container, Flex, Heading, Spinner, Stack, Text } from '@chakra-ui/react';
import { LangsiftNav } from '../components/LangsiftNav';
import { describeVocabularyError, vocabularyApi, VocabularyFilter } from '../services/vocabularyApi';
import type { VocabularyEntry } from '../types';
import { useAuth } from '../auth/useAuth';
import { ls } from '../theme/langsift';
import { LangsiftErrorState } from '../components/LangsiftErrorState';

const filters: Array<[VocabularyFilter, string]> = [['all', 'All'], ['unknown', "Don't know"], ['saved', 'Saved'], ['due', 'Due']];

export const VocabularyPage = () => {
  const [filter, setFilter] = useState<VocabularyFilter>('all');
  const [items, setItems] = useState<VocabularyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const { user, loading: authLoading, requestAuth } = useAuth();
  const emptyMessages: Record<VocabularyFilter, string> = {
    all: 'Mark a lesson item “I don’t know this” or save it, and it will appear here.',
    unknown: 'No words marked “Don’t know” yet.',
    saved: 'No saved words yet.',
    due: 'No words are due for review.',
  };
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); requestAuth({ type: 'open_vocabulary' }); return; }
    setLoading(true);
    setError('');
    vocabularyApi.list(filter)
      .then((result) => setItems(result.items))
      .catch((requestError) => {
        const diagnostic = describeVocabularyError(requestError);
        if (import.meta.env.DEV) console.error('Vocabulary request failed.', { ...diagnostic, endpoint: '/api/vocabulary', filter });
        setError(diagnostic.code === 'AUTH_REQUIRED' ? 'Sign in to load your vocabulary.' : 'We could not load your vocabulary.');
      })
      .finally(() => setLoading(false));
  }, [authLoading, filter, requestAuth, retryKey, user]);

  return (
    <PageShell>
      <Text textTransform="uppercase" letterSpacing="0.12em" fontSize="xs" fontWeight="700" color={ls.brand}>Your vocabulary</Text>
      <Heading mt={3} fontFamily={ls.editorialFont} fontSize={{ base: '3xl', md: '5xl' }} letterSpacing="-0.035em">Words worth returning to.</Heading>
      <Flex mt={8} gap={2} wrap="wrap">
        {filters.map(([value, label]) => <Button key={value} size="sm" minH="44px" aria-pressed={filter === value} onClick={() => setFilter(value)} variant="outline" bg={filter === value ? ls.brand : 'transparent'} color={filter === value ? ls.surface : ls.textPrimary} borderColor={filter === value ? ls.brand : ls.border} _hover={{ bg: filter === value ? ls.brandHover : ls.brandSubtle }} _focusVisible={{ boxShadow: ls.focusRing }}>{label}</Button>)}
      </Flex>
      {loading && <Spinner mt={12} color={ls.brand} />}
      {error && <Box mt={8}><LangsiftErrorState message={error} onRetry={() => setRetryKey((value) => value + 1)} retrying={loading} /></Box>}
      {!loading && !error && !items.length && <Box mt={12} maxW="620px"><Heading fontFamily={ls.editorialFont} fontSize="2xl">Nothing here yet.</Heading><Text mt={3} color={ls.textSecondary}>{emptyMessages[filter]}</Text></Box>}
      <Stack mt={10} spacing={0} maxW="900px" divider={<Box borderBottom="1px solid" borderColor={ls.border} />}>
        {items.map((item) => {
          const occurrence = item.occurrences[0];
          return (
            <Box key={item.normalizedTerm} py={7}>
              <Flex justify="space-between" gap={5} align="flex-start">
                <Box>
                  <Heading fontFamily={ls.editorialFont} fontSize={{ base: '2xl', md: '3xl' }}>{item.term}</Heading>
                  <Text mt={2} color={ls.textPrimary} fontWeight="700">{occurrence?.meaningEnAtOccurrence || occurrence?.meaningAtOccurrence}</Text>
                  {occurrence?.meaningEnAtOccurrence && occurrence.meaningZhAtOccurrence && <Text mt={2} color={ls.textMuted} fontSize="sm">中文：{occurrence.meaningZhAtOccurrence}</Text>}
                </Box>
                <Flex gap={2} wrap="wrap" justify="flex-end">
                  {item.knowledgeStatus === 'unknown' && <Status>Don&apos;t know</Status>}
                  {item.saved && <Status>Saved</Status>}
                </Flex>
              </Flex>
              {occurrence && <><Text mt={4} color={ls.textSecondary} lineHeight="1.65">“{occurrence.contextSentence}”</Text><Text mt={2} color={ls.textMuted} fontSize="sm">From {occurrence.sourceName}: {occurrence.articleTitle}</Text></>}
              <Text mt={2} color={ls.textMuted} fontSize="sm">Next review: {new Date(item.review.nextReviewAt).toLocaleString()}</Text>
              {item.occurrences.length > 1 && <Text mt={2} color={ls.brand} fontSize="sm">Seen in {item.occurrences.length} articles</Text>}
            </Box>
          );
        })}
      </Stack>
    </PageShell>
  );
};

const Status = ({ children }: { children: React.ReactNode }) => <Text px={3} py={1} borderRadius="999px" bg={ls.brandSubtle} color={ls.textPrimary} fontSize="xs" fontWeight="700">{children}</Text>;
const PageShell = ({ children }: { children: React.ReactNode }) => <Box minH="100vh" bg={ls.background} color={ls.textPrimary} fontFamily={ls.bodyFont}><LangsiftNav /><Container maxW="1080px" px={{ base: 5, md: 8 }} py={{ base: 10, md: 16 }}>{children}</Container></Box>;
