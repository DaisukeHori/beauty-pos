import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Avatar, Badge, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import { authService } from '@beauty-pos/api';

interface SettingItem {
  label: string;
  icon: string;
  onPress?: () => void;
  value?: string | React.ReactNode;
  showArrow?: boolean;
}

export default function SettingsScreen() {
  const { staff, company, reset: resetAuth } = useAuthStore();
  const { theme, setTheme, showToast } = useUIStore();

  const handleLogout = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
              resetAuth();
              router.replace('/(auth)/login');
            } catch (error) {
              showToast('ログアウトに失敗しました', 'error');
            }
          },
        },
      ]
    );
  };

  const accountSettings: SettingItem[] = [
    {
      label: 'プロフィール編集',
      icon: '👤',
      onPress: () => {},
      showArrow: true,
    },
    {
      label: 'パスワード変更',
      icon: '🔐',
      onPress: () => {},
      showArrow: true,
    },
    {
      label: '通知設定',
      icon: '🔔',
      onPress: () => {},
      showArrow: true,
    },
  ];

  const adminSettings: SettingItem[] = [
    {
      label: '店舗設定',
      icon: '🏪',
      onPress: () => router.push('/admin/store'),
      showArrow: true,
    },
    {
      label: 'メニュー管理',
      icon: '📋',
      onPress: () => router.push('/admin/menus'),
      showArrow: true,
    },
    {
      label: '商品管理',
      icon: '📦',
      onPress: () => router.push('/admin/products'),
      showArrow: true,
    },
    {
      label: '在庫管理',
      icon: '📊',
      onPress: () => router.push('/admin/inventory'),
      showArrow: true,
    },
    {
      label: 'スタッフ管理',
      icon: '👥',
      onPress: () => router.push('/admin/staff'),
      showArrow: true,
    },
    {
      label: 'シフト・勤怠管理',
      icon: '📅',
      onPress: () => router.push('/admin/shifts'),
      showArrow: true,
    },
    {
      label: 'クーポン管理',
      icon: '🎟️',
      onPress: () => router.push('/admin/coupons'),
      showArrow: true,
    },
    {
      label: '回数券管理',
      icon: '🎫',
      onPress: () => router.push('/admin/tickets'),
      showArrow: true,
    },
  ];

  const reportSettings: SettingItem[] = [
    {
      label: '日報',
      icon: '📝',
      onPress: () => router.push('/admin/daily-report'),
      showArrow: true,
    },
    {
      label: '売上レポート',
      icon: '📊',
      onPress: () => router.push('/admin/reports'),
      showArrow: true,
    },
    {
      label: '月次レポート',
      icon: '📈',
      onPress: () => router.push('/admin/monthly-report'),
      showArrow: true,
    },
    {
      label: 'スタッフ別売上',
      icon: '👤',
      onPress: () => router.push('/admin/staff-sales'),
      showArrow: true,
    },
    {
      label: '顧客分析',
      icon: '📉',
      onPress: () => router.push('/admin/customer-analytics'),
      showArrow: true,
    },
    {
      label: '売上履歴',
      icon: '🧾',
      onPress: () => router.push('/admin/sales-history'),
      showArrow: true,
    },
  ];

  const appSettings: SettingItem[] = [
    {
      label: 'ダークモード',
      icon: '🌙',
      value: (
        <Switch
          value={theme === 'dark'}
          onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
          trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
          thumbColor={theme === 'dark' ? colors.primary[500] : colors.white}
        />
      ),
    },
    {
      label: '言語',
      icon: '🌐',
      value: '日本語',
      onPress: () => {},
      showArrow: true,
    },
  ];

  const supportSettings: SettingItem[] = [
    {
      label: 'ヘルプセンター',
      icon: '❓',
      onPress: () => {},
      showArrow: true,
    },
    {
      label: 'お問い合わせ',
      icon: '📧',
      onPress: () => {},
      showArrow: true,
    },
    {
      label: '利用規約',
      icon: '📄',
      onPress: () => {},
      showArrow: true,
    },
    {
      label: 'プライバシーポリシー',
      icon: '🔒',
      onPress: () => {},
      showArrow: true,
    },
  ];

  const renderSettingItem = (item: SettingItem, index: number, isLast: boolean) => (
    <TouchableOpacity
      key={index}
      style={[styles.settingItem, !isLast && styles.settingItemBorder]}
      onPress={item.onPress}
      disabled={!item.onPress}
      activeOpacity={item.onPress ? 0.7 : 1}
    >
      <Text style={styles.settingIcon}>{item.icon}</Text>
      <Text style={styles.settingLabel}>{item.label}</Text>
      {item.value && (
        typeof item.value === 'string' ? (
          <Text style={styles.settingValue}>{item.value}</Text>
        ) : (
          item.value
        )
      )}
      {item.showArrow && <Text style={styles.arrowIcon}>›</Text>}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.profileSection}>
        <Card variant="elevated" size="lg">
          <View style={styles.profileContent}>
            <Avatar
              name={`${staff?.lastName}${staff?.firstName}`}
              source={staff?.avatarUrl}
              size="xl"
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {staff?.lastName} {staff?.firstName}
              </Text>
              <Text style={styles.profileRole}>
                {staff?.role === 'owner' ? 'オーナー' :
                 staff?.role === 'manager' ? 'マネージャー' :
                 staff?.role === 'stylist' ? 'スタイリスト' :
                 staff?.role === 'assistant' ? 'アシスタント' : 'スタッフ'}
              </Text>
              <Badge colorScheme="primary" variant="subtle" size="sm" style={styles.roleBadge}>
                {company?.name}
              </Badge>
            </View>
          </View>
          <View style={styles.profileStats}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>128</Text>
              <Text style={styles.profileStatLabel}>今月担当</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>4.8</Text>
              <Text style={styles.profileStatLabel}>評価</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>¥2.4M</Text>
              <Text style={styles.profileStatLabel}>今月売上</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アカウント</Text>
        <Card variant="outlined" size="md">
          {accountSettings.map((item, index) =>
            renderSettingItem(item, index, index === accountSettings.length - 1)
          )}
        </Card>
      </View>

      {/* Admin Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>管理</Text>
        <Card variant="outlined" size="md">
          {adminSettings.map((item, index) =>
            renderSettingItem(item, index, index === adminSettings.length - 1)
          )}
        </Card>
      </View>

      {/* Report Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>レポート・分析</Text>
        <Card variant="outlined" size="md">
          {reportSettings.map((item, index) =>
            renderSettingItem(item, index, index === reportSettings.length - 1)
          )}
        </Card>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アプリ設定</Text>
        <Card variant="outlined" size="md">
          {appSettings.map((item, index) =>
            renderSettingItem(item, index, index === appSettings.length - 1)
          )}
        </Card>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>サポート</Text>
        <Card variant="outlined" size="md">
          {supportSettings.map((item, index) =>
            renderSettingItem(item, index, index === supportSettings.length - 1)
          )}
        </Card>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>ログアウト</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Beauty Salon Staff App</Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  profileSection: {
    padding: spacing[4],
    paddingBottom: 0,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing[4],
  },
  profileName: {
    ...textStyles.h4,
    color: colors.neutral[900],
  },
  profileRole: {
    ...textStyles.body,
    color: colors.neutral[600],
    marginTop: spacing[0.5],
  },
  roleBadge: {
    marginTop: spacing[2],
    alignSelf: 'flex-start',
  },
  profileStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing[4],
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatValue: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  profileStatLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  section: {
    padding: spacing[4],
    paddingBottom: 0,
  },
  sectionTitle: {
    ...textStyles.labelSm,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  settingIcon: {
    fontSize: 20,
    marginRight: spacing[3],
  },
  settingLabel: {
    ...textStyles.body,
    color: colors.neutral[900],
    flex: 1,
  },
  settingValue: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginRight: spacing[2],
  },
  arrowIcon: {
    fontSize: 24,
    color: colors.neutral[400],
  },
  logoutButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error[200],
  },
  logoutText: {
    ...textStyles.label,
    color: colors.error[500],
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  versionText: {
    ...textStyles.caption,
    color: colors.neutral[400],
  },
});
