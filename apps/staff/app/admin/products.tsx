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
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, Badge, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import { productService, type Product, type ProductInsert, type ProductUpdate } from '@beauty-pos/api';

interface ProductDisplay {
  id: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  barcode: string;
  imageUrl: string;
  isActive: boolean;
  taxRate: 10 | 8;
  sortOrder: number;
}

interface ProductCategory {
  id: string;
  name: string;
}

const defaultCategories: ProductCategory[] = [
  { id: '1', name: 'シャンプー' },
  { id: '2', name: 'トリートメント' },
  { id: '3', name: 'スタイリング剤' },
  { id: '4', name: 'ヘアケア' },
  { id: '5', name: 'スキンケア' },
  { id: '6', name: 'その他' },
];

const emptyProduct: Omit<ProductDisplay, 'id'> = {
  name: '',
  category: '',
  brand: '',
  description: '',
  price: 0,
  cost: 0,
  stock: 0,
  minStock: 5,
  barcode: '',
  imageUrl: '',
  isActive: true,
  taxRate: 10,
  sortOrder: 0,
};

export default function ProductManagementScreen() {
  const { company, store } = useAuthStore();
  const { showToast } = useUIStore();

  const [products, setProducts] = useState<ProductDisplay[]>([]);
  const [categories] = useState<ProductCategory[]>(defaultCategories);
  const [selectedCategory, setSelectedCategory] = useState<string>('すべて');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductDisplay | null>(null);
  const [formData, setFormData] = useState<Omit<ProductDisplay, 'id'>>(emptyProduct);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load products
  const loadProducts = useCallback(async () => {
    if (!company?.id || !store?.id) return;

    try {
      const data = await productService.getAll(company.id, store.id);
      setProducts(data.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category || '',
        brand: p.brand || '',
        description: p.description || '',
        price: p.selling_price,
        cost: p.cost_price || 0,
        stock: p.stock_quantity || 0,
        minStock: p.min_stock_quantity || 5,
        barcode: p.barcode || '',
        imageUrl: p.image_url || '',
        isActive: p.is_active,
        taxRate: (p.tax_rate === 8 ? 8 : 10) as 10 | 8,
        sortOrder: p.sort_order || 0,
      })));
    } catch (error) {
      console.error('Failed to load products:', error);
      showToast('商品の取得に失敗しました', 'error');
    }
  }, [company?.id, store?.id, showToast]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadProducts();
      setIsLoading(false);
    };
    init();
  }, [loadProducts]);

  const filteredProducts = products.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.includes(searchQuery);
    const matchesCategory =
      selectedCategory === 'すべて' || item.category === selectedCategory;
    const matchesStock = !showLowStock || item.stock <= item.minStock;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadProducts();
    setIsRefreshing(false);
  }, [loadProducts]);

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...emptyProduct, sortOrder: products.length + 1 });
    setIsModalVisible(true);
  };

  const handleEdit = (item: ProductDisplay) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      brand: item.brand,
      description: item.description,
      price: item.price,
      cost: item.cost,
      stock: item.stock,
      minStock: item.minStock,
      barcode: item.barcode,
      imageUrl: item.imageUrl,
      isActive: item.isActive,
      taxRate: item.taxRate,
      sortOrder: item.sortOrder,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (item: ProductDisplay) => {
    Alert.alert(
      '商品削除',
      `「${item.name}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.delete(item.id);
              setProducts((prev) => prev.filter((i) => i.id !== item.id));
              showToast('商品を削除しました', 'success');
            } catch (error) {
              console.error('Failed to delete product:', error);
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
      Alert.alert('エラー', '商品名を入力してください');
      return;
    }
    if (!formData.category) {
      Alert.alert('エラー', 'カテゴリを選択してください');
      return;
    }
    if (formData.price <= 0) {
      Alert.alert('エラー', '販売価格を入力してください');
      return;
    }

    setIsSaving(true);

    try {
      if (editingItem) {
        // Update
        const updateData: ProductUpdate = {
          name: formData.name,
          category: formData.category,
          brand: formData.brand || null,
          description: formData.description || null,
          selling_price: formData.price,
          cost_price: formData.cost || null,
          stock_quantity: formData.stock,
          min_stock_quantity: formData.minStock,
          barcode: formData.barcode || null,
          image_url: formData.imageUrl || null,
          is_active: formData.isActive,
          tax_rate: formData.taxRate,
          sort_order: formData.sortOrder,
        };

        await productService.update(editingItem.id, updateData);
        showToast('商品を更新しました', 'success');
      } else {
        // Create
        const insertData: ProductInsert = {
          company_id: company.id,
          store_id: store.id,
          name: formData.name,
          category: formData.category,
          brand: formData.brand || null,
          description: formData.description || null,
          selling_price: formData.price,
          cost_price: formData.cost || null,
          stock_quantity: formData.stock,
          min_stock_quantity: formData.minStock,
          barcode: formData.barcode || null,
          image_url: formData.imageUrl || null,
          is_active: formData.isActive,
          tax_rate: formData.taxRate,
          sort_order: formData.sortOrder,
        };

        await productService.create(insertData);
        showToast('商品を追加しました', 'success');
      }

      setIsModalVisible(false);
      loadProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      showToast('保存に失敗しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStockAdjust = async (item: ProductDisplay, delta: number) => {
    const newStock = Math.max(0, item.stock + delta);
    try {
      await productService.adjustStock(item.id, delta, delta > 0 ? 'purchase' : 'sale');
      setProducts((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, stock: newStock } : p))
      );
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      showToast('在庫調整に失敗しました', 'error');
    }
  };

  const renderProductItem = ({ item }: { item: ProductDisplay }) => {
    const isLowStock = item.stock <= item.minStock;
    const margin = item.price - item.cost;
    const marginRate = item.cost > 0 ? ((margin / item.cost) * 100).toFixed(0) : 0;

    return (
      <Card variant="outlined" size="md" style={styles.productCard}>
        <TouchableOpacity
          style={styles.productCardContent}
          onPress={() => handleEdit(item)}
          activeOpacity={0.7}
        >
          <View style={styles.productHeader}>
            <View style={styles.productImageContainer}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <Text style={styles.placeholderIcon}>📦</Text>
                </View>
              )}
            </View>
            <View style={styles.productInfo}>
              <View style={styles.productTitleRow}>
                <Text style={styles.productName} numberOfLines={1}>
                  {item.name}
                </Text>
                {!item.isActive && (
                  <Badge colorScheme="neutral" variant="subtle" size="sm">
                    非公開
                  </Badge>
                )}
              </View>
              <Text style={styles.productBrand}>{item.brand || 'ブランドなし'}</Text>
              <Badge colorScheme="primary" variant="subtle" size="sm">
                {item.category}
              </Badge>
            </View>
          </View>

          <View style={styles.productDetails}>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>販売価格</Text>
              <Text style={styles.detailValue}>
                ¥{item.price.toLocaleString()}
              </Text>
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>原価</Text>
              <Text style={styles.detailValueSmall}>
                ¥{item.cost.toLocaleString()}
              </Text>
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>利益率</Text>
              <Text style={styles.detailValueSmall}>{marginRate}%</Text>
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>在庫</Text>
              <Text
                style={[
                  styles.detailValue,
                  isLowStock && styles.detailValueWarning,
                ]}
              >
                {item.stock}
              </Text>
              {isLowStock && (
                <Text style={styles.lowStockText}>要発注</Text>
              )}
            </View>
          </View>

          <View style={styles.stockActions}>
            <Text style={styles.stockLabel}>在庫調整:</Text>
            <View style={styles.stockButtons}>
              <TouchableOpacity
                style={styles.stockButton}
                onPress={() => handleStockAdjust(item, -1)}
              >
                <Text style={styles.stockButtonText}>-1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stockButton}
                onPress={() => handleStockAdjust(item, 1)}
              >
                <Text style={styles.stockButtonText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stockButton}
                onPress={() => handleStockAdjust(item, 5)}
              >
                <Text style={styles.stockButtonText}>+5</Text>
              </TouchableOpacity>
            </View>
          </View>

          {item.barcode && (
            <Text style={styles.barcode}>JAN: {item.barcode}</Text>
          )}

          <View style={styles.productActions}>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>商品管理</Text>
        <Button size="sm" onPress={handleAdd}>
          新規追加
        </Button>
      </View>

      {/* Search & Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="商品名、バーコードで検索..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {lowStockCount > 0 && (
          <TouchableOpacity
            style={[
              styles.lowStockFilter,
              showLowStock && styles.lowStockFilterActive,
            ]}
            onPress={() => setShowLowStock(!showLowStock)}
          >
            <Text
              style={[
                styles.lowStockFilterText,
                showLowStock && styles.lowStockFilterTextActive,
              ]}
            >
              在庫少 ({lowStockCount})
            </Text>
          </TouchableOpacity>
        )}
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

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>商品がありません</Text>
            <Button size="sm" variant="outline" onPress={handleAdd} style={styles.emptyButton}>
              商品を追加
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
              {editingItem ? '商品編集' : '商品追加'}
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
              <Text style={styles.label}>商品名 *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(v) => setFormData((prev) => ({ ...prev, name: v }))}
                placeholder="商品名を入力"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>ブランド</Text>
              <TextInput
                style={styles.input}
                value={formData.brand}
                onChangeText={(v) => setFormData((prev) => ({ ...prev, brand: v }))}
                placeholder="ブランド名"
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
                placeholder="商品の説明"
                placeholderTextColor={colors.neutral[400]}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>販売価格 *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.price > 0 ? formData.price.toString() : ''}
                  onChangeText={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      price: parseInt(v) || 0,
                    }))
                  }
                  placeholder="0"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>原価</Text>
                <TextInput
                  style={styles.input}
                  value={formData.cost > 0 ? formData.cost.toString() : ''}
                  onChangeText={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      cost: parseInt(v) || 0,
                    }))
                  }
                  placeholder="0"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>在庫数</Text>
                <TextInput
                  style={styles.input}
                  value={formData.stock.toString()}
                  onChangeText={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      stock: parseInt(v) || 0,
                    }))
                  }
                  placeholder="0"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>最低在庫</Text>
                <TextInput
                  style={styles.input}
                  value={formData.minStock.toString()}
                  onChangeText={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      minStock: parseInt(v) || 0,
                    }))
                  }
                  placeholder="5"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>バーコード (JAN)</Text>
              <TextInput
                style={styles.input}
                value={formData.barcode}
                onChangeText={(v) =>
                  setFormData((prev) => ({ ...prev, barcode: v }))
                }
                placeholder="4901234567890"
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
                <Text style={styles.switchTitle}>販売する</Text>
                <Text style={styles.switchDescription}>
                  オフにすると商品選択時に表示されません
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing[4],
    paddingTop: 0,
    gap: spacing[2],
  },
  searchInputContainer: {
    flex: 1,
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
  lowStockFilter: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.warning[50],
    borderWidth: 1,
    borderColor: colors.warning[200],
  },
  lowStockFilterActive: {
    backgroundColor: colors.warning[500],
    borderColor: colors.warning[500],
  },
  lowStockFilterText: {
    ...textStyles.label,
    color: colors.warning[700],
  },
  lowStockFilterTextActive: {
    color: colors.white,
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
  productCard: {
    marginBottom: spacing[3],
  },
  productCardContent: {
    padding: spacing[1],
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginRight: spacing[3],
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
    opacity: 0.5,
  },
  productInfo: {
    flex: 1,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  productName: {
    ...textStyles.h6,
    color: colors.neutral[900],
    flex: 1,
  },
  productBrand: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[2],
  },
  productDetails: {
    flexDirection: 'row',
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  detailColumn: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  detailValue: {
    ...textStyles.h6,
    color: colors.neutral[900],
  },
  detailValueSmall: {
    ...textStyles.label,
    color: colors.neutral[700],
  },
  detailValueWarning: {
    color: colors.warning[600],
  },
  lowStockText: {
    ...textStyles.caption,
    color: colors.warning[600],
    marginTop: spacing[0.5],
  },
  stockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: spacing[2],
  },
  stockLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  stockButtons: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  stockButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  stockButtonText: {
    ...textStyles.label,
    color: colors.neutral[700],
  },
  barcode: {
    ...textStyles.caption,
    color: colors.neutral[400],
    marginTop: spacing[2],
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing[3],
    marginTop: spacing[2],
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
