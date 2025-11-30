import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Avatar, Badge, Button, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';

interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  staffName: string;
  startTime: string;
  endTime: string;
  menus: string[];
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  nominationType: 'nomination' | 'free';
  source: 'app' | 'phone' | 'web' | 'hotpepper';
}

const mockReservations: Reservation[] = [
  {
    id: '1',
    customerName: '山田 花子',
    customerPhone: '090-1234-5678',
    staffName: '田中 美咲',
    startTime: '2024-01-15T14:00:00',
    endTime: '2024-01-15T15:00:00',
    menus: ['カット', 'カラー'],
    status: 'confirmed',
    nominationType: 'nomination',
    source: 'app',
  },
  {
    id: '2',
    customerName: '佐藤 美咲',
    customerPhone: '080-2345-6789',
    staffName: '鈴木 花子',
    startTime: '2024-01-15T15:30:00',
    endTime: '2024-01-15T17:00:00',
    menus: ['パーマ', 'トリートメント'],
    status: 'pending',
    nominationType: 'free',
    source: 'hotpepper',
  },
  {
    id: '3',
    customerName: '高橋 愛',
    customerPhone: '070-3456-7890',
    staffName: '山本 さくら',
    startTime: '2024-01-15T16:00:00',
    endTime: '2024-01-15T17:00:00',
    menus: ['ヘッドスパ'],
    status: 'confirmed',
    nominationType: 'nomination',
    source: 'web',
  },
];

const statusConfig = {
  pending: { label: '未確定', colorScheme: 'warning' as const },
  confirmed: { label: '確定', colorScheme: 'success' as const },
  checked_in: { label: '来店済', colorScheme: 'info' as const },
  completed: { label: '完了', colorScheme: 'neutral' as const },
  cancelled: { label: 'キャンセル', colorScheme: 'error' as const },
  no_show: { label: '無断キャンセル', colorScheme: 'error' as const },
};

const sourceLabels = {
  app: 'アプリ',
  phone: '電話',
  web: 'Web',
  hotpepper: 'HP Beauty',
};

export default function ReservationsScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  const getWeekDates = () => {
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
  };

  const weekDates = getWeekDates();

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const isToday = (date: Date) => isSameDay(date, new Date());

  const onRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const renderReservationCard = ({ item: reservation }: { item: Reservation }) => {
    const status = statusConfig[reservation.status];

    return (
      <TouchableOpacity
        onPress={() => router.push(`/reservation/${reservation.id}`)}
        activeOpacity={0.7}
      >
        <Card variant="outlined" size="md" style={styles.reservationCard}>
          <View style={styles.reservationHeader}>
            <View style={styles.timeSlot}>
              <Text style={styles.timeText}>{formatTime(reservation.startTime)}</Text>
              <Text style={styles.timeSeparator}>-</Text>
              <Text style={styles.timeText}>{formatTime(reservation.endTime)}</Text>
            </View>
            <Badge colorScheme={status.colorScheme} size="sm">
              {status.label}
            </Badge>
          </View>

          <View style={styles.reservationContent}>
            <Avatar name={reservation.customerName} size="md" />
            <View style={styles.reservationInfo}>
              <Text style={styles.customerName}>{reservation.customerName}</Text>
              <Text style={styles.menuText}>{reservation.menus.join(' / ')}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.staffName}>担当: {reservation.staffName}</Text>
                <Badge
                  colorScheme={reservation.nominationType === 'nomination' ? 'primary' : 'neutral'}
                  variant="subtle"
                  size="sm"
                >
                  {reservation.nominationType === 'nomination' ? '指名' : 'フリー'}
                </Badge>
              </View>
            </View>
          </View>

          <View style={styles.reservationFooter}>
            <View style={styles.sourceTag}>
              <Text style={styles.sourceText}>{sourceLabels[reservation.source]}</Text>
            </View>
            {reservation.status === 'confirmed' && (
              <Button size="sm" onPress={() => {/* Handle check-in */}}>
                来店受付
              </Button>
            )}
            {reservation.status === 'pending' && (
              <Button size="sm" variant="outline" onPress={() => {/* Handle confirm */}}>
                確定する
              </Button>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Week Calendar */}
      <View style={styles.calendarContainer}>
        <View style={styles.weekHeader}>
          {weekDates.map((date, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                isSameDay(date, selectedDate) && styles.dayCellSelected,
                isToday(date) && styles.dayCellToday,
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text
                style={[
                  styles.dayName,
                  isSameDay(date, selectedDate) && styles.dayNameSelected,
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText,
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
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Reservations List */}
      <FlatList
        data={reservations}
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
              {reservations.length}件の予約
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
        onPress={() => router.push('/reservation/new')}
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
