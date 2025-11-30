import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Avatar, Badge, Button, colors, spacing, textStyles, borderRadius, shadows } from '@beauty-pos/ui';
import { useAuthStore, useVisitStore, useReservationStore, formatCurrency, formatTime } from '@beauty-pos/core';
import { visitService, reservationService, saleService } from '@beauty-pos/api';

interface DashboardStats {
  todayVisits: number;
  inService: number;
  waiting: number;
  todaySales: number;
  upcomingReservations: number;
}

export default function HomeScreen() {
  const { staff, company } = useAuthStore();
  const { todayVisits, setTodayVisits } = useVisitStore();
  const { reservations, setReservations } = useReservationStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    todayVisits: 0,
    inService: 0,
    waiting: 0,
    todaySales: 0,
    upcomingReservations: 0,
  });

  const loadDashboardData = async () => {
    if (!staff || !company) return;

    try {
      // For now, use mock data since we don't have a store selected
      // In real app, this would load from the selected store
      setStats({
        todayVisits: 12,
        inService: 3,
        waiting: 2,
        todaySales: 125000,
        upcomingReservations: 8,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [staff, company]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'おはようございます' : currentHour < 18 ? 'こんにちは' : 'こんばんは';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.staffName}>
            {staff?.lastName} {staff?.firstName} さん
          </Text>
        </View>
        <Avatar
          name={`${staff?.lastName}${staff?.firstName}`}
          source={staff?.avatarUrl}
          size="lg"
        />
      </View>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.primary[50] }]}
          onPress={() => router.push('/(tabs)/visits')}
        >
          <Text style={styles.statValue}>{stats.todayVisits}</Text>
          <Text style={styles.statLabel}>本日来店</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.success[50] }]}
          onPress={() => router.push('/(tabs)/visits')}
        >
          <Text style={styles.statValue}>{stats.inService}</Text>
          <Text style={styles.statLabel}>施術中</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.warning[50] }]}
          onPress={() => router.push('/(tabs)/visits')}
        >
          <Text style={styles.statValue}>{stats.waiting}</Text>
          <Text style={styles.statLabel}>待ち</Text>
        </TouchableOpacity>

        <View style={[styles.statCard, { backgroundColor: colors.info[50] }]}>
          <Text style={styles.statValue}>{formatCurrency(stats.todaySales)}</Text>
          <Text style={styles.statLabel}>本日売上</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>クイックアクション</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/visits')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary[100] }]}>
              <Text style={styles.actionIconText}>✓</Text>
            </View>
            <Text style={styles.actionLabel}>来店受付</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/checkout')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.success[100] }]}>
              <Text style={styles.actionIconText}>💰</Text>
            </View>
            <Text style={styles.actionLabel}>会計</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/reservation/new')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.info[100] }]}>
              <Text style={styles.actionIconText}>📝</Text>
            </View>
            <Text style={styles.actionLabel}>予約登録</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/customers')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.secondary[100] }]}>
              <Text style={styles.actionIconText}>👤</Text>
            </View>
            <Text style={styles.actionLabel}>顧客検索</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Upcoming Reservations */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>次の予約</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/reservations')}>
            <Text style={styles.seeAllText}>すべて見る</Text>
          </TouchableOpacity>
        </View>

        <Card variant="outlined" size="md">
          <View style={styles.reservationItem}>
            <View style={styles.reservationTime}>
              <Text style={styles.reservationTimeText}>14:00</Text>
              <Text style={styles.reservationDuration}>60分</Text>
            </View>
            <View style={styles.reservationInfo}>
              <Text style={styles.reservationCustomer}>山田 花子 様</Text>
              <Text style={styles.reservationMenu}>カット + カラー</Text>
              <Badge colorScheme="primary" size="sm">本指名</Badge>
            </View>
          </View>
        </Card>

        <Card variant="outlined" size="md" style={styles.reservationCard}>
          <View style={styles.reservationItem}>
            <View style={styles.reservationTime}>
              <Text style={styles.reservationTimeText}>15:30</Text>
              <Text style={styles.reservationDuration}>90分</Text>
            </View>
            <View style={styles.reservationInfo}>
              <Text style={styles.reservationCustomer}>佐藤 美咲 様</Text>
              <Text style={styles.reservationMenu}>パーマ + トリートメント</Text>
              <Badge colorScheme="neutral" size="sm">フリー</Badge>
            </View>
          </View>
        </Card>
      </View>

      {/* Current In-Service */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>施術中</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/visits')}>
            <Text style={styles.seeAllText}>すべて見る</Text>
          </TouchableOpacity>
        </View>

        <Card variant="elevated" size="md">
          <View style={styles.inServiceItem}>
            <Avatar name="鈴木 太郎" size="md" />
            <View style={styles.inServiceInfo}>
              <Text style={styles.inServiceCustomer}>鈴木 太郎 様</Text>
              <Text style={styles.inServiceMenu}>カット</Text>
              <View style={styles.inServiceProgress}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '70%' }]} />
                </View>
                <Text style={styles.progressText}>残り約10分</Text>
              </View>
            </View>
            <Button size="sm" variant="outline" onPress={() => router.push('/checkout')}>
              会計へ
            </Button>
          </View>
        </Card>
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
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
    paddingTop: spacing[2],
  },
  headerLeft: {},
  greeting: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    marginBottom: spacing[0.5],
  },
  staffName: {
    ...textStyles.h4,
    color: colors.neutral[900],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing[1.5],
    marginBottom: spacing[6],
  },
  statCard: {
    width: '50%',
    padding: spacing[1.5],
  },
  statCardInner: {
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  statValue: {
    ...textStyles.h3,
    color: colors.neutral[900],
    marginBottom: spacing[1],
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    textAlign: 'center',
  },
  statLabel: {
    ...textStyles.bodySm,
    color: colors.neutral[600],
    textAlign: 'center',
    paddingBottom: spacing[2],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  seeAllText: {
    ...textStyles.bodySm,
    color: colors.primary[500],
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    width: '23%',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  actionIconText: {
    fontSize: 24,
  },
  actionLabel: {
    ...textStyles.labelSm,
    color: colors.neutral[700],
    textAlign: 'center',
  },
  reservationCard: {
    marginTop: spacing[2],
  },
  reservationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reservationTime: {
    alignItems: 'center',
    marginRight: spacing[4],
    paddingRight: spacing[4],
    borderRightWidth: 1,
    borderRightColor: colors.neutral[200],
  },
  reservationTimeText: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  reservationDuration: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  reservationInfo: {
    flex: 1,
  },
  reservationCustomer: {
    ...textStyles.label,
    color: colors.neutral[900],
    marginBottom: spacing[0.5],
  },
  reservationMenu: {
    ...textStyles.bodySm,
    color: colors.neutral[600],
    marginBottom: spacing[1],
  },
  inServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inServiceInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  inServiceCustomer: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  inServiceMenu: {
    ...textStyles.bodySm,
    color: colors.neutral[600],
    marginBottom: spacing[2],
  },
  inServiceProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
  },
  progressText: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
});
