export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
} as const;

export type BorderRadiusName = keyof typeof borderRadius;
export type BorderRadiusValue = (typeof borderRadius)[BorderRadiusName];
