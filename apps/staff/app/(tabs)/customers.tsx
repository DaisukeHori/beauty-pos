import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Avatar, Badge, Button, Modal, Input, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import { customerService, visitService, type CustomerWithDetails } from '@beauty-pos/api';

interface CustomerDisplay {
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

export default function CustomersScreen() {
  const { company, store, staff } = useAuthStore();
  const { showToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // New customer modal state
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    lastName: '',
    firstName: '',
    lastNameKana: '',
    firstNameKana: '',
    phone: '',
    email: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // Load customers
  const loadCustomers = useCallback(async () => {
    if (!company?.id) return;

    try {
      const data = await customerService.getAll(company.id);
      setCustomers(data.map(c => ({
        id: c.id,
        name: `${c.last_name} ${c.first_name}`,
        nameKana: `${c.last_name_kana || ''} ${c.first_name_kana || ''}`.trim(),
        phone: c.phone || '',
        email: c.email || undefined,
        totalVisits: c.total_visits || 0,
        lastVisitAt: c.last_visit_at || undefined,
        pointsBalance: c.points_balance || 0,
        preferredStaff: undefined, // Would need to join with staff table
        tags: c.tags || [],
      })));
    } catch (error) {
      console.error('Failed to load customers:', error);
      showToast('顧客情報の取得に失敗しました', 'error');
    }
  }, [company?.id, showToast]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadCustomers();
      setIsLoading(false);
    };
    init();
  }, [loadCustomers]);

