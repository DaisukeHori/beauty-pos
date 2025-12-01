import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, Badge, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import { productService, type Product } from '@beauty-pos/api';

interface InventoryItem extends Product {
  lowStock: boolean;
  outOfStock: boolean;
}

type FilterType = 'all' | 'low' | 'out';

export default function InventoryScreen() {
  const { company, store } = useAuthStore();
  const { showToast } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isAdjustModalVisible, setIsAdjustModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'set' | 'add' | 'subtract'>('set');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const loadProducts = useCallback(async () => {
    if (!store?.id) return;

    try {
      setIsLoading(true);
      const productList = await productService.getByStore(store.id);

      const inventoryItems: InventoryItem[] = productList.map((product) => ({
        ...product,
        lowStock: (product.stock || 0) > 0 && (product.stock || 0) <= (product.low_stock_threshold || 5),
        outOfStock: (product.stock || 0) === 0,
      }));

      setProducts(inventoryItems);
    } catch (error) {
      console.error('Failed to load products:', error);
      showToast('商品の読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [store?.id, showToast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleAdjustStock = (product: InventoryItem) => {
    setSelectedProduct(product);
    setAdjustmentType('set');
    setAdjustmentValue(product.stock?.toString() || '0');
    setAdjustmentReason('');
    setIsAdjustModalVisible(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedProduct) return;

    const value = parseInt(adjustmentValue, 10);
    if (isNaN(value)) {
      showToast('有効な数値を入力してください', 'error');
      return;
    }

    let newStock: number;
    switch (adjustmentType) {
      case 'set':
        newStock = value;
        break;
      case 'add':
        newStock = (selectedProduct.stock || 0) + value;
        break;
      case 'subtract':
        newStock = Math.max(0, (selectedProduct.stock || 0) - value);
        break;
    }

    try {
      await productService.update(selectedProduct.id, {
        stock: newStock,
      });

      showToast('在庫を更新しました', 'success');
      setIsAdjustModalVisible(false);
      loadProducts();
    } catch (error) {
      console.error('Failed to update stock:', error);
      showToast('在庫の更新に失敗しました', 'error');
    }
  };

  const filteredProducts = products.filter((product) => {
    // Apply filter
    if (filter === 'low' && !product.lowStock) return false;
    if (filter === 'out' && !product.outOfStock) return false;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.brand?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const getStockStatusBadge = (item: InventoryItem) => {
    if (item.outOfStock) {
      return (
        <Badge colorScheme="error" variant="solid" size="sm">
          在庫切れ
        </Badge>
      );
    }
    if (item.lowStock) {
      return (
        <Badge colorScheme="warning" variant="solid" size="sm">
          在庫少
        </Badge>
      );
    }
    return (
      <Badge colorScheme="success" variant="subtle" size="sm">
        在庫あり
      </Badge>
    );
  };

  const getStats = () => {
    const total = products.length;
    const lowStock = products.filter((p) => p.lowStock).length;
    const outOfStock = products.filter((p) => p.outOfStock).length;
    const inStock = total - lowStock - outOfStock;
    return { total, inStock, lowStock, outOfStock };
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
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
        <Text style={styles.headerTitle}>在庫管理</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>総商品数</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success[600] }]}>{stats.inStock}</Text>
          <Text style={styles.statLabel}>在庫あり</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning[600] }]}>{stats.lowStock}</Text>
          <Text style={styles.statLabel}>在庫少</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.error[600] }]}>{stats.outOfStock}</Text>
          <Text style={styles.statLabel}>在庫切れ</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="商品名・SKU・ブランドで検索"
          placeholderTextColor={colors.neutral[400]}
        />

        <View style={styles.filterButtons}>
          {(['all', 'low', 'out'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterButtonActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterButtonText, filter === f && styles.filterButtonTextActive]}>
                {f === 'all' ? 'すべて' : f === 'low' ? '在庫少' : '在庫切れ'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {filteredProducts.map((product) => (
          <Card key={product.id} variant="outlined" size="md" style={styles.productCard}>
            <View style={styles.productHeader}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <View style={styles.productMeta}>
                  {product.brand && <Text style={styles.productBrand}>{product.brand}</Text>}
                  {product.sku && <Text style={styles.productSku}>SKU: {product.sku}</Text>}
                </View>
              </View>
              {getStockStatusBadge(product)}
            </View>

            <View style={styles.stockRow}>
              <View style={styles.stockInfo}>
                <Text style={styles.stockLabel}>現在庫数</Text>
                <Text
                  style={[
                    styles.stockValue,
                    product.outOfStock && styles.stockValueOut,
                    product.lowStock && styles.stockValueLow,
                  ]}
                >
                  {product.stock || 0}
                </Text>
              </View>
              <View style={styles.stockInfo}>
                <Text style={styles.stockLabel}>警告閾値</Text>
                <Text style={styles.stockThreshold}>{product.low_stock_threshold || 5}</Text>
              </View>
              <View style={styles.stockInfo}>
                <Text style={styles.stockLabel}>単価</Text>
                <Text style={styles.stockPrice}>¥{(product.price || 0).toLocaleString()}</Text>
              </View>
              <Button size="sm" variant="outline" onPress={() => handleAdjustStock(product)}>
                調整
              </Button>
            </View>
          </Card>
        ))}

        {filteredProducts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? '検索結果がありません' : '商品がありません'}
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Adjustment Modal */}
      <Modal
        visible={isAdjustModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAdjustModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsAdjustModalVisible(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>在庫調整</Text>
            <TouchableOpacity onPress={handleSaveAdjustment}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedProduct && (
              <>
                <Card variant="outlined" size="md" style={styles.modalProductCard}>
                  <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                  <Text style={styles.modalProductStock}>
                    現在庫: {selectedProduct.stock || 0}個
                  </Text>
                </Card>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>調整タイプ</Text>
                  <View style={styles.adjustTypeSelector}>
                    {(['set', 'add', 'subtract'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.adjustTypeButton,
                          adjustmentType === type && styles.adjustTypeButtonActive,
                        ]}
                        onPress={() => setAdjustmentType(type)}
                      >
                        <Text
                          style={[
                            styles.adjustTypeText,
                            adjustmentType === type && styles.adjustTypeTextActive,
                          ]}
                        >
                          {type === 'set' ? '設定' : type === 'add' ? '入荷' : '出庫'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    {adjustmentType === 'set'
                      ? '新しい在庫数'
                      : adjustmentType === 'add'
                      ? '入荷数'
                      : '出庫数'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={adjustmentValue}
                    onChangeText={setAdjustmentValue}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.neutral[400]}
                  />
                </View>

                {adjustmentType !== 'set' && (
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewLabel}>調整後の在庫数</Text>
                    <Text style={styles.previewValue}>
                      {adjustmentType === 'add'
                        ? (selectedProduct.stock || 0) + (parseInt(adjustmentValue, 10) || 0)
                        : Math.max(
                            0,
                            (selectedProduct.stock || 0) - (parseInt(adjustmentValue, 10) || 0)
                          )}
                      個
                    </Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>理由（任意）</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={adjustmentReason}
                    onChangeText={setAdjustmentReason}
                    placeholder="棚卸し、破損、入荷など"
                    placeholderTextColor={colors.neutral[400]}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </>
            )}

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
    padding: spacing[1],
  },
  backButtonText: {
    ...textStyles.body,
    color: colors.primary[600],
  },
  headerTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...textStyles.h4,
    color: colors.neutral[900],
  },
  statLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  filterSection: {
    backgroundColor: colors.white,
    padding: spacing[4],
    gap: spacing[3],
  },
  searchInput: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    ...textStyles.body,
    color: colors.neutral[900],
  },
  filterButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary[500],
  },
  filterButtonText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: spacing[4],
  },
  productCard: {
    marginBottom: spacing[3],
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[0.5],
  },
  productMeta: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  productBrand: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  productSku: {
    ...textStyles.caption,
    color: colors.neutral[400],
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  stockInfo: {
    flex: 1,
  },
  stockLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[0.5],
  },
  stockValue: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  stockValueLow: {
    color: colors.warning[600],
  },
  stockValueOut: {
    color: colors.error[600],
  },
  stockThreshold: {
    ...textStyles.body,
    color: colors.neutral[600],
  },
  stockPrice: {
    ...textStyles.body,
    color: colors.neutral[600],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  emptyText: {
    ...textStyles.body,
    color: colors.neutral[500],
  },
  bottomPadding: {
    height: spacing[8],
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
  modalProductCard: {
    marginBottom: spacing[4],
    alignItems: 'center',
  },
  modalProductName: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  modalProductStock: {
    ...textStyles.body,
    color: colors.neutral[500],
  },
  formGroup: {
    marginBottom: spacing[4],
  },
  label: {
    ...textStyles.label,
    color: colors.neutral[700],
    marginBottom: spacing[2],
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
  adjustTypeSelector: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  adjustTypeButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  adjustTypeButtonActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  adjustTypeText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  adjustTypeTextActive: {
    color: colors.primary[600],
  },
  previewContainer: {
    backgroundColor: colors.primary[50],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  previewLabel: {
    ...textStyles.caption,
    color: colors.primary[600],
    marginBottom: spacing[1],
  },
  previewValue: {
    ...textStyles.h4,
    color: colors.primary[700],
  },
});
