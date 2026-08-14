import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        bg: 'slate.900',
        color: 'white',
      },
    },
  },
  colors: {
    langsift: {
      background: '#F4F7F8',
      surface: '#FBFCFD',
      surfaceMuted: '#E8EFF1',
      textPrimary: '#102F33',
      textSecondary: '#486269',
      textMuted: '#526C72',
      border: '#B9C9CE',
      brand: '#0F766E',
      brandHover: '#0B5F59',
      brandSubtle: '#DCEFEB',
      accent: '#2563EB',
      danger: '#A62B21',
      dangerSurface: '#FBE9E7',
      success: '#137A4A',
      successSurface: '#DFF3E7',
      warning: '#8A5A00',
      warningSurface: '#F6EBCF',
      disabled: '#D5E0E3',
    },
    slate: {
      900: '#0f172a', // background
      800: '#1e293b', // cards/containers
      700: '#334155', // interactive elements
    },
    brand: {
      400: '#4ade80', // primary action/brand color
    },
    status: {
      xp: '#facc15', // yellow-400
      streak: '#fb923c', // orange-400
      heart: '#ef4444', // red-500
    }
  },
  components: {
    Container: {
      baseStyle: {
        maxW: 'container.xl',
        px: 6,
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'slate.800',
          rounded: 'xl',
          p: 4,
        },
      },
    },
    Button: {
      baseStyle: {
        rounded: 'lg',
        fontWeight: 'medium',
      },
      variants: {
        solid: {
          bg: 'brand.400',
          color: 'slate.900',
          _hover: {
            bg: 'green.300',
          },
        },
        ghost: {
          _hover: {
            bg: 'slate.700',
          },
        },
      },
    },
    Badge: {
      baseStyle: {
        rounded: 'full',
      },
    },
    Progress: {
      baseStyle: {
        track: {
          bg: 'slate.700',
        },
        filledTrack: {
          bg: 'brand.400',
          transition: 'all 0.3s',
        },
      },
    },
  },
  layerStyles: {
    card: {
      bg: 'slate.800',
      rounded: 'xl',
      p: 4,
      shadow: 'md',
    },
    interactive: {
      cursor: 'pointer',
      transition: 'all 0.2s',
      _hover: {
        bg: 'slate.700',
      },
    },
  },
  textStyles: {
    h1: {
      fontSize: ['2xl', '3xl'],
      fontWeight: 'bold',
      lineHeight: 'shorter',
      mb: 4,
    },
    h2: {
      fontSize: ['xl', '2xl'],
      fontWeight: 'semibold',
      lineHeight: 'short',
      mb: 3,
    },
  },
});

export default theme;
