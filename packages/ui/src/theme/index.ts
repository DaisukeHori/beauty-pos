import { colors, ColorPalette, ColorName } from './colors';
import { spacing, SpacingValue, SpacingPixels } from './spacing';
import { typography, textStyles, TextStyleName } from './typography';
import { shadows, Shadow, ShadowName } from './shadows';
import { borderRadius, BorderRadiusName, BorderRadiusValue } from './borderRadius';

export const theme = {
  colors,
  spacing,
  typography,
  textStyles,
  shadows,
  borderRadius,

  // Component-specific styles
  components: {
    button: {
      sizes: {
        sm: { height: 32, paddingHorizontal: 12 },
        md: { height: 40, paddingHorizontal: 16 },
        lg: { height: 48, paddingHorizontal: 20 },
        xl: { height: 56, paddingHorizontal: 24 },
      },
    },
    input: {
      sizes: {
        sm: { height: 36, paddingHorizontal: 12 },
        md: { height: 44, paddingHorizontal: 16 },
        lg: { height: 52, paddingHorizontal: 20 },
      },
    },
    card: {
      padding: {
        sm: 12,
        md: 16,
        lg: 24,
      },
    },
    avatar: {
      sizes: {
        xs: 24,
        sm: 32,
        md: 40,
        lg: 48,
        xl: 64,
        '2xl': 80,
      },
    },
    icon: {
      sizes: {
        xs: 12,
        sm: 16,
        md: 20,
        lg: 24,
        xl: 32,
      },
    },
  },

  // Animation timings
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
    toast: 1700,
  },
} as const;

export type Theme = typeof theme;

// Light theme (default)
export const lightTheme = {
  ...theme,
  semantic: {
    background: {
      primary: colors.white,
      secondary: colors.neutral[50],
      tertiary: colors.neutral[100],
      inverse: colors.neutral[900],
    },
    text: {
      primary: colors.neutral[900],
      secondary: colors.neutral[600],
      tertiary: colors.neutral[400],
      inverse: colors.white,
      disabled: colors.neutral[300],
    },
    border: {
      default: colors.neutral[200],
      strong: colors.neutral[300],
      focus: colors.primary[500],
      error: colors.error[500],
    },
    interactive: {
      default: colors.primary[500],
      hover: colors.primary[600],
      active: colors.primary[700],
      disabled: colors.neutral[200],
    },
    status: {
      success: colors.success[500],
      warning: colors.warning[500],
      error: colors.error[500],
      info: colors.info[500],
    },
  },
} as const;

// Dark theme
export const darkTheme = {
  ...theme,
  semantic: {
    background: {
      primary: colors.neutral[900],
      secondary: colors.neutral[800],
      tertiary: colors.neutral[700],
      inverse: colors.white,
    },
    text: {
      primary: colors.white,
      secondary: colors.neutral[300],
      tertiary: colors.neutral[500],
      inverse: colors.neutral[900],
      disabled: colors.neutral[600],
    },
    border: {
      default: colors.neutral[700],
      strong: colors.neutral[600],
      focus: colors.primary[400],
      error: colors.error[400],
    },
    interactive: {
      default: colors.primary[400],
      hover: colors.primary[300],
      active: colors.primary[500],
      disabled: colors.neutral[700],
    },
    status: {
      success: colors.success[400],
      warning: colors.warning[400],
      error: colors.error[400],
      info: colors.info[400],
    },
  },
} as const;

export type SemanticTheme = typeof lightTheme | typeof darkTheme;

// Export individual modules
export { colors } from './colors';
export type { ColorPalette, ColorName } from './colors';

export { spacing } from './spacing';
export type { SpacingValue, SpacingPixels } from './spacing';

export { typography, textStyles } from './typography';
export type { TextStyleName } from './typography';

export { shadows } from './shadows';
export type { Shadow, ShadowName } from './shadows';

export { borderRadius } from './borderRadius';
export type { BorderRadiusName, BorderRadiusValue } from './borderRadius';
