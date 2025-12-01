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
import { visitService, type VisitWithDetails } from '@beauty-pos/api';

type VisitStatus = 'checked_in' | 'in_service' | 'completed' | 'cancelled' | 'no_show';

const statusConfig: Record<VisitStatus, { label: string; colorScheme: 'warning' | 'success' | 'info' | 'error' | 'neutral' }> = {
  checked_in: { label: '待機中', colorScheme: 'warning' },
  in_service: { label: '施術中', colorScheme: 'success' },
  completed: { label: '完了', colorScheme: 'info' },
  cancelled: { label: 'キャンセル', colorScheme: 'error' },
  no_show: { label: '無断キャンセル', colorScheme: 'error' },
};

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useUIStore();

  const [visit, setVisit] = useState<VisitWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadVisit = useCallback(async () => {
    if (!id) return;

    try {
      const data = await visitService.getById(id);
      setVisit(data);
    } catch (error) {
      console.error('Failed to load visit:', error);
      showToast('来店情報の取得に失敗しました', 'error');
    }
  }, [id, showToast]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadVisit();
      setIsLoading(false);
    };
    init();
  }, [loadVisit]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadVisit();
    setIsRefreshing(false);
  };

  const handleStartService = async () => {
    if (!id) return;

    setIsProcessing(true);
    try {
      await visitService.startService(id);
      showToast('施術を開始しました', 'success');
      loadVisit();
    } catch (error) {
      console.error('Failed to start service:', error);
      showToast('施術開始に失敗しました', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckout = () => {
    if (!id) return;
    router.push({
      pathname: '/checkout',
      params: { visitId: id },
    });
  };

  const handleCancel = () => {
    Alert.alert(
      '来店をキャンセル',
      'この来店をキャンセルしますか？',
      [
        { text: 'いいえ', style: 'cancel' },
        {
          text: 'キャンセルする',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setIsProcessing(true);
            try {
              await visitService.cancel(id);
              showToast('来店をキャンセルしました', 'success');
              router.back();
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getWaitingTime = () => {
    if (!visit) return 0;
    const checkInTime = new Date(visit.check_in_at);
    return Math.floor((Date.now() - checkInTime.getTime()) / 60000);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>😕</Text>
        <Text style={styles.errorText}>来店情報が見つかりません</Text>
        <Button variant="outline" onPress={() => router.back()}>
          戻る
        </Button>
      </View>
    );
  }

  const status = statusConfig[visit.status as VisitStatus] || statusConfig.checked_in;
  const customerName = visit.customer
    ? `${visit.customer.last_name} ${visit.customer.first_name}`
    : '顧客未登録';
  const staffName = visit.staff
    ? `${visit.staff.last_name} ${visit.staff.first_name}`
    : '指名なし';
  const waitingMinutes = getWaitingTime();

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
        {(visit.status === 'checked_in' || visit.status === 'in_service') && (
          <Text style={styles.timeText}>
            {visit.status === 'checked_in' ? '待ち時間' : '経過時間'}: {waitingMinutes}分
          </Text>
        )}
      </View>

      {/* Customer Info */}
      <Card variant="elevated" size="lg" style={styles.card}>
        <View style={styles.customerHeader}>
          <Avatar name={customerName} size="lg" />
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customerName}</Text>
            {visit.customer && (
              <Text style={styles.customerMeta}>
                来店回数: {visit.customer.total_visits || 0}回
              </Text>
            )}
          </View>
          {visit.customer && (
            <TouchableOpacity
              onPress={() => router.push(`/customer/${visit.customer!.id}`)}
            >
              <Text style={styles.viewProfileLink}>詳細 ›</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>担当スタッフ</Text>
            <Text style={styles.infoValue}>{staffName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>指名区分</Text>
            <Badge
              colorScheme={visit.staff_id ? 'primary' : 'neutral'}
              variant="subtle"
              size="sm"
            >
              {visit.staff_id ? '本指名' : 'フリー'}
            </Badge>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>受付時間</Text>
            <Text style={styles.infoValue}>{formatDateTime(visit.check_in_at)}</Text>
          </View>
          {visit.service_start_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>施術開始</Text>
              <Text style={styles.infoValue}>{formatDateTime(visit.service_start_at)}</Text>
            </View>
          )}
          {visit.check_out_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>会計完了</Text>
              <Text style={styles.infoValue}>{formatDateTime(visit.check_out_at)}</Text>
            </View>
          )}
        </View>
      </Card>

      {/* Reservation Info */}
      {visit.reservation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>予約情報</Text>
          <Card variant="outlined" size="md">
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>予約時間</Text>
              <Text style={styles.infoValue}>
                {formatDateTime(visit.reservation.start_time)}
              </Text>
            </View>
            {visit.reservation.notes && (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>メモ</Text>
                <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>
                  {visit.reservation.notes}
                </Text>
              </View>
            )}
          </Card>
        </View>
      )}

      {/* Notes */}
      {visit.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>来店メモ</Text>
          <Card variant="filled" size="md">
            <Text style={styles.notesText}>{visit.notes}</Text>
          </Card>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.section}>
        {visit.status === 'checked_in' && (
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
              onPress={handleStartService}
              style={styles.actionButton}
              isLoading={isProcessing}
            >
              施術開始
            </Button>
          </View>
        )}

        {visit.status === 'in_service' && (
          <Button
            size="lg"
            colorScheme="success"
            fullWidth
            onPress={handleCheckout}
            isDisabled={isProcessing}
          >
            会計へ進む
          </Button>
        )}

        {visit.status === 'completed' && (
          <View style={styles.completedMessage}>
            <Text style={styles.completedIcon}>✓</Text>
            <Text style={styles.completedText}>この来店は完了しています</Text>
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
  timeText: {
    ...textStyles.label,
    color: colors.neutral[700],
  },
  card: {
    margin: spacing[4],
    marginTop: 0,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  customerInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  customerName: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  customerMeta: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  viewProfileLink: {
    ...textStyles.label,
    color: colors.primary[500],
  },
  infoSection: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing[3],
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  infoLabel: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
  },
  infoValue: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  notesText: {
    ...textStyles.body,
    color: colors.neutral[700],
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing[1],
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
  bottomPadding: {
    height: spacing[8],
  },
});
