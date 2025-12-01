import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Card, Button, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import {
  integrationSettingsService,
  IntegrationType,
  IntegrationConfig,
  IntegrationInfo,
} from '@beauty-pos/api';

interface IntegrationFormData {
  api_key?: string;
  api_secret?: string;
  channel_id?: string;
  channel_secret?: string;
  access_token?: string;
  webhook_url?: string;
  account_sid?: string;
  auth_token?: string;
  phone_number?: string;
  sender_id?: string;
  domain?: string;
  from_email?: string;
  from_name?: string;
  publishable_key?: string;
  secret_key?: string;
  webhook_secret?: string;
  project_id?: string;
  organization_id?: string;
  [key: string]: string | undefined;
}

export default function IntegrationsScreen() {
  const { company, staff } = useAuthStore();
  const { showToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [integrations, setIntegrations] = useState<Record<IntegrationType, IntegrationConfig>>({} as Record<IntegrationType, IntegrationConfig>);
  const [integrationInfos] = useState<IntegrationInfo[]>(integrationSettingsService.getIntegrationInfos());
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState<IntegrationFormData>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const isAdmin = staff?.role === 'owner' || staff?.role === 'manager';

  const loadIntegrations = useCallback(async () => {
    if (!company?.id) return;
    try {
      const settings = await integrationSettingsService.getAllMasked(company.id);
      setIntegrations(settings.integrations);
    } catch (error) {
      console.error('Failed to load integrations:', error);
      showToast('連携設定の読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [company?.id, showToast]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadIntegrations();
  };

  const getIntegrationInfo = (type: IntegrationType): IntegrationInfo | undefined => {
    return integrationInfos.find(i => i.type === type);
  };

  const openEditModal = (type: IntegrationType) => {
    if (!isAdmin) {
      Alert.alert('権限エラー', '連携設定を変更する権限がありません');
      return;
    }
    setSelectedIntegration(type);
    // Reset form - we don't pre-fill with masked values
    setFormData({});
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!company?.id || !selectedIntegration) return;

    // Validate required fields
    const info = getIntegrationInfo(selectedIntegration);
    if (info) {
      for (const field of info.requiredFields) {
        if (!formData[field]) {
          showToast(`${getFieldLabel(field)}は必須です`, 'error');
          return;
        }
      }
    }

    setSaving(true);
    try {
      await integrationSettingsService.upsert(company.id, selectedIntegration, {
        ...formData,
        enabled: true,
      });
      showToast('連携設定を保存しました', 'success');
      setModalVisible(false);
      loadIntegrations();
    } catch (error) {
      console.error('Failed to save integration:', error);
      showToast('保存に失敗しました', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (type: IntegrationType, enabled: boolean) => {
    if (!company?.id || !isAdmin) return;
    try {
      await integrationSettingsService.setEnabled(company.id, type, enabled);
      loadIntegrations();
      showToast(enabled ? '連携を有効化しました' : '連携を無効化しました', 'success');
    } catch (error) {
      console.error('Failed to toggle integration:', error);
      showToast('設定変更に失敗しました', 'error');
    }
  };

  const handleDelete = async (type: IntegrationType) => {
    if (!company?.id || !isAdmin) return;
    const info = getIntegrationInfo(type);
    Alert.alert(
      '連携を削除',
      `${info?.name || type}の連携設定を削除しますか？APIキーなどの情報も削除されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await integrationSettingsService.delete(company.id, type);
              showToast('連携設定を削除しました', 'success');
              loadIntegrations();
            } catch (error) {
              console.error('Failed to delete integration:', error);
              showToast('削除に失敗しました', 'error');
            }
          },
        },
      ]
    );
  };

  const handleTestConnection = async (type: IntegrationType) => {
    if (!company?.id) return;
    setTesting(true);
    try {
      const result = await integrationSettingsService.testConnection(company.id, type);
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      showToast('接続テストに失敗しました', 'error');
    } finally {
      setTesting(false);
    }
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      api_key: 'APIキー',
      api_secret: 'APIシークレット',
      channel_id: 'チャンネルID',
      channel_secret: 'チャンネルシークレット',
      access_token: 'アクセストークン',
      webhook_url: 'Webhook URL',
      account_sid: 'アカウントSID',
      auth_token: '認証トークン',
      phone_number: '電話番号',
      sender_id: '送信者ID',
      domain: 'ドメイン',
      from_email: '送信元メールアドレス',
      from_name: '送信者名',
      publishable_key: '公開キー',
      secret_key: 'シークレットキー',
      webhook_secret: 'Webhookシークレット',
      project_id: 'プロジェクトID',
      organization_id: '組織ID',
    };
    return labels[field] || field;
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      messaging: 'メッセージング',
      payment: '決済',
      ai: 'AI・機械学習',
      external: '外部連携',
    };
    return labels[category] || category;
  };

  const renderIntegrationItem = (info: IntegrationInfo) => {
    const config = integrations[info.type];
    const isConfigured = !!config;
    const isEnabled = config?.enabled ?? false;

    return (
      <Card key={info.type} variant="outlined" size="md" style={styles.integrationCard}>
        <View style={styles.integrationHeader}>
          <View style={styles.integrationTitleRow}>
            <Text style={styles.integrationIcon}>{info.icon}</Text>
            <View style={styles.integrationTitleContainer}>
              <Text style={styles.integrationName}>{info.name}</Text>
              <Text style={styles.integrationDescription}>{info.description}</Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            {isConfigured ? (
              <View style={[styles.badge, isEnabled ? styles.badgeEnabled : styles.badgeDisabled]}>
                <Text style={[styles.badgeText, isEnabled ? styles.badgeTextEnabled : styles.badgeTextDisabled]}>
                  {isEnabled ? '有効' : '無効'}
                </Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeNotConfigured]}>
                <Text style={styles.badgeTextNotConfigured}>未設定</Text>
              </View>
            )}
          </View>
        </View>

        {isConfigured && (
          <View style={styles.configuredInfo}>
            <Text style={styles.configuredLabel}>設定済み</Text>
            {config.updated_at && (
              <Text style={styles.configuredDate}>
                最終更新: {new Date(config.updated_at).toLocaleDateString('ja-JP')}
              </Text>
            )}
          </View>
        )}

        <View style={styles.integrationActions}>
          {isConfigured && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.testButton]}
                onPress={() => handleTestConnection(info.type)}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                ) : (
                  <Text style={styles.testButtonText}>接続テスト</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, isEnabled ? styles.disableButton : styles.enableButton]}
                onPress={() => handleToggleEnabled(info.type, !isEnabled)}
              >
                <Text style={isEnabled ? styles.disableButtonText : styles.enableButtonText}>
                  {isEnabled ? '無効化' : '有効化'}
                </Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openEditModal(info.type)}
          >
            <Text style={styles.editButtonText}>{isConfigured ? '編集' : '設定'}</Text>
          </TouchableOpacity>
          {isConfigured && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(info.type)}
            >
              <Text style={styles.deleteButtonText}>削除</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  const renderFormFields = () => {
    if (!selectedIntegration) return null;
    const info = getIntegrationInfo(selectedIntegration);
    if (!info) return null;

    const allFields = [...info.requiredFields, ...(info.optionalFields || [])];

    return allFields.map(field => (
      <View key={field} style={styles.formField}>
        <Text style={styles.formLabel}>
          {getFieldLabel(field)}
          {info.requiredFields.includes(field) && <Text style={styles.required}> *</Text>}
        </Text>
        <TextInput
          style={styles.formInput}
          value={formData[field] || ''}
          onChangeText={(value) => setFormData(prev => ({ ...prev, [field]: value }))}
          placeholder={`${getFieldLabel(field)}を入力`}
          secureTextEntry={field.includes('secret') || field.includes('token') || field.includes('key')}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    ));
  };

  // Group integrations by category
  const groupedIntegrations = integrationInfos.reduce((acc, info) => {
    if (!acc[info.category]) {
      acc[info.category] = [];
    }
    acc[info.category].push(info);
    return acc;
  }, {} as Record<string, IntegrationInfo[]>);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: '外部連携設定' }} />
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '外部連携設定',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← 戻る</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!isAdmin && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              連携設定の変更にはオーナーまたはマネージャー権限が必要です
            </Text>
          </View>
        )}

        {Object.entries(groupedIntegrations).map(([category, infos]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{getCategoryLabel(category)}</Text>
            {infos.map(info => renderIntegrationItem(info))}
          </View>
        ))}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedIntegration && getIntegrationInfo(selectedIntegration)?.name}の設定
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary[500]} />
              ) : (
                <Text style={styles.modalSaveText}>保存</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedIntegration && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoIcon}>
                  {getIntegrationInfo(selectedIntegration)?.icon}
                </Text>
                <Text style={styles.modalInfoDescription}>
                  {getIntegrationInfo(selectedIntegration)?.description}
                </Text>
                {getIntegrationInfo(selectedIntegration)?.setupUrl && (
                  <Text style={styles.setupUrlText}>
                    設定方法: {getIntegrationInfo(selectedIntegration)?.setupUrl}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.formContainer}>
              {renderFormFields()}
            </View>

            <View style={styles.securityNote}>
              <Text style={styles.securityNoteTitle}>セキュリティについて</Text>
              <Text style={styles.securityNoteText}>
                APIキーなどの機密情報は暗号化されて保存されます。
                設定後も入力したキーの全文は表示されません。
              </Text>
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  backButton: {
    paddingHorizontal: spacing[2],
  },
  backButtonText: {
    ...textStyles.body,
    color: colors.primary[500],
  },
  warningBanner: {
    backgroundColor: colors.warning[50],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.warning[200],
  },
  warningText: {
    ...textStyles.bodySmall,
    color: colors.warning[700],
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: spacing[6],
  },
  categoryTitle: {
    ...textStyles.h5,
    color: colors.neutral[700],
    marginBottom: spacing[3],
    marginLeft: spacing[1],
  },
  integrationCard: {
    marginBottom: spacing[3],
    padding: spacing[4],
  },
  integrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  integrationTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  integrationIcon: {
    fontSize: 32,
    marginRight: spacing[3],
  },
  integrationTitleContainer: {
    flex: 1,
  },
  integrationName: {
    ...textStyles.label,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  integrationDescription: {
    ...textStyles.bodySmall,
    color: colors.neutral[600],
  },
  statusBadge: {
    marginLeft: spacing[2],
  },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  badgeEnabled: {
    backgroundColor: colors.success[100],
  },
  badgeDisabled: {
    backgroundColor: colors.neutral[200],
  },
  badgeNotConfigured: {
    backgroundColor: colors.warning[100],
  },
  badgeText: {
    ...textStyles.caption,
    fontWeight: '600',
  },
  badgeTextEnabled: {
    color: colors.success[700],
  },
  badgeTextDisabled: {
    color: colors.neutral[600],
  },
  badgeTextNotConfigured: {
    color: colors.warning[700],
  },
  configuredInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    marginBottom: spacing[3],
  },
  configuredLabel: {
    ...textStyles.caption,
    color: colors.success[600],
  },
  configuredDate: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  integrationActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  actionButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  testButton: {
    backgroundColor: colors.neutral[100],
  },
  testButtonText: {
    ...textStyles.bodySmall,
    color: colors.primary[600],
    fontWeight: '600',
  },
  enableButton: {
    backgroundColor: colors.success[100],
  },
  enableButtonText: {
    ...textStyles.bodySmall,
    color: colors.success[700],
    fontWeight: '600',
  },
  disableButton: {
    backgroundColor: colors.neutral[200],
  },
  disableButtonText: {
    ...textStyles.bodySmall,
    color: colors.neutral[600],
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: colors.primary[500],
  },
  editButtonText: {
    ...textStyles.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: colors.error[100],
  },
  deleteButtonText: {
    ...textStyles.bodySmall,
    color: colors.error[600],
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
  },
  modalCancelText: {
    ...textStyles.body,
    color: colors.neutral[600],
  },
  modalTitle: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  modalSaveText: {
    ...textStyles.body,
    color: colors.primary[500],
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing[4],
  },
  modalInfo: {
    alignItems: 'center',
    paddingVertical: spacing[4],
    marginBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  modalInfoIcon: {
    fontSize: 48,
    marginBottom: spacing[2],
  },
  modalInfoDescription: {
    ...textStyles.body,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  setupUrlText: {
    ...textStyles.caption,
    color: colors.primary[500],
    marginTop: spacing[2],
  },
  formContainer: {
    marginBottom: spacing[6],
  },
  formField: {
    marginBottom: spacing[4],
  },
  formLabel: {
    ...textStyles.label,
    color: colors.neutral[700],
    marginBottom: spacing[2],
  },
  required: {
    color: colors.error[500],
  },
  formInput: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    ...textStyles.body,
    color: colors.neutral[900],
  },
  securityNote: {
    backgroundColor: colors.primary[50],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[6],
  },
  securityNoteTitle: {
    ...textStyles.label,
    color: colors.primary[700],
    marginBottom: spacing[2],
  },
  securityNoteText: {
    ...textStyles.bodySmall,
    color: colors.primary[600],
  },
});
