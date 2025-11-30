import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { colors } from '../theme/colors';
import { textStyles } from '../theme/typography';
import { borderRadius } from '../theme/borderRadius';
import { shadows } from '../theme/shadows';

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';
export type ButtonColorScheme = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  colorScheme?: ButtonColorScheme;
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const sizeConfig = {
  sm: { height: 32, paddingHorizontal: 12, ...textStyles.buttonSm },
  md: { height: 40, paddingHorizontal: 16, ...textStyles.button },
  lg: { height: 48, paddingHorizontal: 20, ...textStyles.button },
  xl: { height: 56, paddingHorizontal: 24, ...textStyles.buttonLg },
};

const colorSchemeConfig = {
  primary: {
    solid: { bg: colors.primary[500], text: colors.white, border: colors.primary[500] },
    outline: { bg: 'transparent', text: colors.primary[500], border: colors.primary[500] },
    ghost: { bg: 'transparent', text: colors.primary[500], border: 'transparent' },
    link: { bg: 'transparent', text: colors.primary[500], border: 'transparent' },
  },
  secondary: {
    solid: { bg: colors.secondary[500], text: colors.white, border: colors.secondary[500] },
    outline: { bg: 'transparent', text: colors.secondary[500], border: colors.secondary[500] },
    ghost: { bg: 'transparent', text: colors.secondary[500], border: 'transparent' },
    link: { bg: 'transparent', text: colors.secondary[500], border: 'transparent' },
  },
  success: {
    solid: { bg: colors.success[500], text: colors.white, border: colors.success[500] },
    outline: { bg: 'transparent', text: colors.success[600], border: colors.success[500] },
    ghost: { bg: 'transparent', text: colors.success[600], border: 'transparent' },
    link: { bg: 'transparent', text: colors.success[600], border: 'transparent' },
  },
  warning: {
    solid: { bg: colors.warning[500], text: colors.white, border: colors.warning[500] },
    outline: { bg: 'transparent', text: colors.warning[600], border: colors.warning[500] },
    ghost: { bg: 'transparent', text: colors.warning[600], border: 'transparent' },
    link: { bg: 'transparent', text: colors.warning[600], border: 'transparent' },
  },
  error: {
    solid: { bg: colors.error[500], text: colors.white, border: colors.error[500] },
    outline: { bg: 'transparent', text: colors.error[500], border: colors.error[500] },
    ghost: { bg: 'transparent', text: colors.error[500], border: 'transparent' },
    link: { bg: 'transparent', text: colors.error[500], border: 'transparent' },
  },
  neutral: {
    solid: { bg: colors.neutral[800], text: colors.white, border: colors.neutral[800] },
    outline: { bg: 'transparent', text: colors.neutral[800], border: colors.neutral[300] },
    ghost: { bg: 'transparent', text: colors.neutral[700], border: 'transparent' },
    link: { bg: 'transparent', text: colors.neutral[700], border: 'transparent' },
  },
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'solid',
  size = 'md',
  colorScheme = 'primary',
  isLoading = false,
  isDisabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  textStyle,
  onPress,
  ...props
}) => {
  const sizeStyles = sizeConfig[size];
  const colorStyles = colorSchemeConfig[colorScheme][variant];
  const disabled = isDisabled || isLoading;

  const buttonStyle: ViewStyle = {
    height: sizeStyles.height,
    paddingHorizontal: sizeStyles.paddingHorizontal,
    backgroundColor: disabled ? colors.neutral[200] : colorStyles.bg,
    borderColor: disabled ? colors.neutral[300] : colorStyles.border,
    borderWidth: variant === 'outline' ? 1 : 0,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(variant === 'solid' && !disabled ? shadows.sm : {}),
    ...(fullWidth ? { width: '100%' } : {}),
    opacity: disabled ? 0.6 : 1,
  };

  const labelStyle: TextStyle = {
    fontSize: sizeStyles.fontSize,
    fontWeight: sizeStyles.fontWeight,
    lineHeight: sizeStyles.lineHeight,
    color: disabled ? colors.neutral[400] : colorStyles.text,
    marginHorizontal: 4,
  };

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={disabled ? colors.neutral[400] : colorStyles.text}
        />
      ) : (
        <>
          {leftIcon}
          <Text style={[labelStyle, textStyle]}>
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
