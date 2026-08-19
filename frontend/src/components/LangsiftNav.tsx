import { Avatar, Box, Button, Container, Flex, Menu, MenuButton, MenuItem, MenuList, Text } from '@chakra-ui/react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ls } from '../theme/langsift';
import { FEEDBACK_MAILTO } from '../config/contact';

export const LangsiftNav = () => {
  const { user, loading, requestAuth, logout } = useAuth();
  const navigate = useNavigate();
  const openProtected = (destination: 'vocabulary' | 'review') => {
    if (user) navigate(`/${destination}`);
    else requestAuth({ type: destination === 'vocabulary' ? 'open_vocabulary' : 'open_review' });
  };
  return (
    <Box as="header" borderBottom="1px solid" borderColor={ls.border} bg={ls.background}>
      <Container maxW="1080px" px={{ base: 4, md: 8 }}>
        <Flex minH="72px" align="center" justify="space-between" gap={3}>
          <Text as={Link} to="/" fontFamily={ls.editorialFont} fontSize="xl" fontWeight="700" color={ls.textPrimary} _focusVisible={{ boxShadow: ls.focusRing }}>
            Langsift<Text as="span" color={ls.accent}>.</Text>
          </Text>
          <Flex as="nav" gap={{ base: 2, md: 7 }} align="center">
            <Flex display={{ base: 'none', md: 'flex' }} gap={7} align="center">
              <NavText to="/">New Lesson</NavText>
              {user && <NavText to="/dashboard">Dashboard</NavText>}
              <Button variant="link" minW="auto" color={ls.textSecondary} fontSize="sm" fontWeight="700" onClick={() => openProtected('vocabulary')}>Vocabulary</Button>
              <Button variant="link" minW="auto" color={ls.textSecondary} fontSize="sm" fontWeight="700" onClick={() => openProtected('review')}>Review</Button>
              <NavExternal href={FEEDBACK_MAILTO}>Send feedback</NavExternal>
              <NavText to="/privacy">Privacy</NavText>
            </Flex>
            {!loading && user && (
              <Menu>
                <MenuButton as={Button} aria-label="Open profile menu" minW="44px" minH="44px" px={{ base: 1, md: 2 }} variant="ghost" color={ls.textPrimary} leftIcon={<Avatar size="sm" name={user.displayName || user.email} src={user.avatarUrl} />}>
                  <Text display={{ base: 'none', md: 'block' }} fontSize="sm">{user.displayName?.split(' ')[0] || user.email}</Text>
                </MenuButton>
                <MenuList bg={ls.surface} borderColor={ls.border} minW="190px">
                  <MenuItem {...menuItemStyle} as={Link} to="/" display={{ md: 'none' }}>New Lesson</MenuItem>
                  <MenuItem {...menuItemStyle} as={Link} to="/dashboard">Dashboard</MenuItem>
                  <MenuItem {...menuItemStyle} onClick={() => openProtected('vocabulary')} display={{ md: 'none' }}>Vocabulary</MenuItem>
                  <MenuItem {...menuItemStyle} onClick={() => openProtected('review')} display={{ md: 'none' }}>Review</MenuItem>
                  <MenuItem {...menuItemStyle} as={Link} to="/account/settings">Settings</MenuItem>
                  <MenuItem {...menuItemStyle} as={Link} to="/privacy">Privacy</MenuItem>
                  <MenuItem {...menuItemStyle} as="a" href={FEEDBACK_MAILTO}>Send feedback</MenuItem>
                  <MenuItem {...menuItemStyle} onClick={() => void logout()}>Sign out</MenuItem>
                </MenuList>
              </Menu>
            )}
            {!loading && !user && (
              <Menu>
                <MenuButton as={Button} display={{ md: 'none' }} variant="outline" h="44px" borderColor={ls.border} bg="transparent" color={ls.textPrimary} _hover={{ bg: ls.surfaceMuted }}>Menu</MenuButton>
                <MenuList bg={ls.surface} borderColor={ls.border}>
                  <MenuItem {...menuItemStyle} as={Link} to="/">New Lesson</MenuItem>
                  <MenuItem {...menuItemStyle} onClick={() => openProtected('vocabulary')}>Vocabulary</MenuItem>
                  <MenuItem {...menuItemStyle} onClick={() => openProtected('review')}>Review</MenuItem>
                  <MenuItem {...menuItemStyle} as={Link} to="/privacy">Privacy</MenuItem>
                  <MenuItem {...menuItemStyle} as="a" href={FEEDBACK_MAILTO}>Send feedback</MenuItem>
                </MenuList>
              </Menu>
            )}
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
};

const NavText = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Text as={NavLink} to={to} fontSize="sm" fontWeight="700" color={ls.textSecondary} _activeLink={{ color: ls.brand }} _hover={{ color: ls.textPrimary }} _focusVisible={{ boxShadow: ls.focusRing }}>
    {children}
  </Text>
);

const NavExternal = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Text as="a" href={href} fontSize="sm" fontWeight="700" color={ls.textSecondary} _hover={{ color: ls.textPrimary }} _focusVisible={{ boxShadow: ls.focusRing }}>
    {children}
  </Text>
);

const menuItemStyle = {
  minH: '44px',
  bg: ls.surface,
  color: ls.textPrimary,
  _hover: { bg: ls.surfaceMuted },
  _focus: { bg: ls.surfaceMuted },
};
