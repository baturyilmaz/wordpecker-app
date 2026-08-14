import { Box, FormControl, FormLabel, Select, Text } from '@chakra-ui/react';
import type { LessonLevel } from '../types';
import { levelOptions } from '../services/levelPreference';

interface LevelSelectorProps {
  value: LessonLevel;
  onChange: (level: LessonLevel) => void;
  isDisabled?: boolean;
}

export const LevelSelector = ({ value, onChange, isDisabled = false }: LevelSelectorProps) => {
  const selected = levelOptions.find((option) => option.value === value) || levelOptions[1];
  return (
    <FormControl maxW="620px">
      <FormLabel htmlFor="english-level" mb={2} fontSize="sm" fontWeight="700" color="#29483d">
        Your English level
      </FormLabel>
      <Select
        id="english-level"
        value={value}
        onChange={(event) => onChange(event.target.value as LessonLevel)}
        isDisabled={isDisabled}
        h={12}
        bg="#fffdf7"
        borderColor="#cad5ce"
        borderRadius="12px"
        color="#18322a"
        _focusVisible={{ borderColor: '#2d765c', boxShadow: '0 0 0 3px rgba(45, 118, 92, 0.14)' }}
      >
        {levelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
      <Box minH="48px" pt={2}>
        <Text fontSize="sm" lineHeight="1.5" color="#647b72">{selected.description}</Text>
      </Box>
    </FormControl>
  );
};
