import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, Button, Badge, Avatar, colors, spacing, textStyles, borderRadius, shadows } from '@beauty-pos/ui';

interface Customer {
  id: string;
  name: string;
  nameKana: string;
  phone: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  birthDate: string;
  address: string;
  memo: string;
  memberSince: string;
  lastVisit: string;
  totalVisits: number;
  totalSpent: number;
  points: number;
  rank: 'regular' | 'silver' | 'gold' | 'platinum';
  tags: string[];
  // 髪情報
  hairInfo: {
    hairType: string;
    hairThickness: string;
    hairAmount: string;
    scalpType: string;
    concerns: string[];
    allergies: string[];
  };
  // AI分析
  aiAnalysis?: {
    lastAnalyzed: string;
    preferredStyles: string[];
    recommendedTreatments: string[];
    visitPattern: string;
    spendingTrend: string;
    churnRisk: 'low' | 'medium' | 'high';
    nextVisitPrediction: string;
  };
}

interface VisitHistory {
  id: string;
  date: string;
  menus: string[];
  products: string[];
  stylist: string;
  totalAmount: number;
  memo: string;
}

const mockCustomer: Customer = {
  id: '1',
  name: '山田 花子',
  nameKana: 'ヤマダ ハナコ',
  phone: '090-1234-5678',
  email: 'hanako@example.com',
  gender: 'female',
  birthDate: '1985-05-15',
  address: '東京都渋谷区神宮前1-2-3',
  memo: 'アレルギー注意。優しい雰囲気の接客を好む。',
  memberSince: '2022-03-01',
  lastVisit: '2024-01-15',
  totalVisits: 24,
  totalSpent: 312000,
  points: 3120,
  rank: 'gold',
  tags: ['常連', 'カラー好き', 'トリートメント重視'],
  hairInfo: {
    hairType: 'くせ毛',
    hairThickness: '普通',
    hairAmount: '多め',
    scalpType: '乾燥肌',
    concerns: ['パサつき', '広がり', '白髪'],
    allergies: ['ジアミン'],
  },
  aiAnalysis: {
    lastAnalyzed: '2024-01-15',
    preferredStyles: ['ゆるふわミディアム', 'レイヤーボブ'],
    recommendedTreatments: ['髪質改善トリートメント', 'ヘッドスパ'],
    visitPattern: '4〜5週間ごと',
    spendingTrend: '安定',
    churnRisk: 'low',
    nextVisitPrediction: '2024-02-12頃',
  },
};

