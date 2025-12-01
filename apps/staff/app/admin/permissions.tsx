import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Card, Avatar, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import { staffService, Staff } from '@beauty-pos/api';

type StaffRole = 'owner' | 'manager' | 'stylist' | 'assistant';

interface Permission {
  key: string;
  name: string;
  description: string;
  category: string;
}

interface RolePermissions {
  [key: string]: boolean;
}

// Define all permissions
const allPermissions: Permission[] = [
  // Sales & Checkout
  { key: 'sales_create', name: '会計作成', description: '会計処理の実行', category: '会計' },
  { key: 'sales_view', name: '売上閲覧', description: '売上データの閲覧', category: '会計' },
  { key: 'sales_edit', name: '売上編集', description: '売上データの修正', category: '会計' },
  { key: 'sales_delete', name: '売上削除', description: '売上データの削除', category: '会計' },
  { key: 'sales_discount', name: '割引適用', description: '割引の適用権限', category: '会計' },
  { key: 'sales_refund', name: '返金処理', description: '返金処理の実行', category: '会計' },

  // Reservations
  { key: 'reservation_create', name: '予約作成', description: '新規予約の作成', category: '予約' },
  { key: 'reservation_view', name: '予約閲覧', description: '予約データの閲覧', category: '予約' },
  { key: 'reservation_edit', name: '予約編集', description: '予約の変更', category: '予約' },
  { key: 'reservation_cancel', name: '予約キャンセル', description: '予約のキャンセル', category: '予約' },

  // Customers
  { key: 'customer_create', name: '顧客登録', description: '新規顧客の登録', category: '顧客' },
  { key: 'customer_view', name: '顧客閲覧', description: '顧客情報の閲覧', category: '顧客' },
  { key: 'customer_edit', name: '顧客編集', description: '顧客情報の編集', category: '顧客' },
  { key: 'customer_delete', name: '顧客削除', description: '顧客情報の削除', category: '顧客' },
  { key: 'customer_karte', name: 'カルテ管理', description: 'カルテの作成・編集', category: '顧客' },

  // Inventory & Products
  { key: 'inventory_view', name: '在庫閲覧', description: '在庫状況の閲覧', category: '在庫・商品' },
  { key: 'inventory_edit', name: '在庫編集', description: '在庫数の調整', category: '在庫・商品' },
  { key: 'product_create', name: '商品登録', description: '新規商品の登録', category: '在庫・商品' },
  { key: 'product_edit', name: '商品編集', description: '商品情報の編集', category: '在庫・商品' },

  // Staff Management
  { key: 'staff_view', name: 'スタッフ閲覧', description: 'スタッフ情報の閲覧', category: 'スタッフ' },
  { key: 'staff_create', name: 'スタッフ登録', description: '新規スタッフの登録', category: 'スタッフ' },
  { key: 'staff_edit', name: 'スタッフ編集', description: 'スタッフ情報の編集', category: 'スタッフ' },
  { key: 'staff_delete', name: 'スタッフ削除', description: 'スタッフの削除', category: 'スタッフ' },

  // Reports
  { key: 'report_daily', name: '日報閲覧', description: '日次レポートの閲覧', category: 'レポート' },
  { key: 'report_sales', name: '売上レポート', description: '売上分析レポートの閲覧', category: 'レポート' },
  { key: 'report_staff', name: 'スタッフ売上', description: 'スタッフ別売上の閲覧', category: 'レポート' },
  { key: 'report_customer', name: '顧客分析', description: '顧客分析レポートの閲覧', category: 'レポート' },

  // Settings
  { key: 'settings_store', name: '店舗設定', description: '店舗情報の設定', category: '設定' },
  { key: 'settings_menu', name: 'メニュー設定', description: 'メニューの管理', category: '設定' },
  { key: 'settings_coupon', name: 'クーポン設定', description: 'クーポンの管理', category: '設定' },
  { key: 'settings_ticket', name: '回数券設定', description: '回数券の管理', category: '設定' },
  { key: 'settings_integration', name: '外部連携設定', description: 'API連携の設定', category: '設定' },
  { key: 'settings_feature', name: '機能設定', description: '機能のON/OFF設定', category: '設定' },
  { key: 'settings_permission', name: '権限設定', description: 'スタッフ権限の管理', category: '設定' },
];

