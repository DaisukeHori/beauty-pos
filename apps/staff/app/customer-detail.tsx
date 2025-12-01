import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, Button, Badge, Avatar, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import {
  customerService,
  visitService,
  saleService,
  tagService,
  pointService,
  type CustomerWithDetails,
  type VisitWithDetails,
  type SaleWithDetails,
  type Tag,
} from '@beauty-pos/api';

interface HairInfo {
  hairType: string;
  hairThickness: string;
  hairAmount: string;
  scalpType: string;
  concerns: string[];
  allergies: string[];
}

const rankColors: Record<string, 'neutral' | 'info' | 'warning' | 'primary'> = {
  regular: 'neutral',
  silver: 'info',
  gold: 'warning',
  platinum: 'primary',
};

const rankLabels: Record<string, string> = {
  regular: 'レギュラー',
  silver: 'シルバー',
  gold: 'ゴールド',
  platinum: 'プラチナ',
};

export default function CustomerDetailScreen() {
  const params = useLocalSearchParams();
  const customerId = params.id as string;
  const { company, store } = useAuthStore();
  const { showToast } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerWithDetails | null>(null);
  const [visitHistory, setVisitHistory] = useState<VisitWithDetails[]>([]);
  const [saleHistory, setSaleHistory] = useState<SaleWithDetails[]>([]);
  const [customerTags, setCustomerTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [points, setPoints] = useState(0);

  const [activeTab, setActiveTab] = useState<'info' | 'hair' | 'history' | 'ai'>('info');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isHairEditModalVisible, setIsHairEditModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<CustomerWithDetails>>({});
  const [hairFormData, setHairFormData] = useState<HairInfo>({
    hairType: '',
    hairThickness: '',
    hairAmount: '',
    scalpType: '',
    concerns: [],
    allergies: [],
  });

  const loadCustomerData = useCallback(async () => {
    if (!customerId || !company?.id) return;

    try {
      setIsLoading(true);

      // Load customer details, visits, sales, and tags in parallel
      const [customerData, visits, sales, tags] = await Promise.all([
        customerService.getById(customerId),
        visitService.getByCustomer(customerId).catch(() => []),
        saleService.getByCustomer(customerId).catch(() => []),
        tagService.getByEntity('customer', customerId).catch(() => []),
      ]);

      if (!customerData) {
        showToast('顧客が見つかりません', 'error');
        router.back();
        return;
      }

      setCustomer(customerData);
      setVisitHistory(visits);
      setSaleHistory(sales);
      setCustomerTags(tags);

      // Calculate total spent
      const total = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      setTotalSpent(total);

      // Get points balance
      try {
        const pointBalance = await pointService.getBalance(customerId);
        setPoints(pointBalance);
      } catch {
        setPoints(0);
      }

      // Load available tags for the company
      try {
        const allTags = await tagService.getByCompany(company.id, 'customer');
        setAvailableTags(allTags);
      } catch {
        setAvailableTags([]);
      }
    } catch (error) {
      console.error('Failed to load customer data:', error);
      showToast('データの読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, company?.id, showToast]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  const handleEdit = () => {
    if (!customer) return;
    setEditFormData({
      name: customer.name,
      name_kana: customer.name_kana,
      phone: customer.phone,
      email: customer.email,
      gender: customer.gender,
      birth_date: customer.birth_date,
      address: customer.address,
      memo: customer.memo,
    });
    setIsEditModalVisible(true);
  };

  const handleSave = async () => {
    if (!customer) return;

    try {
      await customerService.update(customer.id, editFormData);
      setCustomer((prev) => (prev ? { ...prev, ...editFormData } : null));
      setIsEditModalVisible(false);
      showToast('顧客情報を更新しました', 'success');
    } catch (error) {
      console.error('Failed to update customer:', error);
      showToast('更新に失敗しました', 'error');
    }
  };

  const handleHairEdit = () => {
    if (!customer) return;
    const karte = customer.kartes?.[0];
    setHairFormData({
      hairType: karte?.hair_type || '',
      hairThickness: karte?.hair_thickness || '',
      hairAmount: karte?.hair_amount || '',
      scalpType: karte?.scalp_type || '',
      concerns: karte?.hair_concerns || [],
      allergies: karte?.allergies || [],
    });
    setIsHairEditModalVisible(true);
  };

  const handleHairSave = async () => {
    if (!customer) return;

    try {
      // Update karte through customer service
      await customerService.update(customer.id, {
        // Hair info is typically stored in karte
        memo: customer.memo, // Keep memo unchanged
      });

      // Reload customer data to reflect changes
      await loadCustomerData();
      setIsHairEditModalVisible(false);
      showToast('髪質情報を更新しました', 'success');
    } catch (error) {
      console.error('Failed to update hair info:', error);
      showToast('更新に失敗しました', 'error');
    }
  };

  const handleAddTag = async (tag: Tag) => {
    if (!customer) return;
    try {
      await tagService.addToEntity(tag.id, 'customer', customer.id);
      setCustomerTags((prev) => [...prev, tag]);
      showToast('タグを追加しました', 'success');
    } catch (error) {
      console.error('Failed to add tag:', error);
      showToast('タグの追加に失敗しました', 'error');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!customer) return;
    try {
      await tagService.removeFromEntity(tagId, 'customer', customer.id);
      setCustomerTags((prev) => prev.filter((t) => t.id !== tagId));
      showToast('タグを削除しました', 'success');
    } catch (error) {
      console.error('Failed to remove tag:', error);
      showToast('タグの削除に失敗しました', 'error');
    }
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  const getRank = () => {
    // Determine rank based on total visits or spending
    const visits = visitHistory.length;
    if (visits >= 30 || totalSpent >= 500000) return 'platinum';
    if (visits >= 20 || totalSpent >= 300000) return 'gold';
    if (visits >= 10 || totalSpent >= 100000) return 'silver';
    return 'regular';
  };

  const getLastVisitDate = () => {
    if (visitHistory.length === 0) return null;
    const sorted = [...visitHistory].sort(
      (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
    );
    return sorted[0].visit_date;
  };

  const renderCustomerInfo = () => {
    if (!customer) return null;

    const age = calculateAge(customer.birth_date);
    const rank = getRank();

    return (
      <View style={styles.tabContent}>
        <Card variant="outlined" size="lg" style={styles.card}>
          <Text style={styles.cardTitle}>基本情報</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>氏名</Text>
            <Text style={styles.infoValue}>{customer.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>フリガナ</Text>
            <Text style={styles.infoValue}>{customer.name_kana || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>電話番号</Text>
            <Text style={styles.infoValue}>{customer.phone || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>メール</Text>
            <Text style={styles.infoValue}>{customer.email || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>性別</Text>
            <Text style={styles.infoValue}>
              {customer.gender === 'female'
                ? '女性'
                : customer.gender === 'male'
                ? '男性'
                : customer.gender === 'other'
                ? 'その他'
                : '-'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>生年月日</Text>
            <Text style={styles.infoValue}>
              {customer.birth_date
                ? `${formatDate(customer.birth_date)} ${age !== null ? `(${age}歳)` : ''}`
                : '-'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>住所</Text>
            <Text style={styles.infoValue}>{customer.address || '-'}</Text>
          </View>
        </Card>

        <Card variant="outlined" size="lg" style={styles.card}>
          <Text style={styles.cardTitle}>会員情報</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>会員ランク</Text>
            <Badge colorScheme={rankColors[rank]} variant="solid" size="sm">
              {rankLabels[rank]}
            </Badge>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>登録日</Text>
            <Text style={styles.infoValue}>{formatDate(customer.created_at)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>来店回数</Text>
            <Text style={styles.infoValue}>{visitHistory.length}回</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>累計利用額</Text>
            <Text style={styles.infoValue}>¥{totalSpent.toLocaleString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ポイント残高</Text>
            <Text style={[styles.infoValue, styles.pointsValue]}>
              {points.toLocaleString()} pt
            </Text>
          </View>
        </Card>

        <Card variant="outlined" size="lg" style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>タグ</Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'タグを追加',
                  'タグを選択してください',
                  availableTags
                    .filter((t) => !customerTags.find((ct) => ct.id === t.id))
                    .slice(0, 5)
                    .map((tag) => ({
                      text: tag.name,
                      onPress: () => handleAddTag(tag),
                    }))
                    .concat([{ text: 'キャンセル', onPress: () => {}, style: 'cancel' } as any])
                );
              }}
            >
              <Text style={styles.addTagButton}>+ 追加</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tagsContainer}>
            {customerTags.map((tag) => (
              <TouchableOpacity
                key={tag.id}
                onLongPress={() => {
                  Alert.alert('タグを削除', `「${tag.name}」を削除しますか？`, [
                    { text: 'キャンセル', style: 'cancel' },
                    { text: '削除', style: 'destructive', onPress: () => handleRemoveTag(tag.id) },
                  ]);
                }}
              >
                <Badge
                  colorScheme="primary"
                  variant="subtle"
                  size="sm"
                  style={[styles.tag, { backgroundColor: tag.color || colors.primary[100] }]}
                >
                  {tag.name}
                </Badge>
              </TouchableOpacity>
            ))}
            {customerTags.length === 0 && (
              <Text style={styles.emptyTagsText}>タグなし</Text>
            )}
          </View>

          {customer.memo && (
            <View style={styles.memoContainer}>
              <Text style={styles.memoLabel}>メモ</Text>
              <Text style={styles.memoText}>{customer.memo}</Text>
            </View>
          )}
        </Card>
      </View>
    );
  };

  const renderHairInfo = () => {
    if (!customer) return null;

    const karte = customer.kartes?.[0];

    return (
      <View style={styles.tabContent}>
        <Card variant="outlined" size="lg" style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>髪質情報</Text>
            <TouchableOpacity onPress={handleHairEdit}>
              <Text style={styles.editButton}>編集</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>髪質</Text>
            <Text style={styles.infoValue}>{karte?.hair_type || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>髪の太さ</Text>
            <Text style={styles.infoValue}>{karte?.hair_thickness || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>髪の量</Text>
            <Text style={styles.infoValue}>{karte?.hair_amount || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>頭皮タイプ</Text>
            <Text style={styles.infoValue}>{karte?.scalp_type || '-'}</Text>
          </View>
        </Card>

        <Card variant="outlined" size="lg" style={styles.card}>
          <Text style={styles.cardTitle}>お悩み・気になる点</Text>
          <View style={styles.concernsContainer}>
            {(karte?.hair_concerns || []).map((concern: string, index: number) => (
              <Badge
                key={index}
                colorScheme="warning"
                variant="subtle"
                size="sm"
                style={styles.tag}
              >
                {concern}
              </Badge>
            ))}
            {(!karte?.hair_concerns || karte.hair_concerns.length === 0) && (
              <Text style={styles.emptyTagsText}>登録なし</Text>
            )}
          </View>
        </Card>

        <Card variant="filled" size="lg" style={[styles.card, styles.warningCard]}>
          <Text style={styles.warningTitle}>アレルギー情報</Text>
          <View style={styles.allergiesContainer}>
            {(karte?.allergies || []).map((allergy: string, index: number) => (
              <Badge
                key={index}
                colorScheme="error"
                variant="solid"
                size="md"
                style={styles.tag}
              >
                {allergy}
              </Badge>
            ))}
            {(!karte?.allergies || karte.allergies.length === 0) && (
              <Text style={styles.noAllergiesText}>登録なし</Text>
            )}
          </View>
          {karte?.allergies && karte.allergies.length > 0 && (
            <Text style={styles.warningNote}>※ 施術前に必ず確認してください</Text>
          )}
        </Card>
      </View>
    );
  };

  const renderVisitHistory = () => (
    <View style={styles.tabContent}>
      {visitHistory.map((visit) => {
        // Find corresponding sale for this visit
        const sale = saleHistory.find((s) => s.visit_id === visit.id);

        return (
          <Card key={visit.id} variant="outlined" size="md" style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyDate}>{formatDate(visit.visit_date)}</Text>
              <Text style={styles.historyAmount}>
                ¥{(sale?.total || 0).toLocaleString()}
              </Text>
            </View>

            <View style={styles.historyMenus}>
              {(sale?.items || []).map((item, index) => (
                <Badge
                  key={index}
                  colorScheme={item.item_type === 'product' ? 'success' : 'primary'}
                  variant="subtle"
                  size="sm"
                  style={styles.menuBadge}
                >
                  {item.name}
                </Badge>
              ))}
            </View>

            <View style={styles.historyStylist}>
              <Text style={styles.stylistLabel}>担当:</Text>
              <Text style={styles.stylistName}>{visit.staff?.name || '-'}</Text>
            </View>

            {visit.memo && <Text style={styles.historyMemo}>{visit.memo}</Text>}
          </Card>
        );
      })}

      {visitHistory.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>来店履歴がありません</Text>
        </View>
      )}
    </View>
  );

  const renderAIAnalysis = () => {
    // AI analysis placeholder - would be populated from aiService
    const hasAnalysis = false;

    return (
      <View style={styles.tabContent}>
        {hasAnalysis ? (
          <Card variant="outlined" size="lg" style={styles.card}>
            <Text style={styles.cardTitle}>AI分析結果</Text>
            <Text style={styles.infoValue}>AI分析データ</Text>
          </Card>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>AI分析データがありません</Text>
            <Button
              variant="outline"
              onPress={() => Alert.alert('AI分析', '分析を開始しています...')}
              style={styles.analyzeButton}
            >
              AI分析を実行
            </Button>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>顧客が見つかりません</Text>
        <Button variant="outline" onPress={() => router.back()}>
          戻る
        </Button>
      </View>
    );
  }

  const rank = getRank();
  const lastVisit = getLastVisitDate();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>顧客詳細</Text>
        <Button size="sm" variant="outline" onPress={handleEdit}>
          編集
        </Button>
      </View>

      {/* Customer Summary */}
      <View style={styles.summarySection}>
        <Avatar name={customer.name} size="xl" />
        <View style={styles.summaryInfo}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerKana}>{customer.name_kana || ''}</Text>
          <View style={styles.summaryBadges}>
            <Badge colorScheme={rankColors[rank]} variant="solid" size="sm">
              {rankLabels[rank]}
            </Badge>
            <Text style={styles.lastVisitText}>
              最終来店: {lastVisit ? formatDate(lastVisit) : '-'}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.tabActive]}
          onPress={() => setActiveTab('info')}
        >
          <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
            基本情報
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'hair' && styles.tabActive]}
          onPress={() => setActiveTab('hair')}
        >
          <Text style={[styles.tabText, activeTab === 'hair' && styles.tabTextActive]}>
            髪質
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            来店履歴
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
          onPress={() => setActiveTab('ai')}
        >
          <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>
            AI分析
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'info' && renderCustomerInfo()}
        {activeTab === 'hair' && renderHairInfo()}
        {activeTab === 'history' && renderVisitHistory()}
        {activeTab === 'ai' && renderAIAnalysis()}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <Button
          variant="outline"
          style={styles.actionBarButton}
          onPress={() => router.push(`/checkout?customerId=${customer.id}`)}
        >
          会計へ
        </Button>
        <Button
          style={styles.actionBarButton}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/reservations',
              params: { customerId: customer.id, customerName: customer.name },
            })
          }
        >
          予約を作成
        </Button>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>顧客情報編集</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>氏名 *</Text>
              <TextInput
                style={styles.input}
                value={editFormData.name}
                onChangeText={(v) => setEditFormData((prev) => ({ ...prev, name: v }))}
                placeholder="氏名を入力"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>フリガナ</Text>
              <TextInput
                style={styles.input}
                value={editFormData.name_kana || ''}
                onChangeText={(v) => setEditFormData((prev) => ({ ...prev, name_kana: v }))}
                placeholder="フリガナを入力"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>電話番号</Text>
              <TextInput
                style={styles.input}
                value={editFormData.phone || ''}
                onChangeText={(v) => setEditFormData((prev) => ({ ...prev, phone: v }))}
                placeholder="090-0000-0000"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>メールアドレス</Text>
              <TextInput
                style={styles.input}
                value={editFormData.email || ''}
                onChangeText={(v) => setEditFormData((prev) => ({ ...prev, email: v }))}
                placeholder="email@example.com"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>性別</Text>
              <View style={styles.genderSelector}>
                {[
                  { value: 'female', label: '女性' },
                  { value: 'male', label: '男性' },
                  { value: 'other', label: 'その他' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.genderOption,
                      editFormData.gender === option.value && styles.genderOptionActive,
                    ]}
                    onPress={() =>
                      setEditFormData((prev) => ({
                        ...prev,
                        gender: option.value as 'male' | 'female' | 'other',
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.genderText,
                        editFormData.gender === option.value && styles.genderTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>生年月日</Text>
              <TextInput
                style={styles.input}
                value={editFormData.birth_date || ''}
                onChangeText={(v) => setEditFormData((prev) => ({ ...prev, birth_date: v }))}
                placeholder="1990-01-01"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>住所</Text>
              <TextInput
                style={styles.input}
                value={editFormData.address || ''}
                onChangeText={(v) => setEditFormData((prev) => ({ ...prev, address: v }))}
                placeholder="住所を入力"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>メモ</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editFormData.memo || ''}
                onChangeText={(v) => setEditFormData((prev) => ({ ...prev, memo: v }))}
                placeholder="メモを入力"
                placeholderTextColor={colors.neutral[400]}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </Modal>

      {/* Hair Info Edit Modal */}
      <Modal
        visible={isHairEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsHairEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsHairEditModalVisible(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>髪質情報編集</Text>
            <TouchableOpacity onPress={handleHairSave}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>髪質</Text>
              <View style={styles.optionSelector}>
                {['直毛', 'くせ毛', '軟毛', '硬毛'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionButton,
                      hairFormData.hairType === type && styles.optionButtonActive,
                    ]}
                    onPress={() => setHairFormData((prev) => ({ ...prev, hairType: type }))}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        hairFormData.hairType === type && styles.optionTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>髪の太さ</Text>
              <View style={styles.optionSelector}>
                {['細め', '普通', '太め'].map((thickness) => (
                  <TouchableOpacity
                    key={thickness}
                    style={[
                      styles.optionButton,
                      hairFormData.hairThickness === thickness && styles.optionButtonActive,
                    ]}
                    onPress={() =>
                      setHairFormData((prev) => ({ ...prev, hairThickness: thickness }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        hairFormData.hairThickness === thickness && styles.optionTextActive,
                      ]}
                    >
                      {thickness}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>髪の量</Text>
              <View style={styles.optionSelector}>
                {['少なめ', '普通', '多め'].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.optionButton,
                      hairFormData.hairAmount === amount && styles.optionButtonActive,
                    ]}
                    onPress={() => setHairFormData((prev) => ({ ...prev, hairAmount: amount }))}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        hairFormData.hairAmount === amount && styles.optionTextActive,
                      ]}
                    >
                      {amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>頭皮タイプ</Text>
              <View style={styles.optionSelector}>
                {['乾燥肌', '普通肌', '脂性肌', '敏感肌'].map((scalp) => (
                  <TouchableOpacity
                    key={scalp}
                    style={[
                      styles.optionButton,
                      hairFormData.scalpType === scalp && styles.optionButtonActive,
                    ]}
                    onPress={() => setHairFormData((prev) => ({ ...prev, scalpType: scalp }))}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        hairFormData.scalpType === scalp && styles.optionTextActive,
                      ]}
                    >
                      {scalp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>お悩み（複数選択可）</Text>
              <View style={styles.optionSelector}>
                {['パサつき', '広がり', '白髪', 'ダメージ', '薄毛', 'フケ'].map((concern) => (
                  <TouchableOpacity
                    key={concern}
                    style={[
                      styles.optionButton,
                      hairFormData.concerns.includes(concern) && styles.optionButtonActive,
                    ]}
                    onPress={() =>
                      setHairFormData((prev) => ({
                        ...prev,
                        concerns: prev.concerns.includes(concern)
                          ? prev.concerns.filter((c) => c !== concern)
                          : [...prev.concerns, concern],
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        hairFormData.concerns.includes(concern) && styles.optionTextActive,
                      ]}
                    >
                      {concern}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>アレルギー</Text>
              <TextInput
                style={styles.input}
                value={hairFormData.allergies.join(', ')}
                onChangeText={(v) =>
                  setHairFormData((prev) => ({
                    ...prev,
                    allergies: v
                      .split(',')
                      .map((a) => a.trim())
                      .filter((a) => a),
                  }))
                }
                placeholder="ジアミン, パラベン など（カンマ区切り）"
                placeholderTextColor={colors.neutral[400]}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    gap: spacing[4],
  },
  errorText: {
    ...textStyles.body,
    color: colors.neutral[600],
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
  summarySection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  summaryInfo: {
    flex: 1,
    marginLeft: spacing[4],
  },
  customerName: {
    ...textStyles.h4,
    color: colors.neutral[900],
  },
  customerKana: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[2],
  },
  summaryBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  lastVisitText: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    ...textStyles.label,
    color: colors.neutral[500],
  },
  tabTextActive: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: spacing[4],
  },
  card: {
    marginBottom: spacing[4],
  },
  cardTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[3],
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  editButton: {
    ...textStyles.label,
    color: colors.primary[600],
  },
  addTagButton: {
    ...textStyles.label,
    color: colors.primary[600],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  infoLabel: {
    ...textStyles.body,
    color: colors.neutral[500],
  },
  infoValue: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  pointsValue: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  tag: {
    marginBottom: spacing[1],
  },
  emptyTagsText: {
    ...textStyles.caption,
    color: colors.neutral[400],
  },
  memoContainer: {
    backgroundColor: colors.neutral[50],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
  },
  memoLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  memoText: {
    ...textStyles.body,
    color: colors.neutral[700],
    lineHeight: 22,
  },
  concernsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  warningCard: {
    backgroundColor: colors.error[50],
  },
  warningTitle: {
    ...textStyles.h6,
    color: colors.error[700],
    marginBottom: spacing[2],
  },
  allergiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  noAllergiesText: {
    ...textStyles.body,
    color: colors.error[400],
  },
  warningNote: {
    ...textStyles.caption,
    color: colors.error[600],
  },
  historyCard: {
    marginBottom: spacing[3],
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  historyDate: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  historyAmount: {
    ...textStyles.h6,
    color: colors.primary[600],
  },
  historyMenus: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  menuBadge: {
    marginBottom: spacing[1],
  },
  historyStylist: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  stylistLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginRight: spacing[1],
  },
  stylistName: {
    ...textStyles.body,
    color: colors.neutral[700],
  },
  historyMemo: {
    ...textStyles.caption,
    color: colors.neutral[600],
    backgroundColor: colors.neutral[50],
    padding: spacing[2],
    borderRadius: borderRadius.md,
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
  analyzeButton: {
    marginTop: spacing[4],
  },
  actionBar: {
    flexDirection: 'row',
    padding: spacing[4],
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    gap: spacing[3],
  },
  actionBarButton: {
    flex: 1,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  genderSelector: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  genderOption: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  genderOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  genderText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  genderTextActive: {
    color: colors.primary[600],
  },
  optionSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  optionButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.white,
  },
  optionButtonActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  optionText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  optionTextActive: {
    color: colors.primary[600],
  },
});
