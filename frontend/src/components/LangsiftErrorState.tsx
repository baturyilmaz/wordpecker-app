import { Box, Button, Text } from '@chakra-ui/react';
import { ls } from '../theme/langsift';

export const LangsiftErrorState = ({
  message,
  onRetry,
  retrying = false,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}) => (
  <Box role="alert" maxW="620px" aria-live="polite">
    <Text color={ls.danger}>{message}</Text>
    {onRetry && (
      <Button
        mt={4}
        minH="44px"
        onClick={onRetry}
        isDisabled={retrying}
        bg={ls.brand}
        color={ls.surface}
        _hover={{ bg: ls.brandHover }}
        _focusVisible={{ boxShadow: ls.focusRing }}
      >
        {retrying ? 'Trying again…' : 'Try again'}
      </Button>
    )}
  </Box>
);
