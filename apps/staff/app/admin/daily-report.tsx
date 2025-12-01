import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, Badge, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import {
  dailyReportService,
  saleService,
  visitService,
  reservationService,
  staffService,
  type DailyReport,
  type Staff,
} from '@beauty-pos/api';

interface DailySummary {
  totalSales: number;
  saleCount: number;
  visitCount: number;
  reservationCount: number;
  newCustomers: number;
  averageSale: number;
  cashSales: number;
  cardSales: number;
  otherSales: number;
}

interface StaffSummary {
  staffId: string;
  staffName: string;
  sales: number;
  saleCount: number;
  visitCount: number;
}

export default function DailyReportScreen() {
  const { company, store, staff: currentStaff } = useAuthStore();
  const { showToast } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [staffSummaries, setStaffSummaries] = useState<StaffSummary[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editMemo, setEditMemo] = useState('');
  const [editWeather, setEditWeather] = useState('');
  const [editCashBalance, setEditCashBalance] = useState('');

  const loadDailyData = useCallback(async () => {
    if (!company?.id || !store?.id) return;

    try {
      setIsLoading(true);

      // Load staff list
      const staffList = await staffService.getByStore(store.id).catch(() => []);
      setAllStaff(staffList);

      // Load sales data for the date
      const [salesData, visitsData, reservationsData] = await Promise.all([
        saleService.getDailySales(store.id, selectedDate).catch(() => []),
        visitService.getTodayVisits(store.id).catch(() => []),
        reservationService.getByDateRange(store.id, selectedDate, selectedDate).catch(() => []),
      ]);

      // Calculate summary
      const totalSales = salesData.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
      const cashSales = salesData
        .filter((s: any) => s.payments?.some((p: any) => p.method === 'cash'))
        .reduce((sum: number, s: any) => {
          const cashPayment = s.payments?.find((p: any) => p.method === 'cash');
          return sum + (cashPayment?.amount || 0);
        }, 0);
      const cardSales = salesData
        .filter((s: any) => s.payments?.some((p: any) => p.method === 'credit_card'))
        .reduce((sum: number, s: any) => {
          const cardPayment = s.payments?.find((p: any) => p.method === 'credit_card');
          return sum + (cardPayment?.amount || 0);
        }, 0);

      setSummary({
        totalSales,
        saleCount: salesData.length,
        visitCount: visitsData.length,
        reservationCount: reservationsData.length,
        newCustomers: 0, // Would need additional query
        averageSale: salesData.length > 0 ? totalSales / salesData.length : 0,
        cashSales,
        cardSales,
        otherSales: totalSales - cashSales - cardSales,
      });

      // Calculate staff summaries
      const staffMap = new Map<string, StaffSummary>();
      for (const sale of salesData) {
        const staffId = sale.staff_id || 'unknown';
        const existing = staffMap.get(staffId);
        const staffInfo = staffList.find((s) => s.id === staffId);
        if (existing) {
          existing.sales += sale.total || 0;
          existing.saleCount += 1;
        } else {
          staffMap.set(staffId, {
            staffId,
            staffName: staffInfo?.name || '不明',
            sales: sale.total || 0,
            saleCount: 1,
            visitCount: 0,
          });
        }
      }

      // Add visit counts
      for (const visit of visitsData) {
        const staffId = visit.staff_id || 'unknown';
        const existing = staffMap.get(staffId);
        if (existing) {
          existing.visitCount += 1;
        } else {
          const staffInfo = staffList.find((s) => s.id === staffId);
          staffMap.set(staffId, {
            staffId,
            staffName: staffInfo?.name || '不明',
            sales: 0,
            saleCount: 0,
            visitCount: 1,
          });
        }
      }

      setStaffSummaries(Array.from(staffMap.values()).sort((a, b) => b.sales - a.sales));

      // Load existing daily report
      try {
        const existingReport = await dailyReportService.getByDate(store.id, selectedDate);
        if (existingReport) {
          setReport(existingReport);
          setEditMemo(existingReport.memo || '');
          setEditWeather(existingReport.weather || '');
          setEditCashBalance(existingReport.cash_balance?.toString() || '');
        } else {
          setReport(null);
          setEditMemo('');
          setEditWeather('');
          setEditCashBalance('');
        }
      } catch {
        setReport(null);
      }
    } catch (error) {
      console.error('Failed to load daily data:', error);
      showToast('データの読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, store?.id, selectedDate, showToast]);

  useEffect(() => {
    loadDailyData();
  }, [loadDailyData]);

  const handleSaveReport = async () => {
    if (!store?.id || !currentStaff?.id) return;

    try {
      const reportData = {
        store_id: store.id,
        report_date: selectedDate,
        memo: editMemo,
        weather: editWeather,
        cash_balance: editCashBalance ? parseFloat(editCashBalance) : null,
        total_sales: summary?.totalSales || 0,
        sale_count: summary?.saleCount || 0,
        visit_count: summary?.visitCount || 0,
        created_by: currentStaff.id,
      };

      if (report) {
        await dailyReportService.update(report.id, reportData);
      } else {
        await dailyReportService.create(reportData);
      }

      setIsEditModalVisible(false);
      showToast('日報を保存しました', 'success');
      loadDailyData();
    } catch (error) {
      console.error('Failed to save report:', error);
      showToast('保存に失敗しました', 'error');
    }
  };

  const navigateDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${days[date.getDay()]}）`;
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

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
        <Text style={styles.headerTitle}>日報</Text>
        <Button size="sm" variant="outline" onPress={() => setIsEditModalVisible(true)}>
          編集
        </Button>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => navigateDate(-1)} style={styles.dateNavButton}>
          <Text style={styles.dateNavButtonText}>← 前日</Text>
        </TouchableOpacity>
        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          {isToday && (
            <Badge colorScheme="primary" size="sm">
              今日
            </Badge>
          )}
        </View>
        <TouchableOpacity
          onPress={() => navigateDate(1)}
          style={styles.dateNavButton}
          disabled={isToday}
        >
          <Text style={[styles.dateNavButtonText, isToday && styles.dateNavButtonDisabled]}>
            翌日 →
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Sales Summary */}
        <Card variant="elevated" size="lg" style={styles.summaryCard}>
          <Text style={styles.cardTitle}>売上サマリー</Text>

          <View style={styles.mainSalesRow}>
            <Text style={styles.mainSalesLabel}>総売上</Text>
            <Text style={styles.mainSalesValue}>{formatCurrency(summary?.totalSales || 0)}</Text>
          </View>

          <View style={styles.salesGrid}>
            <View style={styles.salesGridItem}>
              <Text style={styles.salesGridValue}>{summary?.saleCount || 0}</Text>
              <Text style={styles.salesGridLabel}>会計数</Text>
            </View>
            <View style={styles.salesGridItem}>
              <Text style={styles.salesGridValue}>{summary?.visitCount || 0}</Text>
              <Text style={styles.salesGridLabel}>来店数</Text>
            </View>
            <View style={styles.salesGridItem}>
              <Text style={styles.salesGridValue}>{formatCurrency(summary?.averageSale || 0)}</Text>
              <Text style={styles.salesGridLabel}>客単価</Text>
            </View>
          </View>
        </Card>

        {/* Payment Breakdown */}
        <Card variant="outlined" size="md" style={styles.card}>
          <Text style={styles.cardTitle}>決済種別内訳</Text>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>現金</Text>
            <Text style={styles.paymentValue}>{formatCurrency(summary?.cashSales || 0)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>クレジットカード</Text>
            <Text style={styles.paymentValue}>{formatCurrency(summary?.cardSales || 0)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>その他</Text>
            <Text style={styles.paymentValue}>{formatCurrency(summary?.otherSales || 0)}</Text>
          </View>
        </Card>

        {/* Staff Performance */}
        <Card variant="outlined" size="md" style={styles.card}>
          <Text style={styles.cardTitle}>スタッフ別実績</Text>

          {staffSummaries.length > 0 ? (
            staffSummaries.map((staff, index) => (
              <View key={staff.staffId} style={styles.staffRow}>
                <View style={styles.staffRank}>
                  <Text style={styles.staffRankText}>{index + 1}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{staff.staffName}</Text>
                  <Text style={styles.staffStats}>
                    {staff.saleCount}件 / {staff.visitCount}来店
                  </Text>
                </View>
                <Text style={styles.staffSales}>{formatCurrency(staff.sales)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>データがありません</Text>
          )}
        </Card>

        {/* Daily Report Details */}
        <Card variant="outlined" size="md" style={styles.card}>
          <Text style={styles.cardTitle}>日報詳細</Text>

          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>天気</Text>
            <Text style={styles.reportValue}>{report?.weather || '-'}</Text>
          </View>
          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>レジ金残高</Text>
            <Text style={styles.reportValue}>
              {report?.cash_balance ? formatCurrency(report.cash_balance) : '-'}
            </Text>
          </View>

          {report?.memo && (
            <View style={styles.memoContainer}>
              <Text style={styles.memoLabel}>メモ</Text>
              <Text style={styles.memoText}>{report.memo}</Text>
            </View>
          )}

          {!report && <Text style={styles.emptyText}>日報が作成されていません</Text>}
        </Card>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>日報編集</Text>
            <TouchableOpacity onPress={handleSaveReport}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>天気</Text>
              <View style={styles.weatherSelector}>
                {['晴れ', '曇り', '雨', '雪'].map((w) => (
                  <TouchableOpacity
                    key={w}
                    style={[styles.weatherOption, editWeather === w && styles.weatherOptionActive]}
                    onPress={() => setEditWeather(w)}
                  >
                    <Text
                      style={[
                        styles.weatherText,
                        editWeather === w && styles.weatherTextActive,
                      ]}
                    >
                      {w === '晴れ' ? '☀️' : w === '曇り' ? '☁️' : w === '雨' ? '☔' : '❄️'} {w}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>レジ金残高</Text>
              <TextInput
                style={styles.input}
                value={editCashBalance}
                onChangeText={setEditCashBalance}
                placeholder="0"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>メモ・特記事項</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editMemo}
                onChangeText={setEditMemo}
                placeholder="今日の出来事、引き継ぎ事項などを入力"
                placeholderTextColor={colors.neutral[400]}
                multiline
                numberOfLines={6}
              />
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </Modal>
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
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  dateNavButton: {
    padding: spacing[2],
  },
  dateNavButtonText: {
    ...textStyles.label,
    color: colors.primary[600],
  },
  dateNavButtonDisabled: {
    color: colors.neutral[300],
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dateText: {
    ...textStyles.h6,
    color: colors.neutral[900],
  },
  content: {
    flex: 1,
    padding: spacing[4],
  },
  summaryCard: {
    marginBottom: spacing[4],
  },
  card: {
    marginBottom: spacing[4],
  },
  cardTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[3],
  },
  mainSalesRow: {
    alignItems: 'center',
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
    marginBottom: spacing[3],
  },
  mainSalesLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  mainSalesValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary[600],
  },
  salesGrid: {
    flexDirection: 'row',
  },
  salesGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  salesGridValue: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  salesGridLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  paymentLabel: {
    ...textStyles.body,
    color: colors.neutral[600],
  },
  paymentValue: {
    ...textStyles.body,
    color: colors.neutral[900],
    fontWeight: '600',
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  staffRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  staffRankText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    ...textStyles.body,
    color: colors.neutral[900],
    fontWeight: '500',
  },
  staffStats: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  staffSales: {
    ...textStyles.h6,
    color: colors.primary[600],
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  reportLabel: {
    ...textStyles.body,
    color: colors.neutral[600],
  },
  reportValue: {
    ...textStyles.body,
    color: colors.neutral[900],
    fontWeight: '500',
  },
  memoContainer: {
    marginTop: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
  },
  memoLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  memoText: {
    ...textStyles.body,
    color: colors.neutral[700],
    lineHeight: 22,
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  modalCancel: {
    ...textStyles.body,
    color: colors.neutral[600],
  },
  modalTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  modalSave: {
    ...textStyles.body,
    color: colors.primary[600],
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing[4],
  },
  formGroup: {
    marginBottom: spacing[4],
  },
  label: {
    ...textStyles.label,
    color: colors.neutral[700],
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    ...textStyles.body,
    color: colors.neutral[900],
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  weatherSelector: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  weatherOption: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  weatherOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  weatherText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  weatherTextActive: {
    color: colors.primary[600],
  },
});
