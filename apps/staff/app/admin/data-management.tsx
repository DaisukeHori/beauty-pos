import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, Badge, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import { getSupabaseClient } from '@beauty-pos/api';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// データタイプ定義
interface DataType {
  id: string;
  name: string;
  description: string;
  category: 'master' | 'transaction';
  icon: string;
  exportable: boolean;
  importable: boolean;
}

const DATA_TYPES: DataType[] = [
  // マスターデータ
  { id: 'products', name: '商品マスター', description: '店販商品の一覧', category: 'master', icon: '📦', exportable: true, importable: true },
  { id: 'menus', name: 'メニューマスター', description: '施術メニューの一覧', category: 'master', icon: '✂️', exportable: true, importable: true },
  { id: 'menu_categories', name: 'メニューカテゴリ', description: 'メニューのカテゴリ', category: 'master', icon: '📂', exportable: true, importable: true },
  { id: 'staff', name: 'スタッフマスター', description: 'スタッフの一覧', category: 'master', icon: '👤', exportable: true, importable: true },
  { id: 'customers', name: '顧客マスター', description: '顧客の一覧', category: 'master', icon: '👥', exportable: true, importable: true },
  { id: 'tags', name: 'タグマスター', description: 'タグの一覧', category: 'master', icon: '🏷️', exportable: true, importable: true },
  { id: 'coupons', name: 'クーポンマスター', description: 'クーポンの一覧', category: 'master', icon: '🎟️', exportable: true, importable: true },
  { id: 'materials', name: '材料マスター', description: '施術材料の一覧', category: 'master', icon: '🧴', exportable: true, importable: true },
  { id: 'processes', name: '工程マスター', description: '施術工程の一覧', category: 'master', icon: '⚙️', exportable: true, importable: true },
  // 取引データ
  { id: 'sales', name: '売上データ', description: '売上伝票の一覧', category: 'transaction', icon: '💰', exportable: true, importable: true },
  { id: 'sale_items', name: '売上明細データ', description: '売上明細の一覧', category: 'transaction', icon: '📝', exportable: true, importable: true },
  { id: 'reservations', name: '予約データ', description: '予約の一覧', category: 'transaction', icon: '📅', exportable: true, importable: true },
  { id: 'visits', name: '来店データ', description: '来店履歴', category: 'transaction', icon: '🚶', exportable: true, importable: false },
  { id: 'points', name: 'ポイント履歴', description: 'ポイント取引履歴', category: 'transaction', icon: '🎯', exportable: true, importable: false },
];

