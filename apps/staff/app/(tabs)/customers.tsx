import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Avatar, Badge, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';

interface Customer {
  id: string;
  name: string;
  nameKana: string;
  phone: string;
  email?: string;
  totalVisits: number;
  lastVisitAt?: string;
  pointsBalance: number;
  preferredStaff?: string;
  tags: string[];
}

const mockCustomers: Customer[] = [
  {
    id: '1',
    name: '山田 花子',
    nameKana: 'ヤマダ ハナコ',
    phone: '090-1234-5678',
    email: 'hanako@example.com',
    totalVisits: 24,
    lastVisitAt: '2024-01-10',
    pointsBalance: 2400,
    preferredStaff: '田中 美咲',
    tags: ['VIP', '長期顧客'],
  },
  {
    id: '2',
    name: '佐藤 美咲',
    nameKana: 'サトウ ミサキ',
    phone: '080-2345-6789',
    totalVisits: 8,
    lastVisitAt: '2024-01-05',
    pointsBalance: 800,
    tags: [],
  },
  {
    id: '3',
    name: '鈴木 太郎',
    nameKana: 'スズキ タロウ',
    phone: '070-3456-7890',
    email: 'taro@example.com',
    totalVisits: 3,
    lastVisitAt: '2023-12-20',
    pointsBalance: 300,
    preferredStaff: '鈴木 花子',
    tags: ['新規'],
  },
  {
    id: '4',
    name: '高橋 愛',
    nameKana: 'タカハシ アイ',
    phone: '090-4567-8901',
    totalVisits: 45,
    lastVisitAt: '2024-01-12',
    pointsBalance: 5200,
    preferredStaff: '山本 さくら',
    tags: ['VIP', 'カラー専門'],
  },
  {
    id: '5',
    name: '伊藤 さくら',
    nameKana: 'イトウ サクラ',
    phone: '080-5678-9012',
    totalVisits: 12,
    lastVisitAt: '2024-01-08',
    pointsBalance: 1200,
    tags: ['アレルギー注意'],
  },
];

export default function CustomersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.nameKana.toLowerCase().includes(query) ||
      customer.phone.includes(query) ||
      (customer.email && customer.email.toLowerCase().includes(query))
    );
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getDaysSinceLastVisit = (dateString?: string) => {
    if (!dateString) return null;
    const lastVisit = new Date(dateString);
    const today = new Date();
    const diffTime = today.getTime() - lastVisit.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderCustomerCard = ({ item: customer }: { item: Customer }) => {
    const daysSinceVisit = getDaysSinceLastVisit(customer.lastVisitAt);

    return (
      <TouchableOpacity
        onPress={() => router.push(`/customer/${customer.id}`)}
        activeOpacity={0.7}
      >
        <Card variant="elevated" size="md" style={styles.customerCard}>
          <View style={styles.customerHeader}>
            <Avatar name={customer.name} size="lg" />
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customer.name}</Text>
              <Text style={styles.customerKana}>{customer.nameKana}</Text>
              <Text style={styles.customerPhone}>{customer.phone}</Text>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{customer.totalVisits}</Text>
                <Text style={styles.statLabel}>回</Text>
              </View>
            </View>
          </View>

          {customer.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {customer.tags.map((tag, index) => (
                <Badge
                  key={index}
                  colorScheme={tag === 'VIP' ? 'primary' : tag === 'アレルギー注意' ? 'warning' : 'neutral'}
                  variant="subtle"
                  size="sm"
                  style={styles.tag}
                >
                  {tag}
                </Badge>
              ))}
            </View>
          )}

          <View style={styles.customerFooter}>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>最終来店</Text>
              <Text style={[
                styles.footerValue,
                daysSinceVisit && daysSinceVisit > 60 && styles.warningText,
              ]}>
                {customer.lastVisitAt ? `${formatDate(customer.lastVisitAt)} (${daysSinceVisit}日前)` : '未来店'}
              </Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>ポイント</Text>
              <Text style={styles.footerValue}>{customer.pointsBalance.toLocaleString()} pt</Text>
            </View>
            {customer.preferredStaff && (
              <View style={styles.footerItem}>
                <Text style={styles.footerLabel}>担当</Text>
                <Text style={styles.footerValue}>{customer.preferredStaff}</Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="名前、電話番号で検索..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Customer List */}
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <Text style={styles.resultCount}>
            {filteredCustomers.length}件の顧客
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? '該当する顧客が見つかりません' : '顧客がいません'}
            </Text>
          </View>
        }
      />

      {/* Add Customer FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {/* Navigate to new customer */}}
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
  searchContainer: {
    backgroundColor: colors.white,
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...textStyles.body,
    color: colors.neutral[900],
  },
  clearIcon: {
    fontSize: 16,
    color: colors.neutral[400],
    padding: spacing[1],
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  resultCount: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    marginBottom: spacing[3],
  },
  customerCard: {
    marginBottom: spacing[3],
  },
  customerHeader: {
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
  customerKana: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  customerPhone: {
    ...textStyles.bodySm,
    color: colors.neutral[600],
    marginTop: spacing[0.5],
  },
  statsContainer: {
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    ...textStyles.h4,
    color: colors.primary[600],
  },
  statLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginLeft: spacing[0.5],
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing[3],
  },
  tag: {
    marginRight: spacing[1],
    marginBottom: spacing[1],
  },
  customerFooter: {
    flexDirection: 'row',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  footerItem: {
    flex: 1,
  },
  footerLabel: {
    ...textStyles.caption,
    color: colors.neutral[400],
  },
  footerValue: {
    ...textStyles.bodySm,
    color: colors.neutral[700],
  },
  warningText: {
    color: colors.warning[600],
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