const mockVisitHistory: VisitHistory[] = [
  {
    id: '1',
    date: '2024-01-15',
    menus: ['カット', 'カラー', 'トリートメント'],
    products: ['シャンプー'],
    stylist: '田中 美咲',
    totalAmount: 15800,
    memo: 'グレージュカラー。次回も同じ色希望。',
  },
  {
    id: '2',
    date: '2023-12-10',
    menus: ['カット', 'トリートメント'],
    products: [],
    stylist: '田中 美咲',
    totalAmount: 8500,
    memo: '毛先整え程度。年末年始に備えてトリートメント追加。',
  },
  {
    id: '3',
    date: '2023-11-05',
    menus: ['カット', 'カラー', 'ヘッドスパ'],
    products: ['トリートメント'],
    stylist: '田中 美咲',
    totalAmount: 18200,
    memo: '秋色カラーに変更。ヘッドスパで頭皮ケア。',
  },
];

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
  const [customer, setCustomer] = useState<Customer>(mockCustomer);
  const [visitHistory] = useState<VisitHistory[]>(mockVisitHistory);
  const [activeTab, setActiveTab] = useState<'info' | 'hair' | 'history' | 'ai'>('info');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({});

  const handleEdit = () => {
    setEditFormData({
      name: customer.name,
      nameKana: customer.nameKana,
      phone: customer.phone,
      email: customer.email,
      gender: customer.gender,
      birthDate: customer.birthDate,
      address: customer.address,
      memo: customer.memo,
    });
    setIsEditModalVisible(true);
  };

  const handleSave = () => {
    setCustomer((prev) => ({ ...prev, ...editFormData }));
    setIsEditModalVisible(false);
    Alert.alert('保存完了', '顧客情報を更新しました');
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const renderCustomerInfo = () => (
    <View style={styles.tabContent}>
      <Card variant="outlined" size="lg" style={styles.card}>
        <Text style={styles.cardTitle}>基本情報</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>氏名</Text>
          <Text style={styles.infoValue}>{customer.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>フリガナ</Text>
          <Text style={styles.infoValue}>{customer.nameKana}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>電話番号</Text>
          <Text style={styles.infoValue}>{customer.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>メール</Text>
          <Text style={styles.infoValue}>{customer.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>性別</Text>
          <Text style={styles.infoValue}>
            {customer.gender === 'female'
              ? '女性'
              : customer.gender === 'male'
              ? '男性'
              : 'その他'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>生年月日</Text>
          <Text style={styles.infoValue}>
            {customer.birthDate} ({calculateAge(customer.birthDate)}歳)
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>住所</Text>
          <Text style={styles.infoValue}>{customer.address}</Text>
        </View>
      </Card>

      <Card variant="outlined" size="lg" style={styles.card}>
        <Text style={styles.cardTitle}>会員情報</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>会員ランク</Text>
          <Badge colorScheme={rankColors[customer.rank]} variant="solid" size="sm">
            {rankLabels[customer.rank]}
          </Badge>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>入会日</Text>
          <Text style={styles.infoValue}>{customer.memberSince}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>来店回数</Text>
          <Text style={styles.infoValue}>{customer.totalVisits}回</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>累計利用額</Text>
          <Text style={styles.infoValue}>
            ¥{customer.totalSpent.toLocaleString()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>ポイント残高</Text>
          <Text style={[styles.infoValue, styles.pointsValue]}>
            {customer.points.toLocaleString()} pt
          </Text>
        </View>
      </Card>

      <Card variant="outlined" size="lg" style={styles.card}>
        <Text style={styles.cardTitle}>メモ・タグ</Text>

        <View style={styles.tagsContainer}>
          {customer.tags.map((tag, index) => (
            <Badge
              key={index}
              colorScheme="primary"
              variant="subtle"
              size="sm"
              style={styles.tag}
            >
              {tag}
            </Badge>
          ))}
        </View>

        {customer.memo && (
          <View style={styles.memoContainer}>
            <Text style={styles.memoText}>{customer.memo}</Text>
          </View>
        )}
      </Card>
    </View>
  );

  const renderHairInfo = () => (
    <View style={styles.tabContent}>
      <Card variant="outlined" size="lg" style={styles.card}>
        <Text style={styles.cardTitle}>髪質情報</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>髪質</Text>
          <Text style={styles.infoValue}>{customer.hairInfo.hairType}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>髪の太さ</Text>
          <Text style={styles.infoValue}>{customer.hairInfo.hairThickness}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>髪の量</Text>
          <Text style={styles.infoValue}>{customer.hairInfo.hairAmount}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>頭皮タイプ</Text>
          <Text style={styles.infoValue}>{customer.hairInfo.scalpType}</Text>
        </View>
      </Card>

      <Card variant="outlined" size="lg" style={styles.card}>
        <Text style={styles.cardTitle}>お悩み・気になる点</Text>
        <View style={styles.concernsContainer}>
          {customer.hairInfo.concerns.map((concern, index) => (
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
        </View>
      </Card>

      <Card variant="filled" size="lg" style={[styles.card, styles.warningCard]}>
        <Text style={styles.warningTitle}>アレルギー情報</Text>
        <View style={styles.allergiesContainer}>
          {customer.hairInfo.allergies.map((allergy, index) => (
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
        </View>
        <Text style={styles.warningNote}>
          ※ 施術前に必ず確認してください
        </Text>
      </Card>
    </View>
  );

  const renderVisitHistory = () => (
    <View style={styles.tabContent}>
      {visitHistory.map((visit) => (
        <Card key={visit.id} variant="outlined" size="md" style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyDate}>{visit.date}</Text>
            <Text style={styles.historyAmount}>
              ¥{visit.totalAmount.toLocaleString()}
            </Text>
          </View>

          <View style={styles.historyMenus}>
            {visit.menus.map((menu, index) => (
              <Badge
                key={index}
                colorScheme="primary"
                variant="subtle"
                size="sm"
                style={styles.menuBadge}
              >
                {menu}
              </Badge>
            ))}
            {visit.products.map((product, index) => (
              <Badge
                key={`product-${index}`}
                colorScheme="success"
                variant="subtle"
                size="sm"
                style={styles.menuBadge}
              >
                {product}
              </Badge>
            ))}
          </View>

          <View style={styles.historyStylist}>
            <Text style={styles.stylistLabel}>担当:</Text>
            <Text style={styles.stylistName}>{visit.stylist}</Text>
          </View>

          {visit.memo && (
            <Text style={styles.historyMemo}>{visit.memo}</Text>
          )}
        </Card>
      ))}

      {visitHistory.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>来店履歴がありません</Text>
        </View>
      )}
    </View>
  );

  const renderAIAnalysis = () => (
    <View style={styles.tabContent}>
      {customer.aiAnalysis ? (
        <>
          <Card variant="outlined" size="lg" style={styles.card}>
            <View style={styles.analysisHeader}>
              <Text style={styles.cardTitle}>AI分析結果</Text>
              <Text style={styles.analysisDate}>
                最終分析: {customer.aiAnalysis.lastAnalyzed}
              </Text>
            </View>

            <View style={styles.analysisSection}>
              <Text style={styles.analysisLabel}>来店パターン</Text>
              <Text style={styles.analysisValue}>
                {customer.aiAnalysis.visitPattern}
              </Text>
            </View>

            <View style={styles.analysisSection}>
              <Text style={styles.analysisLabel}>次回来店予測</Text>
              <Text style={styles.analysisValue}>
                {customer.aiAnalysis.nextVisitPrediction}
              </Text>
            </View>

            <View style={styles.analysisSection}>
              <Text style={styles.analysisLabel}>利用傾向</Text>
              <Text style={styles.analysisValue}>
                {customer.aiAnalysis.spendingTrend}
              </Text>
            </View>

            <View style={styles.analysisSection}>
              <Text style={styles.analysisLabel}>離脱リスク</Text>
              <Badge
                colorScheme={
                  customer.aiAnalysis.churnRisk === 'low'
                    ? 'success'
                    : customer.aiAnalysis.churnRisk === 'medium'
                    ? 'warning'
                    : 'error'
                }
                variant="solid"
                size="sm"
              >
                {customer.aiAnalysis.churnRisk === 'low'
                  ? '低'
                  : customer.aiAnalysis.churnRisk === 'medium'
                  ? '中'
                  : '高'}
              </Badge>
            </View>
          </Card>

          <Card variant="outlined" size="lg" style={styles.card}>
            <Text style={styles.cardTitle}>好みのスタイル</Text>
            <View style={styles.preferencesList}>
              {customer.aiAnalysis.preferredStyles.map((style, index) => (
                <View key={index} style={styles.preferenceItem}>
                  <Text style={styles.preferenceText}>{style}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card variant="outlined" size="lg" style={styles.card}>
            <Text style={styles.cardTitle}>おすすめ施術</Text>
            <View style={styles.recommendationsList}>
              {customer.aiAnalysis.recommendedTreatments.map((treatment, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Badge
                    colorScheme="success"
                    variant="subtle"
                    size="sm"
                    style={styles.recommendationBadge}
                  >
                    おすすめ
                  </Badge>
                  <Text style={styles.recommendationText}>{treatment}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Button
            variant="outline"
            onPress={() => Alert.alert('AI分析', '分析を更新しています...')}
          >
            AI分析を更新
          </Button>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🤖</Text>
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
          <Text style={styles.customerKana}>{customer.nameKana}</Text>
          <View style={styles.summaryBadges}>
            <Badge colorScheme={rankColors[customer.rank]} variant="solid" size="sm">
              {rankLabels[customer.rank]}
            </Badge>
            <Text style={styles.lastVisitText}>
              最終来店: {customer.lastVisit}
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
          <Text
            style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}
          >
            基本情報
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'hair' && styles.tabActive]}
          onPress={() => setActiveTab('hair')}
        >
          <Text
            style={[styles.tabText, activeTab === 'hair' && styles.tabTextActive]}
          >
            髪質
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}
          >
            来店履歴
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
          onPress={() => setActiveTab('ai')}
        >
          <Text
            style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}
          >
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
          onPress={() => router.push('/checkout')}
        >
          会計へ
        </Button>
        <Button
          style={styles.actionBarButton}
          onPress={() => Alert.alert('予約', '予約画面に遷移します')}
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
                onChangeText={(v) =>
                  setEditFormData((prev) => ({ ...prev, name: v }))
                }
                placeholder="氏名を入力"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>フリガナ</Text>
              <TextInput
                style={styles.input}
                value={editFormData.nameKana}
                onChangeText={(v) =>
                  setEditFormData((prev) => ({ ...prev, nameKana: v }))
                }
                placeholder="フリガナを入力"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>電話番号</Text>
              <TextInput
                style={styles.input}
                value={editFormData.phone}
                onChangeText={(v) =>
                  setEditFormData((prev) => ({ ...prev, phone: v }))
                }
                placeholder="090-0000-0000"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>メールアドレス</Text>
              <TextInput
                style={styles.input}
                value={editFormData.email}
                onChangeText={(v) =>
                  setEditFormData((prev) => ({ ...prev, email: v }))
                }
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
                      editFormData.gender === option.value &&
                        styles.genderOptionActive,
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
                        editFormData.gender === option.value &&
                          styles.genderTextActive,
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
                value={editFormData.birthDate}
                onChangeText={(v) =>
                  setEditFormData((prev) => ({ ...prev, birthDate: v }))
                }
                placeholder="1990-01-01"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>住所</Text>
              <TextInput
                style={styles.input}
                value={editFormData.address}
                onChangeText={(v) =>
                  setEditFormData((prev) => ({ ...prev, address: v }))
                }
                placeholder="住所を入力"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>メモ</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editFormData.memo}
                onChangeText={(v) =>
                  setEditFormData((prev) => ({ ...prev, memo: v }))
                }
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
  memoContainer: {
    backgroundColor: colors.neutral[50],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
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
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  analysisDate: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  analysisSection: {
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  analysisLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  analysisValue: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  preferencesList: {
    gap: spacing[2],
  },
  preferenceItem: {
    backgroundColor: colors.neutral[50],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
  },
  preferenceText: {
    ...textStyles.body,
    color: colors.neutral[700],
  },
  recommendationsList: {
    gap: spacing[2],
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success[50],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  recommendationBadge: {
    marginRight: spacing[2],
  },
  recommendationText: {
    ...textStyles.body,
    color: colors.neutral[700],
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
});