export default function DataManagementScreen() {
  const { company, store } = useAuthStore();
  const { showToast } = useUIStore();

  const [selectedType, setSelectedType] = useState<DataType | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    created: number;
    updated: number;
    deleted: number;
    errors: Array<{ row: number; field?: string; message: string }>;
  } | null>(null);

  // 日付範囲（取引データ用）
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // エクスポート処理
  const handleExport = useCallback(async () => {
    if (!selectedType || !company?.id) return;

    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/export-csv`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: selectedType.id,
            companyId: company.id,
            storeId: store?.id,
            startDate,
            endDate,
            format: 'csv',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'エクスポートに失敗しました');
      }

      const csvData = await response.text();
      const filename = `${selectedType.id}_${new Date().toISOString().split('T')[0]}.csv`;

      if (Platform.OS === 'web') {
        // Web用ダウンロード
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Native用
        const fileUri = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, csvData, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'CSVをエクスポート',
          });
        }
      }

      showToast('エクスポートが完了しました', 'success');
      setShowExportModal(false);
    } catch (error: any) {
      console.error('Export error:', error);
      showToast(error.message || 'エクスポートに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, company?.id, store?.id, startDate, endDate, showToast]);

  // インポート処理
  const handleImport = useCallback(async () => {
    if (!selectedType || !company?.id) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];

      setIsLoading(true);

      let csvData: string;
      if (Platform.OS === 'web') {
        // Web用
        const response = await fetch(file.uri);
        csvData = await response.text();
      } else {
        // Native用
        csvData = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      const supabase = getSupabaseClient();
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/import-csv`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            entityType: selectedType.id,
            csvData,
            companyId: company.id,
            storeId: store?.id,
            dryRun: false,
          }),
        }
      );

      const importResultData = await response.json();

      if (!response.ok) {
        throw new Error(importResultData.error || 'インポートに失敗しました');
      }

      setImportResult(importResultData);
      setShowImportModal(false);
      setShowResultModal(true);

      if (importResultData.failed === 0) {
        showToast(`${importResultData.success}件のインポートが完了しました`, 'success');
      } else {
        showToast(`${importResultData.success}件成功、${importResultData.failed}件失敗`, 'warning');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      showToast(error.message || 'インポートに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, company?.id, store?.id, showToast]);

  // テンプレートダウンロード
  const handleDownloadTemplate = useCallback(async () => {
    if (!selectedType) return;

    // テンプレートヘッダーを定義
    const templates: Record<string, string> = {
      products: '_action,ID,商品コード,商品名,カテゴリ,ブランド,説明,単位,原価,販売価格,在庫数,最低在庫,販売用,店内使用,税率,画像URL,表示順,有効',
      menus: '_action,ID,メニューコード,メニュー名,カテゴリID,説明,基本価格,ショート価格,ミディアム価格,ロング価格,所要時間（分）,セットメニュー,税率,チケット適用,クーポン適用,指名必須,表示順,有効',
      menu_categories: '_action,ID,カテゴリ名,説明,アイコン,色,表示順,有効',
      staff: '_action,ID,スタッフコード,姓,名,セイ,メイ,メール,電話番号,役職,ランク,指名料,入社日,生年月日,有効',
      customers: '_action,ID,顧客コード,姓,名,セイ,メイ,メール,電話番号,郵便番号,住所,生年月日,性別,職業,メモ,紹介元,担当スタッフID,来店回数,利用合計,ポイント残高,最終来店日,プライバシー同意,マーケティング同意,有効',
      tags: '_action,ID,タグ名,色,アイコン,親タグID,表示順,有効',
      coupons: '_action,ID,クーポンコード,クーポン名,説明,割引タイプ,割引値,最小購入額,最大割引額,有効開始日,有効終了日,最大使用回数,使用回数,1回限り,有効',
      materials: '_action,ID,材料コード,材料名,カテゴリ,ブランド,説明,単位,単価,在庫数,最低在庫,画像URL,表示順,有効',
      processes: '_action,ID,工程コード,工程名,説明,標準時間（分）,生産性ウェイト,表示順,有効',
      sales: '_action,ID,伝票番号,店舗ID,来店ID,顧客ID,売上日時,小計,割引合計,税合計,合計,使用ポイント,付与ポイント,ステータス,備考,作成者ID',
      sale_items: '_action,ID,売上ID,アイテム種別,アイテムID,名前,数量,単価,髪の長さ,長さ追加料金,割引額,税率,税額,小計,指名タイプ,指名料',
      reservations: '_action,ID,店舗ID,顧客ID,スタッフID,開始時間,終了時間,ステータス,指名タイプ,顧客名,顧客電話,顧客メール,備考,予約元,外部ID',
    };

    const template = templates[selectedType.id];
    if (!template) {
      showToast('このデータタイプのテンプレートはありません', 'error');
      return;
    }

    const BOM = '\uFEFF';
    const csvData = BOM + template + '\n';
    const filename = `template_${selectedType.id}.csv`;

    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const fileUri = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, csvData, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'テンプレートをダウンロード',
          });
        }
      }

      showToast('テンプレートをダウンロードしました', 'success');
    } catch (error: any) {
      console.error('Template download error:', error);
      showToast('テンプレートのダウンロードに失敗しました', 'error');
    }
  }, [selectedType, showToast]);

  const masterTypes = DATA_TYPES.filter(t => t.category === 'master');
  const transactionTypes = DATA_TYPES.filter(t => t.category === 'transaction');

  const renderDataTypeCard = (dataType: DataType) => (
    <Card key={dataType.id} variant="outlined" size="sm" style={styles.dataTypeCard}>
      <View style={styles.dataTypeContent}>
        <View style={styles.dataTypeHeader}>
          <Text style={styles.dataTypeIcon}>{dataType.icon}</Text>
          <View style={styles.dataTypeInfo}>
            <Text style={styles.dataTypeName}>{dataType.name}</Text>
            <Text style={styles.dataTypeDescription}>{dataType.description}</Text>
          </View>
        </View>
        <View style={styles.dataTypeActions}>
          {dataType.exportable && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedType(dataType);
                setShowExportModal(true);
              }}
            >
              <Text style={styles.actionButtonText}>エクスポート</Text>
            </TouchableOpacity>
          )}
          {dataType.importable && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => {
                setSelectedType(dataType);
                setShowImportModal(true);
              }}
            >
              <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>インポート</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>データ管理</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* 説明 */}
        <Card variant="filled" size="md" style={styles.infoCard}>
          <Text style={styles.infoTitle}>CSVインポート/エクスポート</Text>
          <Text style={styles.infoText}>
            マスターデータや取引データのCSVインポート・エクスポートができます。
          </Text>
          <View style={styles.actionInfo}>
            <Text style={styles.actionInfoTitle}>_action列の使い方：</Text>
            <Text style={styles.actionInfoItem}>• create または 空欄: 新規作成（既存があれば更新）</Text>
            <Text style={styles.actionInfoItem}>• update: 更新のみ</Text>
            <Text style={styles.actionInfoItem}>• delete: 削除</Text>
          </View>
        </Card>

        {/* マスターデータ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>マスターデータ</Text>
          <Text style={styles.sectionDescription}>
            商品、メニュー、スタッフ、顧客などの基本データ
          </Text>
          {masterTypes.map(renderDataTypeCard)}
        </View>

        {/* 取引データ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>取引データ</Text>
          <Text style={styles.sectionDescription}>
            売上、予約、来店などの履歴データ
          </Text>
          {transactionTypes.map(renderDataTypeCard)}
        </View>
      </ScrollView>

      {/* エクスポートモーダル */}
      <Modal
        visible={showExportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowExportModal(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedType?.name}をエクスポート
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedType?.category === 'transaction' && (
              <View style={styles.dateRangeContainer}>
                <Text style={styles.dateRangeLabel}>期間を指定</Text>
                <View style={styles.dateInputs}>
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.dateInputLabel}>開始日</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.neutral[400]}
                    />
                  </View>
                  <Text style={styles.dateSeparator}>〜</Text>
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.dateInputLabel}>終了日</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.neutral[400]}
                    />
                  </View>
                </View>
              </View>
            )}

            <View style={styles.exportInfo}>
              <Text style={styles.exportInfoText}>
                • CSV形式（UTF-8 BOM付き）でエクスポートします
              </Text>
              <Text style={styles.exportInfoText}>
                • Excelで直接開くことができます
              </Text>
              <Text style={styles.exportInfoText}>
                • エクスポートしたファイルは編集後、インポートできます
              </Text>
            </View>

            <Button
              onPress={handleExport}
              disabled={isLoading}
              style={styles.exportButton}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                'エクスポート'
              )}
            </Button>
          </ScrollView>
        </View>
      </Modal>

      {/* インポートモーダル */}
      <Modal
        visible={showImportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowImportModal(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedType?.name}をインポート
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.importInfo}>
              <Text style={styles.importInfoTitle}>インポートの手順</Text>
              <Text style={styles.importInfoStep}>1. テンプレートをダウンロード</Text>
              <Text style={styles.importInfoStep}>2. CSVファイルを編集</Text>
              <Text style={styles.importInfoStep}>3. ファイルを選択してインポート</Text>
            </View>

            <View style={styles.templateSection}>
              <Text style={styles.templateTitle}>テンプレート</Text>
              <Button
                variant="outline"
                onPress={handleDownloadTemplate}
                style={styles.templateButton}
              >
                テンプレートをダウンロード
              </Button>
            </View>

            <View style={styles.importWarning}>
              <Text style={styles.warningTitle}>注意事項</Text>
              <Text style={styles.warningText}>
                • _action列で操作を指定できます（create/update/delete）
              </Text>
              <Text style={styles.warningText}>
                • IDまたはコードが既存データと一致する場合は更新されます
              </Text>
              <Text style={styles.warningText}>
                • 削除は_action列にdeleteを指定してください
              </Text>
            </View>

            <Button
              onPress={handleImport}
              disabled={isLoading}
              style={styles.importButton}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                'CSVファイルを選択'
              )}
            </Button>
          </ScrollView>
        </View>
      </Modal>

      {/* 結果モーダル */}
      <Modal
        visible={showResultModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>インポート結果</Text>
            <TouchableOpacity onPress={() => setShowResultModal(false)}>
              <Text style={styles.modalDone}>完了</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {importResult && (
              <>
                <View style={styles.resultSummary}>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>成功</Text>
                    <Text style={[styles.resultValue, styles.resultSuccess]}>
                      {importResult.success}件
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>失敗</Text>
                    <Text style={[styles.resultValue, importResult.failed > 0 && styles.resultError]}>
                      {importResult.failed}件
                    </Text>
                  </View>
                </View>

                <View style={styles.resultDetails}>
                  <View style={styles.resultDetailItem}>
                    <Text style={styles.resultDetailLabel}>新規作成</Text>
                    <Text style={styles.resultDetailValue}>{importResult.created}件</Text>
                  </View>
                  <View style={styles.resultDetailItem}>
                    <Text style={styles.resultDetailLabel}>更新</Text>
                    <Text style={styles.resultDetailValue}>{importResult.updated}件</Text>
                  </View>
                  <View style={styles.resultDetailItem}>
                    <Text style={styles.resultDetailLabel}>削除</Text>
                    <Text style={styles.resultDetailValue}>{importResult.deleted}件</Text>
                  </View>
                </View>

                {importResult.errors.length > 0 && (
                  <View style={styles.errorSection}>
                    <Text style={styles.errorTitle}>エラー詳細</Text>
                    {importResult.errors.slice(0, 10).map((error, index) => (
                      <View key={index} style={styles.errorItem}>
                        <Text style={styles.errorRow}>行 {error.row}</Text>
                        {error.field && (
                          <Text style={styles.errorField}>{error.field}</Text>
                        )}
                        <Text style={styles.errorMessage}>{error.message}</Text>
                      </View>
                    ))}
                    {importResult.errors.length > 10 && (
                      <Text style={styles.errorMore}>
                        他 {importResult.errors.length - 10}件のエラー
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}
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
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  infoCard: {
    marginBottom: spacing[6],
  },
  infoTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[2],
  },
  infoText: {
    ...textStyles.body,
    color: colors.neutral[600],
    marginBottom: spacing[3],
  },
  actionInfo: {
    backgroundColor: colors.neutral[100],
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  actionInfoTitle: {
    ...textStyles.label,
    color: colors.neutral[700],
    marginBottom: spacing[1],
  },
  actionInfoItem: {
    ...textStyles.caption,
    color: colors.neutral[600],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  sectionDescription: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[3],
  },
  dataTypeCard: {
    marginBottom: spacing[2],
  },
  dataTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dataTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dataTypeIcon: {
    fontSize: 24,
    marginRight: spacing[3],
  },
  dataTypeInfo: {
    flex: 1,
  },
  dataTypeName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  dataTypeDescription: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  dataTypeActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary[500],
  },
  actionButtonText: {
    ...textStyles.caption,
    color: colors.neutral[700],
  },
  actionButtonTextPrimary: {
    color: colors.white,
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
    ...textStyles.h6,
    color: colors.neutral[900],
  },
  modalDone: {
    ...textStyles.body,
    color: colors.primary[600],
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing[4],
  },
  dateRangeContainer: {
    marginBottom: spacing[4],
  },
  dateRangeLabel: {
    ...textStyles.label,
    color: colors.neutral[700],
    marginBottom: spacing[2],
  },
  dateInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInputGroup: {
    flex: 1,
  },
  dateInputLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  dateInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    ...textStyles.body,
    color: colors.neutral[900],
  },
  dateSeparator: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginHorizontal: spacing[2],
    marginTop: spacing[4],
  },
  exportInfo: {
    backgroundColor: colors.neutral[100],
    padding: spacing[4],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
  },
  exportInfoText: {
    ...textStyles.caption,
    color: colors.neutral[600],
    marginBottom: spacing[1],
  },
  exportButton: {
    marginTop: spacing[4],
  },
  importInfo: {
    backgroundColor: colors.primary[50],
    padding: spacing[4],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
  },
  importInfoTitle: {
    ...textStyles.label,
    color: colors.primary[700],
    marginBottom: spacing[2],
  },
  importInfoStep: {
    ...textStyles.body,
    color: colors.primary[600],
    marginBottom: spacing[1],
  },
  templateSection: {
    marginBottom: spacing[4],
  },
  templateTitle: {
    ...textStyles.label,
    color: colors.neutral[700],
    marginBottom: spacing[2],
  },
  templateButton: {
    marginBottom: spacing[2],
  },
  importWarning: {
    backgroundColor: colors.warning[50],
    padding: spacing[4],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
  },
  warningTitle: {
    ...textStyles.label,
    color: colors.warning[700],
    marginBottom: spacing[2],
  },
  warningText: {
    ...textStyles.caption,
    color: colors.warning[600],
    marginBottom: spacing[1],
  },
  importButton: {
    marginTop: spacing[4],
  },
  resultSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing[6],
    paddingVertical: spacing[4],
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
  resultItem: {
    alignItems: 'center',
  },
  resultLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  resultValue: {
    ...textStyles.h4,
    color: colors.neutral[900],
  },
  resultSuccess: {
    color: colors.success[600],
  },
  resultError: {
    color: colors.error[600],
  },
  resultDetails: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  resultDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  resultDetailLabel: {
    ...textStyles.body,
    color: colors.neutral[600],
  },
  resultDetailValue: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  errorSection: {
    backgroundColor: colors.error[50],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  errorTitle: {
    ...textStyles.label,
    color: colors.error[700],
    marginBottom: spacing[3],
  },
  errorItem: {
    backgroundColor: colors.white,
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  errorRow: {
    ...textStyles.label,
    color: colors.error[600],
  },
  errorField: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  errorMessage: {
    ...textStyles.caption,
    color: colors.neutral[700],
    marginTop: spacing[1],
  },
  errorMore: {
    ...textStyles.caption,
    color: colors.error[600],
    textAlign: 'center',
    marginTop: spacing[2],
  },
});