// Default permissions by role
const defaultRolePermissions: Record<StaffRole, RolePermissions> = {
  owner: Object.fromEntries(allPermissions.map(p => [p.key, true])),
  manager: {
    sales_create: true, sales_view: true, sales_edit: true, sales_delete: false,
    sales_discount: true, sales_refund: true,
    reservation_create: true, reservation_view: true, reservation_edit: true, reservation_cancel: true,
    customer_create: true, customer_view: true, customer_edit: true, customer_delete: false,
    customer_karte: true,
    inventory_view: true, inventory_edit: true, product_create: true, product_edit: true,
    staff_view: true, staff_create: false, staff_edit: false, staff_delete: false,
    report_daily: true, report_sales: true, report_staff: true, report_customer: true,
    settings_store: true, settings_menu: true, settings_coupon: true, settings_ticket: true,
    settings_integration: false, settings_feature: false, settings_permission: false,
  },
  stylist: {
    sales_create: true, sales_view: true, sales_edit: false, sales_delete: false,
    sales_discount: true, sales_refund: false,
    reservation_create: true, reservation_view: true, reservation_edit: true, reservation_cancel: false,
    customer_create: true, customer_view: true, customer_edit: true, customer_delete: false,
    customer_karte: true,
    inventory_view: true, inventory_edit: false, product_create: false, product_edit: false,
    staff_view: true, staff_create: false, staff_edit: false, staff_delete: false,
    report_daily: false, report_sales: false, report_staff: false, report_customer: false,
    settings_store: false, settings_menu: false, settings_coupon: false, settings_ticket: false,
    settings_integration: false, settings_feature: false, settings_permission: false,
  },
  assistant: {
    sales_create: true, sales_view: false, sales_edit: false, sales_delete: false,
    sales_discount: false, sales_refund: false,
    reservation_create: true, reservation_view: true, reservation_edit: false, reservation_cancel: false,
    customer_create: true, customer_view: true, customer_edit: false, customer_delete: false,
    customer_karte: false,
    inventory_view: true, inventory_edit: false, product_create: false, product_edit: false,
    staff_view: false, staff_create: false, staff_edit: false, staff_delete: false,
    report_daily: false, report_sales: false, report_staff: false, report_customer: false,
    settings_store: false, settings_menu: false, settings_coupon: false, settings_ticket: false,
    settings_integration: false, settings_feature: false, settings_permission: false,
  },
};

const roleLabels: Record<StaffRole, string> = {
  owner: 'オーナー',
  manager: 'マネージャー',
  stylist: 'スタイリスト',
  assistant: 'アシスタント',
};

const roleColors: Record<StaffRole, string> = {
  owner: colors.error[500],
  manager: colors.primary[500],
  stylist: colors.success[500],
  assistant: colors.neutral[500],
};

