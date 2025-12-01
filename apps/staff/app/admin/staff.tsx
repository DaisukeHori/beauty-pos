import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, Badge, Avatar, colors, spacing, textStyles, borderRadius, shadows } from '@beauty-pos/ui';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'stylist' | 'assistant';
  position: string;
  imageUrl: string;
  isActive: boolean;
  nominationFee: number;
  freeNominationFee: number;
  canReceiveNomination: boolean;
  specialties: string[];
  joinDate: string;
  birthDate: string;
}

type StaffRole = 'admin' | 'manager' | 'stylist' | 'assistant';

const roleLabels: Record<StaffRole, string> = {
  admin: '管理者',
  manager: '店長',
  stylist: 'スタイリスト',
  assistant: 'アシスタント',
};

const roleColors: Record<StaffRole, 'primary' | 'success' | 'info' | 'neutral'> = {
  admin: 'primary',
  manager: 'success',
  stylist: 'info',
  assistant: 'neutral',
};

const mockStaff: StaffMember[] = [
  {
    id: '1',
    name: '田中 美咲',
    email: 'tanaka@sakura-salon.jp',
    phone: '090-1234-5678',
    role: 'manager',
    position: '店長',
    imageUrl: '',
    isActive: true,
    nominationFee: 550,
    freeNominationFee: 0,
    canReceiveNomination: true,
    specialties: ['カット', 'カラー', 'パーマ'],
    joinDate: '2018-04-01',
    birthDate: '1990-05-15',
  },
  {
    id: '2',
    name: '佐藤 健一',
    email: 'sato@sakura-salon.jp',
    phone: '090-2345-6789',
    role: 'stylist',
    position: 'トップスタイリスト',
    imageUrl: '',
    isActive: true,
    nominationFee: 550,
    freeNominationFee: 0,
    canReceiveNomination: true,
    specialties: ['カット', 'メンズカット', 'パーマ'],
    joinDate: '2019-07-01',
    birthDate: '1988-03-20',
  },
  {
    id: '3',
    name: '山田 花子',
    email: 'yamada@sakura-salon.jp',
    phone: '090-3456-7890',
    role: 'stylist',
    position: 'スタイリスト',
    imageUrl: '',
    isActive: true,
    nominationFee: 330,
    freeNominationFee: 0,
    canReceiveNomination: true,
    specialties: ['カット', 'カラー', 'ヘアセット'],
    joinDate: '2021-04-01',
    birthDate: '1995-08-10',
  },
  {
    id: '4',
    name: '鈴木 太郎',
    email: 'suzuki@sakura-salon.jp',
    phone: '090-4567-8901',
    role: 'assistant',
    position: 'アシスタント',
    imageUrl: '',
    isActive: true,
    nominationFee: 0,
    freeNominationFee: 0,
    canReceiveNomination: false,
    specialties: ['シャンプー', 'ヘッドスパ'],
    joinDate: '2023-04-01',
    birthDate: '2001-12-25',
  },
];

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

const emptyStaff: Omit<StaffMember, 'id'> = {
  name: '',
  email: '',
  phone: '',
  role: 'stylist',
  position: '',
  imageUrl: '',
  isActive: true,
  nominationFee: 0,
  freeNominationFee: 0,
  canReceiveNomination: true,
  specialties: [],
  joinDate: new Date().toISOString().split('T')[0],
  birthDate: '',
};

