import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { textStyles } from '../theme/typography';
import { borderRadius } from '../theme/borderRadius';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnBackdropPress?: boolean;
  footer?: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const sizeConfig = {
  sm: { width: Math.min(320, screenWidth - 48), maxHeight: screenHeight * 0.5 },
  md: { width: Math.min(480, screenWidth - 48), maxHeight: screenHeight * 0.7 },
  lg: { width: Math.min(640, screenWidth - 48), maxHeight: screenHeight * 0.8 },
  xl: { width: Math.min(800, screenWidth - 48), maxHeight: screenHeight * 0.9 },
  full: { width: screenWidth - 32, maxHeight: screenHeight - 64 },
};

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropPress = true,
  footer,
  scrollable = false,
  style,
}) => {
  const sizeStyles = sizeConfig[size];

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  const containerStyle: ViewStyle = {
    width: sizeStyles.width,
    maxHeight: sizeStyles.maxHeight,
    backgroundColor: colors.white,
    borderRadius: borderRadius['2xl'],
    ...shadows.xl,
    overflow: 'hidden',
  };

  const Content = scrollable ? ScrollView : View;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <TouchableWithoutFeedback>
              <View style={[containerStyle, style]}>
                {(title || showCloseButton) && (
                  <View style={styles.header}>
                    <View style={styles.headerText}>
                      {title && <Text style={styles.title}>{title}</Text>}
                      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    </View>
                    {showCloseButton && (
                      <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      >
                        <Text style={styles.closeIcon}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <Content
                  style={styles.body}
                  contentContainerStyle={scrollable ? styles.scrollContent : undefined}
                  showsVerticalScrollIndicator={false}
                >
                  {children}
                </Content>

                {footer && <View style={styles.footer}>{footer}</View>}
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerText: {
    flex: 1,
    marginRight: spacing[4],
  },
  title: {
    ...textStyles.h4,
    color: colors.neutral[900],
  },
  subtitle: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    marginTop: spacing[1],
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: colors.neutral[500],
    fontWeight: '600',
  },
  body: {
    padding: spacing[5],
  },
  scrollContent: {
    flexGrow: 1,
  },
  footer: {
    padding: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
});

export default Modal;
