import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Button, Input, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { authService } from '@beauty-pos/api';
import { useAuthStore, useUIStore } from '@beauty-pos/core';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setUser, setStaff, setCompany } = useAuthStore();
  const { showToast } = useUIStore();

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('メールアドレスとパスワードを入力してください', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.signIn({ email, password });

      if (result.user && result.staff) {
        setUser({
          id: result.user.id,
          email: result.user.email || '',
        });
        setStaff({
          id: result.staff.id,
          companyId: result.staff.company_id,
          employeeCode: result.staff.employee_code,
          lastName: result.staff.last_name,
          firstName: result.staff.first_name,
          role: result.staff.role as any,
          rank: result.staff.rank || undefined,
          nominationFee: result.staff.nomination_fee,
          avatarUrl: result.staff.avatar_url || undefined,
          isActive: result.staff.is_active,
        });
        if (result.staff.company) {
          setCompany({
            id: result.staff.company.id,
            name: result.staff.company.name,
            settings: result.staff.company.settings as any,
          });
        }
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      showToast(error.message || 'ログインに失敗しました', 'error');
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
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>💇‍♀️</Text>
          </View>
          <Text style={styles.title}>Beauty Salon</Text>
          <Text style={styles.subtitle}>スタッフアプリ</Text>
        </View>

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

          <Input
            label="パスワード"
            placeholder="パスワードを入力"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            size="lg"
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            }
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Link href="/(auth)/forgot-password" asChild>
              <Text style={styles.forgotPasswordText}>パスワードをお忘れですか？</Text>
            </Link>
          </TouchableOpacity>

          <Button
            onPress={handleLogin}
            isLoading={isLoading}
            size="lg"
            fullWidth
            style={styles.loginButton}
          >
            ログイン
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            アカウントをお持ちでない場合は
          </Text>
          <Text style={styles.footerText}>
            管理者にお問い合わせください
          </Text>
        </View>
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
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[10],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    ...textStyles.h2,
    color: colors.primary[600],
    marginBottom: spacing[1],
  },
  subtitle: {
    ...textStyles.body,
    color: colors.neutral[500],
  },
  form: {
    marginBottom: spacing[8],
  },
  eyeIcon: {
    fontSize: 20,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing[6],
  },
  forgotPasswordText: {
    ...textStyles.bodySm,
    color: colors.primary[500],
  },
  loginButton: {
    marginTop: spacing[2],
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    lineHeight: 22,
  },
});
