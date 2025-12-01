import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Card, Avatar, Badge, Button, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
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

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { company, store } = useAuthStore();
  const { showToast } = useUIStore();

  const [reservation, setReservation] = useState<ReservationWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadReservation = useCallback(async () => {
    if (!id) return;

    try {
      const data = await reservationService.getById(id);
      setReservation(data);
    } catch (error) {
      console.error('Failed to load reservation:', error);
      showToast('予約情報の取得に失敗しました', 'error');
    }
  }, [id, showToast]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadReservation();
      setIsLoading(false);
    };
    init();
  }, [loadReservation]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadReservation();
    setIsRefreshing(false);
  };

  const handleConfirm = async () => {
    if (!id) return;

    setIsProcessing(true);
    try {
      await reservationService.confirm(id);
      showToast('予約を確定しました', 'success');
      loadReservation();
    } catch (error) {
      console.error('Failed to confirm:', error);
      showToast('確定に失敗しました', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckIn = async () => {
    if (!reservation || !company?.id || !store?.id) return;

    setIsProcessing(true);
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
      router.push('/(tabs)/visits');
    } catch (error) {
      console.error('Check-in failed:', error);
      showToast('来店受付に失敗しました', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      '予約をキャンセル',
      'この予約をキャンセルしますか？',
      [
        { text: 'いいえ', style: 'cancel' },
        {
          text: 'キャンセルする',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setIsProcessing(true);
            try {
              await reservationService.cancel(id, 'お客様都合によるキャンセル');
              showToast('予約をキャンセルしました', 'success');
              loadReservation();
            } catch (error) {
              showToast('キャンセルに失敗しました', 'error');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleNoShow = () => {
    Alert.alert(
      '無断キャンセル',
      '無断キャンセルとして記録しますか？',
      [
        { text: 'いいえ', style: 'cancel' },
        {
          text: '記録する',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setIsProcessing(true);
            try {
              await reservationService.noShow(id);
              showToast('無断キャンセルとして記録しました', 'success');
              loadReservation();
            } catch (error) {
              showToast('処理に失敗しました', 'error');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}(${weekDays[date.getDay()]})`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>😕</Text>
        <Text style={styles.errorText}>予約が見つかりません</Text>
        <Button variant="outline" onPress={() => router.back()}>
          戻る
        </Button>
      </View>
    );
  }

  const status = statusConfig[reservation.status as keyof typeof statusConfig] || statusConfig.pending;
  const customerName = reservation.customer
    ? `${reservation.customer.last_name} ${reservation.customer.first_name}`
    : '顧客未登録';
  const staffName = reservation.staff
    ? `${reservation.staff.last_name} ${reservation.staff.first_name}`
    : '指名なし';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      {/* Status Header */}
      <View style={[styles.statusHeader, { backgroundColor: colors[status.colorScheme][50] }]}>
        <Badge colorScheme={status.colorScheme} size="lg">
          {status.label}
        </Badge>
        <Text style={styles.sourceText}>
          予約経路: {sourceLabels[reservation.source || 'app'] || reservation.source}
        </Text>
      </View>

      {/* Date/Time */}
      <Card variant="elevated" size="lg" style={styles.card}>
        <View style={styles.dateTimeHeader}>
          <Text style={styles.dateText}>{formatDate(reservation.start_time)}</Text>
          <Text style={styles.timeText}>
            {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
          </Text>
        </View>
      </Card>

      {/* Customer Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>顧客情報</Text>
        <Card variant="outlined" size="md">
          <TouchableOpacity
            style={styles.customerRow}
            onPress={() => reservation.customer && router.push(`/customer/${reservation.customer.id}`)}
            disabled={!reservation.customer}
          >
            <Avatar name={customerName} size="lg" />
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customerName}</Text>
              {reservation.customer && (
                <>
                  <Text style={styles.customerMeta}>
                    {reservation.customer.phone || 'TEL未登録'}
                  </Text>
                  <Text style={styles.customerVisits}>
                    来店回数: {reservation.customer.total_visits || 0}回
                  </Text>
                </>
              )}
            </View>
            {reservation.customer && (
              <Text style={styles.viewLink}>詳細 ›</Text>
            )}
          </TouchableOpacity>
        </Card>
      </View>

      {/* Staff Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>担当スタッフ</Text>
        <Card variant="outlined" size="md">
          <View style={styles.staffRow}>
            {reservation.staff ? (
              <>
                <Avatar name={staffName} size="md" />
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{staffName}</Text>
                  <Badge
                    colorScheme="primary"
                    variant="subtle"
                    size="sm"
                    style={styles.nominationBadge}
                  >
                    本指名
                  </Badge>
                </View>
              </>
            ) : (
              <>
                <View style={styles.freeIcon}>
                  <Text>✓</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>フリー（指名なし）</Text>
                </View>
              </>
            )}
          </View>
        </Card>
      </View>

      {/* Notes */}
      {reservation.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>メモ</Text>
          <Card variant="filled" size="md">
            <Text style={styles.notesText}>{reservation.notes}</Text>
          </Card>
        </View>
      )}

      {/* Timestamps */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>予約情報</Text>
        <Card variant="outlined" size="md">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>予約作成日</Text>
            <Text style={styles.infoValue}>
              {formatDate(reservation.created_at)} {formatTime(reservation.created_at)}
            </Text>
          </View>
          {reservation.updated_at !== reservation.created_at && (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>最終更新</Text>
              <Text style={styles.infoValue}>
                {formatDate(reservation.updated_at)} {formatTime(reservation.updated_at)}
              </Text>
            </View>
          )}
        </Card>
      </View>

      {/* Action Buttons */}
      <View style={styles.section}>
        {reservation.status === 'pending' && (
          <View style={styles.actionButtons}>
            <Button
              variant="outline"
              size="lg"
              onPress={handleCancel}
              style={styles.actionButton}
              isDisabled={isProcessing}
            >
              キャンセル
            </Button>
            <Button
              size="lg"
              onPress={handleConfirm}
              style={styles.actionButton}
              isLoading={isProcessing}
            >
              予約確定
            </Button>
          </View>
        )}

        {reservation.status === 'confirmed' && (
          <>
            <Button
              size="lg"
              fullWidth
              onPress={handleCheckIn}
              isLoading={isProcessing}
              style={styles.checkInButton}
            >
              来店受付
            </Button>
            <View style={styles.actionButtons}>
              <Button
                variant="outline"
                size="md"
                onPress={handleCancel}
                style={styles.actionButton}
                isDisabled={isProcessing}
              >
                キャンセル
              </Button>
              <Button
                variant="outline"
                size="md"
                colorScheme="error"
                onPress={handleNoShow}
                style={styles.actionButton}
                isDisabled={isProcessing}
              >
                無断キャンセル
              </Button>
            </View>
          </>
        )}

        {(reservation.status === 'completed' || reservation.status === 'checked_in') && (
          <View style={styles.completedMessage}>
            <Text style={styles.completedIcon}>✓</Text>
            <Text style={styles.completedText}>
              {reservation.status === 'checked_in' ? 'お客様は来店済みです' : 'この予約は完了しています'}
            </Text>
          </View>
        )}

        {(reservation.status === 'cancelled' || reservation.status === 'no_show') && (
          <View style={styles.cancelledMessage}>
            <Text style={styles.cancelledIcon}>✕</Text>
            <Text style={styles.cancelledText}>
              {reservation.status === 'cancelled' ? 'この予約はキャンセルされました' : '無断キャンセルとして記録済み'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
  loadingText: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginTop: spacing[3],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    padding: spacing[6],
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  errorText: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginBottom: spacing[4],
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
  },
  sourceText: {
    ...textStyles.bodySm,
    color: colors.neutral[600],
  },
  card: {
    margin: spacing[4],
    marginTop: 0,
  },
  dateTimeHeader: {
    alignItems: 'center',
  },
  dateText: {
    ...textStyles.h4,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  timeText: {
    ...textStyles.h5,
    color: colors.primary[600],
  },
  section: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    ...textStyles.labelSm,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  customerName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  customerMeta: {
    ...textStyles.bodySm,
    color: colors.neutral[600],
    marginTop: spacing[0.5],
  },
  customerVisits: {
    ...textStyles.caption,
    color: colors.primary[600],
    marginTop: spacing[0.5],
  },
  viewLink: {
    ...textStyles.label,
    color: colors.primary[500],
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffInfo: {
    marginLeft: spacing[3],
    flex: 1,
  },
  staffName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  nominationBadge: {
    marginTop: spacing[1],
    alignSelf: 'flex-start',
  },
  freeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesText: {
    ...textStyles.body,
    color: colors.neutral[700],
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  infoLabel: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
  },
  infoValue: {
    ...textStyles.bodySm,
    color: colors.neutral[700],
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing[3],
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing[1],
  },
  checkInButton: {
    marginBottom: spacing[3],
  },
  completedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success[50],
    padding: spacing[4],
    borderRadius: borderRadius.xl,
  },
  completedIcon: {
    fontSize: 20,
    color: colors.success[600],
    marginRight: spacing[2],
  },
  completedText: {
    ...textStyles.body,
    color: colors.success[700],
  },
  cancelledMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error[50],
    padding: spacing[4],
    borderRadius: borderRadius.xl,
  },
  cancelledIcon: {
    fontSize: 20,
    color: colors.error[600],
    marginRight: spacing[2],
  },
  cancelledText: {
    ...textStyles.body,
    color: colors.error[700],
  },
  bottomPadding: {
    height: spacing[8],
  },
});
