import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Button, Input, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { authService } from '@beauty-pos/api';
import { useUIStore } from '@beauty-pos/core';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { showToast } = useUIStore();

  const handleResetPassword = async () => {
    if (!email) {
      showToast('メールアドレスを入力してください', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(email);
      setIsSent(true);
      showToast('パスワードリセットメールを送信しました', 'success');
    } catch (error: any) {
      showToast(error.message || 'メールの送信に失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>🔐</Text>
          </View>
          <Text style={styles.title}>パスワードリセット</Text>
          <Text style={styles.subtitle}>
            登録されたメールアドレスにパスワードリセット用のリンクを送信します
          </Text>
        </View>

        {isSent ? (
          <View style={styles.sentContainer}>
            <View style={styles.sentIcon}>
              <Text style={styles.sentIconText}>✉️</Text>
            </View>
            <Text style={styles.sentTitle}>メールを送信しました</Text>
            <Text style={styles.sentDescription}>
              {email} 宛にパスワードリセット用のメールを送信しました。
              メールに記載されたリンクからパスワードを再設定してください。
            </Text>
            <Button
              onPress={() => router.replace('/(auth)/login')}
              size="lg"
              fullWidth
              style={styles.loginButton}
            >
              ログイン画面へ
            </Button>
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              label="メールアドレス"
              placeholder="example@salon.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              size="lg"
            />

            <Button
              onPress={handleResetPassword}
              isLoading={isLoading}
              size="lg"
              fullWidth
              style={styles.submitButton}
            >
              リセットメールを送信
            </Button>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[12],
    paddingBottom: spacing[8],
  },
  backButton: {
    marginBottom: spacing[8],
  },
  backButtonText: {
    ...textStyles.body,
    color: colors.primary[500],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    ...textStyles.h3,
    color: colors.neutral[900],
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  subtitle: {
    ...textStyles.body,
    color: colors.neutral[500],
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  form: {
    marginBottom: spacing[8],
  },
  submitButton: {
    marginTop: spacing[4],
  },
  sentContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  sentIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  sentIconText: {
    fontSize: 40,
  },
  sentTitle: {
    ...textStyles.h4,
    color: colors.neutral[900],
    marginBottom: spacing[2],
  },
  sentDescription: {
    ...textStyles.body,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: 24,
  },
  loginButton: {
    marginTop: spacing[2],
  },
});
