import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Switch,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, Badge, Avatar, colors, spacing, textStyles, borderRadius, shadows } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import { staffService, Staff } from '@beauty-pos/api';

type StaffRole = 'owner' | 'manager' | 'stylist' | 'assistant';

const roleLabels: Record<StaffRole, string> = {
  owner: 'オーナー',
  manager: '店長',
  stylist: 'スタイリスト',
  assistant: 'アシスタント',
};

const roleColors: Record<StaffRole, 'primary' | 'success' | 'info' | 'neutral'> = {
  owner: 'primary',
  manager: 'success',
  stylist: 'info',
  assistant: 'neutral',
};

const specialtyOptions = [
  'カット',
  'カラー',
  'パーマ',
  'トリートメント',
  'ヘッドスパ',
  'ヘアセット',
  'メンズカット',
  'シャンプー',
  '着付け',
  'メイク',
];

interface FormData {
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  phone: string;
  role: StaffRole;
  position: string;
  isActive: boolean;
  nominationFee: number;
  canReceiveNomination: boolean;
  specialties: string[];
  hireDate: string;
  birthDate: string;
  bio: string;
}

const emptyFormData: FormData = {
  lastName: '',
  firstName: '',
  lastNameKana: '',
  firstNameKana: '',
  email: '',
  phone: '',
  role: 'stylist',
  position: '',
  isActive: true,
  nominationFee: 0,
  canReceiveNomination: true,
  specialties: [],
  hireDate: new Date().toISOString().split('T')[0],
  birthDate: '',
  bio: '',
};