  // Search customers
  useEffect(() => {
    if (!company?.id || searchQuery.length < 2) {
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await customerService.search(company.id, searchQuery);
        setCustomers(results.map(c => ({
          id: c.id,
          name: `${c.last_name} ${c.first_name}`,
          nameKana: `${c.last_name_kana || ''} ${c.first_name_kana || ''}`.trim(),
          phone: c.phone || '',
          email: c.email || undefined,
          totalVisits: c.total_visits || 0,
          lastVisitAt: c.last_visit_at || undefined,
          pointsBalance: c.points_balance || 0,
          preferredStaff: undefined,
          tags: c.tags || [],
        })));
      } catch (error) {
        console.error('Customer search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, company?.id]);

  // Reload all customers when search is cleared
  useEffect(() => {
    if (searchQuery.length === 0 && !isLoading) {
      loadCustomers();
    }
  }, [searchQuery, isLoading, loadCustomers]);

  const filteredCustomers = searchQuery.length >= 2 ? customers : customers.filter((customer) => {
    if (searchQuery.length === 0) return true;
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
    await loadCustomers();
    setIsRefreshing(false);
  }, [loadCustomers]);

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

  // Create new customer
  const handleCreateCustomer = async () => {
    if (!company?.id || !newCustomer.lastName || !newCustomer.firstName) {
      showToast('姓と名は必須です', 'error');
      return;
    }

    setIsCreating(true);
    try {
      await customerService.create({
        company_id: company.id,
        last_name: newCustomer.lastName,
        first_name: newCustomer.firstName,
        last_name_kana: newCustomer.lastNameKana || null,
        first_name_kana: newCustomer.firstNameKana || null,
        phone: newCustomer.phone || null,
        email: newCustomer.email || null,
        points_balance: 0,
        total_visits: 0,
        total_spent: 0,
        tags: [],
      });

      setShowNewCustomerModal(false);
      setNewCustomer({
        lastName: '',
        firstName: '',
        lastNameKana: '',
        firstNameKana: '',
        phone: '',
        email: '',
      });
      showToast('顧客を登録しました', 'success');
      loadCustomers();
    } catch (error) {
      console.error('Failed to create customer:', error);
      showToast('顧客登録に失敗しました', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Quick check-in
  const handleQuickCheckIn = async (customer: CustomerDisplay) => {
    if (!company?.id || !store?.id) return;

    try {
      await visitService.checkIn({
        company_id: company.id,
        store_id: store.id,
        customer_id: customer.id,
        staff_id: staff?.id || null,
        status: 'checked_in',
      });
      showToast(`${customer.name}さんの来店を受け付けました`, 'success');
      router.push('/(tabs)/visits');
    } catch (error) {
      console.error('Check-in failed:', error);
      showToast('来店受付に失敗しました', 'error');
    }
  };

  const renderCustomerCard = ({ item: customer }: { item: CustomerDisplay }) => {
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
              {customer.nameKana && (
                <Text style={styles.customerKana}>{customer.nameKana}</Text>
              )}
              <Text style={styles.customerPhone}>{customer.phone || '電話番号未登録'}</Text>
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
                  colorScheme={tag === 'VIP' ? 'primary' : tag.includes('アレルギー') ? 'warning' : 'neutral'}
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
            <View style={styles.footerLeft}>
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
            </View>
            <Button
              size="sm"
              variant="outline"
              onPress={() => handleQuickCheckIn(customer)}
            >
              来店受付
            </Button>
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
          {isSearching && (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          )}
          {searchQuery.length > 0 && !isSearching && (
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
            {!searchQuery && (
              <Button
                size="sm"
                variant="outline"
                onPress={() => setShowNewCustomerModal(true)}
                style={styles.emptyButton}
              >
                顧客を登録する
              </Button>
            )}
          </View>
        }
      />

      {/* Add Customer FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewCustomerModal(true)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* New Customer Modal */}
      <Modal
        visible={showNewCustomerModal}
        onClose={() => setShowNewCustomerModal(false)}
        title="顧客登録"
        size="lg"
      >
        <View style={styles.formContainer}>
          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>姓 *</Text>
              <TextInput
                style={styles.formInput}
                value={newCustomer.lastName}
                onChangeText={(text) => setNewCustomer(prev => ({ ...prev, lastName: text }))}
                placeholder="山田"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>名 *</Text>
              <TextInput
                style={styles.formInput}
                value={newCustomer.firstName}
                onChangeText={(text) => setNewCustomer(prev => ({ ...prev, firstName: text }))}
                placeholder="花子"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>セイ</Text>
              <TextInput
                style={styles.formInput}
                value={newCustomer.lastNameKana}
                onChangeText={(text) => setNewCustomer(prev => ({ ...prev, lastNameKana: text }))}
                placeholder="ヤマダ"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>メイ</Text>
              <TextInput
                style={styles.formInput}
                value={newCustomer.firstNameKana}
                onChangeText={(text) => setNewCustomer(prev => ({ ...prev, firstNameKana: text }))}
                placeholder="ハナコ"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.formLabel}>電話番号</Text>
            <TextInput
              style={styles.formInput}
              value={newCustomer.phone}
              onChangeText={(text) => setNewCustomer(prev => ({ ...prev, phone: text }))}
              placeholder="090-1234-5678"
              placeholderTextColor={colors.neutral[400]}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.formLabel}>メールアドレス</Text>
            <TextInput
              style={styles.formInput}
              value={newCustomer.email}
              onChangeText={(text) => setNewCustomer(prev => ({ ...prev, email: text }))}
              placeholder="example@email.com"
              placeholderTextColor={colors.neutral[400]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Button
            fullWidth
            onPress={handleCreateCustomer}
            isLoading={isCreating}
            style={styles.submitButton}
          >
            登録する
          </Button>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  footerLeft: {
    flexDirection: 'row',
    flex: 1,
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
  emptyButton: {
    marginTop: spacing[4],
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
  formContainer: {
    paddingVertical: spacing[2],
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: spacing[4],
  },
  formField: {
    flex: 1,
    marginHorizontal: spacing[1],
  },
  formFieldFull: {
    marginBottom: spacing[4],
  },
  formLabel: {
    ...textStyles.labelSm,
    color: colors.neutral[700],
    marginBottom: spacing[1],
  },
  formInput: {
    height: 44,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    ...textStyles.body,
    color: colors.neutral[900],
  },
  submitButton: {
    marginTop: spacing[4],
  },
});
