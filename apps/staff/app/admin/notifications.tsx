import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Card, Button, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import { getSupabaseClient } from '@beauty-pos/api';

interface NotificationSettings {
  // Reminder settings
  reminder_enabled: boolean;
  reminder_days_before: number;
  reminder_time: string;
  reminder_channels: {
    line: boolean;
    sms: boolean;
    email: boolean;
    push: boolean;
  };

  // Confirmation settings
  confirmation_enabled: boolean;
  confirmation_channels: {
    line: boolean;
    sms: boolean;
    email: boolean;
  };

  // Follow-up settings
  followup_enabled: boolean;
  followup_days_after: number;
  followup_channels: {
    line: boolean;
    sms: boolean;
    email: boolean;
  };

  // Marketing settings
  marketing_enabled: boolean;
  birthday_greeting: boolean;
  campaign_notifications: boolean;
}

const defaultSettings: NotificationSettings = {
  reminder_enabled: true,
  reminder_days_before: 1,
  reminder_time: '18:00',
  reminder_channels: {
    line: true,
    sms: false,
    email: true,
    push: true,
  },
  confirmation_enabled: true,
  confirmation_channels: {
    line: true,
    sms: false,
    email: true,
  },
  followup_enabled: false,
  followup_days_after: 3,
  followup_channels: {
    line: true,
    sms: false,
    email: true,
  },
  marketing_enabled: false,
  birthday_greeting: false,
  campaign_notifications: false,
};

