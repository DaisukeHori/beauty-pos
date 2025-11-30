import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { colors } from '../theme/colors';
import { textStyles } from '../theme/typography';
import { borderRadius } from '../theme/borderRadius';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';

export type CardVariant = 'elevated' | 'outlined' | 'filled';
export type CardSize = 'sm' | 'md' | 'lg';

export interface CardProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  isPressed?: boolean;
  style?: ViewStyle;
}

const sizeConfig = {
  sm: { padding: 12 },
  md: { padding: 16 },
  lg: { padding: 24 },
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  size = 'md',
  title,
  subtitle,
  headerRight,
  footer,
  isPressed,
  onPress,
  style,
  ...props
}) => {
  const sizeStyles = sizeConfig[size];

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.white,
          ...shadows.md,
        };
      case 'outlined':
        return {
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.neutral[200],
        };
      case 'filled':
        return {
          backgroundColor: colors.neutral[50],
        };
    }
  };

  const cardStyle: ViewStyle = {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...getVariantStyles(),
    ...(isPressed && { opacity: 0.9 }),
  };

  const contentStyle: ViewStyle = {
    padding: sizeStyles.padding,
  };

  const hasHeader = title || subtitle || headerRight;

  const content = (
    <View style={cardStyle}>
      {hasHeader && (
        <View style={[styles.header, contentStyle]}>
          <View style={styles.headerText}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {headerRight}
        </View>
      )}
      <View style={contentStyle}>{children}</View>
      {footer && (
        <View style={[styles.footer, contentStyle]}>
          {footer}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={style}
        {...props}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={style}>{content}</View>;
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  subtitle: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
});

export default Card;
