import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Avatar, Badge, Button, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore, useRealtimeReservations } from '@beauty-pos/core';
import { reservationService, visitService, type ReservationWithDetails } from '@beauty-pos/api';

const statusConfig = {
  pending: { label: '未確定', colorScheme: 'warning' as const },
  confirmed: { label: '確定', colorScheme: 'success' as const },
  checked_in: { label: '来店済', colorScheme: 'info' as const },
  completed: { label: '完了', colorScheme: 'neutral' as const },
  cancelled: { label: 'キャンセル', colorScheme: 'error' as const },
  no_show: { label: '無断キャンセル', colorScheme: 'error' as const },
};

const sourceLabels: Record<string, string> = {
  app: 'アプリ',
  phone: '電話',
  web: 'Web',
  hotpepper: 'HP Beauty',
  line: 'LINE',
  walk_in: '直接',
};

export default function ReservationsScreen() {
  const { company, store, staff } = useAuthStore();
  const { showToast } = useUIStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // Realtime updates
  useRealtimeReservations({
    companyId: company?.id || '',
    storeId: store?.id || '',
    enabled: !!(company?.id && store?.id),
    onInsert: (newReservation) => {
      // Only add if it's for the selected date
      const reservationDate = new Date(newReservation.start_time).toISOString().split('T')[0];
      const selected = selectedDate.toISOString().split('T')[0];
      if (reservationDate === selected) {
        setReservations(prev => [...prev, newReservation as ReservationWithDetails]);
      }
    },
    onUpdate: (updatedReservation) => {
      setReservations(prev => prev.map(r =>
        r.id === updatedReservation.id ? { ...r, ...updatedReservation } as ReservationWithDetails : r
      ));
    },
    onDelete: (deletedReservation) => {
      setReservations(prev => prev.filter(r => r.id !== deletedReservation.id));
    },
  });

  const getWeekDates = useCallback(() => {
    const dates: Date[] = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  const weekDates = getWeekDates();

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const isToday = (date: Date) => isSameDay(date, new Date());

  // Load reservations for selected date
  const loadReservations = useCallback(async () => {
    if (!company?.id || !store?.id) return;

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await reservationService.getByDate(company.id, store.id, dateStr);
      // Sort by start time
      data.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      setReservations(data);
    } catch (error) {
      console.error('Failed to load reservations:', error);
      showToast('予約の取得に失敗しました', 'error');
    }
  }, [company?.id, store?.id, selectedDate, showToast]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadReservations();
      setIsLoading(false);
    };
    init();
  }, [loadReservations]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadReservations();
    setIsRefreshing(false);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // Handle confirm reservation
  const handleConfirm = async (reservationId: string) => {
    setProcessingId(reservationId);
    try {
      await reservationService.confirm(reservationId);
      showToast('予約を確定しました', 'success');
    } catch (error) {
      console.error('Failed to confirm reservation:', error);
      showToast('予約確定に失敗しました', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle check-in
  const handleCheckIn = async (reservation: ReservationWithDetails) => {
    if (!company?.id || !store?.id) return;

    setProcessingId(reservation.id);
    try {
      await visitService.checkIn({
        company_id: company.id,
        store_id: store.id,
        customer_id: reservation.customer_id,
        staff_id: reservation.staff_id,
        reservation_id: reservation.id,
        status: 'checked_in',
      });
      showToast('来店受付が完了しました', 'success');
    } catch (error) {
      console.error('Failed to check in:', error);
      showToast('来店受付に失敗しました', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle cancel
  const handleCancel = async (reservationId: string) => {
    setProcessingId(reservationId);
    try {
      await reservationService.cancel(reservationId, 'お客様都合によるキャンセル');
      showToast('予約をキャンセルしました', 'success');
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
      showToast('キャンセルに失敗しました', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle no-show
  const handleNoShow = async (reservationId: string) => {
    setProcessingId(reservationId);
    try {
      await reservationService.noShow(reservationId);
      showToast('無断キャンセルとして記録しました', 'success');
    } catch (error) {
      console.error('Failed to mark no-show:', error);
      showToast('処理に失敗しました', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const renderReservationCard = ({ item: reservation }: { item: ReservationWithDetails }) => {
    const status = statusConfig[reservation.status as keyof typeof statusConfig] || statusConfig.pending;
    const isProcessing = processingId === reservation.id;

    const customerName = reservation.customer
      ? `${reservation.customer.last_name} ${reservation.customer.first_name}`
      : '顧客未登録';

    const staffName = reservation.staff
      ? `${reservation.staff.last_name} ${reservation.staff.first_name}`
      : '指名なし';

    return (
      <TouchableOpacity
        onPress={() => router.push(`/reservation/${reservation.id}`)}
        activeOpacity={0.7}
      >
        <Card variant="outlined" size="md" style={styles.reservationCard}>
          <View style={styles.reservationHeader}>
            <View style={styles.timeSlot}>
              <Text style={styles.timeText}>{formatTime(reservation.start_time)}</Text>
              <Text style={styles.timeSeparator}>-</Text>
              <Text style={styles.timeText}>{formatTime(reservation.end_time)}</Text>
            </View>
            <Badge colorScheme={status.colorScheme} size="sm">
              {status.label}
            </Badge>
          </View>

          <View style={styles.reservationContent}>
            <Avatar name={customerName} size="md" />
            <View style={styles.reservationInfo}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.menuText}>
                {reservation.notes || '施術内容未設定'}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.staffName}>担当: {staffName}</Text>
                <Badge
                  colorScheme={reservation.staff_id ? 'primary' : 'neutral'}
                  variant="subtle"
                  size="sm"
                >
                  {reservation.staff_id ? '指名' : 'フリー'}
                </Badge>
              </View>
            </View>
          </View>

          <View style={styles.reservationFooter}>
            <View style={styles.sourceTag}>
              <Text style={styles.sourceText}>
                {sourceLabels[reservation.source || 'app'] || reservation.source}
              </Text>
            </View>
            <View style={styles.actionButtons}>
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.primary[500]} />
              ) : (
                <>
                  {reservation.status === 'confirmed' && (
                    <Button
                      size="sm"
                      onPress={() => handleCheckIn(reservation)}
                    >
                      来店受付
                    </Button>
                  )}
                  {reservation.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => handleCancel(reservation.id)}
                        style={styles.cancelButton}
                      >
                        キャンセル
                      </Button>
                      <Button
                        size="sm"
                        onPress={() => handleConfirm(reservation.id)}
                      >
                        確定
                      </Button>
                    </>
                  )}
                  {(reservation.status === 'confirmed' || reservation.status === 'pending') && (
                    <TouchableOpacity
                      style={styles.noShowButton}
                      onPress={() => handleNoShow(reservation.id)}
                    >
                      <Text style={styles.noShowText}>無断C</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // Filter active reservations (exclude completed, cancelled, no_show for display)
  const activeReservations = reservations.filter(
    r => !['completed', 'cancelled', 'no_show'].includes(r.status)
  );

  return (
    <View style={styles.container}>
      {/* Week Calendar */}
      <View style={styles.calendarContainer}>
        <View style={styles.weekHeader}>
          {weekDates.map((date, index) => {
            // Count reservations for this date
            const dateStr = date.toISOString().split('T')[0];
            const count = isSameDay(date, selectedDate)
              ? reservations.filter(r => !['completed', 'cancelled', 'no_show'].includes(r.status)).length
              : 0;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  isSameDay(date, selectedDate) && styles.dayCellSelected,
                  isToday(date) && !isSameDay(date, selectedDate) && styles.dayCellToday,
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text
                  style={[
                    styles.dayName,
                    isSameDay(date, selectedDate) && styles.dayNameSelected,
                    !isSameDay(date, selectedDate) && index === 0 && styles.sundayText,
                    !isSameDay(date, selectedDate) && index === 6 && styles.saturdayText,
                  ]}
                >
                  {weekDays[index]}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isSameDay(date, selectedDate) && styles.dayNumberSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
                {isSameDay(date, selectedDate) && count > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Reservations List */}
      <FlatList
        data={activeReservations}
        renderItem={renderReservationCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.dateTitle}>
              {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日（{weekDays[selectedDate.getDay()]}）
            </Text>
            <Text style={styles.reservationCount}>
              {activeReservations.length}件の予約
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>この日の予約はありません</Text>
          </View>
        }
      />

      {/* Add Reservation FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push({
          pathname: '/reservation/new',
          params: { date: selectedDate.toISOString().split('T')[0] }
        })}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
  calendarContainer: {
    backgroundColor: colors.white,
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  weekHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing[2],
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
    marginHorizontal: spacing[0.5],
    borderRadius: borderRadius.lg,
  },
  dayCellSelected: {
    backgroundColor: colors.primary[500],
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.primary[300],
  },
  dayName: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[0.5],
  },
  dayNameSelected: {
    color: colors.white,
  },
  sundayText: {
    color: colors.error[500],
  },
  saturdayText: {
    color: colors.info[500],
  },
  dayNumber: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  dayNumberSelected: {
    color: colors.white,
  },
  countBadge: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    marginTop: spacing[1],
  },
  countText: {
    ...textStyles.caption,
    color: colors.primary[600],
    fontWeight: '600',
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  dateTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  reservationCount: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
  },
  reservationCard: {
    marginBottom: spacing[3],
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  timeSeparator: {
    ...textStyles.body,
    color: colors.neutral[400],
    marginHorizontal: spacing[1],
  },
  reservationContent: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  reservationInfo: {
    flex: 1,
    marginLeft: spacing[3],
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  staffName: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginRight: spacing[2],
  },
  reservationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  sourceTag: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  sourceText: {
    ...textStyles.caption,
    color: colors.neutral[600],
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: spacing[2],
  },
  noShowButton: {
    marginLeft: spacing[2],
    padding: spacing[1],
  },
  noShowText: {
    ...textStyles.caption,
    color: colors.error[500],
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
});
