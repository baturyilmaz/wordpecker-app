// WordPecker Design System
// Optimized minimal color palette for best UI experience
// Core colors: Blue (#1890FF), Green (#38A169), Orange (#FA8C16), Red (#FF4D4F), Purple (#722ED1)
// Consistent colors, spacing, and component styles

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#E6F7FF',
    100: '#BAE7FF',
    200: '#91D5FF',
    300: '#69C0FF',
    400: '#40A9FF',
    500: '#1890FF', // Main primary
    600: '#096DD9',
    700: '#0050B3',
    800: '#003A8C',
    900: '#002766',
  },
  
  // Secondary Brand Colors
  secondary: {
    50: '#F6FFED',
    100: '#D9F7BE',
    200: '#B7EB8F',
    300: '#95DE64',
    400: '#73D13D',
    500: '#52C41A', // Main secondary
    600: '#389E0D',
    700: '#237804',
    800: '#135200',
    900: '#092B00',
  },
  
  // Accent Colors
  accent: {
    purple: '#722ED1',
    orange: '#FA8C16',
    yellow: '#FADB14',
    pink: '#EB2F96',
    cyan: '#13C2C2',
  },
  
  // Status Colors
  status: {
    success: '#52C41A',
    warning: '#FADB14',
    error: '#FF4D4F',
    info: '#1890FF',
  },
  
  // Difficulty Colors
  difficulty: {
    beginner: '#52C41A',    // Green
    intermediate: '#FA8C16', // Orange
    advanced: '#FF4D4F',    // Red
  },
  
  // Neutral Colors
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // Dark Theme (Current)
  dark: {
    bg: '#0F172A',        // Main background
    surface: '#1E293B',   // Card backgrounds
    border: '#334155',    // Borders
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      muted: '#64748B',
    },
  },
};

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
};

export const borderRadius = {
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  glow: '0 0 20px rgba(24, 144, 255, 0.3)',
};

// Component Styles
export const components = {
  card: {
    bg: colors.dark.surface,
    border: colors.dark.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadow: shadows.md,
    hover: {
      shadow: shadows.glow,
      transform: 'translateY(-2px)',
    },
  },
  
  badge: {
    borderRadius: borderRadius.md,
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: '0.75rem',
    fontWeight: '500',
    textAlign: 'center' as const,
    width: '80px', // Fixed width for consistency
  },
  
  button: {
    borderRadius: borderRadius.md,
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    hover: {
      transform: 'translateY(-1px)',
    },
  },
};

// Optimized Color Palette - Minimal colors for best UI experience
export const designTokens = {
  // Primary colors - keep minimal for cohesive design
  primaryColor: colors.primary[500],    // #1890FF - Blue for templates/navigation
  secondaryColor: '#38A169',            // Chakra green.500 - Green for actions/success
  
  // Core UI colors
  errorColor: colors.status.error,       // #FF4D4F - Red for errors
  warningColor: colors.accent.orange,    // #FA8C16 - Orange for warnings
  accentColor: colors.accent.purple,     // #722ED1 - Purple for tags/badges
  
  // Text colors
  textPrimary: colors.dark.text.primary,    // #F8FAFC - Main text
  textSecondary: colors.dark.text.secondary, // #94A3B8 - Secondary text
  textMuted: colors.dark.text.muted,        // #64748B - Muted text
  
  // Card variants
  cardVariants: {
    userList: {
      borderColor: colors.secondary[600],
      hoverBorderColor: colors.secondary[400],
      hoverShadow: `0 0 20px ${colors.secondary[500]}30`,
    },
    template: {
      borderColor: colors.primary[600],
      hoverBorderColor: colors.primary[400],
      hoverShadow: `0 0 20px ${colors.primary[500]}30`,
    },
  },
  
  // Badge colors - using minimal palette
  badgeColors: {
    primary: colors.primary[500],      // Blue
    secondary: '#38A169',              // Chakra green.500
    featured: colors.accent.yellow,    // Yellow for featured items
    difficulty: {
      beginner: '#38A169',               // Chakra green.500 for beginner
      intermediate: colors.accent.orange, // Orange for intermediate  
      advanced: colors.status.error,      // Red for advanced
    },
    neutral: colors.neutral[600],      // Gray for neutral items
    accent: colors.accent.purple,      // Purple for tags
  },
  
  // Button variants - consistent styling
  buttonVariants: {
    primary: {
      bg: colors.primary[500],
      color: 'white',
      _hover: { bg: colors.primary[600] }
    },
    secondary: {
      bg: '#38A169',             // Chakra green.500
      color: 'white',
      _hover: { bg: '#2F855A' }  // Chakra green.600
    },
    accent: {
      bg: colors.accent.orange,
      color: 'white', 
      _hover: { bg: '#E6780F' }
    },
    danger: {
      bg: colors.status.error,
      color: 'white',
      _hover: { bg: '#FF7875' }
    }
  },
};