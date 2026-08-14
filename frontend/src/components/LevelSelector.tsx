import { Box, FormControl, FormLabel, Select, Text } from '@chakra-ui/react';
import type { LessonLevel } from '../types';
import { levelOptions } from '../services/levelPreference';
import { ls } from '../theme/langsift';

interface LevelSelectorProps {
  value: LessonLevel;
  onChange: (level: LessonLevel) => void;
  isDisabled?: boolean;
}

export const LevelSelector = ({ value, onChange, isDisabled = false }: LevelSelectorProps) => {
  const selected = levelOptions.find((option) => option.value === value) || levelOptions[1];
  return (
    <FormControl maxW="620px">
      <FormLabel htmlFor="english-level" mb={2} fontSize="sm" fontWeight="700" color={ls.textPrimary}>
        Your English level
      </FormLabel>
      <Select
        id="english-level"
        value={value}
        onChange={(event) => onChange(event.target.value as LessonLevel)}
        isDisabled={isDisabled}
        h={12}
        bg={ls.surface}
        borderColor={ls.border}
        borderRadius="12px"
        color={ls.textPrimary}
        _focusVisible={{ borderColor: ls.brand, boxShadow: ls.focusRing }}
      >
        {levelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
      <Box minH="48px" pt={2}>
        <Text fontSize="sm" lineHeight="1.5" color={ls.textSecondary}>{selected.description}</Text>
      </Box>
    </FormControl>
  );
};
