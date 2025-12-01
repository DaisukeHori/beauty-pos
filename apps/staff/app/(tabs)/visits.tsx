import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Avatar, Badge, Button, Modal, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore, useRealtimeVisits } from '@beauty-pos/core';
import { visitService, reservationService, customerService, type VisitWithDetails } from '@beauty-pos/api';

type VisitStatus = 'checked_in' | 'in_service' | 'completed' | 'cancelled' | 'no_show';

const statusConfig: Record<VisitStatus, { label: string; colorScheme: 'warning' | 'success' | 'info' | 'error' }> = {
  checked_in: { label: '待機中', colorScheme: 'warning' },
  in_service: { label: '施術中', colorScheme: 'success' },
  completed: { label: '完了', colorScheme: 'info' },
  cancelled: { label: 'キャンセル', colorScheme: 'error' },
  no_show: { label: '無断キャンセル', colorScheme: 'error' },
};

interface PendingReservation {
  id: string;
  customerId: string | null;
  customerName: string;
  staffId: string | null;
  staffName: string;
  startTime: string;
  menus: string[];
}

interface CustomerSearchResult {
  id: string;
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  phone?: string;
  totalVisits: number;
}

export default function VisitsScreen() {
  const { staff, store, company } = useAuthStore();
  const { showToast } = useUIStore();

  const [visits, setVisits] = useState<VisitWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'checked_in' | 'in_service'>('all');

  // Check-in modal state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInMode, setCheckInMode] = useState<'menu' | 'reservation' | 'customer' | 'walkin'>('menu');
  const [pendingReservations, setPendingReservations] = useState<PendingReservation[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Realtime updates
  useRealtimeVisits({
    companyId: company?.id || '',
    storeId: store?.id || '',
    enabled: !!(company?.id && store?.id),
    onInsert: (newVisit) => {
      setVisits(prev => [...prev, newVisit as VisitWithDetails]);
    },
    onUpdate: (updatedVisit) => {
      setVisits(prev => prev.map(v =>
        v.id === updatedVisit.id ? { ...v, ...updatedVisit } as VisitWithDetails : v
      ));
    },
    onDelete: (deletedVisit) => {
      setVisits(prev => prev.filter(v => v.id !== deletedVisit.id));
    },
  });

  // Load visits
  const loadVisits = useCallback(async () => {
    if (!company?.id || !store?.id) return;

    try {
      const todayVisits = await visitService.getToday(company.id, store.id);
      setVisits(todayVisits);
    } catch (error) {
      console.error('Failed to load visits:', error);
      showToast('来店情報の取得に失敗しました', 'error');
    }
  }, [company?.id, store?.id, showToast]);

  // Load pending reservations
  const loadPendingReservations = useCallback(async () => {
    if (!company?.id || !store?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const reservations = await reservationService.getByDate(company.id, store.id, today);

      // Filter reservations that haven't been checked in yet
      const pending = reservations
        .filter(r => r.status === 'confirmed' || r.status === 'pending')
        .map(r => ({
          id: r.id,
          customerId: r.customer_id,
          customerName: r.customer
            ? `${r.customer.last_name} ${r.customer.first_name}`
            : '顧客未登録',
          staffId: r.staff_id,
          staffName: r.staff
            ? `${r.staff.last_name} ${r.staff.first_name}`
            : '指名なし',
          startTime: r.start_time,
          menus: [], // Would need to join with reservation_menus
        }));

      setPendingReservations(pending);
    } catch (error) {
      console.error('Failed to load reservations:', error);
    }
  }, [company?.id, store?.id]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadVisits();
      setIsLoading(false);
    };
    init();
  }, [loadVisits]);

  // Load reservations when modal opens
  useEffect(() => {
    if (showCheckInModal && checkInMode === 'reservation') {
      loadPendingReservations();
    }
  }, [showCheckInModal, checkInMode, loadPendingReservations]);

  // Customer search
  useEffect(() => {
    if (checkInMode !== 'customer' || customerSearchQuery.length < 2) {
      setCustomerSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (!company?.id) return;
        const results = await customerService.search(company.id, customerSearchQuery);
        setCustomerSearchResults(results.map(c => ({
          id: c.id,
          lastName: c.last_name,
          firstName: c.first_name,
          lastNameKana: c.last_name_kana || '',
          firstNameKana: c.first_name_kana || '',
          phone: c.phone || undefined,
          totalVisits: c.total_visits || 0,
        })));
      } catch (error) {
        console.error('Customer search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [customerSearchQuery, checkInMode, company?.id]);

  const filteredVisits = visits.filter((visit) => {
    if (filter === 'all') return visit.status !== 'completed' && visit.status !== 'cancelled' && visit.status !== 'no_show';
    return visit.status === filter;
  });

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadVisits();
    setIsRefreshing(false);
  };

  const handleStartService = async (visitId: string) => {
    try {
      await visitService.startService(visitId);
      showToast('施術を開始しました', 'success');
    } catch (error) {
      console.error('Failed to start service:', error);
      showToast('施術開始に失敗しました', 'error');
    }
  };

  const handleCheckout = (visitId: string) => {
    router.push({
      pathname: '/checkout',
      params: { visitId }
    });
  };

  // Check in from reservation
  const handleCheckInFromReservation = async (reservation: PendingReservation) => {
    if (!company?.id || !store?.id) return;

    setIsCheckingIn(true);
    try {
      await visitService.checkIn({
        company_id: company.id,
        store_id: store.id,
        customer_id: reservation.customerId,
        staff_id: reservation.staffId,
        reservation_id: reservation.id,
        status: 'checked_in',
      });

      setShowCheckInModal(false);
      setCheckInMode('menu');
      showToast('来店受付が完了しました', 'success');
    } catch (error) {
      console.error('Check-in failed:', error);
      showToast('来店受付に失敗しました', 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Check in from customer search
  const handleCheckInFromCustomer = async () => {
    if (!company?.id || !store?.id || !selectedCustomer) return;

    setIsCheckingIn(true);
    try {
      await visitService.checkIn({
        company_id: company.id,
        store_id: store.id,
        customer_id: selectedCustomer.id,
        staff_id: staff?.id || null,
        status: 'checked_in',
      });

      setShowCheckInModal(false);
      setCheckInMode('menu');
      setSelectedCustomer(null);
      setCustomerSearchQuery('');
      showToast('来店受付が完了しました', 'success');
    } catch (error) {
      console.error('Check-in failed:', error);
      showToast('来店受付に失敗しました', 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Walk-in check in
  const handleWalkInCheckIn = async () => {
    if (!company?.id || !store?.id) return;

    setIsCheckingIn(true);
    try {
      await visitService.checkIn({
        company_id: company.id,
        store_id: store.id,
        customer_id: null,
        staff_id: staff?.id || null,
        status: 'checked_in',
        notes: '飛び込み来店',
      });

      setShowCheckInModal(false);
      setCheckInMode('menu');
      showToast('来店受付が完了しました', 'success');
    } catch (error) {
      console.error('Walk-in check-in failed:', error);
      showToast('来店受付に失敗しました', 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const renderVisitCard = ({ item: visit }: { item: VisitWithDetails }) => {
    const status = statusConfig[visit.status as VisitStatus] || statusConfig.checked_in;
    const checkInTime = new Date(visit.check_in_at);
    const waitingMinutes = Math.floor((Date.now() - checkInTime.getTime()) / 60000);

    const customerName = visit.customer
      ? `${visit.customer.last_name} ${visit.customer.first_name}`
      : '顧客未登録';
    const staffName = visit.staff
      ? `${visit.staff.last_name} ${visit.staff.first_name}`
      : '指名なし';

    return (
      <Card variant="elevated" size="md" style={styles.visitCard}>
        <View style={styles.visitHeader}>
          <View style={styles.visitInfo}>
            <Avatar name={customerName} size="md" />
            <View style={styles.visitDetails}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.menuText}>
                {visit.reservation?.notes || '施術内容未設定'}
              </Text>
            </View>
          </View>
          <Badge colorScheme={status.colorScheme}>{status.label}</Badge>
        </View>

        <View style={styles.visitMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>担当</Text>
            <Text style={styles.metaValue}>{staffName}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>受付時間</Text>
            <Text style={styles.metaValue}>
              {checkInTime.getHours()}:{String(checkInTime.getMinutes()).padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>
              {visit.status === 'checked_in' ? '待ち時間' : '経過時間'}
            </Text>
            <Text style={[styles.metaValue, visit.status === 'checked_in' && waitingMinutes > 15 && styles.warningText]}>
              {waitingMinutes}分
            </Text>
          </View>
          <Badge
            colorScheme={visit.staff_id ? 'primary' : 'neutral'}
            variant="subtle"
            size="sm"
          >
            {visit.staff_id ? '本指名' : 'フリー'}
          </Badge>
        </View>

        <View style={styles.visitActions}>
          {visit.status === 'checked_in' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onPress={() => router.push(`/visit/${visit.id}`)}
                style={styles.actionButton}
              >
                詳細
              </Button>
              <Button
                size="sm"
                onPress={() => handleStartService(visit.id)}
                style={styles.actionButton}
              >
                施術開始
              </Button>
            </>
          )}
          {visit.status === 'in_service' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onPress={() => router.push(`/visit/${visit.id}`)}
                style={styles.actionButton}
              >
                詳細
              </Button>
              <Button
                size="sm"
                colorScheme="success"
                onPress={() => handleCheckout(visit.id)}
                style={styles.actionButton}
              >
                会計へ
              </Button>
            </>
          )}
        </View>
      </Card>
    );
  };

  const renderCheckInModalContent = () => {
    switch (checkInMode) {
      case 'menu':
        return (
          <>
            <Text style={styles.modalText}>
              予約または顧客を選択して来店受付を行います
            </Text>
            <Button
              fullWidth
              variant="outline"
              onPress={() => setCheckInMode('reservation')}
              style={styles.modalButton}
            >
              予約から受付
            </Button>
            <Button
              fullWidth
              variant="outline"
              onPress={() => setCheckInMode('customer')}
              style={styles.modalButton}
            >
              顧客検索から受付
            </Button>
            <Button
              fullWidth
              onPress={() => setCheckInMode('walkin')}
            >
              飛び込み来店
            </Button>
          </>
        );

      case 'reservation':
        return (
          <>
            <TouchableOpacity onPress={() => setCheckInMode('menu')} style={styles.backButton}>
              <Text style={styles.backButtonText}>← 戻る</Text>
            </TouchableOpacity>
            <Text style={styles.modalSubtitle}>本日の予約</Text>
            {pendingReservations.length === 0 ? (
              <Text style={styles.emptyReservations}>未受付の予約はありません</Text>
            ) : (
              <ScrollView style={styles.reservationList}>
                {pendingReservations.map((reservation) => (
                  <TouchableOpacity
                    key={reservation.id}
                    style={styles.reservationItem}
                    onPress={() => handleCheckInFromReservation(reservation)}
                    disabled={isCheckingIn}
                  >
                    <View style={styles.reservationInfo}>
                      <Text style={styles.reservationCustomer}>{reservation.customerName}</Text>
                      <Text style={styles.reservationTime}>
                        {new Date(reservation.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={styles.reservationStaff}>{reservation.staffName}</Text>
                    </View>
                    <Text style={styles.reservationArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        );

      case 'customer':
        return (
          <>
            <TouchableOpacity onPress={() => setCheckInMode('menu')} style={styles.backButton}>
              <Text style={styles.backButtonText}>← 戻る</Text>
            </TouchableOpacity>
            <Text style={styles.modalSubtitle}>顧客検索</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="名前・電話番号で検索"
              value={customerSearchQuery}
              onChangeText={setCustomerSearchQuery}
              placeholderTextColor={colors.neutral[400]}
            />
            {isSearching ? (
              <ActivityIndicator style={styles.searchingIndicator} />
            ) : customerSearchResults.length > 0 ? (
              <ScrollView style={styles.customerList}>
                {customerSearchResults.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    style={[
                      styles.customerItem,
                      selectedCustomer?.id === customer.id && styles.customerItemSelected
                    ]}
                    onPress={() => setSelectedCustomer(customer)}
                  >
                    <Avatar name={`${customer.lastName}${customer.firstName}`} size="sm" />
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>
                        {customer.lastName} {customer.firstName}
                      </Text>
                      <Text style={styles.customerMeta}>
                        {customer.lastNameKana} {customer.firstNameKana}
                        {customer.phone && ` / ${customer.phone}`}
                      </Text>
                      <Text style={styles.customerVisits}>来店回数: {customer.totalVisits}回</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : customerSearchQuery.length >= 2 ? (
              <Text style={styles.noResults}>該当する顧客が見つかりません</Text>
            ) : null}
            {selectedCustomer && (
              <Button
                fullWidth
                onPress={handleCheckInFromCustomer}
                isLoading={isCheckingIn}
                style={styles.checkInButton}
              >
                {selectedCustomer.lastName} {selectedCustomer.firstName} さんを受付
              </Button>
            )}
          </>
        );

      case 'walkin':
        return (
          <>
            <TouchableOpacity onPress={() => setCheckInMode('menu')} style={styles.backButton}>
              <Text style={styles.backButtonText}>← 戻る</Text>
            </TouchableOpacity>
            <Text style={styles.modalSubtitle}>飛び込み来店</Text>
            <Text style={styles.walkinText}>
              予約なしの飛び込み来店として受付します。{'\n'}
              会計時に顧客情報を登録できます。
            </Text>
            <Button
              fullWidth
              onPress={handleWalkInCheckIn}
              isLoading={isCheckingIn}
            >
              受付を完了
            </Button>
          </>
        );
    }
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
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            すべて ({visits.filter(v => v.status !== 'completed' && v.status !== 'cancelled').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'checked_in' && styles.filterTabActive]}
          onPress={() => setFilter('checked_in')}
        >
          <Text style={[styles.filterTabText, filter === 'checked_in' && styles.filterTabTextActive]}>
            待機中 ({visits.filter(v => v.status === 'checked_in').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'in_service' && styles.filterTabActive]}
          onPress={() => setFilter('in_service')}
        >
          <Text style={[styles.filterTabText, filter === 'in_service' && styles.filterTabTextActive]}>
            施術中 ({visits.filter(v => v.status === 'in_service').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Visits List */}
      <FlatList
        data={filteredVisits}
        renderItem={renderVisitCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>現在の来店はありません</Text>
          </View>
        }
      />

      {/* Check In FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCheckInModal(true)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Check In Modal */}
      <Modal
        visible={showCheckInModal}
        onClose={() => {
          setShowCheckInModal(false);
          setCheckInMode('menu');
          setSelectedCustomer(null);
          setCustomerSearchQuery('');
        }}
        title="来店受付"
        size="lg"
      >
        {renderCheckInModalContent()}
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[50],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginTop: spacing[4],
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  filterTabActive: {
    backgroundColor: colors.primary[50],
  },
  filterTabText: {
    ...textStyles.label,
    color: colors.neutral[500],
  },
  filterTabTextActive: {
    color: colors.primary[600],
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  visitCard: {
    marginBottom: spacing[3],
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  visitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  visitDetails: {
    marginLeft: spacing[3],
    flex: 1,
  },
  customerName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  menuText: {
    ...textStyles.bodySm,
    color: colors.neutral[600],
    marginTop: spacing[0.5],
  },
  visitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    marginBottom: spacing[3],
  },
  metaItem: {
    marginRight: spacing[4],
  },
  metaLabel: {
    ...textStyles.caption,
    color: colors.neutral[400],
  },
  metaValue: {
    ...textStyles.label,
    color: colors.neutral[700],
  },
  warningText: {
    color: colors.warning[600],
  },
  visitActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    marginLeft: spacing[2],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  emptyText: {
    ...textStyles.body,
    color: colors.neutral[500],
  },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[4],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.white,
    fontWeight: '300',
  },
  modalText: {
    ...textStyles.body,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  modalButton: {
    marginBottom: spacing[3],
  },
  backButton: {
    marginBottom: spacing[4],
  },
  backButtonText: {
    ...textStyles.label,
    color: colors.primary[500],
  },
  modalSubtitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
    marginBottom: spacing[4],
  },
  emptyReservations: {
    ...textStyles.body,
    color: colors.neutral[500],
    textAlign: 'center',
    paddingVertical: spacing[8],
  },
  reservationList: {
    maxHeight: 300,
  },
  reservationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  reservationInfo: {
    flex: 1,
  },
  reservationCustomer: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  reservationTime: {
    ...textStyles.bodySm,
    color: colors.primary[600],
    marginTop: spacing[1],
  },
  reservationStaff: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  reservationArrow: {
    fontSize: 24,
    color: colors.neutral[400],
  },
  searchInput: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    ...textStyles.body,
    color: colors.neutral[900],
    marginBottom: spacing[4],
  },
  searchingIndicator: {
    marginVertical: spacing[8],
  },
  customerList: {
    maxHeight: 250,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  customerItemSelected: {
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[2],
    marginHorizontal: -spacing[2],
  },
  customerInfo: {
    marginLeft: spacing[3],
    flex: 1,
  },
  customerMeta: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  customerVisits: {
    ...textStyles.caption,
    color: colors.primary[600],
    marginTop: spacing[0.5],
  },
  noResults: {
    ...textStyles.body,
    color: colors.neutral[500],
    textAlign: 'center',
    paddingVertical: spacing[8],
  },
  checkInButton: {
    marginTop: spacing[4],
  },
  walkinText: {
    ...textStyles.body,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: 24,
  },
});
