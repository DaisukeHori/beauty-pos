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
import {
  staffService,
  saleService,
  visitService,
  staffPerformanceService,
  type Staff,
  type StaffPerformance,
} from '@beauty-pos/api';

type Period = 'today' | 'week' | 'month';

interface StaffSalesData {
  staff: Staff;
  totalSales: number;
  saleCount: number;
  visitCount: number;
  averageSale: number;
  menuSales: number;
  productSales: number;
}

export default function StaffSalesScreen() {
  const { company, store } = useAuthStore();
  const { showToast } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');
  const [staffSalesData, setStaffSalesData] = useState<StaffSalesData[]>([]);
  const [totalStoreSales, setTotalStoreSales] = useState(0);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  const getDateRange = useCallback((p: Period) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    switch (p) {
      case 'today':
        return { start: todayStr, end: todayStr };
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 6);
        return { start: weekAgo.toISOString().split('T')[0], end: todayStr };
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: monthStart.toISOString().split('T')[0], end: todayStr };
      }
    }
  }, []);

  const loadStaffSales = useCallback(async () => {
    if (!company?.id || !store?.id) return;

    try {
      setIsLoading(true);

      // Load all staff
      const staffList = await staffService.getByStore(store.id);

      // Get date range
      const { start, end } = getDateRange(period);

      // Load sales data - aggregate by staff
      const salesByStaff = new Map<string, StaffSalesData>();

      // Initialize with all staff
      for (const staff of staffList) {
        salesByStaff.set(staff.id, {
          staff,
          totalSales: 0,
          saleCount: 0,
          visitCount: 0,
          averageSale: 0,
          menuSales: 0,
          productSales: 0,
        });
      }

      // Try to get performance data from staffPerformanceService
      try {
        const performances = await staffPerformanceService.getByStore(store.id, {
          startDate: start,
          endDate: end,
        });

        for (const perf of performances) {
          const existing = salesByStaff.get(perf.staff_id);
          if (existing) {
            existing.totalSales = perf.total_sales || 0;
            existing.saleCount = perf.sale_count || 0;
            existing.visitCount = perf.visit_count || 0;
            existing.averageSale = perf.sale_count ? (perf.total_sales || 0) / perf.sale_count : 0;
          }
        }
      } catch {
        // Fall back to manual calculation
        // Load sales for date range
        for (let d = new Date(start); d <= new Date(end); d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          try {
            const daySales = await saleService.getDailySales(store.id, dateStr);
            for (const sale of daySales) {
              const staffId = sale.staff_id;
              if (staffId && salesByStaff.has(staffId)) {
                const data = salesByStaff.get(staffId)!;
                data.totalSales += sale.total || 0;
                data.saleCount += 1;

                // Count menu vs product sales
                for (const item of sale.items || []) {
                  if (item.item_type === 'product') {
                    data.productSales += item.subtotal || 0;
                  } else {
                    data.menuSales += item.subtotal || 0;
                  }
                }
              }
            }
          } catch {
            // Skip failed dates
          }
        }

        // Calculate averages
        for (const data of salesByStaff.values()) {
          data.averageSale = data.saleCount > 0 ? data.totalSales / data.saleCount : 0;
        }
      }

      // Sort by total sales
      const sortedData = Array.from(salesByStaff.values()).sort(
        (a, b) => b.totalSales - a.totalSales
      );

      setStaffSalesData(sortedData);
      setTotalStoreSales(sortedData.reduce((sum, d) => sum + d.totalSales, 0));
    } catch (error) {
      console.error('Failed to load staff sales:', error);
      showToast('データの読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, store?.id, period, getDateRange, showToast]);

  useEffect(() => {
    loadStaffSales();
  }, [loadStaffSales]);

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const getPercentage = (amount: number) => {
    if (totalStoreSales === 0) return 0;
    return Math.round((amount / totalStoreSales) * 100);
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <Badge colorScheme="warning" variant="solid" size="sm">
            1位
          </Badge>
        );
      case 1:
        return (
          <Badge colorScheme="neutral" variant="solid" size="sm">
            2位
          </Badge>
        );
      case 2:
        return (
          <Badge colorScheme="info" variant="subtle" size="sm">
            3位
          </Badge>
        );
      default:
        return null;
    }
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
        <Text style={styles.headerTitle}>スタッフ別売上</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['today', 'week', 'month'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text
              style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}
            >
              {p === 'today' ? '今日' : p === 'week' ? '今週' : '今月'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Total Summary */}
      <Card variant="elevated" size="lg" style={styles.totalCard}>
        <Text style={styles.totalLabel}>店舗合計売上</Text>
        <Text style={styles.totalValue}>{formatCurrency(totalStoreSales)}</Text>
        <Text style={styles.totalSubtext}>
          {staffSalesData.reduce((sum, d) => sum + d.saleCount, 0)}件の会計 /{' '}
          {staffSalesData.reduce((sum, d) => sum + d.visitCount, 0)}件の来店
        </Text>
      </Card>

      <ScrollView style={styles.content}>
        {/* Staff Rankings */}
        {staffSalesData.map((data, index) => (
          <TouchableOpacity
            key={data.staff.id}
            onPress={() =>
              setSelectedStaff(selectedStaff === data.staff.id ? null : data.staff.id)
            }
          >
            <Card
              variant={selectedStaff === data.staff.id ? 'elevated' : 'outlined'}
              size="md"
              style={[styles.staffCard, index < 3 && styles.topThreeCard]}
            >
              <View style={styles.staffHeader}>
                <View style={styles.staffRank}>
                  <Text style={styles.staffRankText}>{index + 1}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <View style={styles.staffNameRow}>
                    <Text style={styles.staffName}>{data.staff.name}</Text>
                    {getRankBadge(index)}
                  </View>
                  <Text style={styles.staffRole}>
                    {data.staff.role === 'stylist'
                      ? 'スタイリスト'
                      : data.staff.role === 'manager'
                      ? 'マネージャー'
                      : 'アシスタント'}
                  </Text>
                </View>
                <View style={styles.staffSalesInfo}>
                  <Text style={styles.staffSalesValue}>{formatCurrency(data.totalSales)}</Text>
                  <Text style={styles.staffSalesPercent}>{getPercentage(data.totalSales)}%</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${getPercentage(data.totalSales)}%`,
                      backgroundColor:
                        index === 0
                          ? colors.warning[500]
                          : index === 1
                          ? colors.neutral[500]
                          : index === 2
                          ? colors.info[500]
                          : colors.primary[400],
                    },
                  ]}
                />
              </View>

              {/* Expanded Details */}
              {selectedStaff === data.staff.id && (
                <View style={styles.staffDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>会計数</Text>
                    <Text style={styles.detailValue}>{data.saleCount}件</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>来店数</Text>
                    <Text style={styles.detailValue}>{data.visitCount}件</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>客単価</Text>
                    <Text style={styles.detailValue}>{formatCurrency(data.averageSale)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>施術売上</Text>
                    <Text style={styles.detailValue}>{formatCurrency(data.menuSales)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>物販売上</Text>
                    <Text style={styles.detailValue}>{formatCurrency(data.productSales)}</Text>
                  </View>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ))}

        {staffSalesData.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>スタッフデータがありません</Text>
          </View>
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
  totalCard: {
    margin: spacing[4],
    marginBottom: 0,
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  totalLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary[600],
    marginBottom: spacing[1],
  },
  totalSubtext: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  content: {
    flex: 1,
    padding: spacing[4],
  },
  staffCard: {
    marginBottom: spacing[3],
  },
  topThreeCard: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  staffRankText: {
    ...textStyles.h6,
    color: colors.neutral[600],
  },
  staffInfo: {
    flex: 1,
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  staffName: {
    ...textStyles.h6,
    color: colors.neutral[900],
  },
  staffRole: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  staffSalesInfo: {
    alignItems: 'flex-end',
  },
  staffSalesValue: {
    ...textStyles.h5,
    color: colors.primary[600],
  },
  staffSalesPercent: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.full,
    marginTop: spacing[3],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  staffDetails: {
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  detailLabel: {
    ...textStyles.body,
    color: colors.neutral[500],
  },
  detailValue: {
    ...textStyles.body,
    color: colors.neutral[900],
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  emptyText: {
    ...textStyles.body,
    color: colors.neutral[500],
  },
  bottomPadding: {
    height: spacing[8],
  },
});
