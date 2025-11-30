import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../theme/colors';
import { textStyles } from '../theme/typography';
import { borderRadius } from '../theme/borderRadius';
import { spacing } from '../theme/spacing';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: InputSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isDisabled?: boolean;
  isRequired?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  onRightIconPress?: () => void;
}

const sizeConfig = {
  sm: { height: 36, paddingHorizontal: 12, fontSize: 14 },
  md: { height: 44, paddingHorizontal: 16, fontSize: 16 },
  lg: { height: 52, paddingHorizontal: 20, fontSize: 18 },
};

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  helperText,
  size = 'md',
  leftIcon,
  rightIcon,
  isDisabled = false,
  isRequired = false,
  containerStyle,
  inputStyle,
  onRightIconPress,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const sizeStyles = sizeConfig[size];

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getBorderColor = () => {
    if (error) return colors.error[500];
    if (isFocused) return colors.primary[500];
    return colors.neutral[300];
  };

  const inputContainerStyle: ViewStyle = {
    height: sizeStyles.height,
    paddingHorizontal: sizeStyles.paddingHorizontal,
    backgroundColor: isDisabled ? colors.neutral[100] : colors.white,
    borderWidth: 1,
    borderColor: getBorderColor(),
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  };

  const textInputStyle: TextStyle = {
    flex: 1,
    fontSize: sizeStyles.fontSize,
    color: isDisabled ? colors.neutral[400] : colors.neutral[900],
    paddingVertical: 0,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {isRequired && <Text style={styles.required}>*</Text>}
        </View>
      )}

      <View style={inputContainerStyle}>
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

        <TextInput
          ref={ref}
          style={[textInputStyle, inputStyle]}
          placeholderTextColor={colors.neutral[400]}
          editable={!isDisabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.iconRight}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {(error || helperText) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: spacing[1.5],
  },
  label: {
    ...textStyles.label,
    color: colors.neutral[700],
  },
  required: {
    ...textStyles.label,
    color: colors.error[500],
    marginLeft: spacing[0.5],
  },
  iconLeft: {
    marginRight: spacing[2],
  },
  iconRight: {
    marginLeft: spacing[2],
  },
  helperText: {
    ...textStyles.helper,
    color: colors.neutral[500],
    marginTop: spacing[1],
  },
  errorText: {
    color: colors.error[500],
  },
});

export default Input;
