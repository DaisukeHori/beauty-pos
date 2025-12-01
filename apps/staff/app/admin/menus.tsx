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
import { Card, Button, Badge, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import { menuService, type Menu, type MenuInsert, type MenuUpdate } from '@beauty-pos/api';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  shortPrice: number;
  mediumPrice: number;
  longPrice: number;
  duration: number;
  isActive: boolean;
  taxRate: 10 | 8;
  sortOrder: number;
}

interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

const defaultCategories: MenuCategory[] = [
  { id: '1', name: 'カット', sortOrder: 1 },
  { id: '2', name: 'カラー', sortOrder: 2 },
  { id: '3', name: 'パーマ', sortOrder: 3 },
  { id: '4', name: 'トリートメント', sortOrder: 4 },
  { id: '5', name: 'ヘッドスパ', sortOrder: 5 },
  { id: '6', name: 'セット', sortOrder: 6 },
];

const emptyMenuItem: Omit<MenuItem, 'id'> = {
  name: '',
  category: '',
  description: '',
  basePrice: 0,
  shortPrice: 0,
  mediumPrice: 0,
  longPrice: 0,
  duration: 60,
  isActive: true,
  taxRate: 10,
  sortOrder: 0,
};

export default function MenuManagementScreen() {
  const { company, store } = useAuthStore();
  const { showToast } = useUIStore();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories] = useState<MenuCategory[]>(defaultCategories);
  const [selectedCategory, setSelectedCategory] = useState<string>('すべて');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<Omit<MenuItem, 'id'>>(emptyMenuItem);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load menus
  const loadMenus = useCallback(async () => {
    if (!company?.id || !store?.id) return;

    try {
      const data = await menuService.getAll(company.id, store.id);
      setMenuItems(data.map(m => ({
        id: m.id,
        name: m.name,
        category: m.category || '',
        description: m.description || '',
        basePrice: m.price,
        shortPrice: m.price_short ? m.price_short - m.price : 0,
        mediumPrice: m.price_medium ? m.price_medium - m.price : 0,
        longPrice: m.price_long ? m.price_long - m.price : 0,
        duration: m.duration || 60,
        isActive: m.is_active,
        taxRate: (m.tax_rate === 8 ? 8 : 10) as 10 | 8,
        sortOrder: m.sort_order || 0,
      })));
    } catch (error) {
      console.error('Failed to load menus:', error);
      showToast('メニューの取得に失敗しました', 'error');
    }
  }, [company?.id, store?.id, showToast]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadMenus();
      setIsLoading(false);
    };
    init();
  }, [loadMenus]);

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'すべて' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMenus();
    setIsRefreshing(false);
  }, [loadMenus]);

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...emptyMenuItem, sortOrder: menuItems.length + 1 });
    setIsModalVisible(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      description: item.description,
      basePrice: item.basePrice,
      shortPrice: item.shortPrice,
      mediumPrice: item.mediumPrice,
      longPrice: item.longPrice,
      duration: item.duration,
      isActive: item.isActive,
      taxRate: item.taxRate,
      sortOrder: item.sortOrder,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (item: MenuItem) => {
    Alert.alert(
      'メニュー削除',
      `「${item.name}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await menuService.delete(item.id);
              setMenuItems((prev) => prev.filter((i) => i.id !== item.id));
              showToast('メニューを削除しました', 'success');
            } catch (error) {
              console.error('Failed to delete menu:', error);
              showToast('削除に失敗しました', 'error');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!company?.id || !store?.id) return;

    if (!formData.name.trim()) {
      Alert.alert('エラー', 'メニュー名を入力してください');
      return;
    }
    if (!formData.category) {
      Alert.alert('エラー', 'カテゴリを選択してください');
      return;
    }
    if (formData.basePrice <= 0) {
      Alert.alert('エラー', '基本価格を入力してください');
      return;
    }

    setIsSaving(true);

    try {
      if (editingItem) {
        // Update
        const updateData: MenuUpdate = {
          name: formData.name,
          category: formData.category,
          description: formData.description || null,
          price: formData.basePrice,
          price_short: formData.shortPrice > 0 ? formData.basePrice + formData.shortPrice : null,
          price_medium: formData.mediumPrice > 0 ? formData.basePrice + formData.mediumPrice : null,
          price_long: formData.longPrice > 0 ? formData.basePrice + formData.longPrice : null,
          duration: formData.duration,
          is_active: formData.isActive,
          tax_rate: formData.taxRate,
          sort_order: formData.sortOrder,
        };

        await menuService.update(editingItem.id, updateData);
        showToast('メニューを更新しました', 'success');
      } else {
        // Create
        const insertData: MenuInsert = {
          company_id: company.id,
          store_id: store.id,
          name: formData.name,
          category: formData.category,
          description: formData.description || null,
          price: formData.basePrice,
          price_short: formData.shortPrice > 0 ? formData.basePrice + formData.shortPrice : null,
          price_medium: formData.mediumPrice > 0 ? formData.basePrice + formData.mediumPrice : null,
          price_long: formData.longPrice > 0 ? formData.basePrice + formData.longPrice : null,
          duration: formData.duration,
          is_active: formData.isActive,
          tax_rate: formData.taxRate,
          sort_order: formData.sortOrder,
        };

        await menuService.create(insertData);
        showToast('メニューを追加しました', 'success');
      }

      setIsModalVisible(false);
      loadMenus();
    } catch (error) {
      console.error('Failed to save menu:', error);
      showToast('保存に失敗しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (item: MenuItem) => {
    try {
      await menuService.update(item.id, { is_active: !item.isActive });
      setMenuItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isActive: !i.isActive } : i
        )
      );
      showToast(item.isActive ? 'メニューを非公開にしました' : 'メニューを公開しました', 'success');
    } catch (error) {
      console.error('Failed to toggle menu:', error);
      showToast('更新に失敗しました', 'error');
    }
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <Card variant="outlined" size="md" style={styles.menuCard}>
      <TouchableOpacity
        style={styles.menuCardContent}
        onPress={() => handleEdit(item)}
        activeOpacity={0.7}
      >
        <View style={styles.menuCardHeader}>
          <View style={styles.menuCardTitleRow}>
            <Text style={styles.menuName}>{item.name}</Text>
            {!item.isActive && (
              <Badge colorScheme="neutral" variant="subtle" size="sm">
                非公開
              </Badge>
            )}
          </View>
          <Badge colorScheme="primary" variant="subtle" size="sm">
            {item.category}
          </Badge>
        </View>

        <Text style={styles.menuDescription} numberOfLines={1}>
          {item.description || '説明なし'}
        </Text>

        <View style={styles.menuCardPrices}>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>基本</Text>
            <Text style={styles.priceValue}>
              ¥{item.basePrice.toLocaleString()}
            </Text>
          </View>
          {item.shortPrice > 0 && (
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>S</Text>
              <Text style={styles.priceValueSmall}>
                +¥{item.shortPrice.toLocaleString()}
              </Text>
            </View>
          )}
          {item.mediumPrice > 0 && (
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>M</Text>
              <Text style={styles.priceValueSmall}>
                +¥{item.mediumPrice.toLocaleString()}
              </Text>
            </View>
          )}
          {item.longPrice > 0 && (
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>L</Text>
              <Text style={styles.priceValueSmall}>
                +¥{item.longPrice.toLocaleString()}
              </Text>
            </View>
          )}
          <View style={styles.durationItem}>
            <Text style={styles.durationText}>{item.duration}分</Text>
          </View>
        </View>

        <View style={styles.menuCardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleActive(item)}
          >
            <Text style={styles.actionButtonText}>
              {item.isActive ? '非公開にする' : '公開する'}
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
        <Text style={styles.headerTitle}>メニュー管理</Text>
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
            placeholder="メニュー名で検索..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === 'すべて' && styles.categoryButtonActive,
          ]}
          onPress={() => setSelectedCategory('すべて')}
        >
          <Text
            style={[
              styles.categoryText,
              selectedCategory === 'すべて' && styles.categoryTextActive,
            ]}
          >
            すべて
          </Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.name && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category.name)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.name && styles.categoryTextActive,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Menu List */}
      <FlatList
        data={filteredItems}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>メニューがありません</Text>
            <Button size="sm" variant="outline" onPress={handleAdd} style={styles.emptyButton}>
              メニューを追加
            </Button>
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
              {editingItem ? 'メニュー編集' : 'メニュー追加'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary[500]} />
              ) : (
                <Text style={styles.modalSave}>保存</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>メニュー名 *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(v) => setFormData((prev) => ({ ...prev, name: v }))}
                placeholder="メニュー名を入力"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>カテゴリ *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categorySelector}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categorySelectorItem,
                      formData.category === category.name &&
                        styles.categorySelectorItemActive,
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, category: category.name }))
                    }
                  >
                    <Text
                      style={[
                        styles.categorySelectorText,
                        formData.category === category.name &&
                          styles.categorySelectorTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>説明</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(v) =>
                  setFormData((prev) => ({ ...prev, description: v }))
                }
                placeholder="メニューの説明"
                placeholderTextColor={colors.neutral[400]}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>基本価格 *</Text>
              <TextInput
                style={styles.input}
                value={formData.basePrice > 0 ? formData.basePrice.toString() : ''}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    basePrice: parseInt(v) || 0,
                  }))
                }
                placeholder="0"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>髪の長さ別追加料金</Text>
              <View style={styles.priceRow}>
                <View style={styles.priceInputGroup}>
                  <Text style={styles.priceInputLabel}>ショート</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={
                      formData.shortPrice > 0 ? formData.shortPrice.toString() : ''
                    }
                    onChangeText={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        shortPrice: parseInt(v) || 0,
                      }))
                    }
                    placeholder="0"
                    placeholderTextColor={colors.neutral[400]}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.priceInputGroup}>
                  <Text style={styles.priceInputLabel}>ミディアム</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={
                      formData.mediumPrice > 0 ? formData.mediumPrice.toString() : ''
                    }
                    onChangeText={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        mediumPrice: parseInt(v) || 0,
                      }))
                    }
                    placeholder="0"
                    placeholderTextColor={colors.neutral[400]}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.priceInputGroup}>
                  <Text style={styles.priceInputLabel}>ロング</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={
                      formData.longPrice > 0 ? formData.longPrice.toString() : ''
                    }
                    onChangeText={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        longPrice: parseInt(v) || 0,
                      }))
                    }
                    placeholder="0"
                    placeholderTextColor={colors.neutral[400]}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>施術時間（分）</Text>
              <TextInput
                style={styles.input}
                value={formData.duration.toString()}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    duration: parseInt(v) || 0,
                  }))
                }
                placeholder="60"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>税率</Text>
              <View style={styles.taxRateSelector}>
                <TouchableOpacity
                  style={[
                    styles.taxRateOption,
                    formData.taxRate === 10 && styles.taxRateOptionActive,
                  ]}
                  onPress={() =>
                    setFormData((prev) => ({ ...prev, taxRate: 10 }))
                  }
                >
                  <Text
                    style={[
                      styles.taxRateText,
                      formData.taxRate === 10 && styles.taxRateTextActive,
                    ]}
                  >
                    10%（標準）
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.taxRateOption,
                    formData.taxRate === 8 && styles.taxRateOptionActive,
                  ]}
                  onPress={() => setFormData((prev) => ({ ...prev, taxRate: 8 }))}
                >
                  <Text
                    style={[
                      styles.taxRateText,
                      formData.taxRate === 8 && styles.taxRateTextActive,
                    ]}
                  >
                    8%（軽減）
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.switchTitle}>公開する</Text>
                <Text style={styles.switchDescription}>
                  オフにするとメニュー選択時に表示されません
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[50],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginTop: spacing[4],
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
  categoriesContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  categoriesContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  categoryButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    backgroundColor: colors.neutral[100],
  },
  categoryButtonActive: {
    backgroundColor: colors.primary[500],
  },
  categoryText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  categoryTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing[4],
  },
  menuCard: {
    marginBottom: spacing[3],
  },
  menuCardContent: {
    padding: spacing[1],
  },
  menuCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  menuCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  menuName: {
    ...textStyles.h6,
    color: colors.neutral[900],
  },
  menuDescription: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[3],
  },
  menuCardPrices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[0.5],
  },
  priceValue: {
    ...textStyles.h6,
    color: colors.primary[600],
  },
  priceValueSmall: {
    ...textStyles.label,
    color: colors.neutral[700],
  },
  durationItem: {
    marginLeft: 'auto',
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  durationText: {
    ...textStyles.caption,
    color: colors.neutral[600],
  },
  menuCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing[3],
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
  emptyButton: {
    marginTop: spacing[4],
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
  categorySelector: {
    flexDirection: 'row',
    marginTop: spacing[2],
  },
  categorySelectorItem: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    marginRight: spacing[2],
  },
  categorySelectorItemActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  categorySelectorText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  categorySelectorTextActive: {
    color: colors.primary[600],
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  priceInputGroup: {
    flex: 1,
  },
  priceInputLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  priceInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    ...textStyles.body,
    color: colors.neutral[900],
    textAlign: 'center',
  },
  taxRateSelector: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  taxRateOption: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  taxRateOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  taxRateText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  taxRateTextActive: {
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
