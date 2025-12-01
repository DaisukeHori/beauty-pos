import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, Badge, colors, spacing, textStyles, borderRadius, shadows } from '@beauty-pos/ui';
import { proposalService, visitService, reservationService, VisitWithDetails, ReservationWithDetails } from '@beauty-pos/api';
import { formatTime } from '@beauty-pos/core';

// Default IDs for demo (should come from session/config in real app)
const DEFAULT_COMPANY_ID = 'demo-company';
const DEFAULT_STORE_ID = 'demo-store';
const DEFAULT_CUSTOMER_ID = 'demo-customer';

interface SessionInfo {
  visit?: VisitWithDetails | null;
  reservation?: ReservationWithDetails | null;
}

export default function CustomerHomeScreen() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({});
  const [pendingProposalCount, setPendingProposalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Load pending proposals count
      const proposalCount = await proposalService.countPending(DEFAULT_CUSTOMER_ID);
      setPendingProposalCount(proposalCount);

      // Try to load current session info (visit or reservation)
      // In real app, this would be based on the current context
      // For demo, we'll just show mock info or empty state
      setSessionInfo({
        visit: null,
        reservation: null,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const getMenuDisplay = () => {
    if (sessionInfo.visit?.reservation) {
      // From visit's reservation
      const menuNames = sessionInfo.visit.reservation.menus?.map(m => m.name) || [];
      return menuNames.length > 0 ? menuNames.join(' + ') : 'メニュー情報なし';
    }
    if (sessionInfo.reservation) {
      // From reservation
      const menuNames = sessionInfo.reservation.menus?.map(m => m.name) || [];
      return menuNames.length > 0 ? menuNames.join(' + ') : 'メニュー情報なし';
    }
    return 'カット + カラー'; // Demo default
  };

  const getStaffDisplay = () => {
    if (sessionInfo.visit?.staff) {
      return `${sessionInfo.visit.staff.last_name} ${sessionInfo.visit.staff.first_name}`;
    }
    if (sessionInfo.reservation?.staff) {
      return `${sessionInfo.reservation.staff.last_name} ${sessionInfo.reservation.staff.first_name}`;
    }
    return '田中 美咲'; // Demo default
  };

  const getDurationDisplay = () => {
    if (sessionInfo.reservation?.menus) {
      const totalMinutes = sessionInfo.reservation.menus.reduce(
        (sum, m) => sum + (m.duration_minutes || 0), 0
      );
      return formatTime(totalMinutes);
    }
    return '約90分'; // Demo default
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary[500]]}
          tintColor={colors.primary[500]}
        />
      }
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
      {pendingProposalCount > 0 && (
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
                  <Text style={styles.proposalBadgeText}>{pendingProposalCount}</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      )}

      {/* No proposals - show placeholder */}
      {pendingProposalCount === 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>スタイリストからの提案</Text>
          <TouchableOpacity
            onPress={() => router.push('/proposal')}
            activeOpacity={0.8}
          >
            <Card variant="outlined" size="md">
              <View style={styles.proposalContent}>
                <View style={styles.proposalInfo}>
                  <Text style={styles.proposalTitle}>提案を確認する</Text>
                  <Text style={styles.proposalDescription}>
                    スタイリストからの提案があればここに表示されます
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      )}

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>本日のメニュー</Text>
        <Card variant="filled" size="md">
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>予約メニュー</Text>
            <Text style={styles.menuValue}>{getMenuDisplay()}</Text>
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>担当</Text>
            <Text style={styles.menuValue}>{getStaffDisplay()}</Text>
          </View>
          <View style={[styles.menuInfo, styles.menuInfoLast]}>
            <Text style={styles.menuLabel}>予定時間</Text>
            <Text style={styles.menuValue}>{getDurationDisplay()}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginTop: spacing[3],
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
  chevron: {
    fontSize: 24,
    color: colors.neutral[400],
  },
  menuInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  menuInfoLast: {
    borderBottomWidth: 0,
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
