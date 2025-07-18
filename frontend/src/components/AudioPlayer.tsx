import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Text,
  useColorModeValue,
  Spinner,
  Tooltip,
  HStack,
  VStack,
  useToast,
  Progress,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@chakra-ui/react';
import { FaPlay, FaPause, FaVolumeUp, FaRedo } from 'react-icons/fa';

export interface AudioPlayerProps {
  /** Audio URL to play */
  audioUrl?: string;
  /** Text being pronounced (for accessibility) */
  text?: string;
  /** Size variant of the player */
  size?: 'sm' | 'md' | 'lg';
  /** Show minimal controls only */
  minimal?: boolean;
  /** Show waveform animation */
  showWaveform?: boolean;
  /** Custom loading text */
  loadingText?: string;
  /** Callback when audio starts playing */
  onPlay?: () => void;
  /** Callback when audio pauses */
  onPause?: () => void;
  /** Callback when audio ends */
  onEnd?: () => void;
  /** Callback when audio fails to load */
  onError?: (error: string) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  text = 'Audio content',
  size = 'md',
  minimal = false,
  showWaveform = true,
  loadingText = 'Loading audio...',
  onPlay,
  onPause,
  onEnd,
  onError,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const toast = useToast();

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const accentColor = useColorModeValue('blue.500', 'blue.400');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const iconColor = useColorModeValue('gray.600', 'gray.400');

  // Size configurations
  const sizeConfig = {
    sm: {
      buttonSize: 'sm' as const,
      iconSize: '14px',
      spacing: 2,
      fontSize: 'xs',
    },
    md: {
      buttonSize: 'md' as const,
      iconSize: '16px',
      spacing: 3,
      fontSize: 'sm',
    },
    lg: {
      buttonSize: 'lg' as const,
      iconSize: '20px',
      spacing: 4,
      fontSize: 'md',
    },
  };

  const config = sizeConfig[size];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnd?.();
    };

    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      const errorMessage = 'Failed to load audio';
      setError(errorMessage);
      onError?.(errorMessage);
      
      toast({
        title: 'Audio Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, onEnd, onError, toast]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlayPause = async () => {
    if (!audioRef.current || !audioUrl) return;

    try {
      if (isPlaying) {
        await audioRef.current.pause();
        setIsPlaying(false);
        onPause?.();
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        onPlay?.();
      }
    } catch (err) {
      console.error('Audio playback error:', err);
      setError('Playback failed');
    }
  };

  const replay = () => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    
    if (!isPlaying) {
      togglePlayPause();
    }
  };

  // Note: handleSeek function available for future use with progress bar interaction
  // const handleSeek = (value: number) => {
  //   if (!audioRef.current) return;
  //   
  //   const newTime = (value / 100) * duration;
  //   audioRef.current.currentTime = newTime;
  //   setCurrentTime(newTime);
  // };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderWaveform = () => {
    if (!showWaveform || minimal) return null;

    return (
      <HStack spacing={1} px={2}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Box
            key={i}
            width="2px"
            height={`${Math.random() * 20 + 10}px`}
            bg={isPlaying ? accentColor : iconColor}
            borderRadius="1px"
            opacity={isPlaying ? 0.8 : 0.4}
            transform={isPlaying ? 'scaleY(1)' : 'scaleY(0.6)'}
            transition="all 0.3s ease"
            animation={isPlaying ? `waveform-${i} 1s ease-in-out infinite` : undefined}
            style={{
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </HStack>
    );
  };

  if (!audioUrl && !isLoading) {
    return null;
  }

  if (minimal) {
    return (
      <Box>
        {audioUrl && (
          <audio ref={audioRef} src={audioUrl} preload="metadata" />
        )}
        
        <Tooltip label={`Play pronunciation: "${text}"`} hasArrow>
          <IconButton
            aria-label={`Play pronunciation of ${text}`}
            icon={
              isLoading ? (
                <Spinner size="sm" color={accentColor} />
              ) : isPlaying ? (
                <FaPause />
              ) : (
                <FaVolumeUp />
              )
            }
            size={config.buttonSize}
            variant="ghost"
            colorScheme="blue"
            color={iconColor}
            onClick={togglePlayPause}
            isDisabled={isLoading || error !== null}
            _hover={{
              bg: useColorModeValue('blue.50', 'blue.900'),
              color: accentColor,
              transform: 'scale(1.05)',
            }}
            transition="all 0.2s"
          />
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={config.spacing}
      shadow="sm"
      maxW="400px"
    >
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}

      <VStack spacing={config.spacing} align="stretch">
        {/* Main Controls */}
        <HStack spacing={config.spacing} justify="space-between" align="center">
          <HStack spacing={config.spacing}>
            <IconButton
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              icon={
                isLoading ? (
                  <Spinner size="sm" color={accentColor} />
                ) : isPlaying ? (
                  <FaPause />
                ) : (
                  <FaPlay />
                )
              }
              size={config.buttonSize}
              colorScheme="blue"
              variant="solid"
              onClick={togglePlayPause}
              isDisabled={isLoading || error !== null}
              _hover={{
                transform: 'scale(1.05)',
              }}
              transition="all 0.2s"
            />

            <IconButton
              aria-label="Replay audio"
              icon={<FaRedo />}
              size={config.buttonSize}
              variant="ghost"
              colorScheme="blue"
              onClick={replay}
              isDisabled={isLoading || error !== null}
              _hover={{
                transform: 'scale(1.05)',
              }}
              transition="all 0.2s"
            />
          </HStack>

          {renderWaveform()}

          <Text fontSize={config.fontSize} color={textColor} minW="60px" textAlign="right">
            {isLoading ? loadingText : error ? 'Error' : `${formatTime(currentTime)} / ${formatTime(duration)}`}
          </Text>
        </HStack>

        {/* Progress Bar */}
        {duration > 0 && !error && (
          <Box>
            <Progress
              value={(currentTime / duration) * 100}
              size="sm"
              colorScheme="blue"
              borderRadius="full"
              bg={useColorModeValue('gray.100', 'gray.700')}
            />
          </Box>
        )}

        {/* Advanced Controls */}
        {!minimal && (
          <HStack spacing={config.spacing} align="center">
            <Text fontSize="xs" color={textColor} minW="50px">
              Volume
            </Text>
            <Slider
              value={volume * 100}
              onChange={(value) => setVolume(value / 100)}
              size="sm"
              colorScheme="blue"
              flex={1}
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb boxSize={3} />
            </Slider>
          </HStack>
        )}

        {/* Error State */}
        {error && (
          <Text fontSize="xs" color="red.500" textAlign="center">
            {error}
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default AudioPlayer;