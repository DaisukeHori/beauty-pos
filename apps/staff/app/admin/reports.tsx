import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Badge, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import { saleService, visitService, reservationService } from '@beauty-pos/api';

interface DailyStats {
  date: string;
  sales: number;
  saleCount: number;
  visitCount: number;
  reservationCount: number;
  newCustomers: number;
  averageSale: number;
}

export default function ReportsScreen() {
  const { company, store } = useAuthStore();
  const { showToast } = useUIStore();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([]);

  const loadStats = useCallback(async () => {
    if (!company?.id || !store?.id) return;

    try {
      setIsLoading(true);

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Get today's data
      const [salesData, visitsData, reservationsData] = await Promise.all([
        saleService.getDailySales(store.id, todayStr),
        visitService.getTodayVisits(store.id),
        reservationService.getByDateRange(store.id, todayStr, todayStr),
      ]);

      const totalSales = salesData.reduce((sum: number, s: { total?: number }) => sum + (s.total || 0), 0);

      setTodayStats({
        date: todayStr,
        sales: totalSales,
        saleCount: salesData.length,
        visitCount: visitsData.length,
        reservationCount: reservationsData.length,
        newCustomers: 0, // Would need additional query
        averageSale: salesData.length > 0 ? totalSales / salesData.length : 0,
      });

      // Get weekly data
      const weekData: DailyStats[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        try {
          const daySales = await saleService.getDailySales(store.id, dateStr);
          const dayTotal = daySales.reduce((sum: number, s: { total?: number }) => sum + (s.total || 0), 0);

          weekData.push({
            date: dateStr,
            sales: dayTotal,
            saleCount: daySales.length,
            visitCount: 0,
            reservationCount: 0,
            newCustomers: 0,
            averageSale: daySales.length > 0 ? dayTotal / daySales.length : 0,
          });
        } catch {
          weekData.push({
            date: dateStr,
            sales: 0,
            saleCount: 0,
            visitCount: 0,
            reservationCount: 0,
            newCustomers: 0,
            averageSale: 0,
          });
        }
      }
      setWeeklyStats(weekData);
    } catch (error) {
      console.error('Failed to load stats:', error);
      showToast('データの読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, store?.id, showToast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getDayOfWeek = (dateStr: string) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const date = new Date(dateStr);
    return days[date.getDay()];
  };

  const getWeekTotal = () => {
    return weeklyStats.reduce((sum, day) => sum + day.sales, 0);
  };

  const getWeekAverage = () => {
    const total = getWeekTotal();
    return weeklyStats.length > 0 ? total / weeklyStats.length : 0;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>売上レポート</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['today', 'week', 'month'] as const).map(period => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive,
              ]}
            >
              {period === 'today' ? '今日' : period === 'week' ? '今週' : '今月'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* Today's Summary */}
        {selectedPeriod === 'today' && todayStats && (
          <>
            <Card variant="elevated" size="lg" style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>本日の売上</Text>
              <Text style={styles.summaryValue}>{formatCurrency(todayStats.sales)}</Text>
              <View style={styles.summaryDetails}>
                <View style={styles.summaryDetailItem}>
                  <Text style={styles.summaryDetailValue}>{todayStats.saleCount}</Text>
                  <Text style={styles.summaryDetailLabel}>会計数</Text>
                </View>
                <View style={styles.summaryDetailItem}>
                  <Text style={styles.summaryDetailValue}>{todayStats.visitCount}</Text>
                  <Text style={styles.summaryDetailLabel}>来店数</Text>
                </View>
                <View style={styles.summaryDetailItem}>
                  <Text style={styles.summaryDetailValue}>
                    {formatCurrency(todayStats.averageSale)}
                  </Text>
                  <Text style={styles.summaryDetailLabel}>客単価</Text>
                </View>
              </View>
            </Card>

            <Card variant="outlined" size="md" style={styles.infoCard}>
              <Text style={styles.infoTitle}>予約状況</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>本日の予約</Text>
                <Text style={styles.infoValue}>{todayStats.reservationCount}件</Text>
              </View>
            </Card>
          </>
        )}

        {/* Weekly Summary */}
        {selectedPeriod === 'week' && (
          <>
            <Card variant="elevated" size="lg" style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>今週の売上</Text>
              <Text style={styles.summaryValue}>{formatCurrency(getWeekTotal())}</Text>
              <View style={styles.summaryDetails}>
                <View style={styles.summaryDetailItem}>
                  <Text style={styles.summaryDetailValue}>
                    {weeklyStats.reduce((sum, d) => sum + d.saleCount, 0)}
                  </Text>
                  <Text style={styles.summaryDetailLabel}>会計数</Text>
                </View>
                <View style={styles.summaryDetailItem}>
                  <Text style={styles.summaryDetailValue}>
                    {formatCurrency(getWeekAverage())}
                  </Text>
                  <Text style={styles.summaryDetailLabel}>日平均</Text>
                </View>
              </View>
            </Card>

            {/* Daily Breakdown */}
            <Text style={styles.sectionTitle}>日別売上</Text>
            {weeklyStats.map((day, index) => (
              <Card key={day.date} variant="outlined" size="sm" style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayDate}>
                    <Text style={styles.dayDateText}>{formatDate(day.date)}</Text>
                    <Badge
                      colorScheme={index === weeklyStats.length - 1 ? 'primary' : 'neutral'}
                      size="sm"
                    >
                      {getDayOfWeek(day.date)}
                    </Badge>
                  </View>
                  <Text style={styles.daySales}>{formatCurrency(day.sales)}</Text>
                </View>
                <View style={styles.dayBar}>
                  <View
                    style={[
                      styles.dayBarFill,
                      {
                        width: `${Math.min(100, (day.sales / Math.max(...weeklyStats.map(d => d.sales), 1)) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Monthly Summary */}
        {selectedPeriod === 'month' && (
          <Card variant="outlined" size="lg" style={styles.infoCard}>
            <Text style={styles.infoTitle}>月次レポート</Text>
            <Text style={styles.comingSoon}>
              詳細な月次レポートは管理画面で確認できます
            </Text>
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: spacing[1],
  },
  backButtonText: {
    ...textStyles.body,
    color: colors.primary[600],
  },
  headerTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  periodSelector: {
    flexDirection: 'row',
    padding: spacing[4],
    backgroundColor: colors.white,
    gap: spacing[2],
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary[500],
  },
  periodButtonText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  periodButtonTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: spacing[4],
  },
  summaryCard: {
    marginBottom: spacing[4],
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  summaryTitle: {
    ...textStyles.label,
    color: colors.neutral[500],
    marginBottom: spacing[2],
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: spacing[4],
  },
  summaryDetails: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing[4],
  },
  summaryDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDetailValue: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  summaryDetailLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  infoCard: {
    marginBottom: spacing[4],
  },
  infoTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  infoLabel: {
    ...textStyles.body,
    color: colors.neutral[600],
  },
  infoValue: {
    ...textStyles.body,
    color: colors.neutral[900],
    fontWeight: '500',
  },
  sectionTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  dayCard: {
    marginBottom: spacing[2],
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  dayDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dayDateText: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  daySales: {
    ...textStyles.label,
    color: colors.neutral[900],
    fontWeight: '600',
  },
  dayBar: {
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  dayBarFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
  },
  comingSoon: {
    ...textStyles.body,
    color: colors.neutral[500],
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  bottomPadding: {
    height: spacing[8],
  },
});
