import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Avatar, Badge, Button, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore, useRealtimeReservations } from '@beauty-pos/core';
import { reservationService, visitService, type ReservationWithDetails } from '@beauty-pos/api';

type ViewMode = 'list' | 'week' | 'day';

const statusConfig = {
  pending: { label: '未確定', colorScheme: 'warning' as const, color: colors.warning[500] },
  confirmed: { label: '確定', colorScheme: 'success' as const, color: colors.success[500] },
  checked_in: { label: '来店済', colorScheme: 'info' as const, color: colors.info[500] },
  completed: { label: '完了', colorScheme: 'neutral' as const, color: colors.neutral[400] },
  cancelled: { label: 'キャンセル', colorScheme: 'error' as const, color: colors.error[500] },
  no_show: { label: '無断キャンセル', colorScheme: 'error' as const, color: colors.error[500] },
};

const sourceLabels: Record<string, string> = {
  app: 'アプリ',
  phone: '電話',
  web: 'Web',
  hotpepper: 'HP Beauty',
  line: 'LINE',
  walk_in: '直接',
};

// Time slots for day view (9:00 - 21:00)
const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function ReservationsScreen() {
  const { company, store, staff } = useAuthStore();
  const { showToast } = useUIStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [weekReservations, setWeekReservations] = useState<ReservationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Realtime updates
  useRealtimeReservations({
    companyId: company?.id || '',
    storeId: store?.id || '',
    enabled: !!(company?.id && store?.id),
    onInsert: (newReservation) => {
      const reservationDate = new Date(newReservation.start_time).toISOString().split('T')[0];
      const selected = selectedDate.toISOString().split('T')[0];
      if (reservationDate === selected) {
        setReservations(prev => [...prev, newReservation as ReservationWithDetails]);
      }
      // Also update week reservations
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const resDate = new Date(newReservation.start_time);
      if (resDate >= currentWeekStart && resDate <= weekEnd) {
        setWeekReservations(prev => [...prev, newReservation as ReservationWithDetails]);
      }
    },
    onUpdate: (updatedReservation) => {
      setReservations(prev => prev.map(r =>
        r.id === updatedReservation.id ? { ...r, ...updatedReservation } as ReservationWithDetails : r
      ));
      setWeekReservations(prev => prev.map(r =>
        r.id === updatedReservation.id ? { ...r, ...updatedReservation } as ReservationWithDetails : r
      ));
    },
    onDelete: (deletedReservation) => {
      setReservations(prev => prev.filter(r => r.id !== deletedReservation.id));
      setWeekReservations(prev => prev.filter(r => r.id !== deletedReservation.id));
    },
  });

  // Get week dates
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeekStart]);

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
      data.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      setReservations(data);
    } catch (error) {
      console.error('Failed to load reservations:', error);
      showToast('予約の取得に失敗しました', 'error');
    }
  }, [company?.id, store?.id, selectedDate, showToast]);

  // Load week reservations
  const loadWeekReservations = useCallback(async () => {
    if (!company?.id || !store?.id) return;

    try {
      const startStr = currentWeekStart.toISOString().split('T')[0];
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const endStr = weekEnd.toISOString().split('T')[0];

      const data = await reservationService.getByDateRange(store.id, startStr, endStr);
      setWeekReservations(data);
    } catch (error) {
      console.error('Failed to load week reservations:', error);
    }
  }, [company?.id, store?.id, currentWeekStart]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadReservations(), loadWeekReservations()]);
      setIsLoading(false);
    };
    init();
  }, [loadReservations, loadWeekReservations]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadReservations(), loadWeekReservations()]);
    setIsRefreshing(false);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
    setSelectedDate(today);
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

  // Get reservations for a specific time slot in day view
  const getReservationsForTimeSlot = (timeSlot: string) => {
    return reservations.filter(r => {
      const startTime = new Date(r.start_time);
      const slotHour = parseInt(timeSlot.split(':')[0]);
      const slotMinute = parseInt(timeSlot.split(':')[1]);
      return startTime.getHours() === slotHour && startTime.getMinutes() === slotMinute;
    });
  };

  // Get reservations for a specific day in week view
  const getReservationsForDay = (date: Date) => {
    return weekReservations.filter(r => {
      const resDate = new Date(r.start_time);
      return isSameDay(resDate, date);
    });
  };

  // Render reservation card for list view
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

  // Render week view
  const renderWeekView = () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const headerText = `${currentWeekStart.getMonth() + 1}/${currentWeekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

    return (
      <View style={styles.weekViewContainer}>
        {/* Week Navigation */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity onPress={goToPreviousWeek} style={styles.navButton}>
            <Text style={styles.navButtonText}>◀ 前週</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToCurrentWeek}>
            <Text style={styles.weekTitle}>{headerText}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
            <Text style={styles.navButtonText}>次週 ▶</Text>
          </TouchableOpacity>
        </View>

        {/* Week Grid */}
        <ScrollView style={styles.weekGrid} showsVerticalScrollIndicator={false}>
          <View style={styles.weekGridHeader}>
            <View style={styles.timeColumn} />
            {weekDates.map((date, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayHeader,
                  isSameDay(date, selectedDate) && styles.dayHeaderSelected,
                  isToday(date) && styles.dayHeaderToday,
                ]}
                onPress={() => {
                  setSelectedDate(date);
                  setViewMode('day');
                }}
              >
                <Text style={[
                  styles.dayHeaderText,
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText,
                ]}>
                  {WEEK_DAYS[date.getDay()]}
                </Text>
                <Text style={[
                  styles.dayHeaderNumber,
                  isSameDay(date, selectedDate) && styles.dayHeaderNumberSelected,
                ]}>
                  {date.getDate()}
                </Text>
                <Text style={styles.reservationCountBadge}>
                  {getReservationsForDay(date).filter(r =>
                    !['completed', 'cancelled', 'no_show'].includes(r.status)
                  ).length}件
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Time Slots */}
          {TIME_SLOTS.filter((_, i) => i % 2 === 0).map((timeSlot, timeIndex) => (
            <View key={timeSlot} style={styles.weekRow}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>{timeSlot}</Text>
              </View>
              {weekDates.map((date, dayIndex) => {
                const dayReservations = getReservationsForDay(date).filter(r => {
                  const startTime = new Date(r.start_time);
                  const slotHour = parseInt(timeSlot.split(':')[0]);
                  return startTime.getHours() === slotHour;
                });

                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.weekCell,
                      isToday(date) && styles.weekCellToday,
                    ]}
                    onPress={() => {
                      setSelectedDate(date);
                      setViewMode('day');
                    }}
                  >
                    {dayReservations.slice(0, 2).map((res, idx) => {
                      const status = statusConfig[res.status as keyof typeof statusConfig];
                      return (
                        <View
                          key={res.id}
                          style={[
                            styles.weekCellReservation,
                            { backgroundColor: status?.color || colors.primary[100] },
                          ]}
                        >
                          <Text style={styles.weekCellText} numberOfLines={1}>
                            {res.customer?.last_name || '予約'}
                          </Text>
                        </View>
                      );
                    })}
                    {dayReservations.length > 2 && (
                      <Text style={styles.moreText}>+{dayReservations.length - 2}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render day view
  const renderDayView = () => {
    return (
      <View style={styles.dayViewContainer}>
        {/* Day Navigation */}
        <View style={styles.dayNavigation}>
          <TouchableOpacity
            onPress={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() - 1);
              setSelectedDate(newDate);
            }}
            style={styles.navButton}
          >
            <Text style={styles.navButtonText}>◀ 前日</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedDate(new Date())}>
            <Text style={styles.dayTitle}>
              {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日（{WEEK_DAYS[selectedDate.getDay()]}）
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() + 1);
              setSelectedDate(newDate);
            }}
            style={styles.navButton}
          >
            <Text style={styles.navButtonText}>翌日 ▶</Text>
          </TouchableOpacity>
        </View>

        {/* Time Slots */}
        <ScrollView style={styles.dayGrid} showsVerticalScrollIndicator={false}>
          {TIME_SLOTS.map((timeSlot, index) => {
            const slotReservations = getReservationsForTimeSlot(timeSlot);
            const isHourStart = index % 2 === 0;

            return (
              <View
                key={timeSlot}
                style={[
                  styles.dayRow,
                  isHourStart && styles.dayRowHour,
                ]}
              >
                <View style={styles.dayTimeColumn}>
                  {isHourStart && (
                    <Text style={styles.dayTimeLabel}>{timeSlot}</Text>
                  )}
                </View>
                <View style={styles.daySlotContainer}>
                  {slotReservations.length === 0 ? (
                    <TouchableOpacity
                      style={styles.emptySlot}
                      onPress={() => router.push({
                        pathname: '/reservation/new',
                        params: {
                          date: selectedDate.toISOString().split('T')[0],
                          time: timeSlot
                        }
                      })}
                    >
                      <Text style={styles.emptySlotText}>+</Text>
                    </TouchableOpacity>
                  ) : (
                    slotReservations.map(res => {
                      const status = statusConfig[res.status as keyof typeof statusConfig];
                      const duration = (new Date(res.end_time).getTime() - new Date(res.start_time).getTime()) / 60000;
                      const heightMultiplier = Math.max(1, duration / 30);

                      return (
                        <TouchableOpacity
                          key={res.id}
                          style={[
                            styles.dayReservation,
                            {
                              backgroundColor: status?.color || colors.primary[100],
                              minHeight: 40 * heightMultiplier,
                            },
                          ]}
                          onPress={() => router.push(`/reservation/${res.id}`)}
                        >
                          <Text style={styles.dayReservationTime}>
                            {formatTime(res.start_time)} - {formatTime(res.end_time)}
                          </Text>
                          <Text style={styles.dayReservationCustomer} numberOfLines={1}>
                            {res.customer?.last_name} {res.customer?.first_name}
                          </Text>
                          <Text style={styles.dayReservationStaff} numberOfLines={1}>
                            {res.staff?.last_name || 'フリー'}
                          </Text>
                          {res.notes && (
                            <Text style={styles.dayReservationNotes} numberOfLines={1}>
                              {res.notes}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </View>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
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

  const activeReservations = reservations.filter(
    r => !['completed', 'cancelled', 'no_show'].includes(r.status)
  );

  return (
    <View style={styles.container}>
      {/* View Mode Tabs */}
      <View style={styles.viewModeTabs}>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'list' && styles.viewModeTabActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.viewModeTabText, viewMode === 'list' && styles.viewModeTabTextActive]}>
            リスト
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'week' && styles.viewModeTabActive]}
          onPress={() => setViewMode('week')}
        >
          <Text style={[styles.viewModeTabText, viewMode === 'week' && styles.viewModeTabTextActive]}>
            週表示
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'day' && styles.viewModeTabActive]}
          onPress={() => setViewMode('day')}
        >
          <Text style={[styles.viewModeTabText, viewMode === 'day' && styles.viewModeTabTextActive]}>
            日表示
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on view mode */}
      {viewMode === 'list' && (
        <>
          {/* Week Calendar for List View */}
          <View style={styles.calendarContainer}>
            <View style={styles.weekHeader}>
              {weekDates.map((date, index) => {
                const count = isSameDay(date, selectedDate)
                  ? activeReservations.length
                  : getReservationsForDay(date).filter(r =>
                      !['completed', 'cancelled', 'no_show'].includes(r.status)
                    ).length;

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
                      {WEEK_DAYS[date.getDay()]}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumber,
                        isSameDay(date, selectedDate) && styles.dayNumberSelected,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                    {count > 0 && (
                      <View style={[
                        styles.countBadge,
                        isSameDay(date, selectedDate) && styles.countBadgeSelected,
                      ]}>
                        <Text style={[
                          styles.countText,
                          isSameDay(date, selectedDate) && styles.countTextSelected,
                        ]}>{count}</Text>
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
                  {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日（{WEEK_DAYS[selectedDate.getDay()]}）
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
        </>
      )}

      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}

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
  // View Mode Tabs
  viewModeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  viewModeTab: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  viewModeTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary[500],
  },
  viewModeTabText: {
    ...textStyles.label,
    color: colors.neutral[500],
  },
  viewModeTabTextActive: {
    color: colors.primary[600],
  },
  // Calendar
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
    backgroundColor: colors.primary[100],
    borderRadius: 10,
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    marginTop: spacing[1],
  },
  countBadgeSelected: {
    backgroundColor: colors.white,
  },
  countText: {
    ...textStyles.caption,
    color: colors.primary[600],
    fontWeight: '600',
  },
  countTextSelected: {
    color: colors.primary[600],
  },
  // List View
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
  // Week View
  weekViewContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  navButton: {
    padding: spacing[2],
  },
  navButtonText: {
    ...textStyles.label,
    color: colors.primary[500],
  },
  weekTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
  },
  weekGrid: {
    flex: 1,
  },
  weekGridHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
  },
  timeColumn: {
    width: 50,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.neutral[200],
  },
  dayHeader: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.neutral[100],
  },
  dayHeaderSelected: {
    backgroundColor: colors.primary[50],
  },
  dayHeaderToday: {
    backgroundColor: colors.primary[100],
  },
  dayHeaderText: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  dayHeaderNumber: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  dayHeaderNumberSelected: {
    color: colors.primary[600],
    fontWeight: 'bold',
  },
  reservationCountBadge: {
    ...textStyles.caption,
    color: colors.primary[500],
    marginTop: spacing[0.5],
  },
  weekRow: {
    flexDirection: 'row',
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  timeLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  weekCell: {
    flex: 1,
    padding: spacing[1],
    borderRightWidth: 1,
    borderRightColor: colors.neutral[100],
  },
  weekCellToday: {
    backgroundColor: colors.primary[25],
  },
  weekCellReservation: {
    padding: spacing[1],
    borderRadius: borderRadius.sm,
    marginBottom: spacing[0.5],
  },
  weekCellText: {
    ...textStyles.caption,
    color: colors.white,
    fontWeight: '500',
  },
  moreText: {
    ...textStyles.caption,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  // Day View
  dayViewContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  dayNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  dayTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  dayGrid: {
    flex: 1,
  },
  dayRow: {
    flexDirection: 'row',
    minHeight: 40,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  dayRowHour: {
    borderBottomColor: colors.neutral[200],
  },
  dayTimeColumn: {
    width: 60,
    paddingRight: spacing[2],
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: spacing[1],
  },
  dayTimeLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  daySlotContainer: {
    flex: 1,
    padding: spacing[1],
  },
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    minHeight: 36,
  },
  emptySlotText: {
    ...textStyles.h5,
    color: colors.neutral[300],
  },
  dayReservation: {
    padding: spacing[2],
    borderRadius: borderRadius.md,
    marginBottom: spacing[1],
  },
  dayReservationTime: {
    ...textStyles.caption,
    color: colors.white,
    fontWeight: '600',
  },
  dayReservationCustomer: {
    ...textStyles.label,
    color: colors.white,
  },
  dayReservationStaff: {
    ...textStyles.caption,
    color: colors.white,
    opacity: 0.9,
  },
  dayReservationNotes: {
    ...textStyles.caption,
    color: colors.white,
    opacity: 0.8,
    marginTop: spacing[0.5],
  },
  // FAB
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
