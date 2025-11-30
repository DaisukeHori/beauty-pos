import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { colors } from '../theme/colors';
import { textStyles } from '../theme/typography';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface AvatarProps {
  source?: ImageSourcePropType | string;
  name?: string;
  size?: AvatarSize;
  backgroundColor?: string;
  style?: ViewStyle;
}

const sizeConfig = {
  xs: { size: 24, fontSize: 10 },
  sm: { size: 32, fontSize: 12 },
  md: { size: 40, fontSize: 14 },
  lg: { size: 48, fontSize: 16 },
  xl: { size: 64, fontSize: 20 },
  '2xl': { size: 80, fontSize: 24 },
};

const getInitials = (name: string): string => {
  if (!name) return '';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getBackgroundColor = (name: string): string => {
  const colorOptions = [
    colors.primary[400],
    colors.secondary[400],
    colors.success[400],
    colors.warning[400],
    colors.info[400],
    colors.error[400],
  ];

  if (!name) return colors.neutral[300];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colorOptions[Math.abs(hash) % colorOptions.length];
};

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  backgroundColor,
  style,
}) => {
  const sizeStyles = sizeConfig[size];

  const containerStyle: ViewStyle = {
    width: sizeStyles.size,
    height: sizeStyles.size,
    borderRadius: sizeStyles.size / 2,
    backgroundColor: backgroundColor || getBackgroundColor(name || ''),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const hasValidSource = source && (typeof source === 'object' || (typeof source === 'string' && source.length > 0));

  if (hasValidSource) {
    const imageSource = typeof source === 'string' ? { uri: source } : source;
    return (
      <View style={[containerStyle, style]}>
        <Image
          source={imageSource}
          style={{
            width: sizeStyles.size,
            height: sizeStyles.size,
          }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <Text
        style={{
          fontSize: sizeStyles.fontSize,
          fontWeight: '600',
          color: colors.white,
        }}
      >
        {getInitials(name || '')}
      </Text>
    </View>
  );
};

export interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarSize;
  style?: ViewStyle;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  children,
  max = 4,
  size = 'md',
  style,
}) => {
  const sizeStyles = sizeConfig[size];
  const childArray = React.Children.toArray(children);
  const visibleAvatars = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  return (
    <View style={[styles.group, style]}>
      {visibleAvatars.map((child, index) => (
        <View
          key={index}
          style={[
            styles.groupItem,
            {
              marginLeft: index === 0 ? 0 : -sizeStyles.size / 3,
              zIndex: visibleAvatars.length - index,
            },
          ]}
        >
          {React.cloneElement(child as React.ReactElement, { size })}
        </View>
      ))}
      {remainingCount > 0 && (
        <View
          style={[
            styles.groupItem,
            {
              marginLeft: -sizeStyles.size / 3,
              zIndex: 0,
            },
          ]}
        >
          <Avatar
            name={`+${remainingCount}`}
            size={size}
            backgroundColor={colors.neutral[400]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupItem: {
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 999,
  },
});

export default Avatar;
