import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Avatar, Badge, Button, Modal, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useVisitStore, formatTime } from '@beauty-pos/core';

type VisitStatus = 'checked_in' | 'in_service' | 'completed' | 'cancelled';

interface Visit {
  id: string;
  customerName: string;
  staffName: string;
  status: VisitStatus;
  checkInAt: string;
  serviceStartAt?: string;
  menus: string[];
  nominationType: 'nomination' | 'free';
}

const mockVisits: Visit[] = [
  {
    id: '1',
    customerName: '山田 花子',
    staffName: '田中 美咲',
    status: 'in_service',
    checkInAt: '2024-01-15T13:30:00',
    serviceStartAt: '2024-01-15T13:35:00',
    menus: ['カット', 'カラー'],
    nominationType: 'nomination',
  },
  {
    id: '2',
    customerName: '佐藤 美咲',
    staffName: '鈴木 花子',
    status: 'checked_in',
    checkInAt: '2024-01-15T14:00:00',
    menus: ['パーマ'],
    nominationType: 'free',
  },
  {
    id: '3',
    customerName: '鈴木 太郎',
    staffName: '田中 美咲',
    status: 'in_service',
    checkInAt: '2024-01-15T13:00:00',
    serviceStartAt: '2024-01-15T13:05:00',
    menus: ['カット'],
    nominationType: 'nomination',
  },
  {
    id: '4',
    customerName: '高橋 愛',
    staffName: '山本 さくら',
    status: 'checked_in',
    checkInAt: '2024-01-15T14:15:00',
    menus: ['トリートメント', 'ヘッドスパ'],
    nominationType: 'nomination',
  },
];

const statusConfig: Record<VisitStatus, { label: string; colorScheme: 'warning' | 'success' | 'info' | 'error' }> = {
  checked_in: { label: '待機中', colorScheme: 'warning' },
  in_service: { label: '施術中', colorScheme: 'success' },
  completed: { label: '完了', colorScheme: 'info' },
  cancelled: { label: 'キャンセル', colorScheme: 'error' },
};

export default function VisitsScreen() {
  const [visits, setVisits] = useState<Visit[]>(mockVisits);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'checked_in' | 'in_service'>('all');
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  const filteredVisits = visits.filter((visit) => {
    if (filter === 'all') return visit.status !== 'completed' && visit.status !== 'cancelled';
    return visit.status === filter;
  });

  const onRefresh = async () => {
    setIsRefreshing(true);
    // Load visits from API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleStartService = (visitId: string) => {
    setVisits((prev) =>
      prev.map((v) =>
        v.id === visitId
          ? { ...v, status: 'in_service' as VisitStatus, serviceStartAt: new Date().toISOString() }
          : v
      )
    );
  };

  const handleCheckout = (visitId: string) => {
    router.push('/checkout');
  };

  const renderVisitCard = ({ item: visit }: { item: Visit }) => {
    const status = statusConfig[visit.status];
    const checkInTime = new Date(visit.checkInAt);
    const waitingMinutes = Math.floor((Date.now() - checkInTime.getTime()) / 60000);

    return (
      <Card variant="elevated" size="md" style={styles.visitCard}>
        <View style={styles.visitHeader}>
          <View style={styles.visitInfo}>
            <Avatar name={visit.customerName} size="md" />
            <View style={styles.visitDetails}>
              <Text style={styles.customerName}>{visit.customerName}</Text>
              <Text style={styles.menuText}>{visit.menus.join(' / ')}</Text>
            </View>
          </View>
          <Badge colorScheme={status.colorScheme}>{status.label}</Badge>
        </View>

        <View style={styles.visitMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>担当</Text>
            <Text style={styles.metaValue}>{visit.staffName}</Text>
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
            colorScheme={visit.nominationType === 'nomination' ? 'primary' : 'neutral'}
            variant="subtle"
            size="sm"
          >
            {visit.nominationType === 'nomination' ? '本指名' : 'フリー'}
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

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            すべて
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'checked_in' && styles.filterTabActive]}
          onPress={() => setFilter('checked_in')}
        >
          <Text style={[styles.filterTabText, filter === 'checked_in' && styles.filterTabTextActive]}>
            待機中
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'in_service' && styles.filterTabActive]}
          onPress={() => setFilter('in_service')}
        >
          <Text style={[styles.filterTabText, filter === 'in_service' && styles.filterTabTextActive]}>
            施術中
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
        onClose={() => setShowCheckInModal(false)}
        title="来店受付"
        size="lg"
      >
        <Text style={styles.modalText}>
          予約または顧客を選択して来店受付を行います
        </Text>
        <Button
          fullWidth
          variant="outline"
          onPress={() => {
            setShowCheckInModal(false);
            router.push('/(tabs)/reservations');
          }}
          style={styles.modalButton}
        >
          予約から受付
        </Button>
        <Button
          fullWidth
          variant="outline"
          onPress={() => {
            setShowCheckInModal(false);
            router.push('/(tabs)/customers');
          }}
          style={styles.modalButton}
        >
          顧客検索から受付
        </Button>
        <Button
          fullWidth
          onPress={() => {
            setShowCheckInModal(false);
            // Handle walk-in
          }}
        >
          飛び込み来店
        </Button>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
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
});
