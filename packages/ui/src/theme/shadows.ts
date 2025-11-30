import { Platform, ViewStyle } from 'react-native';

export interface Shadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

const createShadow = (
  offsetY: number,
  blur: number,
  opacity: number,
  elevation: number
): Shadow => ({
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: opacity,
  shadowRadius: blur,
  elevation,
});

export const shadows = {
  none: createShadow(0, 0, 0, 0),
  xs: createShadow(1, 2, 0.05, 1),
  sm: createShadow(1, 3, 0.1, 2),
  md: createShadow(2, 4, 0.1, 3),
  lg: createShadow(4, 6, 0.1, 4),
  xl: createShadow(8, 10, 0.1, 6),
  '2xl': createShadow(12, 16, 0.15, 8),
  inner: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: {
      // Android doesn't support inner shadows natively
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.1)',
    },
    default: {},
  }) as Shadow,
} as const;

export type ShadowName = keyof typeof shadows;
