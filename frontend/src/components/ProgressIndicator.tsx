import { Box, Text, Progress, HStack, Badge } from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

interface ProgressIndicatorProps {
  learnedPoint: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showBadge?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  learnedPoint,
  size = 'md',
  showLabel = true,
  showBadge = true
}) => {
  const getProgressColor = (point: number) => {
    if (point >= 80) return 'green';
    if (point >= 60) return 'blue';
    if (point >= 40) return 'yellow';
    if (point >= 20) return 'orange';
    return 'red';
  };

  const getProgressLabel = (point: number) => {
    if (point >= 80) return 'Mastered';
    if (point >= 60) return 'Familiar';
    if (point >= 40) return 'Learning';
    if (point >= 20) return 'Practicing';
    return 'New';
  };

  const getProgressEmoji = (point: number) => {
    if (point >= 80) return '🎓';
    if (point >= 60) return '📚';
    if (point >= 40) return '📖';
    if (point >= 20) return '📝';
    return '🌱';
  };

  const progressColor = getProgressColor(learnedPoint);
  const progressLabel = getProgressLabel(learnedPoint);
  const progressEmoji = getProgressEmoji(learnedPoint);

  const sizeProps = {
    sm: { 
      progressSize: 'sm' as const, 
      fontSize: 'xs', 
      badgeSize: 'sm' as const,
      spacing: 1
    },
    md: { 
      progressSize: 'md' as const, 
      fontSize: 'sm', 
      badgeSize: 'md' as const,
      spacing: 2
    },
    lg: { 
      progressSize: 'lg' as const, 
      fontSize: 'md', 
      badgeSize: 'lg' as const,
      spacing: 3
    }
  };

  const props = sizeProps[size];

  return (
    <MotionBox
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <HStack spacing={props.spacing} align="center">
        {showBadge && (
          <Badge 
            colorScheme={progressColor} 
            size={props.badgeSize}
            borderRadius="full"
            px={2}
          >
            {progressEmoji} {learnedPoint}
          </Badge>
        )}
        
        <Box flex={1} minW="60px">
          <Progress
            value={learnedPoint}
            size={props.progressSize}
            colorScheme={progressColor}
            borderRadius="full"
            hasStripe
            isAnimated
          />
        </Box>
        
        {showLabel && (
          <Text 
            fontSize={props.fontSize} 
            color={`${progressColor}.400`}
            fontWeight="medium"
            minW="fit-content"
          >
            {progressLabel}
          </Text>
        )}
      </HStack>
    </MotionBox>
  );
};

interface OverallProgressProps {
  words: Array<{ learnedPoint: number }>;
  size?: 'sm' | 'md' | 'lg';
}

export const OverallProgress: React.FC<OverallProgressProps> = ({ words, size = 'md' }) => {
  const totalWords = words.length;
  const averageProgress = totalWords > 0 
    ? Math.round(words.reduce((sum, word) => sum + (word.learnedPoint || 0), 0) / totalWords)
    : 0;

  const masteredWords = words.filter(word => (word.learnedPoint || 0) >= 80).length;
  const learningWords = words.filter(word => {
    const point = word.learnedPoint || 0;
    return point >= 20 && point < 80;
  }).length;
  const newWords = words.filter(word => (word.learnedPoint || 0) < 20).length;

  return (
    <MotionBox
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      p={4}
      bg="slate.800"
      borderRadius="lg"
      borderWidth={1}
      borderColor="slate.700"
    >
      <Text fontSize="lg" fontWeight="bold" color="white" mb={3}>
        📊 Overall Progress
      </Text>
      
      <ProgressIndicator 
        learnedPoint={averageProgress} 
        size={size}
        showLabel={true}
        showBadge={true}
      />
      
      <HStack justify="space-between" mt={3} spacing={4}>
        <HStack spacing={1}>
          <Text fontSize="sm" color="green.400">🎓</Text>
          <Text fontSize="sm" color="green.400">{masteredWords}</Text>
        </HStack>
        <HStack spacing={1}>
          <Text fontSize="sm" color="blue.400">📚</Text>
          <Text fontSize="sm" color="blue.400">{learningWords}</Text>
        </HStack>
        <HStack spacing={1}>
          <Text fontSize="sm" color="orange.400">🌱</Text>
          <Text fontSize="sm" color="orange.400">{newWords}</Text>
        </HStack>
        <Text fontSize="sm" color="gray.400">
          Total: {totalWords}
        </Text>
      </HStack>
    </MotionBox>
  );
};