export default function NotificationsScreen() {
  const { company, staff } = useAuthStore();
  const { showToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const isAdmin = staff?.role === 'owner' || staff?.role === 'manager';

  const loadSettings = useCallback(async () => {
    if (!company?.id) return;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', company.id)
        .single();

      if (error) throw error;

      const companySettings = (data?.settings as Record<string, unknown>) || {};
      const notificationSettings = (companySettings.notifications as NotificationSettings) || defaultSettings;

      setSettings({
        ...defaultSettings,
        ...notificationSettings,
      });
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      showToast('設定の読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [company?.id, showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSettings();
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateChannel = (
    category: 'reminder_channels' | 'confirmation_channels' | 'followup_channels',
    channel: 'line' | 'sms' | 'email' | 'push',
    value: boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [channel]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!company?.id || !isAdmin) return;

    setSaving(true);
    try {
      const supabase = getSupabaseClient();

      // Get current settings
      const { data: current } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', company.id)
        .single();

      const currentSettings = (current?.settings as Record<string, unknown>) || {};

      // Update with new notification settings
      const { error } = await supabase
        .from('companies')
        .update({
          settings: {
            ...currentSettings,
            notifications: settings,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', company.id);

      if (error) throw error;

      showToast('設定を保存しました', 'success');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('保存に失敗しました', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderChannelSettings = (
    category: 'reminder_channels' | 'confirmation_channels' | 'followup_channels',
    showPush: boolean = false
  ) => {
    const channels = settings[category];
    return (
      <View style={styles.channelsContainer}>
        <View style={styles.channelItem}>
          <Text style={styles.channelLabel}>LINE</Text>
          <Switch
            value={channels.line}
            onValueChange={(value) => updateChannel(category, 'line', value)}
            trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
            thumbColor={channels.line ? colors.primary[500] : colors.neutral[100]}
            disabled={!isAdmin}
          />
        </View>
        <View style={styles.channelItem}>
          <Text style={styles.channelLabel}>SMS</Text>
          <Switch
            value={channels.sms}
            onValueChange={(value) => updateChannel(category, 'sms', value)}
            trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
            thumbColor={channels.sms ? colors.primary[500] : colors.neutral[100]}
            disabled={!isAdmin}
          />
        </View>
        <View style={styles.channelItem}>
          <Text style={styles.channelLabel}>メール</Text>
          <Switch
            value={channels.email}
            onValueChange={(value) => updateChannel(category, 'email', value)}
            trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
            thumbColor={channels.email ? colors.primary[500] : colors.neutral[100]}
            disabled={!isAdmin}
          />
        </View>
        {showPush && 'push' in channels && (
          <View style={styles.channelItem}>
            <Text style={styles.channelLabel}>プッシュ</Text>
            <Switch
              value={(channels as { push: boolean }).push}
              onValueChange={(value) => updateChannel(category as 'reminder_channels', 'push', value)}
              trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
              thumbColor={(channels as { push: boolean }).push ? colors.primary[500] : colors.neutral[100]}
              disabled={!isAdmin}
            />
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: '通知設定' }} />
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '通知設定',
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
              通知設定の変更にはオーナーまたはマネージャー権限が必要です
            </Text>
          </View>
        )}

        {/* Reminder Settings */}
        <Card variant="outlined" size="md" style={styles.settingCard}>
          <View style={styles.settingHeader}>
            <View style={styles.settingTitleRow}>
              <Text style={styles.settingIcon}>⏰</Text>
              <View style={styles.settingTitleContainer}>
                <Text style={styles.settingTitle}>予約リマインダー</Text>
                <Text style={styles.settingDescription}>
                  予約の前日にお客様へリマインダーを送信
                </Text>
              </View>
            </View>
            <Switch
              value={settings.reminder_enabled}
              onValueChange={(value) => updateSetting('reminder_enabled', value)}
              trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
              thumbColor={settings.reminder_enabled ? colors.primary[500] : colors.neutral[100]}
              disabled={!isAdmin}
            />
          </View>

          {settings.reminder_enabled && (
            <View style={styles.settingDetails}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>送信タイミング</Text>
                <View style={styles.timingOptions}>
                  {[1, 2, 3].map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.timingButton,
                        settings.reminder_days_before === days && styles.timingButtonActive,
                      ]}
                      onPress={() => updateSetting('reminder_days_before', days)}
                      disabled={!isAdmin}
                    >
                      <Text style={[
                        styles.timingButtonText,
                        settings.reminder_days_before === days && styles.timingButtonTextActive,
                      ]}>
                        {days}日前
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>送信時刻</Text>
                <View style={styles.timeInputContainer}>
                  <TextInput
                    style={styles.timeInput}
                    value={settings.reminder_time}
                    onChangeText={(value) => updateSetting('reminder_time', value)}
                    placeholder="18:00"
                    editable={isAdmin}
                  />
                </View>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>送信チャンネル</Text>
              </View>
              {renderChannelSettings('reminder_channels', true)}
            </View>
          )}
        </Card>

        {/* Confirmation Settings */}
        <Card variant="outlined" size="md" style={styles.settingCard}>
          <View style={styles.settingHeader}>
            <View style={styles.settingTitleRow}>
              <Text style={styles.settingIcon}>✓</Text>
              <View style={styles.settingTitleContainer}>
                <Text style={styles.settingTitle}>予約確認通知</Text>
                <Text style={styles.settingDescription}>
                  予約完了時にお客様へ確認メッセージを送信
                </Text>
              </View>
            </View>
            <Switch
              value={settings.confirmation_enabled}
              onValueChange={(value) => updateSetting('confirmation_enabled', value)}
              trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
              thumbColor={settings.confirmation_enabled ? colors.primary[500] : colors.neutral[100]}
              disabled={!isAdmin}
            />
          </View>

          {settings.confirmation_enabled && (
            <View style={styles.settingDetails}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>送信チャンネル</Text>
              </View>
              {renderChannelSettings('confirmation_channels')}
            </View>
          )}
        </Card>

        {/* Follow-up Settings */}
        <Card variant="outlined" size="md" style={styles.settingCard}>
          <View style={styles.settingHeader}>
            <View style={styles.settingTitleRow}>
              <Text style={styles.settingIcon}>💌</Text>
              <View style={styles.settingTitleContainer}>
                <Text style={styles.settingTitle}>フォローアップ</Text>
                <Text style={styles.settingDescription}>
                  来店後にお礼メッセージを送信
                </Text>
              </View>
            </View>
            <Switch
              value={settings.followup_enabled}
              onValueChange={(value) => updateSetting('followup_enabled', value)}
              trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
              thumbColor={settings.followup_enabled ? colors.primary[500] : colors.neutral[100]}
              disabled={!isAdmin}
            />
          </View>

          {settings.followup_enabled && (
            <View style={styles.settingDetails}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>送信タイミング</Text>
                <View style={styles.timingOptions}>
                  {[1, 3, 7].map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.timingButton,
                        settings.followup_days_after === days && styles.timingButtonActive,
                      ]}
                      onPress={() => updateSetting('followup_days_after', days)}
                      disabled={!isAdmin}
                    >
                      <Text style={[
                        styles.timingButtonText,
                        settings.followup_days_after === days && styles.timingButtonTextActive,
                      ]}>
                        {days}日後
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>送信チャンネル</Text>
              </View>
              {renderChannelSettings('followup_channels')}
            </View>
          )}
        </Card>

        {/* Marketing Settings */}
        <Card variant="outlined" size="md" style={styles.settingCard}>
          <View style={styles.settingHeader}>
            <View style={styles.settingTitleRow}>
              <Text style={styles.settingIcon}>📢</Text>
              <View style={styles.settingTitleContainer}>
                <Text style={styles.settingTitle}>マーケティング通知</Text>
                <Text style={styles.settingDescription}>
                  お客様へのプロモーション通知
                </Text>
              </View>
            </View>
            <Switch
              value={settings.marketing_enabled}
              onValueChange={(value) => updateSetting('marketing_enabled', value)}
              trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
              thumbColor={settings.marketing_enabled ? colors.primary[500] : colors.neutral[100]}
              disabled={!isAdmin}
            />
          </View>

          {settings.marketing_enabled && (
            <View style={styles.settingDetails}>
              <View style={styles.marketingOption}>
                <View style={styles.marketingOptionInfo}>
                  <Text style={styles.marketingOptionLabel}>誕生日メッセージ</Text>
                  <Text style={styles.marketingOptionDescription}>
                    お客様の誕生日にお祝いメッセージを自動送信
                  </Text>
                </View>
                <Switch
                  value={settings.birthday_greeting}
                  onValueChange={(value) => updateSetting('birthday_greeting', value)}
                  trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
                  thumbColor={settings.birthday_greeting ? colors.primary[500] : colors.neutral[100]}
                  disabled={!isAdmin}
                />
              </View>

              <View style={styles.marketingOption}>
                <View style={styles.marketingOptionInfo}>
                  <Text style={styles.marketingOptionLabel}>キャンペーン通知</Text>
                  <Text style={styles.marketingOptionDescription}>
                    セール・キャンペーン情報をお客様へ通知
                  </Text>
                </View>
                <Switch
                  value={settings.campaign_notifications}
                  onValueChange={(value) => updateSetting('campaign_notifications', value)}
                  trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
                  thumbColor={settings.campaign_notifications ? colors.primary[500] : colors.neutral[100]}
                  disabled={!isAdmin}
                />
              </View>
            </View>
          )}
        </Card>

        {/* Save Button */}
        {isAdmin && hasChanges && (
          <Button
            fullWidth
            onPress={handleSave}
            isLoading={saving}
            style={styles.saveButton}
          >
            設定を保存
          </Button>
        )}

        {/* Integration Notice */}
        <View style={styles.noticeContainer}>
          <Text style={styles.noticeTitle}>連携設定について</Text>
          <Text style={styles.noticeText}>
            LINE、SMS、メール通知を利用するには、外部連携設定で各サービスのAPIキーを設定してください。
          </Text>
          <TouchableOpacity
            style={styles.integrationLink}
            onPress={() => router.push('/admin/integrations')}
          >
            <Text style={styles.integrationLinkText}>外部連携設定へ →</Text>
          </TouchableOpacity>
        </View>
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
  settingCard: {
    marginBottom: spacing[4],
    padding: spacing[4],
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  settingTitleRow: {
    flexDirection: 'row',
    flex: 1,
    marginRight: spacing[3],
  },
  settingIcon: {
    fontSize: 24,
    marginRight: spacing[3],
  },
  settingTitleContainer: {
    flex: 1,
  },
  settingTitle: {
    ...textStyles.label,
    color: colors.neutral[900],
    marginBottom: spacing[0.5],
  },
  settingDescription: {
    ...textStyles.bodySmall,
    color: colors.neutral[500],
  },
  settingDetails: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  settingRow: {
    marginBottom: spacing[3],
  },
  settingLabel: {
    ...textStyles.label,
    color: colors.neutral[700],
    marginBottom: spacing[2],
  },
  timingOptions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  timingButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
  },
  timingButtonActive: {
    backgroundColor: colors.primary[500],
  },
  timingButtonText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  timingButtonTextActive: {
    color: colors.white,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    ...textStyles.body,
    color: colors.neutral[900],
    width: 100,
  },
  channelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  channelLabel: {
    ...textStyles.body,
    color: colors.neutral[700],
  },
  marketingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  marketingOptionInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  marketingOptionLabel: {
    ...textStyles.label,
    color: colors.neutral[900],
    marginBottom: spacing[0.5],
  },
  marketingOptionDescription: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  saveButton: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  noticeContainer: {
    backgroundColor: colors.primary[50],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[6],
  },
  noticeTitle: {
    ...textStyles.label,
    color: colors.primary[700],
    marginBottom: spacing[2],
  },
  noticeText: {
    ...textStyles.bodySmall,
    color: colors.primary[600],
    marginBottom: spacing[3],
  },
  integrationLink: {
    alignSelf: 'flex-start',
  },
  integrationLinkText: {
    ...textStyles.body,
    color: colors.primary[600],
    fontWeight: '600',
  },
});