export default function StaffManagementScreen() {
  const { company, store } = useAuthStore();
  const { showToast } = useUIStore();

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('すべて');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    if (!company?.id) return;

    try {
      // If store is selected, get staff for that store; otherwise get all company staff
      let staffData: Staff[];
      if (store?.id) {
        staffData = await staffService.getByStore(store.id);
      } else {
        staffData = await staffService.getAll(company.id);
      }
      setStaffList(staffData);
    } catch (error) {
      console.error('Error loading staff:', error);
      showToast('スタッフ情報の取得に失敗しました', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [company?.id, store?.id, showToast]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadStaff();
  };

  const filteredStaff = staffList.filter((staff) => {
    const fullName = `${staff.last_name} ${staff.first_name}`;
    const matchesSearch =
      searchQuery === '' ||
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.email && staff.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole =
      selectedRole === 'すべて' || roleLabels[staff.role as StaffRole] === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...emptyFormData });
    setIsModalVisible(true);
  };

  const handleEdit = (item: Staff) => {
    setEditingItem(item);
    setFormData({
      lastName: item.last_name || '',
      firstName: item.first_name || '',
      lastNameKana: item.last_name_kana || '',
      firstNameKana: item.first_name_kana || '',
      email: item.email || '',
      phone: item.phone || '',
      role: (item.role as StaffRole) || 'stylist',
      position: item.rank || '',
      isActive: item.is_active,
      nominationFee: item.nomination_fee || 0,
      canReceiveNomination: (item.nomination_fee || 0) > 0 || item.role === 'stylist',
      specialties: item.specialties || [],
      hireDate: item.hire_date || '',
      birthDate: item.birth_date || '',
      bio: item.bio || '',
    });
    setIsModalVisible(true);
  };

  const handleDelete = (item: Staff) => {
    const fullName = `${item.last_name} ${item.first_name}`;
    Alert.alert(
      'スタッフ削除',
      `「${fullName}」を削除しますか？\n※削除されたスタッフの売上データは「削除済みスタッフ」として表示されます`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await staffService.delete(item.id);
              showToast('スタッフを削除しました', 'success');
              loadStaff();
            } catch (error) {
              console.error('Error deleting staff:', error);
              showToast('スタッフの削除に失敗しました', 'error');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.lastName.trim() || !formData.firstName.trim()) {
      Alert.alert('エラー', 'スタッフ名を入力してください');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return;
    }
    if (!company?.id) {
      Alert.alert('エラー', '会社情報が取得できません');
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        // Update existing staff
        await staffService.update(editingItem.id, {
          last_name: formData.lastName,
          first_name: formData.firstName,
          last_name_kana: formData.lastNameKana || null,
          first_name_kana: formData.firstNameKana || null,
          email: formData.email,
          phone: formData.phone || null,
          role: formData.role,
          rank: formData.position || null,
          is_active: formData.isActive,
          nomination_fee: formData.canReceiveNomination ? formData.nominationFee : 0,
          specialties: formData.specialties,
          hire_date: formData.hireDate || null,
          birth_date: formData.birthDate || null,
          bio: formData.bio || null,
        });
        showToast('スタッフを更新しました', 'success');
      } else {
        // Create new staff
        const employeeCode = await staffService.generateEmployeeCode(company.id);
        const newStaff = await staffService.create({
          company_id: company.id,
          employee_code: employeeCode,
          last_name: formData.lastName,
          first_name: formData.firstName,
          last_name_kana: formData.lastNameKana || null,
          first_name_kana: formData.firstNameKana || null,
          email: formData.email,
          phone: formData.phone || null,
          role: formData.role,
          rank: formData.position || null,
          is_active: formData.isActive,
          nomination_fee: formData.canReceiveNomination ? formData.nominationFee : 0,
          specialties: formData.specialties,
          hire_date: formData.hireDate || null,
          birth_date: formData.birthDate || null,
          bio: formData.bio || null,
          sns_links: {},
          settings: {},
        });

        // Assign to current store if available
        if (store?.id && newStaff) {
          await staffService.assignToStore(newStaff.id, store.id, true);
        }

        showToast('スタッフを追加しました', 'success');
      }

      setIsModalVisible(false);
      loadStaff();
    } catch (error) {
      console.error('Error saving staff:', error);
      showToast(editingItem ? 'スタッフの更新に失敗しました' : 'スタッフの追加に失敗しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const toggleActive = async (item: Staff) => {
    try {
      await staffService.update(item.id, {
        is_active: !item.is_active,
      });
      showToast(
        item.is_active ? 'スタッフを休止にしました' : 'スタッフをアクティブにしました',
        'success'
      );
      loadStaff();
    } catch (error) {
      console.error('Error toggling staff active status:', error);
      showToast('ステータスの変更に失敗しました', 'error');
    }
  };

  const getDisplayName = (staff: Staff) => {
    return `${staff.last_name} ${staff.first_name}`;
  };

  const getPositionLabel = (staff: Staff) => {
    if (staff.rank) {
      switch (staff.rank) {
        case 'jr': return 'ジュニアスタイリスト';
        case 'stylist': return 'スタイリスト';
        case 'top_stylist': return 'トップスタイリスト';
        case 'director': return 'ディレクター';
        default: return staff.rank;
      }
    }
    return roleLabels[staff.role as StaffRole] || staff.role;
  };

  const renderStaffItem = ({ item }: { item: Staff }) => (
    <Card variant="outlined" size="md" style={styles.staffCard}>
      <TouchableOpacity
        style={styles.staffCardContent}
        onPress={() => handleEdit(item)}
        activeOpacity={0.7}
      >
        <View style={styles.staffHeader}>
          <Avatar
            name={getDisplayName(item)}
            size="lg"
            imageUrl={item.avatar_url || undefined}
          />
          <View style={styles.staffInfo}>
            <View style={styles.staffNameRow}>
              <Text style={styles.staffName}>{getDisplayName(item)}</Text>
              {!item.is_active && (
                <Badge colorScheme="neutral" variant="subtle" size="sm">
                  休止中
                </Badge>
              )}
            </View>
            <Text style={styles.staffPosition}>{getPositionLabel(item)}</Text>
            <Badge
              colorScheme={roleColors[item.role as StaffRole] || 'neutral'}
              variant="subtle"
              size="sm"
            >
              {roleLabels[item.role as StaffRole] || item.role}
            </Badge>
          </View>
        </View>

        <View style={styles.staffDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>メール</Text>
            <Text style={styles.detailValue}>{item.email || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>電話</Text>
            <Text style={styles.detailValue}>{item.phone || '-'}</Text>
          </View>
          {item.nomination_fee && item.nomination_fee > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>指名料</Text>
              <Text style={styles.detailValue}>
                ¥{item.nomination_fee.toLocaleString()}
              </Text>
            </View>
          )}
          {item.employee_code && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>社員番号</Text>
              <Text style={styles.detailValue}>{item.employee_code}</Text>
            </View>
          )}
        </View>

        {item.specialties && item.specialties.length > 0 && (
          <View style={styles.specialtiesContainer}>
            <Text style={styles.specialtiesLabel}>担当技術:</Text>
            <View style={styles.specialtiesTags}>
              {item.specialties.map((specialty: string, index: number) => (
                <Badge
                  key={index}
                  colorScheme="primary"
                  variant="outline"
                  size="sm"
                  style={styles.specialtyTag}
                >
                  {specialty}
                </Badge>
              ))}
            </View>
          </View>
        )}

        <View style={styles.staffActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleActive(item)}
          >
            <Text style={styles.actionButtonText}>
              {item.is_active ? '休止にする' : 'アクティブにする'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDanger]}
            onPress={() => handleDelete(item)}
          >
            <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
              削除
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Card>
  );

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>スタッフ管理</Text>
        <Button size="sm" onPress={handleAdd}>
          新規追加
        </Button>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="名前、メールで検索..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Role Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rolesContainer}
        contentContainerStyle={styles.rolesContent}
      >
        <TouchableOpacity
          style={[
            styles.roleButton,
            selectedRole === 'すべて' && styles.roleButtonActive,
          ]}
          onPress={() => setSelectedRole('すべて')}
        >
          <Text
            style={[
              styles.roleText,
              selectedRole === 'すべて' && styles.roleTextActive,
            ]}
          >
            すべて ({staffList.length})
          </Text>
        </TouchableOpacity>
        {Object.entries(roleLabels).map(([role, label]) => {
          const count = staffList.filter((s) => s.role === role).length;
          return (
            <TouchableOpacity
              key={role}
              style={[
                styles.roleButton,
                selectedRole === label && styles.roleButtonActive,
              ]}
              onPress={() => setSelectedRole(label)}
            >
              <Text
                style={[
                  styles.roleText,
                  selectedRole === label && styles.roleTextActive,
                ]}
              >
                {label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Staff List */}
      <FlatList
        data={filteredStaff}
        renderItem={renderStaffItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? '検索結果がありません' : 'スタッフがいません'}
            </Text>
            {!searchQuery && (
              <Button size="sm" variant="outline" onPress={handleAdd} style={{ marginTop: spacing[4] }}>
                スタッフを追加
              </Button>
            )}
          </View>
        }
      />

      {/* Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)} disabled={isSaving}>
              <Text style={[styles.modalCancel, isSaving && { opacity: 0.5 }]}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingItem ? 'スタッフ編集' : 'スタッフ追加'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary[600]} />
              ) : (
                <Text style={styles.modalSave}>保存</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>姓 *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(v) => setFormData((prev) => ({ ...prev, lastName: v }))}
                  placeholder="山田"
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>名 *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(v) => setFormData((prev) => ({ ...prev, firstName: v }))}
                  placeholder="太郎"
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>姓（カナ）</Text>
                <TextInput
                  style={styles.input}
                  value={formData.lastNameKana}
                  onChangeText={(v) => setFormData((prev) => ({ ...prev, lastNameKana: v }))}
                  placeholder="ヤマダ"
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>名（カナ）</Text>
                <TextInput
                  style={styles.input}
                  value={formData.firstNameKana}
                  onChangeText={(v) => setFormData((prev) => ({ ...prev, firstNameKana: v }))}
                  placeholder="タロウ"
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>メールアドレス *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(v) => setFormData((prev) => ({ ...prev, email: v }))}
                placeholder="email@example.com"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>電話番号</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(v) => setFormData((prev) => ({ ...prev, phone: v }))}
                placeholder="090-0000-0000"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>役職 *</Text>
              <View style={styles.roleSelector}>
                {(Object.entries(roleLabels) as [StaffRole, string][]).map(
                  ([role, label]) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleSelectorItem,
                        formData.role === role && styles.roleSelectorItemActive,
                      ]}
                      onPress={() =>
                        setFormData((prev) => ({ ...prev, role }))
                      }
                    >
                      <Text
                        style={[
                          styles.roleSelectorText,
                          formData.role === role && styles.roleSelectorTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>肩書き</Text>
              <TextInput
                style={styles.input}
                value={formData.position}
                onChangeText={(v) =>
                  setFormData((prev) => ({ ...prev, position: v }))
                }
                placeholder="トップスタイリスト、店長など"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>自己紹介</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.bio}
                onChangeText={(v) =>
                  setFormData((prev) => ({ ...prev, bio: v }))
                }
                placeholder="スタッフの紹介文を入力..."
                placeholderTextColor={colors.neutral[400]}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>担当技術</Text>
              <View style={styles.specialtySelector}>
                {specialtyOptions.map((specialty) => (
                  <TouchableOpacity
                    key={specialty}
                    style={[
                      styles.specialtyOption,
                      formData.specialties.includes(specialty) &&
                        styles.specialtyOptionActive,
                    ]}
                    onPress={() => toggleSpecialty(specialty)}
                  >
                    <Text
                      style={[
                        styles.specialtyOptionText,
                        formData.specialties.includes(specialty) &&
                          styles.specialtyOptionTextActive,
                      ]}
                    >
                      {specialty}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.switchTitle}>指名を受け付ける</Text>
                <Text style={styles.switchDescription}>
                  オンにすると顧客から指名を受けられます
                </Text>
              </View>
              <Switch
                value={formData.canReceiveNomination}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, canReceiveNomination: v }))
                }
                trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
              />
            </View>

            {formData.canReceiveNomination && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>指名料</Text>
                <TextInput
                  style={styles.input}
                  value={
                    formData.nominationFee > 0
                      ? formData.nominationFee.toString()
                      : ''
                  }
                  onChangeText={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      nominationFee: parseInt(v) || 0,
                    }))
                  }
                  placeholder="550"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="number-pad"
                />
              </View>
            )}

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>入社日</Text>
                <TextInput
                  style={styles.input}
                  value={formData.hireDate}
                  onChangeText={(v) =>
                    setFormData((prev) => ({ ...prev, hireDate: v }))
                  }
                  placeholder="2024-01-01"
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>生年月日</Text>
                <TextInput
                  style={styles.input}
                  value={formData.birthDate}
                  onChangeText={(v) =>
                    setFormData((prev) => ({ ...prev, birthDate: v }))
                  }
                  placeholder="1990-01-01"
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.switchTitle}>アクティブ</Text>
                <Text style={styles.switchDescription}>
                  オフにすると予約受付や売上計上ができなくなります
                </Text>
              </View>
              <Switch
                value={formData.isActive}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, isActive: v }))
                }
                trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
              />
            </View>

            <View style={styles.bottomPadding} />
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
  loadingText: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginTop: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    paddingVertical: spacing[1],
  },
  backButtonText: {
    ...textStyles.body,
    color: colors.primary[600],
  },
  headerTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  searchContainer: {
    backgroundColor: colors.white,
    padding: spacing[4],
    paddingTop: 0,
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
  rolesContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  rolesContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  roleButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    backgroundColor: colors.neutral[100],
  },
  roleButtonActive: {
    backgroundColor: colors.primary[500],
  },
  roleText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  roleTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing[4],
  },
  staffCard: {
    marginBottom: spacing[3],
  },
  staffCardContent: {
    padding: spacing[1],
  },
  staffHeader: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  staffInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  staffName: {
    ...textStyles.h6,
    color: colors.neutral[900],
  },
  staffPosition: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[2],
  },
  staffDetails: {
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  detailLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  detailValue: {
    ...textStyles.body,
    color: colors.neutral[700],
  },
  specialtiesContainer: {
    paddingTop: spacing[2],
  },
  specialtiesLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[2],
  },
  specialtiesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  specialtyTag: {
    marginBottom: spacing[1],
  },
  staffActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing[3],
    marginTop: spacing[3],
  },
  actionButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  actionButtonDanger: {
    backgroundColor: colors.error[50],
  },
  actionButtonText: {
    ...textStyles.caption,
    color: colors.neutral[600],
  },
  actionButtonTextDanger: {
    color: colors.error[600],
  },
  emptyContainer: {
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  modalCancel: {
    ...textStyles.body,
    color: colors.neutral[600],
  },
  modalTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  modalSave: {
    ...textStyles.body,
    color: colors.primary[600],
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing[4],
  },
  formGroup: {
    marginBottom: spacing[4],
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  formGroupHalf: {
    flex: 1,
  },
  label: {
    ...textStyles.label,
    color: colors.neutral[700],
    marginBottom: spacing[1],
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    ...textStyles.body,
    color: colors.neutral[900],
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  roleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  roleSelectorItem: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  roleSelectorItemActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  roleSelectorText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  roleSelectorTextActive: {
    color: colors.primary[600],
  },
  specialtySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  specialtyOption: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  specialtyOptionActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  specialtyOptionText: {
    ...textStyles.caption,
    color: colors.neutral[600],
  },
  specialtyOptionTextActive: {
    color: colors.primary[600],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  switchLabel: {
    flex: 1,
    marginRight: spacing[3],
  },
  switchTitle: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  switchDescription: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  bottomPadding: {
    height: spacing[8],
  },
});
