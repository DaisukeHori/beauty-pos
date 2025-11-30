import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, colors, spacing, textStyles, borderRadius, shadows } from '@beauty-pos/ui';

export default function CustomerHomeScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>💇‍♀️</Text>
        </View>
        <Text style={styles.title}>Beauty Salon</Text>
        <Text style={styles.subtitle}>ようこそ！</Text>
      </View>

      {/* Welcome Message */}
      <Card variant="elevated" size="lg" style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>本日はご来店ありがとうございます</Text>
        <Text style={styles.welcomeText}>
          こちらのiPadで、ヘアスタイルのシミュレーションや
          カタログの閲覧ができます。
        </Text>
      </Card>

      {/* Main Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/simulation')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: colors.primary[100] }]}>
            <Text style={styles.actionIcon}>🪞</Text>
          </View>
          <Text style={styles.actionTitle}>ヘアスタイル{'\n'}シミュレーション</Text>
          <Text style={styles.actionDescription}>
            あなたの写真で新しいヘアスタイルを試してみましょう
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/gallery')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: colors.secondary[100] }]}>
            <Text style={styles.actionIcon}>📚</Text>
          </View>
          <Text style={styles.actionTitle}>ヘア{'\n'}カタログ</Text>
          <Text style={styles.actionDescription}>
            人気のヘアスタイルをチェック
          </Text>
        </TouchableOpacity>
      </View>

      {/* Proposals Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>スタイリストからの提案</Text>
        <TouchableOpacity
          onPress={() => router.push('/proposal')}
          activeOpacity={0.8}
        >
          <Card variant="outlined" size="md">
            <View style={styles.proposalContent}>
              <View style={styles.proposalInfo}>
                <Text style={styles.proposalTitle}>新しい提案があります</Text>
                <Text style={styles.proposalDescription}>
                  あなたにおすすめのスタイルを見てみましょう
                </Text>
              </View>
              <View style={styles.proposalBadge}>
                <Text style={styles.proposalBadgeText}>1</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>本日のメニュー</Text>
        <Card variant="filled" size="md">
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>予約メニュー</Text>
            <Text style={styles.menuValue}>カット + カラー</Text>
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>担当</Text>
            <Text style={styles.menuValue}>田中 美咲</Text>
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>予定時間</Text>
            <Text style={styles.menuValue}>約90分</Text>
          </View>
        </Card>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ご不明な点がございましたら、スタッフにお声がけください
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  content: {
    padding: spacing[6],
    paddingBottom: spacing[10],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[8],
    paddingTop: spacing[8],
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
    ...textStyles.h5,
    color: colors.neutral[500],
  },
  welcomeCard: {
    marginBottom: spacing[6],
    backgroundColor: colors.primary[50],
  },
  welcomeTitle: {
    ...textStyles.h5,
    color: colors.primary[700],
    marginBottom: spacing[2],
  },
  welcomeText: {
    ...textStyles.body,
    color: colors.primary[600],
    lineHeight: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    marginHorizontal: -spacing[2],
    marginBottom: spacing[6],
  },
  actionCard: {
    flex: 1,
    marginHorizontal: spacing[2],
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    alignItems: 'center',
    ...shadows.md,
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  actionIcon: {
    fontSize: 32,
  },
  actionTitle: {
    ...textStyles.label,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  actionDescription: {
    ...textStyles.caption,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[3],
  },
  proposalContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proposalInfo: {
    flex: 1,
  },
  proposalTitle: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  proposalDescription: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  proposalBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  proposalBadgeText: {
    ...textStyles.labelSm,
    color: colors.white,
  },
  menuInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  menuLabel: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
  },
  menuValue: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing[4],
  },
  footerText: {
    ...textStyles.bodySm,
    color: colors.neutral[400],
    textAlign: 'center',
  },
});