export default function StaffManagementScreen() {
  const [staffList, setStaffList] = useState<StaffMember[]>(mockStaff);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('すべて');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState<Omit<StaffMember, 'id'>>(emptyStaff);

  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch =
      searchQuery === '' ||
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      selectedRole === 'すべて' || roleLabels[staff.role] === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...emptyStaff });
    setIsModalVisible(true);
  };

  const handleEdit = (item: StaffMember) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      email: item.email,
      phone: item.phone,
      role: item.role,
      position: item.position,
      imageUrl: item.imageUrl,
      isActive: item.isActive,
      nominationFee: item.nominationFee,
      freeNominationFee: item.freeNominationFee,
      canReceiveNomination: item.canReceiveNomination,
      specialties: [...item.specialties],
      joinDate: item.joinDate,
      birthDate: item.birthDate,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (item: StaffMember) => {
    Alert.alert(
      'スタッフ削除',
      `「${item.name}」を削除しますか？\n※削除されたスタッフの売上データは「削除済みスタッフ」として表示されます`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            setStaffList((prev) => prev.filter((s) => s.id !== item.id));
          },
        },
      ]
    );
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('エラー', 'スタッフ名を入力してください');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return;
    }

    if (editingItem) {
      setStaffList((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? { ...formData, id: item.id } : item
        )
      );
    } else {
      const newItem: StaffMember = {
        ...formData,
        id: Date.now().toString(),
      };
      setStaffList((prev) => [...prev, newItem]);
    }

    setIsModalVisible(false);
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const toggleActive = (item: StaffMember) => {
    setStaffList((prev) =>
      prev.map((s) =>
        s.id === item.id ? { ...s, isActive: !s.isActive } : s
      )
    );
  };

  const renderStaffItem = ({ item }: { item: StaffMember }) => (
    <Card variant="outlined" size="md" style={styles.staffCard}>
      <TouchableOpacity
        style={styles.staffCardContent}
        onPress={() => handleEdit(item)}
        activeOpacity={0.7}
      >
        <View style={styles.staffHeader}>
          <Avatar
            name={item.name}
            size="lg"
            imageUrl={item.imageUrl || undefined}
          />
          <View style={styles.staffInfo}>
            <View style={styles.staffNameRow}>
              <Text style={styles.staffName}>{item.name}</Text>
              {!item.isActive && (
                <Badge colorScheme="neutral" variant="subtle" size="sm">
                  休止中
                </Badge>
              )}
            </View>
            <Text style={styles.staffPosition}>{item.position}</Text>
            <Badge
              colorScheme={roleColors[item.role]}
              variant="subtle"
              size="sm"
            >
              {roleLabels[item.role]}
            </Badge>
          </View>
        </View>

        <View style={styles.staffDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>メール</Text>
            <Text style={styles.detailValue}>{item.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>電話</Text>
            <Text style={styles.detailValue}>{item.phone}</Text>
          </View>
          {item.canReceiveNomination && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>指名料</Text>
              <Text style={styles.detailValue}>
                ¥{item.nominationFee.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {item.specialties.length > 0 && (
          <View style={styles.specialtiesContainer}>
            <Text style={styles.specialtiesLabel}>担当技術:</Text>
            <View style={styles.specialtiesTags}>
              {item.specialties.map((specialty, index) => (
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
              {item.isActive ? '休止にする' : 'アクティブにする'}
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
            すべて
          </Text>
        </TouchableOpacity>
        {Object.entries(roleLabels).map(([role, label]) => (
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
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Staff List */}
      <FlatList
        data={filteredStaff}
        renderItem={renderStaffItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>スタッフがいません</Text>
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
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingItem ? 'スタッフ編集' : 'スタッフ追加'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>スタッフ名 *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(v) => setFormData((prev) => ({ ...prev, name: v }))}
                placeholder="氏名を入力"
                placeholderTextColor={colors.neutral[400]}
              />
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
              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
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
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>フリー指名料</Text>
                  <TextInput
                    style={styles.input}
                    value={
                      formData.freeNominationFee > 0
                        ? formData.freeNominationFee.toString()
                        : ''
                    }
                    onChangeText={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        freeNominationFee: parseInt(v) || 0,
                      }))
                    }
                    placeholder="0"
                    placeholderTextColor={colors.neutral[400]}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            )}

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>入社日</Text>
                <TextInput
                  style={styles.input}
                  value={formData.joinDate}
                  onChangeText={(v) =>
                    setFormData((prev) => ({ ...prev, joinDate: v }))
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
