import { useEffect, useState } from 'react';
import { Box, Button, Container, Flex, Heading, Spinner, Stack, Text } from '@chakra-ui/react';
import { LangsiftNav } from '../components/LangsiftNav';
import { vocabularyApi, VocabularyFilter } from '../services/vocabularyApi';
import type { VocabularyEntry } from '../types';

const filters: Array<[VocabularyFilter, string]> = [['all', 'All'], ['unknown', "Don't know"], ['saved', 'Saved'], ['due', 'Due']];

export const VocabularyPage = () => {
  const [filter, setFilter] = useState<VocabularyFilter>('all');
  const [items, setItems] = useState<VocabularyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    setLoading(true);
    vocabularyApi.list(filter).then((result) => setItems(result.items)).catch(() => setError('We could not load your vocabulary.')).finally(() => setLoading(false));
  }, [filter]);

  return (
    <PageShell>
      <Text textTransform="uppercase" letterSpacing="0.15em" fontSize="xs" fontWeight="700" color="#d55539">Your vocabulary</Text>
      <Heading mt={3} fontFamily="'Lora', serif" fontSize={{ base: '4xl', md: '6xl' }} letterSpacing="-0.05em">Words worth returning to.</Heading>
      <Flex mt={8} gap={2} wrap="wrap">
        {filters.map(([value, label]) => <Button key={value} size="sm" onClick={() => setFilter(value)} variant={filter === value ? 'solid' : 'outline'} bg={filter === value ? '#2d765c' : 'transparent'} color={filter === value ? '#fffaf3' : '#29483d'} borderColor="#aebdb4">{label}</Button>)}
      </Flex>
      {loading && <Spinner mt={12} color="#ee6c4d" />}
      {error && <Text mt={8} color="#b23c2d">{error}</Text>}
      {!loading && !error && !items.length && <Box mt={12} maxW="620px"><Heading fontFamily="'Lora', serif" fontSize="2xl">Nothing here yet.</Heading><Text mt={3} color="#647b72">Mark a lesson item “I don&apos;t know this” or save it, and it will appear here.</Text></Box>}
      <Stack mt={10} spacing={0} maxW="900px" divider={<Box borderBottom="1px solid #d9dfda" />}>
        {items.map((item) => {
          const occurrence = item.occurrences[0];
          return (
            <Box key={item.normalizedTerm} py={7}>
              <Flex justify="space-between" gap={5} align="flex-start">
                <Box>
                  <Heading fontFamily="'Lora', serif" fontSize={{ base: '2xl', md: '3xl' }}>{item.term}</Heading>
                  <Text mt={2} color="#2d765c" fontWeight="700">{occurrence?.meaningAtOccurrence}</Text>
                </Box>
                <Flex gap={2} wrap="wrap" justify="flex-end">
                  {item.knowledgeStatus === 'unknown' && <Status>Don&apos;t know</Status>}
                  {item.saved && <Status>Saved</Status>}
                </Flex>
              </Flex>
              {occurrence && <Text mt={4} color="#557067" lineHeight="1.65">From {occurrence.sourceName}: {occurrence.articleTitle}</Text>}
              <Text mt={2} color="#71847d" fontSize="sm">Next review: {new Date(item.review.nextReviewAt).toLocaleString()}</Text>
              {item.occurrences.length > 1 && <Text mt={2} color="#d55539" fontSize="sm">Seen in {item.occurrences.length} articles</Text>}
            </Box>
          );
        })}
      </Stack>
    </PageShell>
  );
};

const Status = ({ children }: { children: React.ReactNode }) => <Text px={3} py={1} borderRadius="999px" bg="#e4ebe5" color="#405f54" fontSize="xs" fontWeight="700">{children}</Text>;
const PageShell = ({ children }: { children: React.ReactNode }) => <Box minH="100vh" bg="#f7f5ee" color="#18322a" fontFamily="'DM Sans', sans-serif"><LangsiftNav /><Container maxW="1080px" px={{ base: 5, md: 8 }} py={{ base: 10, md: 16 }}>{children}</Container></Box>;
