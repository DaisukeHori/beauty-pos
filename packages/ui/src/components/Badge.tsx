import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../theme/colors';
import { textStyles } from '../theme/typography';
import { borderRadius } from '../theme/borderRadius';
import { spacing } from '../theme/spacing';

export type BadgeVariant = 'solid' | 'subtle' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeColorScheme = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  colorScheme?: BadgeColorScheme;
  rounded?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const sizeConfig = {
  sm: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10 },
  md: { paddingHorizontal: 8, paddingVertical: 3, fontSize: 12 },
  lg: { paddingHorizontal: 12, paddingVertical: 4, fontSize: 14 },
};

const colorSchemeConfig = {
  primary: {
    solid: { bg: colors.primary[500], text: colors.white, border: colors.primary[500] },
    subtle: { bg: colors.primary[50], text: colors.primary[700], border: colors.primary[100] },
    outline: { bg: 'transparent', text: colors.primary[600], border: colors.primary[500] },
  },
  secondary: {
    solid: { bg: colors.secondary[500], text: colors.white, border: colors.secondary[500] },
    subtle: { bg: colors.secondary[50], text: colors.secondary[700], border: colors.secondary[100] },
    outline: { bg: 'transparent', text: colors.secondary[600], border: colors.secondary[500] },
  },
  success: {
    solid: { bg: colors.success[500], text: colors.white, border: colors.success[500] },
    subtle: { bg: colors.success[50], text: colors.success[700], border: colors.success[100] },
    outline: { bg: 'transparent', text: colors.success[600], border: colors.success[500] },
  },
  warning: {
    solid: { bg: colors.warning[500], text: colors.white, border: colors.warning[500] },
    subtle: { bg: colors.warning[50], text: colors.warning[700], border: colors.warning[100] },
    outline: { bg: 'transparent', text: colors.warning[600], border: colors.warning[500] },
  },
  error: {
    solid: { bg: colors.error[500], text: colors.white, border: colors.error[500] },
    subtle: { bg: colors.error[50], text: colors.error[700], border: colors.error[100] },
    outline: { bg: 'transparent', text: colors.error[600], border: colors.error[500] },
  },
  info: {
    solid: { bg: colors.info[500], text: colors.white, border: colors.info[500] },
    subtle: { bg: colors.info[50], text: colors.info[700], border: colors.info[100] },
    outline: { bg: 'transparent', text: colors.info[600], border: colors.info[500] },
  },
  neutral: {
    solid: { bg: colors.neutral[500], text: colors.white, border: colors.neutral[500] },
    subtle: { bg: colors.neutral[100], text: colors.neutral[700], border: colors.neutral[200] },
    outline: { bg: 'transparent', text: colors.neutral[600], border: colors.neutral[400] },
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'subtle',
  size = 'md',
  colorScheme = 'neutral',
  rounded = false,
  style,
  textStyle,
}) => {
  const sizeStyles = sizeConfig[size];
  const colorStyles = colorSchemeConfig[colorScheme][variant];

  const badgeStyle: ViewStyle = {
    paddingHorizontal: sizeStyles.paddingHorizontal,
    paddingVertical: sizeStyles.paddingVertical,
    backgroundColor: colorStyles.bg,
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: colorStyles.border,
    borderRadius: rounded ? borderRadius.full : borderRadius.md,
    alignSelf: 'flex-start',
  };

  const labelStyle: TextStyle = {
    fontSize: sizeStyles.fontSize,
    fontWeight: '600',
    color: colorStyles.text,
  };

  return (
    <View style={[badgeStyle, style]}>
      <Text style={[labelStyle, textStyle]}>{children}</Text>
    </View>
  );
};

export interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'error';
  size?: BadgeSize;
  style?: ViewStyle;
}

const statusConfig: Record<StatusBadgeProps['status'], { colorScheme: BadgeColorScheme; label: string }> = {
  active: { colorScheme: 'success', label: '有効' },
  inactive: { colorScheme: 'neutral', label: '無効' },
  pending: { colorScheme: 'warning', label: '保留中' },
  completed: { colorScheme: 'info', label: '完了' },
  cancelled: { colorScheme: 'error', label: 'キャンセル' },
  error: { colorScheme: 'error', label: 'エラー' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  style,
}) => {
  const config = statusConfig[status];

  return (
    <Badge
      colorScheme={config.colorScheme}
      size={size}
      variant="subtle"
      style={style}
    >
      {config.label}
    </Badge>
  );
};

export default Badge;
