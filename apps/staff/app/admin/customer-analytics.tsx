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
  customerService,
  visitService,
  saleService,
  type Customer,
} from '@beauty-pos/api';

interface CustomerStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  activeCustomers: number; // Visited in last 3 months
  dormantCustomers: number; // No visit in 3+ months
  averageVisitFrequency: number; // days between visits
  averageLifetimeValue: number;
}

interface CustomerSegment {
  name: string;
  count: number;
  color: string;
  description: string;
}

interface TopCustomer {
  customer: Customer;
  totalSpent: number;
  visitCount: number;
  lastVisit: string | null;
}

export default function CustomerAnalyticsScreen() {
  const { company, store } = useAuthStore();
  const { showToast } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [atRiskCustomers, setAtRiskCustomers] = useState<TopCustomer[]>([]);

  const loadAnalytics = useCallback(async () => {
    if (!company?.id || !store?.id) return;

    try {
      setIsLoading(true);

      // Load all customers
      const customers = await customerService.getByCompany(company.id);

      const now = new Date();
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate stats
      let newThisMonth = 0;
      let activeCount = 0;
      let dormantCount = 0;
      const customerSales: Map<string, { total: number; visits: number; lastVisit: string | null }> =
        new Map();

      // Initialize customer data
      for (const customer of customers) {
        customerSales.set(customer.id, { total: 0, visits: 0, lastVisit: null });

        // Check if new this month
        if (customer.created_at && new Date(customer.created_at) >= thisMonthStart) {
          newThisMonth++;
        }
      }

      // Load visit data for all customers (simplified - in production would use aggregation)
      for (const customer of customers) {
        try {
          const visits = await visitService.getByCustomer(customer.id);
          const sales = await saleService.getByCustomer(customer.id);

          const totalSpent = sales.reduce((sum, s) => sum + (s.total || 0), 0);
          const lastVisit =
            visits.length > 0
              ? visits.sort(
                  (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
                )[0].visit_date
              : null;

          customerSales.set(customer.id, {
            total: totalSpent,
            visits: visits.length,
            lastVisit,
          });

          // Check active/dormant
          if (lastVisit) {
            if (new Date(lastVisit) >= threeMonthsAgo) {
              activeCount++;
            } else {
              dormantCount++;
            }
          }
        } catch {
          // Skip failed customers
        }
      }

      // Calculate averages
      const customersWithVisits = Array.from(customerSales.values()).filter((c) => c.visits > 0);
      const avgLifetimeValue =
        customersWithVisits.length > 0
          ? customersWithVisits.reduce((sum, c) => sum + c.total, 0) / customersWithVisits.length
          : 0;

      setStats({
        totalCustomers: customers.length,
        newCustomersThisMonth: newThisMonth,
        activeCustomers: activeCount,
        dormantCustomers: dormantCount,
        averageVisitFrequency: 30, // Would need more complex calculation
        averageLifetimeValue: avgLifetimeValue,
      });

      // Create segments
      const segmentData: CustomerSegment[] = [
        {
          name: 'プラチナ会員',
          count: Array.from(customerSales.values()).filter((c) => c.total >= 500000).length,
          color: colors.primary[500],
          description: '累計50万円以上',
        },
        {
          name: 'ゴールド会員',
          count: Array.from(customerSales.values()).filter(
            (c) => c.total >= 300000 && c.total < 500000
          ).length,
          color: colors.warning[500],
          description: '累計30万円以上',
        },
        {
          name: 'シルバー会員',
          count: Array.from(customerSales.values()).filter(
            (c) => c.total >= 100000 && c.total < 300000
          ).length,
          color: colors.neutral[400],
          description: '累計10万円以上',
        },
        {
          name: 'レギュラー会員',
          count: Array.from(customerSales.values()).filter((c) => c.total < 100000).length,
          color: colors.neutral[300],
          description: '累計10万円未満',
        },
      ];
      setSegments(segmentData);

      // Get top customers by spending
      const sortedBySpend = customers
        .map((customer) => ({
          customer,
          ...(customerSales.get(customer.id) || { total: 0, visits: 0, lastVisit: null }),
        }))
        .filter((c) => c.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map((c) => ({
          customer: c.customer,
          totalSpent: c.total,
          visitCount: c.visits,
          lastVisit: c.lastVisit,
        }));
      setTopCustomers(sortedBySpend);

      // Get at-risk customers (high value but dormant)
      const atRisk = customers
        .map((customer) => ({
          customer,
          ...(customerSales.get(customer.id) || { total: 0, visits: 0, lastVisit: null }),
        }))
        .filter((c) => {
          if (!c.lastVisit || c.total < 50000) return false;
          const lastVisitDate = new Date(c.lastVisit);
          const twoMonthsAgo = new Date();
          twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
          return lastVisitDate < twoMonthsAgo;
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map((c) => ({
          customer: c.customer,
          totalSpent: c.total,
          visitCount: c.visits,
          lastVisit: c.lastVisit,
        }));
      setAtRiskCustomers(atRisk);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      showToast('データの読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, store?.id, showToast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getDaysSince = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
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
        <Text style={styles.headerTitle}>顧客分析</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Overview Stats */}
        <View style={styles.statsGrid}>
          <Card variant="elevated" size="md" style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.totalCustomers || 0}</Text>
            <Text style={styles.statLabel}>総顧客数</Text>
          </Card>
          <Card variant="elevated" size="md" style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success[600] }]}>
              +{stats?.newCustomersThisMonth || 0}
            </Text>
            <Text style={styles.statLabel}>今月新規</Text>
          </Card>
          <Card variant="elevated" size="md" style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary[600] }]}>
              {stats?.activeCustomers || 0}
            </Text>
            <Text style={styles.statLabel}>アクティブ</Text>
          </Card>
          <Card variant="elevated" size="md" style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.warning[600] }]}>
              {stats?.dormantCustomers || 0}
            </Text>
            <Text style={styles.statLabel}>休眠顧客</Text>
          </Card>
        </View>

        {/* Customer Segments */}
        <Card variant="outlined" size="lg" style={styles.card}>
          <Text style={styles.cardTitle}>顧客セグメント</Text>

          {segments.map((segment) => (
            <View key={segment.name} style={styles.segmentRow}>
              <View style={[styles.segmentDot, { backgroundColor: segment.color }]} />
              <View style={styles.segmentInfo}>
                <Text style={styles.segmentName}>{segment.name}</Text>
                <Text style={styles.segmentDescription}>{segment.description}</Text>
              </View>
              <Text style={styles.segmentCount}>{segment.count}人</Text>
            </View>
          ))}
        </Card>

        {/* Average LTV */}
        <Card variant="outlined" size="md" style={styles.card}>
          <Text style={styles.cardTitle}>顧客生涯価値 (LTV)</Text>
          <View style={styles.ltvContainer}>
            <Text style={styles.ltvValue}>{formatCurrency(stats?.averageLifetimeValue || 0)}</Text>
            <Text style={styles.ltvLabel}>平均顧客単価</Text>
          </View>
        </Card>

        {/* Top Customers */}
        <Card variant="outlined" size="lg" style={styles.card}>
          <Text style={styles.cardTitle}>上位顧客 (累計売上)</Text>

          {topCustomers.map((data, index) => (
            <TouchableOpacity
              key={data.customer.id}
              style={styles.customerRow}
              onPress={() => router.push(`/customer-detail?id=${data.customer.id}`)}
            >
              <View style={styles.customerRank}>
                <Text style={styles.customerRankText}>{index + 1}</Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{data.customer.name}</Text>
                <Text style={styles.customerStats}>
                  {data.visitCount}回来店 / 最終: {formatDate(data.lastVisit)}
                </Text>
              </View>
              <Text style={styles.customerValue}>{formatCurrency(data.totalSpent)}</Text>
            </TouchableOpacity>
          ))}

          {topCustomers.length === 0 && (
            <Text style={styles.emptyText}>データがありません</Text>
          )}
        </Card>

        {/* At Risk Customers */}
        <Card variant="filled" size="lg" style={[styles.card, styles.atRiskCard]}>
          <Text style={[styles.cardTitle, { color: colors.warning[700] }]}>
            要フォロー顧客
          </Text>
          <Text style={styles.atRiskSubtitle}>
            高価値顧客で2ヶ月以上来店なし
          </Text>

          {atRiskCustomers.map((data) => {
            const daysSince = getDaysSince(data.lastVisit);
            return (
              <TouchableOpacity
                key={data.customer.id}
                style={styles.atRiskRow}
                onPress={() => router.push(`/customer-detail?id=${data.customer.id}`)}
              >
                <View style={styles.atRiskInfo}>
                  <Text style={styles.atRiskName}>{data.customer.name}</Text>
                  <Text style={styles.atRiskStats}>
                    累計 {formatCurrency(data.totalSpent)} / {data.visitCount}回来店
                  </Text>
                </View>
                <Badge colorScheme="warning" variant="solid" size="sm">
                  {daysSince}日
                </Badge>
              </TouchableOpacity>
            );
          })}

          {atRiskCustomers.length === 0 && (
            <Text style={styles.noAtRiskText}>要フォロー顧客はいません</Text>
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
  content: {
    flex: 1,
    padding: spacing[4],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  statLabel: {
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
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  segmentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing[3],
  },
  segmentInfo: {
    flex: 1,
  },
  segmentName: {
    ...textStyles.body,
    color: colors.neutral[900],
    fontWeight: '500',
  },
  segmentDescription: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  segmentCount: {
    ...textStyles.h6,
    color: colors.neutral[700],
  },
  ltvContainer: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  ltvValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary[600],
    marginBottom: spacing[1],
  },
  ltvLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  customerRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  customerRankText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    ...textStyles.body,
    color: colors.neutral[900],
    fontWeight: '500',
  },
  customerStats: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  customerValue: {
    ...textStyles.h6,
    color: colors.primary[600],
  },
  atRiskCard: {
    backgroundColor: colors.warning[50],
  },
  atRiskSubtitle: {
    ...textStyles.caption,
    color: colors.warning[600],
    marginBottom: spacing[3],
  },
  atRiskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.warning[100],
  },
  atRiskInfo: {
    flex: 1,
  },
  atRiskName: {
    ...textStyles.body,
    color: colors.neutral[900],
    fontWeight: '500',
  },
  atRiskStats: {
    ...textStyles.caption,
    color: colors.neutral[600],
  },
  noAtRiskText: {
    ...textStyles.body,
    color: colors.success[600],
    textAlign: 'center',
    paddingVertical: spacing[4],
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
