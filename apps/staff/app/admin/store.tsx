import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, colors, spacing, textStyles, borderRadius, shadows } from '@beauty-pos/ui';

interface StoreSettings {
  // 基本情報
  name: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;

  // 営業情報
  businessHours: string;
  closedDays: string;

  // レシート・請求書設定
  logoUrl: string;
  invoiceRegistrationNumber: string;
  receiptHeader: string;
  receiptFooter: string;
  receiptNote: string;

  // レシート表示設定
  showLogo: boolean;
  showBarcode: boolean;
  showQrCode: boolean;
  paperWidth: 80 | 58;
}

const mockStoreSettings: StoreSettings = {
  name: 'Beauty Salon SAKURA',
  postalCode: '150-0001',
  address: '東京都渋谷区神宮前1-2-3 サクラビル2F',
  phone: '03-1234-5678',
  email: 'info@sakura-salon.jp',
  businessHours: '10:00〜20:00',
  closedDays: '毎週火曜日',
  logoUrl: '',
  invoiceRegistrationNumber: 'T1234567890123',
  receiptHeader: '',
  receiptFooter: 'またのご来店をお待ちしております',
  receiptNote: '',
  showLogo: true,
  showBarcode: true,
  showQrCode: false,
  paperWidth: 80,
};

export default function StoreManagementScreen() {
  const [settings, setSettings] = useState<StoreSettings>(mockStoreSettings);
  const [activeTab, setActiveTab] = useState<'basic' | 'receipt' | 'invoice'>('basic');
  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = <K extends keyof StoreSettings>(
    key: K,
    value: StoreSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // TODO: API call to save settings
    Alert.alert('保存完了', '店舗設定を保存しました');
    setHasChanges(false);
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        '変更を破棄',
        '保存されていない変更があります。破棄しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '破棄', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const renderBasicInfo = () => (
    <View style={styles.tabContent}>
      <Card variant="outlined" size="lg" style={styles.card}>
        <Text style={styles.cardTitle}>基本情報</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>店舗名 *</Text>
          <TextInput
            style={styles.input}
            value={settings.name}
            onChangeText={(v) => updateSetting('name', v)}
            placeholder="店舗名を入力"
            placeholderTextColor={colors.neutral[400]}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, styles.formGroupHalf]}>
            <Text style={styles.label}>郵便番号</Text>
            <TextInput
              style={styles.input}
              value={settings.postalCode}
              onChangeText={(v) => updateSetting('postalCode', v)}
              placeholder="000-0000"
              placeholderTextColor={colors.neutral[400]}
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.formGroup, styles.formGroupHalf]}>
            <Text style={styles.label}>電話番号 *</Text>
            <TextInput
              style={styles.input}
              value={settings.phone}
              onChangeText={(v) => updateSetting('phone', v)}
              placeholder="03-0000-0000"
              placeholderTextColor={colors.neutral[400]}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>住所 *</Text>
          <TextInput
            style={styles.input}
            value={settings.address}
            onChangeText={(v) => updateSetting('address', v)}
            placeholder="住所を入力"
            placeholderTextColor={colors.neutral[400]}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>メールアドレス</Text>
          <TextInput
            style={styles.input}
            value={settings.email}
            onChangeText={(v) => updateSetting('email', v)}
            placeholder="email@example.com"
            placeholderTextColor={colors.neutral[400]}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </Card>

      <Card variant="outlined" size="lg" style={styles.card}>
        <Text style={styles.cardTitle}>営業情報</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>営業時間</Text>
          <TextInput
            style={styles.input}
            value={settings.businessHours}
            onChangeText={(v) => updateSetting('businessHours', v)}
            placeholder="10:00〜20:00"
            placeholderTextColor={colors.neutral[400]}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>定休日</Text>
          <TextInput
            style={styles.input}
            value={settings.closedDays}
            onChangeText={(v) => updateSetting('closedDays', v)}
            placeholder="毎週火曜日"
            placeholderTextColor={colors.neutral[400]}
          />
        </View>
      </Card>
    </View>
  );

  const renderReceiptSettings = () => (
    <View style={styles.tabContent}>
      <Card variant="outlined" size="lg" style={styles.card}>
        <Text style={styles.cardTitle}>店舗ロゴ</Text>

        <View style={styles.logoSection}>
          {settings.logoUrl ? (
            <Image
              source={{ uri: settings.logoUrl }}
              style={styles.logoPreview}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>ロゴ未設定</Text>
            </View>
          )}
          <View style={styles.logoButtons}>
            <Button variant="outline" size="sm">
              画像をアップロード
            </Button>
            {settings.logoUrl && (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => updateSetting('logoUrl', '')}
              >
                削除
              </Button>
            )}
          </View>
        </View>
      </Card>

      <Card variant="outlined" size="lg" style={styles.card}>
        <Text style={styles.cardTitle}>レシート表示設定</Text>

        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.switchTitle}>ロゴを表示</Text>
            <Text style={styles.switchDescription}>
              レシートに店舗ロゴを印刷します
            </Text>
          </View>
          <Switch
            value={settings.showLogo}
            onValueChange={(v) => updateSetting('showLogo', v)}
            trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.switchTitle}>バーコードを表示</Text>
            <Text style={styles.switchDescription}>
              レシート番号のバーコードを印刷します
            </Text>
          </View>
          <Switch
            value={settings.showBarcode}
            onValueChange={(v) => updateSetting('showBarcode', v)}
            trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.switchTitle}>QRコードを表示</Text>
            <Text style={styles.switchDescription}>
              予約サイトへのQRコードを印刷します
            </Text>
          </View>
          <Switch
            value={settings.showQrCode}
            onValueChange={(v) => updateSetting('showQrCode', v)}
            trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>用紙幅</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioOption,
                settings.paperWidth === 80 && styles.radioOptionActive,
              ]}
              onPress={() => updateSetting('paperWidth', 80)}
            >
              <Text
                style={[
                  styles.radioText,
                  settings.paperWidth === 80 && styles.radioTextActive,
                ]}
              >
                80mm
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.radioOption,
                settings.paperWidth === 58 && styles.radioOptionActive,
              ]}
              onPress={() => updateSetting('paperWidth', 58)}
            >
              <Text
                style={[
                  styles.radioText,
                  settings.paperWidth === 58 && styles.radioTextActive,
                ]}
              >
                58mm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>

      <Card variant="outlined" size="lg" style={styles.card}>
        <Text style={styles.cardTitle}>レシートメッセージ</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>ヘッダーメッセージ</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={settings.receiptHeader}
            onChangeText={(v) => updateSetting('receiptHeader', v)}
            placeholder="レシート上部に表示するメッセージ"
            placeholderTextColor={colors.neutral[400]}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>フッターメッセージ</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={settings.receiptFooter}
            onChangeText={(v) => updateSetting('receiptFooter', v)}
            placeholder="レシート下部に表示するメッセージ"
            placeholderTextColor={colors.neutral[400]}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>備考欄</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={settings.receiptNote}
            onChangeText={(v) => updateSetting('receiptNote', v)}
            placeholder="キャンセルポリシーなど"
            placeholderTextColor={colors.neutral[400]}
            multiline
            numberOfLines={3}
          />
        </View>
      </Card>
    </View>
  );

  const renderInvoiceSettings = () => (
    <View style={styles.tabContent}>
      <Card variant="outlined" size="lg" style={styles.card}>
        <Text style={styles.cardTitle}>適格請求書発行事業者情報</Text>
        <Text style={styles.cardDescription}>
          インボイス制度対応のため、登録番号を設定してください
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>登録番号 *</Text>
          <TextInput
            style={styles.input}
            value={settings.invoiceRegistrationNumber}
            onChangeText={(v) => updateSetting('invoiceRegistrationNumber', v)}
            placeholder="T1234567890123"
            placeholderTextColor={colors.neutral[400]}
            autoCapitalize="characters"
          />
          <Text style={styles.hint}>
            「T」+ 13桁の数字で入力してください
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>適格簡易請求書について</Text>
          <Text style={styles.infoText}>
            当システムのレシートは適格簡易請求書（インボイス）の要件を満たしています：
          </Text>
          <Text style={styles.infoListItem}>・適格請求書発行事業者の氏名・登録番号</Text>
          <Text style={styles.infoListItem}>・取引年月日</Text>
          <Text style={styles.infoListItem}>・取引内容（軽減税率対象の表記）</Text>
          <Text style={styles.infoListItem}>・税率ごとの消費税額と適用税率</Text>
        </View>
      </Card>

      <Card variant="outlined" size="lg" style={styles.card}>
        <Text style={styles.cardTitle}>消費税設定</Text>

        <View style={styles.taxInfo}>
          <View style={styles.taxRow}>
            <Text style={styles.taxLabel}>標準税率</Text>
            <Text style={styles.taxValue}>10%</Text>
          </View>
          <Text style={styles.taxDescription}>
            施術メニュー、店販商品など
          </Text>
        </View>

        <View style={styles.taxInfo}>
          <View style={styles.taxRow}>
            <Text style={styles.taxLabel}>軽減税率 ※</Text>
            <Text style={styles.taxValue}>8%</Text>
          </View>
          <Text style={styles.taxDescription}>
            飲食料品（ドリンクサービスなど）
          </Text>
        </View>

        <Text style={styles.taxNote}>
          ※ 軽減税率対象商品は「※」マークで表示されます
        </Text>
      </Card>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>キャンセル</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>店舗設定</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.headerButton, !hasChanges && styles.headerButtonDisabled]}
          disabled={!hasChanges}
        >
          <Text
            style={[
              styles.headerButtonText,
              styles.headerButtonTextPrimary,
              !hasChanges && styles.headerButtonTextDisabled,
            ]}
          >
            保存
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'basic' && styles.tabActive]}
          onPress={() => setActiveTab('basic')}
        >
          <Text
            style={[styles.tabText, activeTab === 'basic' && styles.tabTextActive]}
          >
            基本情報
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'receipt' && styles.tabActive]}
          onPress={() => setActiveTab('receipt')}
        >
          <Text
            style={[styles.tabText, activeTab === 'receipt' && styles.tabTextActive]}
          >
            レシート設定
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invoice' && styles.tabActive]}
          onPress={() => setActiveTab('invoice')}
        >
          <Text
            style={[styles.tabText, activeTab === 'invoice' && styles.tabTextActive]}
          >
            インボイス
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'basic' && renderBasicInfo()}
        {activeTab === 'receipt' && renderReceiptSettings()}
        {activeTab === 'invoice' && renderInvoiceSettings()}
        <View style={styles.bottomPadding} />
      </ScrollView>
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
  headerButton: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerButtonText: {
    ...textStyles.body,
    color: colors.neutral[600],
  },
  headerButtonTextPrimary: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  headerButtonTextDisabled: {
    color: colors.neutral[400],
  },
  headerTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
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
    marginBottom: spacing[2],
  },
  cardDescription: {
    ...textStyles.body,
    color: colors.neutral[600],
    marginBottom: spacing[4],
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
  logoSection: {
    alignItems: 'center',
    padding: spacing[4],
  },
  logoPreview: {
    width: 200,
    height: 100,
    marginBottom: spacing[3],
  },
  logoPlaceholder: {
    width: 200,
    height: 100,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.neutral[300],
  },
  logoPlaceholderText: {
    ...textStyles.body,
    color: colors.neutral[400],
  },
  logoButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
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
  radioGroup: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  radioOption: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.white,
  },
  radioOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  radioText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  radioTextActive: {
    color: colors.primary[600],
  },
  infoBox: {
    backgroundColor: colors.info[50],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginTop: spacing[4],
  },
  infoTitle: {
    ...textStyles.label,
    color: colors.info[700],
    marginBottom: spacing[2],
  },
  infoText: {
    ...textStyles.body,
    color: colors.info[600],
    marginBottom: spacing[2],
  },
  infoListItem: {
    ...textStyles.caption,
    color: colors.info[600],
    marginLeft: spacing[2],
    lineHeight: 20,
  },
  taxInfo: {
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taxLabel: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  taxValue: {
    ...textStyles.h6,
    color: colors.primary[600],
  },
  taxDescription: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[1],
  },
  taxNote: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[3],
  },
  bottomPadding: {
    height: spacing[8],
  },
});
