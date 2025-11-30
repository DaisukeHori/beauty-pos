import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { textStyles } from '../theme/typography';
import { borderRadius } from '../theme/borderRadius';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom';

export interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  position?: ToastPosition;
  onClose?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

const typeConfig = {
  success: {
    backgroundColor: colors.success[500],
    icon: '✓',
  },
  error: {
    backgroundColor: colors.error[500],
    icon: '✕',
  },
  warning: {
    backgroundColor: colors.warning[500],
    icon: '!',
  },
  info: {
    backgroundColor: colors.info[500],
    icon: 'ℹ',
  },
};

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 3000,
  position = 'bottom',
  onClose,
  action,
  style,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const config = typeConfig[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (duration > 0 && onClose) {
        const timer = setTimeout(() => {
          hideToast();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  if (!visible) return null;

  const containerStyle: ViewStyle = {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    ...(position === 'top' ? { top: spacing[12] } : { bottom: spacing[12] }),
  };

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      <View style={[styles.toast, { backgroundColor: config.backgroundColor }]}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{config.icon}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        {action && (
          <TouchableOpacity onPress={action.onPress} style={styles.actionButton}>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        )}
        {onClose && !action && (
          <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

// Toast Container for managing multiple toasts
export interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type?: ToastType;
    duration?: number;
  }>;
  onDismiss: (id: string) => void;
  position?: ToastPosition;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position = 'bottom',
}) => {
  return (
    <View style={[styles.container, position === 'top' ? styles.containerTop : styles.containerBottom]}>
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          visible={true}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          position={position}
          onClose={() => onDismiss(toast.id)}
          style={{
            position: 'relative',
            marginBottom: index < toasts.length - 1 ? spacing[2] : 0,
            left: 0,
            right: 0,
            ...(position === 'top' ? { top: 0 } : { bottom: 0 }),
          }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: spacing[4],
  },
  containerTop: {
    top: spacing[12],
  },
  containerBottom: {
    bottom: spacing[12],
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  icon: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  message: {
    ...textStyles.body,
    color: colors.white,
    flex: 1,
  },
  actionButton: {
    marginLeft: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionLabel: {
    ...textStyles.labelSm,
    color: colors.white,
  },
  closeButton: {
    marginLeft: spacing[2],
    padding: spacing[1],
  },
  closeIcon: {
    color: colors.white,
    fontSize: 14,
    opacity: 0.8,
  },
});

export default Toast;
