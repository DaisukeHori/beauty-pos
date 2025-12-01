import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, Badge, Modal, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore, formatCurrency, usePermissions } from '@beauty-pos/core';
import { saleService, type SaleWithDetails } from '@beauty-pos/api';

type TabType = 'completed' | 'voided';

export default function SalesHistoryScreen() {
  const { staff, company, store } = useAuthStore();
  const { showToast } = useUIStore();
  const { hasPermission } = usePermissions();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<TabType>('completed');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [completedSales, setCompletedSales] = useState<SaleWithDetails[]>([]);
  const [voidedSales, setVoidedSales] = useState<SaleWithDetails[]>([]);

  // Void modal state
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailSale, setDetailSale] = useState<SaleWithDetails | null>(null);

  const canVoidSale = hasPermission('void_sales');

  const loadSales = useCallback(async () => {
    if (!store?.id) return;

    try {
      setIsLoading(true);

      const [completed, voided] = await Promise.all([
        saleService.getDailySales(store.id, selectedDate),
        saleService.getVoidedSales(store.id, selectedDate, selectedDate),
      ]);

      setCompletedSales(completed.filter(s => s.status === 'completed'));
      setVoidedSales(voided);
    } catch (error) {
      console.error('Failed to load sales:', error);
      showToast('売上データの読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [store?.id, selectedDate, showToast]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const handleVoidSale = async () => {
    if (!selectedSale || !voidReason.trim() || !staff?.id) {
      Alert.alert('エラー', '取消理由を入力してください');
      return;
    }

    if (!canVoidSale) {
      Alert.alert('エラー', '売上取消の権限がありません');
      return;
    }

    setIsVoiding(true);

    try {
      await saleService.void(selectedSale.id, voidReason.trim(), staff.id);
      showToast('売上を取り消しました（赤伝票発行）', 'success');
      setShowVoidModal(false);
      setSelectedSale(null);
      setVoidReason('');
      loadSales();
    } catch (error) {
      console.error('Failed to void sale:', error);
      Alert.alert('エラー', '売上の取消に失敗しました');
    } finally {
      setIsVoiding(false);
    }
  };

  const openVoidModal = (sale: SaleWithDetails) => {
    if (!canVoidSale) {
      Alert.alert('権限エラー', '売上取消の権限がありません');
      return;
    }
    setSelectedSale(sale);
    setShowVoidModal(true);
  };

  const openDetailModal = (sale: SaleWithDetails) => {
    setDetailSale(sale);
    setShowDetailModal(true);
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getTotalForDay = (sales: SaleWithDetails[]) => {
    return sales.reduce((sum, s) => sum + s.total, 0);
  };

  const renderSaleCard = (sale: SaleWithDetails) => {
    const isVoided = sale.status === 'voided';

    return (
      <Card
        key={sale.id}
        variant={isVoided ? 'outlined' : 'elevated'}
        size="sm"
        style={[styles.saleCard, isVoided && styles.voidedCard]}
      >
        <TouchableOpacity onPress={() => openDetailModal(sale)}>
          <View style={styles.saleHeader}>
            <View style={styles.saleInfo}>
              <Text style={styles.saleNumber}>{sale.sale_number}</Text>
              <Text style={styles.saleTime}>{formatTime(sale.sale_date)}</Text>
            </View>
            <View style={styles.saleRight}>
              <Text style={[styles.saleTotal, isVoided && styles.voidedText]}>
                {isVoided ? '-' : ''}{formatCurrency(sale.total)}
              </Text>
              {isVoided && (
                <Badge colorScheme="error" size="sm">取消済</Badge>
              )}
            </View>
          </View>

          <View style={styles.saleDetails}>
            {sale.customer && (
              <Text style={styles.customerName}>
                {sale.customer.last_name} {sale.customer.first_name} 様
              </Text>
            )}
            <Text style={styles.itemCount}>
              {sale.items?.length || 0}点 / {sale.payments?.map(p => {
                const labels: Record<string, string> = {
                  cash: '現金',
                  card: 'カード',
                  electronic_money: '電子マネー',
                  qr_payment: 'QR決済',
                  credit: '売掛',
                };
                return labels[p.payment_method] || p.payment_method;
              }).join(', ')}
            </Text>
          </View>

          {isVoided && sale.void_reason && (
            <View style={styles.voidInfo}>
              <Text style={styles.voidReasonLabel}>取消理由:</Text>
              <Text style={styles.voidReasonText}>{sale.void_reason}</Text>
              {sale.voided_at && (
                <Text style={styles.voidedAt}>
                  取消日時: {new Date(sale.voided_at).toLocaleString('ja-JP')}
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        {!isVoided && canVoidSale && (
          <TouchableOpacity
            style={styles.voidButton}
            onPress={() => openVoidModal(sale)}
          >
            <Text style={styles.voidButtonText}>取消</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  const currentSales = selectedTab === 'completed' ? completedSales : voidedSales;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>売上履歴・赤伝票</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.dateNavButton} onPress={() => changeDate(-1)}>
          <Text style={styles.dateNavText}>◀</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateNavButton} onPress={() => changeDate(1)}>
          <Text style={styles.dateNavText}>▶</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.todayButton}
          onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
        >
          <Text style={styles.todayButtonText}>今日</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'completed' && styles.tabActive]}
          onPress={() => setSelectedTab('completed')}
        >
          <Text style={[styles.tabText, selectedTab === 'completed' && styles.tabTextActive]}>
            売上 ({completedSales.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'voided' && styles.tabActive]}
          onPress={() => setSelectedTab('voided')}
        >
          <Text style={[styles.tabText, selectedTab === 'voided' && styles.tabTextActive]}>
            赤伝票 ({voidedSales.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>
          {selectedTab === 'completed' ? '売上合計' : '取消合計'}
        </Text>
        <Text style={[styles.summaryValue, selectedTab === 'voided' && styles.voidedText]}>
          {selectedTab === 'voided' ? '-' : ''}{formatCurrency(getTotalForDay(currentSales))}
        </Text>
      </View>

      {/* Sales List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentSales.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>
              {selectedTab === 'completed' ? '📊' : '📋'}
            </Text>
            <Text style={styles.emptyText}>
              {selectedTab === 'completed'
                ? 'この日の売上はありません'
                : 'この日の赤伝票はありません'}
            </Text>
          </View>
        ) : (
          currentSales.map(renderSaleCard)
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Void Confirmation Modal */}
      <Modal
        visible={showVoidModal}
        onClose={() => {
          setShowVoidModal(false);
          setSelectedSale(null);
          setVoidReason('');
        }}
        title="売上取消（赤伝票発行）"
        size="md"
      >
        <View style={styles.voidModalContent}>
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              この操作は取り消せません。売上を取り消すと、ポイントの付与・使用も取り消されます。
            </Text>
          </View>

          {selectedSale && (
            <View style={styles.targetSale}>
              <Text style={styles.targetLabel}>取消対象</Text>
              <Text style={styles.targetNumber}>{selectedSale.sale_number}</Text>
              <Text style={styles.targetAmount}>{formatCurrency(selectedSale.total)}</Text>
            </View>
          )}

          <View style={styles.reasonInput}>
            <Text style={styles.reasonLabel}>取消理由 *</Text>
            <TextInput
              style={styles.reasonTextInput}
              value={voidReason}
              onChangeText={setVoidReason}
              placeholder="例: お客様都合によるキャンセル"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.voidActions}>
            <Button
              variant="outline"
              onPress={() => {
                setShowVoidModal(false);
                setSelectedSale(null);
                setVoidReason('');
              }}
              style={styles.cancelButton}
            >
              キャンセル
            </Button>
            <Button
              colorScheme="error"
              onPress={handleVoidSale}
              isLoading={isVoiding}
              isDisabled={!voidReason.trim()}
            >
              取消を確定
            </Button>
          </View>
        </View>
      </Modal>

      {/* Sale Detail Modal */}
      <Modal
        visible={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setDetailSale(null);
        }}
        title="売上詳細"
        size="lg"
      >
        {detailSale && (
          <ScrollView style={styles.detailModalContent}>
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.detailNumber}>{detailSale.sale_number}</Text>
                <Text style={styles.detailDate}>
                  {new Date(detailSale.sale_date).toLocaleString('ja-JP')}
                </Text>
              </View>
              {detailSale.status === 'voided' && (
                <Badge colorScheme="error" size="md">取消済</Badge>
              )}
            </View>

            {detailSale.customer && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>お客様</Text>
                <Text style={styles.detailCustomer}>
                  {detailSale.customer.last_name} {detailSale.customer.first_name} 様
                </Text>
              </View>
            )}

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>明細</Text>
              {detailSale.items?.map((item, index) => (
                <View key={index} style={styles.detailItem}>
                  <View style={styles.detailItemLeft}>
                    <Text style={styles.detailItemName}>{item.name}</Text>
                    <Text style={styles.detailItemQty}>x{item.quantity}</Text>
                  </View>
                  <Text style={styles.detailItemPrice}>
                    {formatCurrency(item.subtotal)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>支払い</Text>
              {detailSale.payments?.map((payment, index) => {
                const labels: Record<string, string> = {
                  cash: '現金',
                  card: 'クレジットカード',
                  electronic_money: '電子マネー',
                  qr_payment: 'QR決済',
                  credit: '売掛',
                };
                return (
                  <View key={index} style={styles.detailPayment}>
                    <Text style={styles.detailPaymentMethod}>
                      {labels[payment.payment_method] || payment.payment_method}
                    </Text>
                    <Text style={styles.detailPaymentAmount}>
                      {formatCurrency(payment.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.detailTotals}>
              <View style={styles.detailTotalRow}>
                <Text style={styles.detailTotalLabel}>小計</Text>
                <Text style={styles.detailTotalValue}>
                  {formatCurrency(detailSale.subtotal)}
                </Text>
              </View>
              {detailSale.discount_total > 0 && (
                <View style={styles.detailTotalRow}>
                  <Text style={styles.detailTotalLabel}>割引</Text>
                  <Text style={[styles.detailTotalValue, styles.discountText]}>
                    -{formatCurrency(detailSale.discount_total)}
                  </Text>
                </View>
              )}
              <View style={styles.detailTotalRow}>
                <Text style={styles.detailTotalLabel}>消費税</Text>
                <Text style={styles.detailTotalValue}>
                  {formatCurrency(detailSale.tax_total)}
                </Text>
              </View>
              <View style={[styles.detailTotalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>合計</Text>
                <Text style={styles.grandTotalValue}>
                  {formatCurrency(detailSale.total)}
                </Text>
              </View>
            </View>

            {detailSale.points_used > 0 && (
              <View style={styles.detailPoints}>
                <Text style={styles.pointsUsedLabel}>使用ポイント:</Text>
                <Text style={styles.pointsUsedValue}>
                  -{detailSale.points_used} pt
                </Text>
              </View>
            )}
            {detailSale.points_earned > 0 && (
              <View style={styles.detailPoints}>
                <Text style={styles.pointsEarnedLabel}>獲得ポイント:</Text>
                <Text style={styles.pointsEarnedValue}>
                  +{detailSale.points_earned} pt
                </Text>
              </View>
            )}

            {detailSale.status === 'voided' && detailSale.void_reason && (
              <View style={styles.voidDetailSection}>
                <Text style={styles.voidDetailTitle}>取消情報</Text>
                <Text style={styles.voidDetailReason}>{detailSale.void_reason}</Text>
                {detailSale.voided_at && (
                  <Text style={styles.voidDetailDate}>
                    取消日時: {new Date(detailSale.voided_at).toLocaleString('ja-JP')}
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        )}
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[3],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  dateNavButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
  },
  dateNavText: {
    ...textStyles.label,
    color: colors.neutral[700],
  },
  dateDisplay: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
  },
  dateText: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  todayButton: {
    marginLeft: spacing[4],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
  },
  todayButtonText: {
    ...textStyles.labelSm,
    color: colors.primary[600],
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    ...textStyles.label,
    color: colors.neutral[500],
  },
  tabTextActive: {
    color: colors.primary[600],
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.white,
    marginBottom: spacing[2],
  },
  summaryLabel: {
    ...textStyles.body,
    color: colors.neutral[600],
  },
  summaryValue: {
    ...textStyles.h4,
    color: colors.neutral[900],
  },
  voidedText: {
    color: colors.error[500],
  },
  content: {
    flex: 1,
    padding: spacing[4],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing[3],
  },
  emptyText: {
    ...textStyles.body,
    color: colors.neutral[400],
  },
  saleCard: {
    marginBottom: spacing[3],
  },
  voidedCard: {
    backgroundColor: colors.error[50],
    borderColor: colors.error[200],
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  saleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleNumber: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  saleTime: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    marginLeft: spacing[2],
  },
  saleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  saleTotal: {
    ...textStyles.h6,
    color: colors.neutral[900],
  },
  saleDetails: {
    marginBottom: spacing[2],
  },
  customerName: {
    ...textStyles.bodySm,
    color: colors.neutral[700],
    marginBottom: spacing[0.5],
  },
  itemCount: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  voidInfo: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.error[100],
  },
  voidReasonLabel: {
    ...textStyles.caption,
    color: colors.error[600],
  },
  voidReasonText: {
    ...textStyles.bodySm,
    color: colors.error[700],
    marginTop: spacing[0.5],
  },
  voidedAt: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[1],
  },
  voidButton: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    backgroundColor: colors.error[50],
    borderRadius: borderRadius.md,
  },
  voidButtonText: {
    ...textStyles.caption,
    color: colors.error[600],
  },
  bottomPadding: {
    height: spacing[8],
  },
  // Void Modal
  voidModalContent: {
    padding: spacing[2],
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning[50],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  warningIcon: {
    fontSize: 20,
    marginRight: spacing[2],
  },
  warningText: {
    flex: 1,
    ...textStyles.bodySm,
    color: colors.warning[700],
  },
  targetSale: {
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  targetLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  targetNumber: {
    ...textStyles.label,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  targetAmount: {
    ...textStyles.h4,
    color: colors.neutral[900],
  },
  reasonInput: {
    marginBottom: spacing[4],
  },
  reasonLabel: {
    ...textStyles.label,
    color: colors.neutral[700],
    marginBottom: spacing[2],
  },
  reasonTextInput: {
    height: 100,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    textAlignVertical: 'top',
    ...textStyles.body,
  },
  voidActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  cancelButton: {
    flex: 1,
  },
  // Detail Modal
  detailModalContent: {
    maxHeight: 500,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  detailNumber: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  detailDate: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    marginTop: spacing[1],
  },
  detailSection: {
    marginBottom: spacing[4],
  },
  detailSectionTitle: {
    ...textStyles.labelSm,
    color: colors.neutral[500],
    marginBottom: spacing[2],
  },
  detailCustomer: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[50],
  },
  detailItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItemName: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  detailItemQty: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    marginLeft: spacing[2],
  },
  detailItemPrice: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  detailPayment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  detailPaymentMethod: {
    ...textStyles.bodySm,
    color: colors.neutral[700],
  },
  detailPaymentAmount: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  detailTotals: {
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    marginBottom: spacing[3],
  },
  detailTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  detailTotalLabel: {
    ...textStyles.bodySm,
    color: colors.neutral[600],
  },
  detailTotalValue: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  discountText: {
    color: colors.error[500],
  },
  grandTotalRow: {
    paddingTop: spacing[2],
    marginTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  grandTotalLabel: {
    ...textStyles.h6,
    color: colors.neutral[900],
  },
  grandTotalValue: {
    ...textStyles.h5,
    color: colors.primary[600],
  },
  detailPoints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  pointsUsedLabel: {
    ...textStyles.bodySm,
    color: colors.neutral[600],
  },
  pointsUsedValue: {
    ...textStyles.bodySm,
    color: colors.error[500],
  },
  pointsEarnedLabel: {
    ...textStyles.bodySm,
    color: colors.neutral[600],
  },
  pointsEarnedValue: {
    ...textStyles.bodySm,
    color: colors.success[600],
  },
  voidDetailSection: {
    marginTop: spacing[4],
    padding: spacing[3],
    backgroundColor: colors.error[50],
    borderRadius: borderRadius.lg,
  },
  voidDetailTitle: {
    ...textStyles.label,
    color: colors.error[700],
    marginBottom: spacing[2],
  },
  voidDetailReason: {
    ...textStyles.body,
    color: colors.error[900],
    marginBottom: spacing[1],
  },
  voidDetailDate: {
    ...textStyles.caption,
    color: colors.error[600],
  },
});
