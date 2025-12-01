import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Card, Button, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore, formatCurrency } from '@beauty-pos/core';
import {
  subscriptionService,
  SubscriptionPlan,
  Subscription,
  Invoice,
  PaymentMethod,
  BillingCycle,
  PlanType,
} from '@beauty-pos/api';

export default function SubscriptionScreen() {
  const { company, staff } = useAuthStore();
  const { showToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle>('monthly');
  const [processing, setProcessing] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  const isOwner = staff?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!company?.id) return;
    try {
      const [subscriptionData, invoicesData, paymentMethodsData] = await Promise.all([
        subscriptionService.getSubscription(company.id),
        subscriptionService.getInvoices(company.id),
        subscriptionService.getPaymentMethods(company.id),
      ]);
      setPlans(subscriptionService.getPlans());
      setSubscription(subscriptionData);
      setInvoices(invoicesData);
      setPaymentMethods(paymentMethodsData);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      showToast('データの読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [company?.id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getCurrentPlan = (): SubscriptionPlan | undefined => {
    return plans.find(p => p.id === subscription?.plan);
  };

  const handleUpgrade = async (planId: PlanType) => {
    if (!company?.id || !isOwner) return;

    setProcessing(true);
    try {
      const { url } = await subscriptionService.createCheckoutSession(
        company.id,
        planId,
        selectedBillingCycle
      );
      // Open Stripe Checkout
      await Linking.openURL(url);
      setShowPlans(false);
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      showToast('決済画面の表示に失敗しました', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = () => {
    if (!company?.id || !isOwner) return;

    Alert.alert(
      'サブスクリプションをキャンセル',
      '現在の期間終了後にサブスクリプションがキャンセルされます。それまでは引き続きご利用いただけます。',
      [
        { text: '戻る', style: 'cancel' },
        {
          text: 'キャンセルする',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              await subscriptionService.cancelSubscription(company.id, false);
              showToast('サブスクリプションをキャンセルしました', 'success');
              loadData();
            } catch (error) {
              showToast('キャンセルに失敗しました', 'error');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleResumeSubscription = async () => {
    if (!company?.id || !isOwner) return;

    setProcessing(true);
    try {
      await subscriptionService.resumeSubscription(company.id);
      showToast('サブスクリプションを再開しました', 'success');
      loadData();
    } catch (error) {
      showToast('再開に失敗しました', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
      active: { label: '有効', color: colors.success[700], bgColor: colors.success[100] },
      trialing: { label: 'トライアル中', color: colors.primary[700], bgColor: colors.primary[100] },
      past_due: { label: '支払い遅延', color: colors.error[700], bgColor: colors.error[100] },
      canceled: { label: 'キャンセル済み', color: colors.neutral[700], bgColor: colors.neutral[200] },
      paused: { label: '一時停止中', color: colors.warning[700], bgColor: colors.warning[100] },
    };
    const config = statusConfig[status] || statusConfig.active;
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

  const renderPlanCard = (plan: SubscriptionPlan, isCurrentPlan: boolean) => {
    const price = selectedBillingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    const periodLabel = selectedBillingCycle === 'monthly' ? '/月' : '/年';
    const isDowngrade = subscription?.plan && plans.findIndex(p => p.id === plan.id) < plans.findIndex(p => p.id === subscription.plan);

    return (
      <Card
        key={plan.id}
        variant={isCurrentPlan ? 'elevated' : 'outlined'}
        size="md"
        style={[styles.planCard, isCurrentPlan && styles.currentPlanCard]}
      >
        {isCurrentPlan && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>現在のプラン</Text>
          </View>
        )}
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planDescription}>{plan.description}</Text>

        <View style={styles.priceContainer}>
          {price === 0 ? (
            <Text style={styles.freePrice}>無料</Text>
          ) : (
            <>
              <Text style={styles.priceAmount}>{formatCurrency(price)}</Text>
              <Text style={styles.pricePeriod}>{periodLabel}</Text>
            </>
          )}
        </View>

        {selectedBillingCycle === 'yearly' && plan.priceYearly > 0 && (
          <Text style={styles.yearlyDiscount}>
            年払いで{formatCurrency(plan.priceMonthly * 12 - plan.priceYearly)}お得
          </Text>
        )}

        <View style={styles.featureList}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.limitsSection}>
          <Text style={styles.limitsTitle}>制限</Text>
          <View style={styles.limitItem}>
            <Text style={styles.limitLabel}>スタッフ数</Text>
            <Text style={styles.limitValue}>
              {plan.limits.maxStaff === -1 ? '無制限' : `${plan.limits.maxStaff}名`}
            </Text>
          </View>
          <View style={styles.limitItem}>
            <Text style={styles.limitLabel}>店舗数</Text>
            <Text style={styles.limitValue}>
              {plan.limits.maxStores === -1 ? '無制限' : `${plan.limits.maxStores}店舗`}
            </Text>
          </View>
          <View style={styles.limitItem}>
            <Text style={styles.limitLabel}>月間予約数</Text>
            <Text style={styles.limitValue}>
              {plan.limits.maxReservationsPerMonth === -1 ? '無制限' : `${plan.limits.maxReservationsPerMonth}件`}
            </Text>
          </View>
        </View>

        {!isCurrentPlan && isOwner && (
          <Button
            fullWidth
            variant={isDowngrade ? 'outline' : 'solid'}
            onPress={() => handleUpgrade(plan.id)}
            isLoading={processing}
            style={styles.upgradeButton}
          >
            {isDowngrade ? 'ダウングレード' : price === 0 ? '選択する' : 'アップグレード'}
          </Button>
        )}
      </Card>
    );
  };

  const renderInvoice = (invoice: Invoice) => {
    const statusColors: Record<string, string> = {
      paid: colors.success[600],
      open: colors.warning[600],
      draft: colors.neutral[500],
      void: colors.neutral[400],
      uncollectible: colors.error[600],
    };
    const statusLabels: Record<string, string> = {
      paid: '支払済み',
      open: '未払い',
      draft: '下書き',
      void: '無効',
      uncollectible: '回収不能',
    };

    return (
      <TouchableOpacity
        key={invoice.id}
        style={styles.invoiceItem}
        onPress={() => invoice.pdf_url && Linking.openURL(invoice.pdf_url)}
      >
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceNumber}>{invoice.number}</Text>
          <Text style={styles.invoiceDate}>
            {new Date(invoice.period_start).toLocaleDateString('ja-JP')} -
            {new Date(invoice.period_end).toLocaleDateString('ja-JP')}
          </Text>
        </View>
        <View style={styles.invoiceRight}>
          <Text style={styles.invoiceAmount}>{formatCurrency(invoice.amount)}</Text>
          <Text style={[styles.invoiceStatus, { color: statusColors[invoice.status] }]}>
            {statusLabels[invoice.status]}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'プラン・お支払い' }} />
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  const currentPlan = getCurrentPlan();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'プラン・お支払い',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← 戻る</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!isOwner && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              プラン変更にはオーナー権限が必要です
            </Text>
          </View>
        )}

        {/* Current Subscription */}
        <Card variant="elevated" size="lg" style={styles.currentSubscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <Text style={styles.sectionTitle}>現在のプラン</Text>
            {subscription && getStatusBadge(subscription.status)}
          </View>

          <View style={styles.currentPlanInfo}>
            <Text style={styles.currentPlanName}>{currentPlan?.name || 'フリープラン'}</Text>
            {currentPlan && currentPlan.priceMonthly > 0 && (
              <Text style={styles.currentPlanPrice}>
                {formatCurrency(subscription?.billing_cycle === 'yearly'
                  ? currentPlan.priceYearly
                  : currentPlan.priceMonthly)}
                /{subscription?.billing_cycle === 'yearly' ? '年' : '月'}
              </Text>
            )}
          </View>

          {subscription && subscription.plan !== 'free' && (
            <View style={styles.periodInfo}>
              <Text style={styles.periodLabel}>現在の請求期間</Text>
              <Text style={styles.periodDates}>
                {new Date(subscription.current_period_start).toLocaleDateString('ja-JP')} -
                {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
              </Text>
              {subscription.cancel_at_period_end && (
                <Text style={styles.cancelNotice}>
                  ※ 期間終了後にキャンセルされます
                </Text>
              )}
            </View>
          )}

          <View style={styles.actionButtons}>
            <Button
              variant="outline"
              onPress={() => setShowPlans(true)}
              style={styles.changePlanButton}
            >
              プランを変更
            </Button>
            {subscription && subscription.plan !== 'free' && !subscription.cancel_at_period_end && (
              <TouchableOpacity onPress={handleCancelSubscription}>
                <Text style={styles.cancelLink}>キャンセル</Text>
              </TouchableOpacity>
            )}
            {subscription?.cancel_at_period_end && (
              <TouchableOpacity onPress={handleResumeSubscription}>
                <Text style={styles.resumeLink}>キャンセルを取り消す</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* Payment Methods */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>お支払い方法</Text>
            {isOwner && (
              <TouchableOpacity>
                <Text style={styles.addLink}>+ 追加</Text>
              </TouchableOpacity>
            )}
          </View>

          <Card variant="outlined" size="md">
            {paymentMethods.length === 0 ? (
              <Text style={styles.noPaymentText}>
                支払い方法が登録されていません
              </Text>
            ) : (
              paymentMethods.map((method, index) => (
                <View
                  key={method.id}
                  style={[
                    styles.paymentMethodItem,
                    index < paymentMethods.length - 1 && styles.paymentMethodBorder,
                  ]}
                >
                  <View style={styles.cardIcon}>
                    <Text style={styles.cardBrand}>
                      {method.card.brand === 'visa' ? 'VISA' :
                       method.card.brand === 'mastercard' ? 'MC' :
                       method.card.brand === 'amex' ? 'AMEX' :
                       method.card.brand.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardNumber}>•••• {method.card.last4}</Text>
                    <Text style={styles.cardExpiry}>
                      有効期限: {method.card.exp_month}/{method.card.exp_year}
                    </Text>
                  </View>
                  {method.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>デフォルト</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </Card>
        </View>

        {/* Invoice History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>請求履歴</Text>
          <Card variant="outlined" size="md">
            {invoices.length === 0 ? (
              <Text style={styles.noInvoicesText}>
                請求履歴がありません
              </Text>
            ) : (
              invoices.map((invoice, index) => (
                <View key={invoice.id}>
                  {renderInvoice(invoice)}
                  {index < invoices.length - 1 && <View style={styles.invoiceDivider} />}
                </View>
              ))
            )}
          </Card>
        </View>

        {/* Plan Selection Modal Content */}
        {showPlans && (
          <View style={styles.plansOverlay}>
            <View style={styles.plansContainer}>
              <View style={styles.plansHeader}>
                <Text style={styles.plansTitle}>プランを選択</Text>
                <TouchableOpacity onPress={() => setShowPlans(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Billing Cycle Toggle */}
              <View style={styles.billingCycleToggle}>
                <TouchableOpacity
                  style={[
                    styles.cycleButton,
                    selectedBillingCycle === 'monthly' && styles.cycleButtonActive,
                  ]}
                  onPress={() => setSelectedBillingCycle('monthly')}
                >
                  <Text style={[
                    styles.cycleButtonText,
                    selectedBillingCycle === 'monthly' && styles.cycleButtonTextActive,
                  ]}>
                    月払い
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.cycleButton,
                    selectedBillingCycle === 'yearly' && styles.cycleButtonActive,
                  ]}
                  onPress={() => setSelectedBillingCycle('yearly')}
                >
                  <Text style={[
                    styles.cycleButtonText,
                    selectedBillingCycle === 'yearly' && styles.cycleButtonTextActive,
                  ]}>
                    年払い（2ヶ月無料）
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.plansScroll} horizontal showsHorizontalScrollIndicator={false}>
                {plans.map(plan => renderPlanCard(plan, plan.id === subscription?.plan))}
              </ScrollView>
            </View>
          </View>
        )}
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
    backgroundColor: colors.neutral[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  backButton: {
    paddingHorizontal: spacing[2],
  },
  backButtonText: {
    ...textStyles.body,
    color: colors.primary[500],
  },
  warningBanner: {
    backgroundColor: colors.warning[50],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.warning[200],
  },
  warningText: {
    ...textStyles.bodySmall,
    color: colors.warning[700],
    textAlign: 'center',
  },
  currentSubscriptionCard: {
    marginBottom: spacing[6],
    padding: spacing[5],
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  sectionTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    ...textStyles.caption,
    fontWeight: '600',
  },
  currentPlanInfo: {
    marginBottom: spacing[4],
  },
  currentPlanName: {
    ...textStyles.h3,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  currentPlanPrice: {
    ...textStyles.body,
    color: colors.primary[600],
  },
  periodInfo: {
    backgroundColor: colors.neutral[100],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  periodLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  periodDates: {
    ...textStyles.body,
    color: colors.neutral[700],
  },
  cancelNotice: {
    ...textStyles.caption,
    color: colors.error[500],
    marginTop: spacing[2],
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  changePlanButton: {
    flex: 1,
    marginRight: spacing[4],
  },
  cancelLink: {
    ...textStyles.body,
    color: colors.error[500],
  },
  resumeLink: {
    ...textStyles.body,
    color: colors.primary[500],
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
  addLink: {
    ...textStyles.body,
    color: colors.primary[500],
  },
  noPaymentText: {
    ...textStyles.body,
    color: colors.neutral[400],
    textAlign: 'center',
    padding: spacing[6],
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  paymentMethodBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  cardIcon: {
    width: 48,
    height: 32,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  cardBrand: {
    ...textStyles.caption,
    fontWeight: '700',
    color: colors.neutral[600],
  },
  cardInfo: {
    flex: 1,
  },
  cardNumber: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  cardExpiry: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  defaultBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  defaultBadgeText: {
    ...textStyles.caption,
    color: colors.primary[700],
  },
  noInvoicesText: {
    ...textStyles.body,
    color: colors.neutral[400],
    textAlign: 'center',
    padding: spacing[6],
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginHorizontal: spacing[4],
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  invoiceDate: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  invoiceStatus: {
    ...textStyles.caption,
    marginTop: spacing[0.5],
  },
  // Plans overlay
  plansOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  plansContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    width: '95%',
    maxHeight: '90%',
    padding: spacing[4],
  },
  plansHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  plansTitle: {
    ...textStyles.h4,
    color: colors.neutral[900],
  },
  closeButton: {
    fontSize: 24,
    color: colors.neutral[400],
    padding: spacing[2],
  },
  billingCycleToggle: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    padding: spacing[1],
    marginBottom: spacing[4],
  },
  cycleButton: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cycleButtonActive: {
    backgroundColor: colors.white,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cycleButtonText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  cycleButtonTextActive: {
    color: colors.neutral[900],
  },
  plansScroll: {
    flexGrow: 0,
  },
  planCard: {
    width: 280,
    marginRight: spacing[3],
    padding: spacing[4],
  },
  currentPlanCard: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  currentBadge: {
    position: 'absolute',
    top: -10,
    right: spacing[4],
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.full,
  },
  currentBadgeText: {
    ...textStyles.caption,
    color: colors.white,
    fontWeight: '600',
  },
  planName: {
    ...textStyles.h5,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  planDescription: {
    ...textStyles.bodySmall,
    color: colors.neutral[500],
    marginBottom: spacing[3],
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing[1],
  },
  freePrice: {
    ...textStyles.h3,
    color: colors.success[600],
  },
  priceAmount: {
    ...textStyles.h3,
    color: colors.neutral[900],
  },
  pricePeriod: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginLeft: spacing[1],
  },
  yearlyDiscount: {
    ...textStyles.caption,
    color: colors.success[600],
    marginBottom: spacing[3],
  },
  featureList: {
    marginBottom: spacing[4],
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: spacing[2],
  },
  featureCheck: {
    color: colors.success[500],
    marginRight: spacing[2],
    fontWeight: '700',
  },
  featureText: {
    ...textStyles.bodySmall,
    color: colors.neutral[700],
    flex: 1,
  },
  limitsSection: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  limitsTitle: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[2],
  },
  limitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  limitLabel: {
    ...textStyles.caption,
    color: colors.neutral[600],
  },
  limitValue: {
    ...textStyles.caption,
    color: colors.neutral[900],
    fontWeight: '600',
  },
  upgradeButton: {
    marginTop: 'auto',
  },
});
