import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, Badge, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import { couponService, type Coupon } from '@beauty-pos/api';

type DiscountType = 'percentage' | 'fixed' | 'free_item';

interface CouponForm {
  name: string;
  code: string;
  discountType: DiscountType;
  discountValue: string;
  minPurchase: string;
  maxDiscount: string;
  maxUses: string;
  maxUsesPerCustomer: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  description: string;
}

const defaultForm: CouponForm = {
  name: '',
  code: '',
  discountType: 'percentage',
  discountValue: '',
  minPurchase: '',
  maxDiscount: '',
  maxUses: '',
  maxUsesPerCustomer: '1',
  validFrom: new Date().toISOString().split('T')[0],
  validUntil: '',
  isActive: true,
  description: '',
};

export default function CouponsManagementScreen() {
  const { company } = useAuthStore();
  const { showToast } = useUIStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadCoupons = useCallback(async () => {
    if (!company?.id) return;

    try {
      setIsLoading(true);
      const data = await couponService.getAll(company.id);
      setCoupons(data);
    } catch (error) {
      console.error('Failed to load coupons:', error);
      showToast('クーポンの読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, showToast]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, code }));
  };

  const handleNew = () => {
    setEditingCoupon(null);
    setForm(defaultForm);
    generateCode();
    setShowModal(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      name: coupon.name,
      code: coupon.code,
      discountType: coupon.discount_type as DiscountType,
      discountValue: coupon.discount_value.toString(),
      minPurchase: coupon.min_purchase_amount?.toString() || '',
      maxDiscount: coupon.max_discount_amount?.toString() || '',
      maxUses: coupon.max_uses?.toString() || '',
      maxUsesPerCustomer: coupon.max_uses_per_customer?.toString() || '1',
      validFrom: coupon.valid_from?.split('T')[0] || '',
      validUntil: coupon.valid_until?.split('T')[0] || '',
      isActive: coupon.is_active,
      description: coupon.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!company?.id) return;

    if (!form.name || !form.code || !form.discountValue) {
      showToast('必須項目を入力してください', 'error');
      return;
    }

    try {
      setIsSaving(true);

      const couponData = {
        company_id: company.id,
        name: form.name,
        code: form.code.toUpperCase(),
        discount_type: form.discountType,
        discount_value: parseFloat(form.discountValue),
        min_purchase_amount: form.minPurchase ? parseFloat(form.minPurchase) : null,
        max_discount_amount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        max_uses: form.maxUses ? parseInt(form.maxUses) : null,
        max_uses_per_customer: form.maxUsesPerCustomer ? parseInt(form.maxUsesPerCustomer) : 1,
        valid_from: form.validFrom || null,
        valid_until: form.validUntil || null,
        is_active: form.isActive,
        description: form.description || null,
      };

      if (editingCoupon) {
        await couponService.update(editingCoupon.id, couponData);
        showToast('クーポンを更新しました', 'success');
      } else {
        await couponService.create(couponData);
        showToast('クーポンを作成しました', 'success');
      }

      setShowModal(false);
      loadCoupons();
    } catch (error) {
      console.error('Failed to save coupon:', error);
      showToast('クーポンの保存に失敗しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (coupon: Coupon) => {
    Alert.alert(
      'クーポン削除',
      `${coupon.name}を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await couponService.delete(coupon.id);
              showToast('クーポンを削除しました', 'success');
              loadCoupons();
            } catch (error) {
              showToast('削除に失敗しました', 'error');
            }
          },
        },
      ]
    );
  };

  const getDiscountLabel = (coupon: Coupon) => {
    switch (coupon.discount_type) {
      case 'percentage':
        return `${coupon.discount_value}%OFF`;
      case 'fixed':
        return `¥${coupon.discount_value.toLocaleString()}OFF`;
      case 'free_item':
        return '商品無料';
      default:
        return '';
    }
  };

  const isExpired = (coupon: Coupon) => {
    if (!coupon.valid_until) return false;
    return new Date(coupon.valid_until) < new Date();
  };

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
        <Text style={styles.headerTitle}>クーポン管理</Text>
        <Button size="sm" onPress={handleNew}>
          新規作成
        </Button>
      </View>

      {/* Coupon List */}
      <ScrollView style={styles.content}>
        {coupons.length === 0 ? (
          <Card variant="outlined" size="lg" style={styles.emptyCard}>
            <Text style={styles.emptyText}>クーポンがありません</Text>
            <Button variant="outline" onPress={handleNew} style={styles.emptyButton}>
              最初のクーポンを作成
            </Button>
          </Card>
        ) : (
          coupons.map(coupon => (
            <TouchableOpacity
              key={coupon.id}
              onPress={() => handleEdit(coupon)}
              activeOpacity={0.7}
            >
              <Card variant="outlined" size="md" style={styles.couponCard}>
                <View style={styles.couponHeader}>
                  <View style={styles.couponInfo}>
                    <Text style={styles.couponName}>{coupon.name}</Text>
                    <Text style={styles.couponCode}>{coupon.code}</Text>
                  </View>
                  <View style={styles.couponBadges}>
                    <Badge
                      colorScheme={coupon.is_active && !isExpired(coupon) ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {isExpired(coupon) ? '期限切れ' : coupon.is_active ? '有効' : '無効'}
                    </Badge>
                    <Text style={styles.discountBadge}>{getDiscountLabel(coupon)}</Text>
                  </View>
                </View>

                <View style={styles.couponDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>使用回数</Text>
                    <Text style={styles.detailValue}>
                      {coupon.used_count || 0}
                      {coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                    </Text>
                  </View>
                  {coupon.valid_until && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>有効期限</Text>
                      <Text style={styles.detailValue}>
                        {new Date(coupon.valid_until).toLocaleDateString('ja-JP')}
                      </Text>
                    </View>
                  )}
                  {coupon.min_purchase_amount && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>最低購入金額</Text>
                      <Text style={styles.detailValue}>
                        ¥{coupon.min_purchase_amount.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.couponActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    colorScheme="error"
                    onPress={() => handleDelete(coupon)}
                  >
                    削除
                  </Button>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingCoupon ? 'クーポン編集' : 'クーポン作成'}
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
            <View style={styles.formGroup}>
              <Text style={styles.label}>クーポン名 *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm(prev => ({ ...prev, name: v }))}
                placeholder="例: 初回限定10%OFF"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>クーポンコード *</Text>
              <View style={styles.codeInputRow}>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={form.code}
                  onChangeText={(v) => setForm(prev => ({ ...prev, code: v.toUpperCase() }))}
                  placeholder="WELCOME10"
                  placeholderTextColor={colors.neutral[400]}
                  autoCapitalize="characters"
                />
                <Button variant="outline" size="sm" onPress={generateCode}>
                  自動生成
                </Button>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>割引タイプ *</Text>
              <View style={styles.typeButtons}>
                {(['percentage', 'fixed', 'free_item'] as DiscountType[]).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      form.discountType === type && styles.typeButtonActive,
                    ]}
                    onPress={() => setForm(prev => ({ ...prev, discountType: type }))}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        form.discountType === type && styles.typeButtonTextActive,
                      ]}
                    >
                      {type === 'percentage' ? '割合' : type === 'fixed' ? '固定額' : '商品無料'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {form.discountType !== 'free_item' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  割引{form.discountType === 'percentage' ? '率(%)' : '額(円)'} *
                </Text>
                <TextInput
                  style={styles.input}
                  value={form.discountValue}
                  onChangeText={(v) => setForm(prev => ({ ...prev, discountValue: v }))}
                  placeholder={form.discountType === 'percentage' ? '10' : '1000'}
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="number-pad"
                />
              </View>
            )}

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>最低購入金額</Text>
                <TextInput
                  style={styles.input}
                  value={form.minPurchase}
                  onChangeText={(v) => setForm(prev => ({ ...prev, minPurchase: v }))}
                  placeholder="3000"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>最大割引額</Text>
                <TextInput
                  style={styles.input}
                  value={form.maxDiscount}
                  onChangeText={(v) => setForm(prev => ({ ...prev, maxDiscount: v }))}
                  placeholder="2000"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>使用回数上限</Text>
                <TextInput
                  style={styles.input}
                  value={form.maxUses}
                  onChangeText={(v) => setForm(prev => ({ ...prev, maxUses: v }))}
                  placeholder="100"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>1人あたり上限</Text>
                <TextInput
                  style={styles.input}
                  value={form.maxUsesPerCustomer}
                  onChangeText={(v) => setForm(prev => ({ ...prev, maxUsesPerCustomer: v }))}
                  placeholder="1"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>開始日</Text>
                <TextInput
                  style={styles.input}
                  value={form.validFrom}
                  onChangeText={(v) => setForm(prev => ({ ...prev, validFrom: v }))}
                  placeholder="2024-01-01"
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>終了日</Text>
                <TextInput
                  style={styles.input}
                  value={form.validUntil}
                  onChangeText={(v) => setForm(prev => ({ ...prev, validUntil: v }))}
                  placeholder="2024-12-31"
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>説明</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(v) => setForm(prev => ({ ...prev, description: v }))}
                placeholder="クーポンの説明（お客様に表示されます）"
                placeholderTextColor={colors.neutral[400]}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>有効</Text>
              <Switch
                value={form.isActive}
                onValueChange={(v) => setForm(prev => ({ ...prev, isActive: v }))}
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
  content: {
    flex: 1,
    padding: spacing[4],
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing[8],
  },
  emptyText: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginBottom: spacing[4],
  },
  emptyButton: {
    marginTop: spacing[2],
  },
  couponCard: {
    marginBottom: spacing[3],
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  couponInfo: {
    flex: 1,
  },
  couponName: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  couponCode: {
    ...textStyles.label,
    color: colors.primary[600],
    fontFamily: 'monospace',
  },
  couponBadges: {
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  discountBadge: {
    ...textStyles.labelLg,
    color: colors.error[600],
    fontWeight: 'bold',
  },
  couponDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing[3],
    gap: spacing[2],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  detailValue: {
    ...textStyles.caption,
    color: colors.neutral[700],
  },
  couponActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing[2],
  },
  bottomPadding: {
    height: spacing[8],
  },
  // Modal styles
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
  codeInputRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  codeInput: {
    flex: 1,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  typeButtonText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  typeButtonTextActive: {
    color: colors.primary[600],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
  },
  switchLabel: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
});
