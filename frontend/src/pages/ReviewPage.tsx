import { useEffect, useState } from 'react';
import { Box, Button, Container, Flex, Heading, Spinner, Text } from '@chakra-ui/react';
import { LangsiftNav } from '../components/LangsiftNav';
import { reviewApi, ReviewRating } from '../services/reviewApi';
import type { VocabularyEntry } from '../types';

export const ReviewPage = () => {
  const [items, setItems] = useState<VocabularyEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reviewApi.due().then((result) => setItems(result.items)).catch(() => setError('We could not load today’s review.')).finally(() => setLoading(false));
  }, []);

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
      {loading && <Spinner color="#ee6c4d" />}
      {error && <Text color="#b23c2d">{error}</Text>}
      {!loading && !error && !current && (
        <Box maxW="680px">
          <Text textTransform="uppercase" letterSpacing="0.15em" fontSize="xs" fontWeight="700" color="#d55539">Review today</Text>
          <Heading mt={4} fontFamily="'Lora', serif" fontSize={{ base: '4xl', md: '6xl' }} letterSpacing="-0.05em">You’re caught up.</Heading>
          <Text mt={5} color="#557067" fontSize="lg">Come back when your next words are due.</Text>
        </Box>
      )}
      {current && occurrence && (
        <Box maxW="820px">
          <Flex justify="space-between" align="baseline">
            <Text textTransform="uppercase" letterSpacing="0.15em" fontSize="xs" fontWeight="700" color="#d55539">Review today</Text>
            <Text color="#71847d" fontSize="sm">{index + 1} / {items.length}</Text>
          </Flex>
          <Heading mt={{ base: 10, md: 14 }} fontFamily="'Lora', serif" fontSize={{ base: '4xl', md: '7xl' }} letterSpacing="-0.055em">{current.term}</Heading>
          <Text mt={7} pl={5} borderLeft="3px solid #efb09f" fontFamily="'Lora', serif" fontSize={{ base: 'lg', md: 'xl' }} lineHeight="1.75" color="#405f54">“{occurrence.contextSentence}”</Text>
          <Text mt={4} color="#71847d" fontSize="sm">{occurrence.sourceName} · {occurrence.articleTitle}</Text>
          {!revealed ? (
            <Button mt={10} onClick={() => setRevealed(true)} bg="#ee6c4d" color="#fffaf3" h={12} px={8}>Reveal</Button>
          ) : (
            <Box mt={10} pt={8} borderTop="1px solid #d9dfda">
              <Text color="#2d765c" fontSize="xl" fontWeight="700">{occurrence.meaningAtOccurrence}</Text>
              <Text mt={4} color="#405f54" lineHeight="1.7">{occurrence.explanation}</Text>
              <Text mt={3} color="#557067" lineHeight="1.7"><strong>Example:</strong> {occurrence.exampleSentence}</Text>
              <Flex mt={8} gap={3} wrap="wrap">
                <Button onClick={() => void rate('forgot')} variant="outline" borderColor="#d18b7a">Forgot</Button>
                <Button onClick={() => void rate('unsure')} variant="outline" borderColor="#d1b36d">Unsure</Button>
                <Button onClick={() => void rate('remembered')} bg="#2d765c" color="#fffaf3">Remembered</Button>
              </Flex>
            </Box>
          )}
        </Box>
      )}
    </PageShell>
  );
};

const PageShell = ({ children }: { children: React.ReactNode }) => <Box minH="100vh" bg="#f7f5ee" color="#18322a" fontFamily="'DM Sans', sans-serif"><LangsiftNav /><Container maxW="1080px" px={{ base: 5, md: 8 }} py={{ base: 12, md: 20 }}>{children}</Container></Box>;
