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
import { customerService, visitService } from '@beauty-pos/api';

interface CustomerDetail {
  id: string;
  lastName: string;
  firstName: string;
  lastNameKana?: string;
  firstNameKana?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  notes?: string;
  points: number;
  totalVisits: number;
  totalSpent: number;
  lastVisitAt?: string;
  tags: string[];
  createdAt: string;
}

interface VisitHistory {
  id: string;
  date: string;
  staffName: string;
  menus: string;
  amount: number;
  status: string;
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { company, store, staff } = useAuthStore();
  const { showToast } = useUIStore();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [visitHistory, setVisitHistory] = useState<VisitHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCustomer = useCallback(async () => {
    if (!id) return;

    try {
      const data = await customerService.getById(id);
      if (data) {
        setCustomer({
          id: data.id,
          lastName: data.last_name,
          firstName: data.first_name,
          lastNameKana: data.last_name_kana || undefined,
          firstNameKana: data.first_name_kana || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          birthDate: data.birth_date || undefined,
          gender: data.gender || undefined,
          address: data.address || undefined,
          notes: data.notes || undefined,
          points: data.points || 0,
          totalVisits: data.total_visits || 0,
          totalSpent: data.total_spent || 0,
          lastVisitAt: data.last_visit_at || undefined,
          tags: data.tags || [],
          createdAt: data.created_at,
        });
      }

      // Load visit history
      const visits = await visitService.getByCustomer(id);
      setVisitHistory(visits.slice(0, 10).map(v => ({
        id: v.id,
        date: v.check_in_at,
        staffName: v.staff ? `${v.staff.last_name} ${v.staff.first_name}` : '-',
        menus: v.reservation?.notes || '-',
        amount: 0, // Would need to join with sales
        status: v.status,
      })));
    } catch (error) {
      console.error('Failed to load customer:', error);
      showToast('顧客情報の取得に失敗しました', 'error');
    }
  }, [id, showToast]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadCustomer();
      setIsLoading(false);
    };
    init();
  }, [loadCustomer]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadCustomer();
    setIsRefreshing(false);
  };

  const handleCheckIn = async () => {
    if (!customer || !company?.id || !store?.id) return;

    try {
      await visitService.checkIn({
        company_id: company.id,
        store_id: store.id,
        customer_id: customer.id,
        staff_id: staff?.id || null,
        status: 'checked_in',
      });
      showToast('来店受付が完了しました', 'success');
      router.push('/(tabs)/visits');
    } catch (error) {
      console.error('Check-in failed:', error);
      showToast('来店受付に失敗しました', 'error');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '顧客を削除',
      'この顧客を削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await customerService.delete(id);
              showToast('顧客を削除しました', 'success');
              router.back();
            } catch (error) {
              showToast('削除に失敗しました', 'error');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>😕</Text>
        <Text style={styles.errorText}>顧客が見つかりません</Text>
        <Button variant="outline" onPress={() => router.back()}>
          戻る
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      {/* Profile Header */}
      <Card variant="elevated" size="lg" style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Avatar name={`${customer.lastName}${customer.firstName}`} size="xl" />
          <View style={styles.profileInfo}>
            <Text style={styles.customerName}>
              {customer.lastName} {customer.firstName}
            </Text>
            {customer.lastNameKana && (
              <Text style={styles.customerKana}>
                {customer.lastNameKana} {customer.firstNameKana}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{customer.totalVisits}</Text>
            <Text style={styles.statLabel}>来店回数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>¥{customer.totalSpent.toLocaleString()}</Text>
            <Text style={styles.statLabel}>累計利用額</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{customer.points.toLocaleString()}</Text>
            <Text style={styles.statLabel}>ポイント</Text>
          </View>
        </View>

        {customer.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {customer.tags.map((tag, index) => (
              <Badge
                key={index}
                colorScheme={tag === 'VIP' ? 'primary' : 'neutral'}
                variant="subtle"
                size="sm"
                style={styles.tag}
              >
                {tag}
              </Badge>
            ))}
          </View>
        )}

        <View style={styles.actionButtons}>
          <Button
            variant="outline"
            size="md"
            onPress={handleCheckIn}
            style={styles.actionButton}
          >
            来店受付
          </Button>
          <Button
            size="md"
            onPress={() => router.push({
              pathname: '/reservation/new',
              params: { customerId: customer.id }
            })}
            style={styles.actionButton}
          >
            予約作成
          </Button>
        </View>
      </Card>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>連絡先</Text>
        <Card variant="outlined" size="md">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>電話番号</Text>
            <Text style={styles.infoValue}>{customer.phone || '未登録'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>メール</Text>
            <Text style={styles.infoValue}>{customer.email || '未登録'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>住所</Text>
            <Text style={styles.infoValue}>{customer.address || '未登録'}</Text>
          </View>
        </Card>
      </View>

      {/* Basic Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本情報</Text>
        <Card variant="outlined" size="md">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>生年月日</Text>
            <Text style={styles.infoValue}>
              {customer.birthDate ? formatDate(customer.birthDate) : '未登録'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>性別</Text>
            <Text style={styles.infoValue}>
              {customer.gender === 'male' ? '男性' :
               customer.gender === 'female' ? '女性' : '未設定'}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>登録日</Text>
            <Text style={styles.infoValue}>{formatDate(customer.createdAt)}</Text>
          </View>
        </Card>
      </View>

      {/* Notes */}
      {customer.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>メモ</Text>
          <Card variant="filled" size="md">
            <Text style={styles.notesText}>{customer.notes}</Text>
          </Card>
        </View>
      )}

      {/* Visit History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>来店履歴</Text>
        {visitHistory.length === 0 ? (
          <Card variant="outlined" size="md">
            <Text style={styles.emptyText}>来店履歴がありません</Text>
          </Card>
        ) : (
          visitHistory.map((visit, index) => (
            <Card key={visit.id} variant="outlined" size="sm" style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <Text style={styles.visitDate}>{formatDate(visit.date)}</Text>
                <Badge
                  colorScheme={visit.status === 'completed' ? 'success' : 'neutral'}
                  size="sm"
                >
                  {visit.status === 'completed' ? '完了' :
                   visit.status === 'in_service' ? '施術中' : visit.status}
                </Badge>
              </View>
              <Text style={styles.visitStaff}>担当: {visit.staffName}</Text>
              <Text style={styles.visitMenus}>{visit.menus}</Text>
            </Card>
          ))
        )}
      </View>

      {/* Delete Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>顧客を削除</Text>
        </TouchableOpacity>
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
  profileCard: {
    margin: spacing[4],
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  profileInfo: {
    marginLeft: spacing[4],
    flex: 1,
  },
  customerName: {
    ...textStyles.h4,
    color: colors.neutral[900],
  },
  customerKana: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing[4],
    marginBottom: spacing[4],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...textStyles.h5,
    color: colors.primary[600],
  },
  statLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing[4],
  },
  tag: {
    marginRight: spacing[1],
    marginBottom: spacing[1],
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing[1],
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
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  infoRowLast: {
    borderBottomWidth: 0,
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
  visitCard: {
    marginBottom: spacing[2],
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  visitDate: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  visitStaff: {
    ...textStyles.bodySm,
    color: colors.neutral[600],
  },
  visitMenus: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[1],
  },
  emptyText: {
    ...textStyles.body,
    color: colors.neutral[500],
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  deleteButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error[200],
  },
  deleteText: {
    ...textStyles.label,
    color: colors.error[500],
  },
  bottomPadding: {
    height: spacing[8],
  },
});
