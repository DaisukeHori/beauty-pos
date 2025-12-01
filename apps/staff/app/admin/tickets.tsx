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
import { ticketService, menuService, type Ticket, type Menu } from '@beauty-pos/api';

interface TicketForm {
  name: string;
  menuId: string;
  totalUses: string;
  price: string;
  validDays: string;
  isActive: boolean;
  description: string;
}

const defaultForm: TicketForm = {
  name: '',
  menuId: '',
  totalUses: '5',
  price: '',
  validDays: '180',
  isActive: true,
  description: '',
};

export default function TicketsManagementScreen() {
  const { company } = useAuthStore();
  const { showToast } = useUIStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMenuSelector, setShowMenuSelector] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [form, setForm] = useState<TicketForm>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!company?.id) return;

    try {
      setIsLoading(true);
      const [ticketsData, menusData] = await Promise.all([
        ticketService.getTemplates(company.id),
        menuService.getAll(company.id),
      ]);
      setTickets(ticketsData);
      setMenus(menusData);
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('データの読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNew = () => {
    setEditingTicket(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setForm({
      name: ticket.name,
      menuId: ticket.menu_id || '',
      totalUses: ticket.total_uses.toString(),
      price: ticket.price.toString(),
      validDays: ticket.valid_days?.toString() || '180',
      isActive: ticket.is_active,
      description: ticket.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!company?.id) return;

    if (!form.name || !form.totalUses || !form.price) {
      showToast('必須項目を入力してください', 'error');
      return;
    }

    try {
      setIsSaving(true);

      const ticketData = {
        company_id: company.id,
        name: form.name,
        menu_id: form.menuId || null,
        total_uses: parseInt(form.totalUses),
        remaining_uses: parseInt(form.totalUses),
        price: parseFloat(form.price),
        valid_days: form.validDays ? parseInt(form.validDays) : null,
        is_active: form.isActive,
        description: form.description || null,
        is_template: true, // This is a template
      };

      if (editingTicket) {
        await ticketService.update(editingTicket.id, ticketData);
        showToast('回数券を更新しました', 'success');
      } else {
        await ticketService.create(ticketData);
        showToast('回数券を作成しました', 'success');
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to save ticket:', error);
      showToast('回数券の保存に失敗しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (ticket: Ticket) => {
    Alert.alert(
      '回数券削除',
      `${ticket.name}を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await ticketService.delete(ticket.id);
              showToast('回数券を削除しました', 'success');
              loadData();
            } catch (error) {
              showToast('削除に失敗しました', 'error');
            }
          },
        },
      ]
    );
  };

  const getMenuName = (menuId: string | null) => {
    if (!menuId) return '全メニュー対象';
    const menu = menus.find(m => m.id === menuId);
    return menu?.name || '不明なメニュー';
  };

  const calculateUnitPrice = (price: number, totalUses: number) => {
    return Math.floor(price / totalUses);
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
        <Text style={styles.headerTitle}>回数券管理</Text>
        <Button size="sm" onPress={handleNew}>
          新規作成
        </Button>
      </View>

      {/* Ticket List */}
      <ScrollView style={styles.content}>
        {tickets.length === 0 ? (
          <Card variant="outlined" size="lg" style={styles.emptyCard}>
            <Text style={styles.emptyText}>回数券がありません</Text>
            <Button variant="outline" onPress={handleNew} style={styles.emptyButton}>
              最初の回数券を作成
            </Button>
          </Card>
        ) : (
          tickets.map(ticket => (
            <TouchableOpacity
              key={ticket.id}
              onPress={() => handleEdit(ticket)}
              activeOpacity={0.7}
            >
              <Card variant="outlined" size="md" style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketName}>{ticket.name}</Text>
                    <Text style={styles.ticketMenu}>{getMenuName(ticket.menu_id)}</Text>
                  </View>
                  <Badge
                    colorScheme={ticket.is_active ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {ticket.is_active ? '販売中' : '販売停止'}
                  </Badge>
                </View>

                <View style={styles.ticketPricing}>
                  <View style={styles.pricingItem}>
                    <Text style={styles.pricingLabel}>販売価格</Text>
                    <Text style={styles.pricingValue}>¥{ticket.price.toLocaleString()}</Text>
                  </View>
                  <View style={styles.pricingItem}>
                    <Text style={styles.pricingLabel}>回数</Text>
                    <Text style={styles.pricingValue}>{ticket.total_uses}回</Text>
                  </View>
                  <View style={styles.pricingItem}>
                    <Text style={styles.pricingLabel}>1回あたり</Text>
                    <Text style={styles.pricingValueSmall}>
                      ¥{calculateUnitPrice(ticket.price, ticket.total_uses).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {ticket.valid_days && (
                  <View style={styles.ticketValidity}>
                    <Text style={styles.validityText}>
                      有効期限: 購入から{ticket.valid_days}日間
                    </Text>
                  </View>
                )}

                <View style={styles.ticketActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    colorScheme="error"
                    onPress={() => handleDelete(ticket)}
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
              {editingTicket ? '回数券編集' : '回数券作成'}
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
              <Text style={styles.label}>回数券名 *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm(prev => ({ ...prev, name: v }))}
                placeholder="例: カット5回券"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>対象メニュー</Text>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setShowMenuSelector(true)}
              >
                <Text style={form.menuId ? styles.selectorText : styles.selectorPlaceholder}>
                  {form.menuId ? getMenuName(form.menuId) : '全メニュー対象'}
                </Text>
                <Text style={styles.selectorArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>回数 *</Text>
                <TextInput
                  style={styles.input}
                  value={form.totalUses}
                  onChangeText={(v) => setForm(prev => ({ ...prev, totalUses: v }))}
                  placeholder="5"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>販売価格(税込) *</Text>
                <TextInput
                  style={styles.input}
                  value={form.price}
                  onChangeText={(v) => setForm(prev => ({ ...prev, price: v }))}
                  placeholder="25000"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {form.totalUses && form.price && (
              <View style={styles.pricePreview}>
                <Text style={styles.pricePreviewLabel}>1回あたりの価格</Text>
                <Text style={styles.pricePreviewValue}>
                  ¥{calculateUnitPrice(parseFloat(form.price) || 0, parseInt(form.totalUses) || 1).toLocaleString()}
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>有効期限(日数)</Text>
              <TextInput
                style={styles.input}
                value={form.validDays}
                onChangeText={(v) => setForm(prev => ({ ...prev, validDays: v }))}
                placeholder="180"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="number-pad"
              />
              <Text style={styles.hint}>購入日から何日間有効か（空欄で無期限）</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>説明</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(v) => setForm(prev => ({ ...prev, description: v }))}
                placeholder="回数券の説明（お客様に表示されます）"
                placeholderTextColor={colors.neutral[400]}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>販売中</Text>
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

      {/* Menu Selector Modal */}
      <Modal visible={showMenuSelector} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMenuSelector(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>対象メニュー選択</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setForm(prev => ({ ...prev, menuId: '' }));
                setShowMenuSelector(false);
              }}
            >
              <Text style={styles.menuItemText}>全メニュー対象</Text>
              {!form.menuId && <Text style={styles.menuItemCheck}>✓</Text>}
            </TouchableOpacity>

            {menus.map(menu => (
              <TouchableOpacity
                key={menu.id}
                style={styles.menuItem}
                onPress={() => {
                  setForm(prev => ({ ...prev, menuId: menu.id }));
                  setShowMenuSelector(false);
                }}
              >
                <View>
                  <Text style={styles.menuItemText}>{menu.name}</Text>
                  <Text style={styles.menuItemPrice}>
                    ¥{menu.base_price.toLocaleString()}
                  </Text>
                </View>
                {form.menuId === menu.id && <Text style={styles.menuItemCheck}>✓</Text>}
              </TouchableOpacity>
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
  ticketCard: {
    marginBottom: spacing[3],
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[0.5],
  },
  ticketMenu: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  ticketPricing: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  pricingItem: {
    flex: 1,
    alignItems: 'center',
  },
  pricingLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[0.5],
  },
  pricingValue: {
    ...textStyles.h6,
    color: colors.neutral[900],
  },
  pricingValueSmall: {
    ...textStyles.label,
    color: colors.success[600],
  },
  ticketValidity: {
    marginTop: spacing[2],
  },
  validityText: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  ticketActions: {
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
  hint: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[1],
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  selectorText: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  selectorPlaceholder: {
    ...textStyles.body,
    color: colors.neutral[400],
  },
  selectorArrow: {
    fontSize: 20,
    color: colors.neutral[400],
  },
  pricePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.success[50],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  pricePreviewLabel: {
    ...textStyles.label,
    color: colors.success[700],
  },
  pricePreviewValue: {
    ...textStyles.h6,
    color: colors.success[600],
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  menuItemText: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  menuItemPrice: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  menuItemCheck: {
    ...textStyles.h6,
    color: colors.primary[600],
  },
});
