import { useEffect, useState } from 'react';
import { Box, Button, Container, Flex, Heading, Spinner, Text } from '@chakra-ui/react';
import { LangsiftNav } from '../components/LangsiftNav';
import { reviewApi, ReviewRating } from '../services/reviewApi';
import type { VocabularyEntry } from '../types';
import { useAuth } from '../auth/useAuth';
import { ls } from '../theme/langsift';
import { LangsiftErrorState } from '../components/LangsiftErrorState';

export const ReviewPage = () => {
  const [items, setItems] = useState<VocabularyEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const { user, loading: authLoading, requestAuth } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); requestAuth({ type: 'open_review' }); return; }
    setLoading(true);
    setError('');
    reviewApi.due().then((result) => { setItems(result.items); setIndex(0); setRevealed(false); }).catch(() => setError('We could not load today’s review.')).finally(() => setLoading(false));
  }, [authLoading, requestAuth, retryKey, user]);

  const rate = async (rating: ReviewRating) => {
    const current = items[index];
    if (!current) return;
    try {
      await reviewApi.rate(current.normalizedTerm, rating);
      setIndex((value) => value + 1);
      setRevealed(false);
    } catch {
      setError('That review was not saved. Please try again.');
    }
  };

  const current = items[index];
  const occurrence = current?.occurrences[0];
  return (
    <PageShell>
      {loading && <Spinner color={ls.brand} />}
      {error && <LangsiftErrorState message={error} onRetry={() => setRetryKey((value) => value + 1)} retrying={loading} />}
      {!loading && !error && !current && (
        <Box maxW="680px">
          <Text textTransform="uppercase" letterSpacing="0.12em" fontSize="xs" fontWeight="700" color={ls.brand}>Review today</Text>
          <Heading mt={4} fontFamily="'Lora', serif" fontSize={{ base: '4xl', md: '6xl' }} letterSpacing="-0.05em">You’re caught up.</Heading>
          <Text mt={5} color={ls.textSecondary} fontSize="lg">Come back when your next words are due.</Text>
        </Box>
      )}
      {current && occurrence && (
        <Box maxW="820px">
          <Flex justify="space-between" align="baseline">
            <Text textTransform="uppercase" letterSpacing="0.12em" fontSize="xs" fontWeight="700" color={ls.brand}>Review today</Text>
            <Text color={ls.textMuted} fontSize="sm">{index + 1} / {items.length}</Text>
          </Flex>
          <Heading mt={{ base: 10, md: 14 }} fontFamily="'Lora', serif" fontSize={{ base: '4xl', md: '7xl' }} letterSpacing="-0.055em">{current.term}</Heading>
          <Text mt={7} p={5} bg={ls.surfaceMuted} borderRadius="12px" fontFamily={ls.bodyFont} fontSize={{ base: 'lg', md: 'xl' }} lineHeight="1.75" color={ls.textPrimary}>“{occurrence.contextSentence}”</Text>
          <Text mt={4} color={ls.textMuted} fontSize="sm">{occurrence.sourceName} · {occurrence.articleTitle}</Text>
          {!revealed ? (
            <Button mt={10} onClick={() => setRevealed(true)} bg={ls.brand} color={ls.surface} h={12} px={8} _hover={{ bg: ls.brandHover }} _focusVisible={{ boxShadow: ls.focusRing }}>Reveal</Button>
          ) : (
            <Box mt={10} pt={8} borderTop="1px solid" borderColor={ls.border}>
              <Text color={ls.textPrimary} fontSize="xl" fontWeight="700">{occurrence.meaningEnAtOccurrence || occurrence.meaningAtOccurrence}</Text>
              <Text mt={4} color={ls.textSecondary} lineHeight="1.7">{occurrence.explanation}</Text>
              <Text mt={3} color={ls.textSecondary} lineHeight="1.7"><strong>Example:</strong> {occurrence.exampleSentence}</Text>
              {occurrence.meaningEnAtOccurrence && <Text mt={3} color={ls.textMuted} fontSize="sm"><strong>中文：</strong>{occurrence.meaningZhAtOccurrence}</Text>}
              <Flex mt={8} gap={3} wrap="wrap">
                <Button minH="44px" onClick={() => void rate('forgot')} variant="outline" borderColor={ls.danger} color={ls.danger}>Forgot</Button>
                <Button minH="44px" onClick={() => void rate('unsure')} variant="outline" borderColor={ls.warning} color={ls.warning}>Unsure</Button>
                <Button minH="44px" onClick={() => void rate('remembered')} bg={ls.brand} color={ls.surface}>Remembered</Button>
              </Flex>
            </Box>
          )}
        </Box>
      )}
    </PageShell>
  );
};

const PageShell = ({ children }: { children: React.ReactNode }) => <Box minH="100vh" bg={ls.background} color={ls.textPrimary} fontFamily={ls.bodyFont}><LangsiftNav /><Container maxW="1080px" px={{ base: 5, md: 8 }} py={{ base: 12, md: 20 }}>{children}</Container></Box>;
