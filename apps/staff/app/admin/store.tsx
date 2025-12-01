import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Card, Button, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import { storeService, companyService } from '@beauty-pos/api';

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

const defaultSettings: StoreSettings = {
  name: '',
  postalCode: '',
  address: '',
  phone: '',
  email: '',
  businessHours: '',
  closedDays: '',
  logoUrl: '',
  invoiceRegistrationNumber: '',
  receiptHeader: '',
  receiptFooter: 'またのご来店をお待ちしております',
  receiptNote: '',
  showLogo: true,
  showBarcode: true,
  showQrCode: false,
  paperWidth: 80,
};

export default function StoreManagementScreen() {
  const { store, company } = useAuthStore();
  const { showToast } = useUIStore();
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<'basic' | 'receipt' | 'invoice'>('basic');
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load store and company settings
  const loadSettings = useCallback(async () => {
    if (!store?.id || !company?.id) return;

    try {
      setIsLoading(true);
      const [storeData, companyData] = await Promise.all([
        storeService.getById(store.id),
        companyService.getById(company.id),
      ]);

      if (storeData && companyData) {
        const storeSettings = (storeData.settings || {}) as Record<string, unknown>;
        const companySettings = (companyData.settings || {}) as Record<string, unknown>;

        setSettings({
          name: storeData.name || '',
          postalCode: storeData.postal_code || '',
          address: storeData.address || '',
          phone: storeData.phone || '',
          email: storeData.email || '',
          businessHours: typeof storeData.business_hours === 'string'
            ? storeData.business_hours
            : (storeData.business_hours as Record<string, unknown>)?.display as string || '',
          closedDays: Array.isArray(storeData.holidays)
            ? (storeData.holidays as string[]).join(', ')
            : '',
          logoUrl: companyData.logo_url || '',
          invoiceRegistrationNumber: (companySettings.invoice_registration_number as string) || '',
          receiptHeader: (storeSettings.receipt_header as string) || '',
          receiptFooter: (storeSettings.receipt_footer as string) || 'またのご来店をお待ちしております',
          receiptNote: (storeSettings.receipt_note as string) || '',
          showLogo: (storeSettings.show_logo as boolean) ?? true,
          showBarcode: (storeSettings.show_barcode as boolean) ?? true,
          showQrCode: (storeSettings.show_qr_code as boolean) ?? false,
          paperWidth: (storeSettings.paper_width as 80 | 58) || 80,
        });
      }
    } catch (error) {
      console.error('Failed to load store settings:', error);
      showToast('設定の読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [store?.id, company?.id, showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = <K extends keyof StoreSettings>(
    key: K,
    value: StoreSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!store?.id || !company?.id) return;

    try {
      setIsSaving(true);

      // Update store basic info
      await storeService.update(store.id, {
        name: settings.name,
        postal_code: settings.postalCode || null,
        address: settings.address || null,
        phone: settings.phone || null,
        email: settings.email || null,
        business_hours: { display: settings.businessHours },
        holidays: settings.closedDays.split(',').map(s => s.trim()).filter(Boolean),
        settings: {
          receipt_header: settings.receiptHeader,
          receipt_footer: settings.receiptFooter,
          receipt_note: settings.receiptNote,
          show_logo: settings.showLogo,
          show_barcode: settings.showBarcode,
          show_qr_code: settings.showQrCode,
          paper_width: settings.paperWidth,
        },
      });

      // Update company settings (invoice registration number)
      await companyService.updateSettings(company.id, {
        invoice_registration_number: settings.invoiceRegistrationNumber,
      });

      showToast('店舗設定を保存しました', 'success');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save store settings:', error);
      showToast('設定の保存に失敗しました', 'error');
    } finally {
      setIsSaving(false);
    }
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

  const handleLogoUpload = async () => {
    if (!company?.id) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [2, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], 'logo.jpg', { type: 'image/jpeg' });

        const logoUrl = await companyService.uploadLogo(company.id, file);
        updateSetting('logoUrl', logoUrl);
        showToast('ロゴをアップロードしました', 'success');
      }
    } catch (error) {
      console.error('Failed to upload logo:', error);
      showToast('ロゴのアップロードに失敗しました', 'error');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

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
            <Button variant="outline" size="sm" onPress={handleLogoUpload}>
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
          style={[styles.headerButton, (!hasChanges || isSaving) && styles.headerButtonDisabled]}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary[600]} />
          ) : (
            <Text
              style={[
                styles.headerButtonText,
                styles.headerButtonTextPrimary,
                !hasChanges && styles.headerButtonTextDisabled,
              ]}
            >
              保存
            </Text>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.neutral[600],
    marginTop: spacing[2],
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
    minWidth: 80,
    alignItems: 'center',
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
