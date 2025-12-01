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
import { saleService, visitService, customerService, staffService } from '@beauty-pos/api';

interface MonthlyData {
  month: string; // YYYY-MM
  totalSales: number;
  saleCount: number;
  visitCount: number;
  newCustomers: number;
  averageSale: number;
}

interface MonthlyStats {
  currentMonth: MonthlyData;
  previousMonth: MonthlyData;
  yearToDate: {
    totalSales: number;
    saleCount: number;
    visitCount: number;
    newCustomers: number;
  };
  topMenus: { name: string; count: number; revenue: number }[];
  topProducts: { name: string; count: number; revenue: number }[];
}

export default function MonthlyReportScreen() {
  const { company, store } = useAuthStore();
  const { showToast } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [dailyData, setDailyData] = useState<{ date: string; sales: number }[]>([]);

  const loadMonthlyData = useCallback(async () => {
    if (!company?.id || !store?.id) return;

    try {
      setIsLoading(true);

      const currentMonthStart = new Date(selectedYear, selectedMonth - 1, 1);
      const currentMonthEnd = new Date(selectedYear, selectedMonth, 0);
      const previousMonthStart = new Date(selectedYear, selectedMonth - 2, 1);
      const previousMonthEnd = new Date(selectedYear, selectedMonth - 1, 0);
      const yearStart = new Date(selectedYear, 0, 1);

      // Load current month data day by day
      const dailySalesData: { date: string; sales: number }[] = [];
      let currentMonthTotal = 0;
      let currentMonthSaleCount = 0;
      const menuCounts = new Map<string, { count: number; revenue: number }>();
      const productCounts = new Map<string, { count: number; revenue: number }>();

      for (let d = new Date(currentMonthStart); d <= currentMonthEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        try {
          const daySales = await saleService.getDailySales(store.id, dateStr);
          const dayTotal = daySales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
          dailySalesData.push({ date: dateStr, sales: dayTotal });
          currentMonthTotal += dayTotal;
          currentMonthSaleCount += daySales.length;

          // Count items
          for (const sale of daySales) {
            for (const item of sale.items || []) {
              const name = item.name;
              if (item.item_type === 'product') {
                const existing = productCounts.get(name) || { count: 0, revenue: 0 };
                productCounts.set(name, {
                  count: existing.count + (item.quantity || 1),
                  revenue: existing.revenue + (item.subtotal || 0),
                });
              } else {
                const existing = menuCounts.get(name) || { count: 0, revenue: 0 };
                menuCounts.set(name, {
                  count: existing.count + (item.quantity || 1),
                  revenue: existing.revenue + (item.subtotal || 0),
                });
              }
            }
          }
        } catch {
          dailySalesData.push({ date: dateStr, sales: 0 });
        }
      }

      setDailyData(dailySalesData);

      // Load previous month data
      let previousMonthTotal = 0;
      let previousMonthSaleCount = 0;

      for (
        let d = new Date(previousMonthStart);
        d <= previousMonthEnd;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().split('T')[0];
        try {
          const daySales = await saleService.getDailySales(store.id, dateStr);
          previousMonthTotal += daySales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
          previousMonthSaleCount += daySales.length;
        } catch {
          // Skip failed dates
        }
      }

      // Sort and get top items
      const topMenus = Array.from(menuCounts.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const topProducts = Array.from(productCounts.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Calculate year to date (simplified)
      let ytdSales = currentMonthTotal + previousMonthTotal;
      let ytdSaleCount = currentMonthSaleCount + previousMonthSaleCount;

      setStats({
        currentMonth: {
          month: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
          totalSales: currentMonthTotal,
          saleCount: currentMonthSaleCount,
          visitCount: 0, // Would need visit data
          newCustomers: 0, // Would need customer data
          averageSale: currentMonthSaleCount > 0 ? currentMonthTotal / currentMonthSaleCount : 0,
        },
        previousMonth: {
          month: `${selectedYear}-${String(selectedMonth - 1).padStart(2, '0')}`,
          totalSales: previousMonthTotal,
          saleCount: previousMonthSaleCount,
          visitCount: 0,
          newCustomers: 0,
          averageSale:
            previousMonthSaleCount > 0 ? previousMonthTotal / previousMonthSaleCount : 0,
        },
        yearToDate: {
          totalSales: ytdSales,
          saleCount: ytdSaleCount,
          visitCount: 0,
          newCustomers: 0,
        },
        topMenus,
        topProducts,
      });
    } catch (error) {
      console.error('Failed to load monthly data:', error);
      showToast('データの読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, store?.id, selectedYear, selectedMonth, showToast]);

  useEffect(() => {
    loadMonthlyData();
  }, [loadMonthlyData]);

  const navigateMonth = (direction: number) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const getChangePercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const renderMiniChart = () => {
    if (dailyData.length === 0) return null;

    const maxSales = Math.max(...dailyData.map((d) => d.sales), 1);

    return (
      <View style={styles.chartContainer}>
        {dailyData.map((day, index) => (
          <View key={day.date} style={styles.chartBarContainer}>
            <View
              style={[
                styles.chartBar,
                {
                  height: `${Math.max(2, (day.sales / maxSales) * 100)}%`,
                },
              ]}
            />
            {index % 5 === 0 && (
              <Text style={styles.chartLabel}>
                {new Date(day.date).getDate()}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const isCurrentMonth =
    selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth() + 1;

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
        <Text style={styles.headerTitle}>月次レポート</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthNavButton}>
          <Text style={styles.monthNavButtonText}>← 前月</Text>
        </TouchableOpacity>
        <View style={styles.monthDisplay}>
          <Text style={styles.monthText}>
            {selectedYear}年{selectedMonth}月
          </Text>
          {isCurrentMonth && (
            <Badge colorScheme="primary" size="sm">
              今月
            </Badge>
          )}
        </View>
        <TouchableOpacity
          onPress={() => navigateMonth(1)}
          style={styles.monthNavButton}
          disabled={isCurrentMonth}
        >
          <Text
            style={[styles.monthNavButtonText, isCurrentMonth && styles.monthNavButtonDisabled]}
          >
            翌月 →
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Monthly Summary */}
        <Card variant="elevated" size="lg" style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>月間売上</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(stats?.currentMonth.totalSales || 0)}
          </Text>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>前月比</Text>
            {(() => {
              const change = getChangePercentage(
                stats?.currentMonth.totalSales || 0,
                stats?.previousMonth.totalSales || 0
              );
              return (
                <Badge
                  colorScheme={change >= 0 ? 'success' : 'error'}
                  variant="solid"
                  size="sm"
                >
                  {change >= 0 ? '+' : ''}
                  {change}%
                </Badge>
              );
            })()}
          </View>
        </Card>

        {/* Daily Chart */}
        <Card variant="outlined" size="md" style={styles.card}>
          <Text style={styles.cardTitle}>日別売上推移</Text>
          {renderMiniChart()}
        </Card>

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <Card variant="outlined" size="md" style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{stats?.currentMonth.saleCount || 0}</Text>
            <Text style={styles.kpiLabel}>会計数</Text>
          </Card>
          <Card variant="outlined" size="md" style={styles.kpiCard}>
            <Text style={styles.kpiValue}>
              {formatCurrency(stats?.currentMonth.averageSale || 0)}
            </Text>
            <Text style={styles.kpiLabel}>客単価</Text>
          </Card>
        </View>

        {/* Previous Month Comparison */}
        <Card variant="outlined" size="md" style={styles.card}>
          <Text style={styles.cardTitle}>前月との比較</Text>

          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonItemLabel}>売上</Text>
            <View style={styles.comparisonValues}>
              <Text style={styles.comparisonPrevious}>
                {formatCurrency(stats?.previousMonth.totalSales || 0)}
              </Text>
              <Text style={styles.comparisonArrow}>→</Text>
              <Text style={styles.comparisonCurrent}>
                {formatCurrency(stats?.currentMonth.totalSales || 0)}
              </Text>
            </View>
          </View>

          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonItemLabel}>会計数</Text>
            <View style={styles.comparisonValues}>
              <Text style={styles.comparisonPrevious}>{stats?.previousMonth.saleCount || 0}件</Text>
              <Text style={styles.comparisonArrow}>→</Text>
              <Text style={styles.comparisonCurrent}>{stats?.currentMonth.saleCount || 0}件</Text>
            </View>
          </View>

          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonItemLabel}>客単価</Text>
            <View style={styles.comparisonValues}>
              <Text style={styles.comparisonPrevious}>
                {formatCurrency(stats?.previousMonth.averageSale || 0)}
              </Text>
              <Text style={styles.comparisonArrow}>→</Text>
              <Text style={styles.comparisonCurrent}>
                {formatCurrency(stats?.currentMonth.averageSale || 0)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Top Menus */}
        <Card variant="outlined" size="md" style={styles.card}>
          <Text style={styles.cardTitle}>売上上位メニュー</Text>

          {stats?.topMenus.map((menu, index) => (
            <View key={menu.name} style={styles.rankingItem}>
              <View style={styles.rankingRank}>
                <Text style={styles.rankingRankText}>{index + 1}</Text>
              </View>
              <View style={styles.rankingInfo}>
                <Text style={styles.rankingName}>{menu.name}</Text>
                <Text style={styles.rankingCount}>{menu.count}件</Text>
              </View>
              <Text style={styles.rankingValue}>{formatCurrency(menu.revenue)}</Text>
            </View>
          ))}

          {(!stats?.topMenus || stats.topMenus.length === 0) && (
            <Text style={styles.emptyText}>データがありません</Text>
          )}
        </Card>

        {/* Top Products */}
        <Card variant="outlined" size="md" style={styles.card}>
          <Text style={styles.cardTitle}>売上上位商品</Text>

          {stats?.topProducts.map((product, index) => (
            <View key={product.name} style={styles.rankingItem}>
              <View style={styles.rankingRank}>
                <Text style={styles.rankingRankText}>{index + 1}</Text>
              </View>
              <View style={styles.rankingInfo}>
                <Text style={styles.rankingName}>{product.name}</Text>
                <Text style={styles.rankingCount}>{product.count}個</Text>
              </View>
              <Text style={styles.rankingValue}>{formatCurrency(product.revenue)}</Text>
            </View>
          ))}

          {(!stats?.topProducts || stats.topProducts.length === 0) && (
            <Text style={styles.emptyText}>データがありません</Text>
          )}
        </Card>

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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  monthNavButton: {
    padding: spacing[2],
  },
  monthNavButtonText: {
    ...textStyles.label,
    color: colors.primary[600],
  },
  monthNavButtonDisabled: {
    color: colors.neutral[300],
  },
  monthDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  monthText: {
    ...textStyles.h6,
    color: colors.neutral[900],
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
  summaryLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary[600],
    marginBottom: spacing[3],
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  comparisonLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  card: {
    marginBottom: spacing[4],
  },
  cardTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[3],
  },
  chartContainer: {
    flexDirection: 'row',
    height: 100,
    alignItems: 'flex-end',
    gap: 2,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
  },
  chartBar: {
    width: '100%',
    backgroundColor: colors.primary[400],
    borderRadius: 2,
    minHeight: 2,
  },
  chartLabel: {
    ...textStyles.caption,
    fontSize: 9,
    color: colors.neutral[400],
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  kpiValue: {
    ...textStyles.h4,
    color: colors.neutral[900],
    marginBottom: spacing[0.5],
  },
  kpiLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  comparisonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  comparisonItemLabel: {
    ...textStyles.body,
    color: colors.neutral[600],
  },
  comparisonValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  comparisonPrevious: {
    ...textStyles.body,
    color: colors.neutral[400],
  },
  comparisonArrow: {
    ...textStyles.body,
    color: colors.neutral[300],
  },
  comparisonCurrent: {
    ...textStyles.body,
    color: colors.neutral[900],
    fontWeight: '600',
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  rankingRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  rankingRankText: {
    ...textStyles.caption,
    color: colors.neutral[600],
    fontWeight: '600',
  },
  rankingInfo: {
    flex: 1,
  },
  rankingName: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  rankingCount: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  rankingValue: {
    ...textStyles.label,
    color: colors.primary[600],
    fontWeight: '600',
  },
  emptyText: {
    ...textStyles.body,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  bottomPadding: {
    height: spacing[8],
  },
});