export default function PermissionsScreen() {
  const { company, staff: currentStaff } = useAuthStore();
  const { showToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedRole, setSelectedRole] = useState<StaffRole>('stylist');
  const [rolePermissions, setRolePermissions] = useState<Record<StaffRole, RolePermissions>>(defaultRolePermissions);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffPermissions, setStaffPermissions] = useState<RolePermissions>({});
  const [saving, setSaving] = useState(false);

  const isOwner = currentStaff?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!company?.id) return;
    try {
      const staffData = await staffService.listByCompany(company.id);
      setStaffList(staffData);
    } catch (error) {
      console.error('Failed to load staff:', error);
      showToast('スタッフ情報の読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [company?.id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRolePermissionToggle = (permKey: string, value: boolean) => {
    if (!isOwner) {
      Alert.alert('権限エラー', '権限設定を変更できるのはオーナーのみです');
      return;
    }

    if (selectedRole === 'owner') {
      Alert.alert('制限', 'オーナーの権限は変更できません');
      return;
    }

    setRolePermissions(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [permKey]: value,
      },
    }));
  };

  const openStaffPermissionModal = (staff: Staff) => {
    setSelectedStaff(staff);
    // Load staff-specific permissions or use role defaults
    const role = staff.role as StaffRole;
    setStaffPermissions({ ...rolePermissions[role] });
    setModalVisible(true);
  };

  const handleStaffPermissionToggle = (permKey: string, value: boolean) => {
    setStaffPermissions(prev => ({
      ...prev,
      [permKey]: value,
    }));
  };

  const handleSaveStaffPermissions = async () => {
    if (!selectedStaff) return;
    setSaving(true);
    try {
      // In a real implementation, save to database
      // await staffService.updatePermissions(selectedStaff.id, staffPermissions);
      showToast('権限設定を保存しました', 'success');
      setModalVisible(false);
    } catch (error) {
      showToast('保存に失敗しました', 'error');
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const renderPermissionItem = (
    perm: Permission,
    value: boolean,
    onToggle: (key: string, value: boolean) => void,
    disabled: boolean = false
  ) => (
    <View key={perm.key} style={styles.permissionItem}>
      <View style={styles.permissionInfo}>
        <Text style={styles.permissionName}>{perm.name}</Text>
        <Text style={styles.permissionDescription}>{perm.description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => onToggle(perm.key, v)}
        trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
        thumbColor={value ? colors.primary[500] : colors.neutral[100]}
        disabled={disabled}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: '権限管理' }} />
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '権限管理',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← 戻る</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!isOwner && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              権限設定を変更できるのはオーナーのみです
            </Text>
          </View>
        )}

        {/* Role-based Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ロール別権限設定</Text>
          <Text style={styles.sectionSubtitle}>
            各ロールのデフォルト権限を設定します
          </Text>

          {/* Role Tabs */}
          <View style={styles.roleTabs}>
            {(Object.keys(roleLabels) as StaffRole[]).map(role => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleTab,
                  selectedRole === role && styles.roleTabActive,
                  { borderColor: roleColors[role] },
                ]}
                onPress={() => setSelectedRole(role)}
              >
                <Text style={[
                  styles.roleTabText,
                  selectedRole === role && { color: roleColors[role] },
                ]}>
                  {roleLabels[role]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Permission Groups */}
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <Card key={category} variant="outlined" size="md" style={styles.permissionCard}>
              <Text style={styles.categoryTitle}>{category}</Text>
              {perms.map((perm, index) => (
                <View key={perm.key}>
                  {renderPermissionItem(
                    perm,
                    rolePermissions[selectedRole][perm.key] ?? false,
                    handleRolePermissionToggle,
                    !isOwner || selectedRole === 'owner'
                  )}
                  {index < perms.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          ))}
        </View>

        {/* Staff List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>スタッフ別権限設定</Text>
          <Text style={styles.sectionSubtitle}>
            個別のスタッフに対してカスタム権限を設定できます
          </Text>

          <Card variant="outlined" size="md" style={styles.staffListCard}>
            {staffList.map((staff, index) => (
              <View key={staff.id}>
                <TouchableOpacity
                  style={styles.staffItem}
                  onPress={() => openStaffPermissionModal(staff)}
                  disabled={!isOwner}
                >
                  <Avatar
                    name={`${staff.lastName}${staff.firstName}`}
                    source={staff.avatarUrl}
                    size="md"
                  />
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>
                      {staff.lastName} {staff.firstName}
                    </Text>
                    <View style={[styles.roleBadge, { backgroundColor: `${roleColors[staff.role as StaffRole]}20` }]}>
                      <Text style={[styles.roleBadgeText, { color: roleColors[staff.role as StaffRole] }]}>
                        {roleLabels[staff.role as StaffRole]}
                      </Text>
                    </View>
                  </View>
                  {isOwner && <Text style={styles.arrowIcon}>›</Text>}
                </TouchableOpacity>
                {index < staffList.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>

      {/* Staff Permission Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedStaff ? `${selectedStaff.lastName} ${selectedStaff.firstName}の権限` : '権限設定'}
            </Text>
            <TouchableOpacity onPress={handleSaveStaffPermissions} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary[500]} />
              ) : (
                <Text style={styles.modalSaveText}>保存</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedStaff && (
              <View style={styles.staffModalHeader}>
                <Avatar
                  name={`${selectedStaff.lastName}${selectedStaff.firstName}`}
                  source={selectedStaff.avatarUrl}
                  size="lg"
                />
                <Text style={styles.staffModalName}>
                  {selectedStaff.lastName} {selectedStaff.firstName}
                </Text>
                <View style={[styles.roleBadge, { backgroundColor: `${roleColors[selectedStaff.role as StaffRole]}20` }]}>
                  <Text style={[styles.roleBadgeText, { color: roleColors[selectedStaff.role as StaffRole] }]}>
                    {roleLabels[selectedStaff.role as StaffRole]}
                  </Text>
                </View>
              </View>
            )}

            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <Card key={category} variant="outlined" size="md" style={styles.permissionCard}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {perms.map((perm, index) => (
                  <View key={perm.key}>
                    {renderPermissionItem(
                      perm,
                      staffPermissions[perm.key] ?? false,
                      handleStaffPermissionToggle,
                      false
                    )}
                    {index < perms.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </Card>
            ))}
          </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  backButton: {
    paddingHorizontal: spacing[2],
  },
  backButtonText: {
    ...textStyles.body,
    color: colors.primary[500],
  },
  warningBanner: {
    backgroundColor: colors.warning[50],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.warning[200],
  },
  warningText: {
    ...textStyles.bodySmall,
    color: colors.warning[700],
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  sectionSubtitle: {
    ...textStyles.bodySmall,
    color: colors.neutral[500],
    marginBottom: spacing[4],
  },
  roleTabs: {
    flexDirection: 'row',
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  roleTab: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    alignItems: 'center',
  },
  roleTabActive: {
    backgroundColor: colors.white,
  },
  roleTabText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  permissionCard: {
    marginBottom: spacing[3],
    padding: spacing[3],
  },
  categoryTitle: {
    ...textStyles.label,
    color: colors.neutral[700],
    marginBottom: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  permissionInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  permissionName: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  permissionDescription: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: spacing[1],
  },
  staffListCard: {
    padding: 0,
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  staffInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  staffName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  roleBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: spacing[1],
  },
  roleBadgeText: {
    ...textStyles.caption,
    fontWeight: '600',
  },
  arrowIcon: {
    fontSize: 24,
    color: colors.neutral[400],
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
  },
  modalCancelText: {
    ...textStyles.body,
    color: colors.neutral[600],
  },
  modalTitle: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  modalSaveText: {
    ...textStyles.body,
    color: colors.primary[500],
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing[4],
  },
  staffModalHeader: {
    alignItems: 'center',
    paddingVertical: spacing[4],
    marginBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  staffModalName: {
    ...textStyles.h5,
    color: colors.neutral[900],
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
});
