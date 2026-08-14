import { useEffect, useState } from 'react';
import { Box, Button, Container, Heading, Select, Text } from '@chakra-ui/react';
import { useAuth } from '../auth/useAuth';
import { LangsiftNav } from '../components/LangsiftNav';
import { authApi } from '../services/authApi';
import type { LessonLevel } from '../types';
import { ls } from '../theme/langsift';

export const AccountSettingsPage = () => {
  const { user, loading, requestAuth, updateUser } = useAuth();
  const [level, setLevel] = useState<LessonLevel>(user?.levelPreference || 'intermediate');
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (!loading && !user) requestAuth({ type: 'open_dashboard' }); }, [loading, requestAuth, user]);
  useEffect(() => { if (user?.levelPreference) setLevel(user.levelPreference); }, [user?.levelPreference]);
  const save = async () => { const result = await authApi.updateLevel(level); updateUser(result.user); setSaved(true); };
  return <Box minH="100vh" bg={ls.background} color={ls.textPrimary} fontFamily={ls.bodyFont}><LangsiftNav /><Container maxW="760px" px={{ base: 5, md: 8 }} py={{ base: 10, md: 16 }}><Text textTransform="uppercase" letterSpacing="0.12em" fontSize="xs" fontWeight="700" color={ls.brand}>Settings</Text><Heading mt={3} fontFamily={ls.editorialFont} fontSize={{ base: '3xl', md: '5xl' }}>English Level</Heading><Text mt={4} color={ls.textSecondary}>Langsift uses this level when creating personalized lessons.</Text><Select mt={8} maxW="380px" value={level} onChange={(event) => { setLevel(event.target.value as LessonLevel); setSaved(false); }} bg={ls.surface} borderColor={ls.border} _focusVisible={{ borderColor: ls.brand, boxShadow: ls.focusRing }}><option value="basic">Basic</option><option value="intermediate">Intermediate</option><option value="upper_intermediate">Upper intermediate</option><option value="advanced">Advanced</option></Select><Button mt={5} bg={ls.brand} color={ls.surface} onClick={() => void save()} _hover={{ bg: ls.brandHover }}>Save level</Button>{saved && <Text mt={3} color={ls.success}>Saved.</Text>}</Container></Box>;
};
