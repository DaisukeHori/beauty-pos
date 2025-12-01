import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Card, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import {
  featureSettingsService,
  FeatureType,
  FeatureConfig,
  FeatureCategory,
  FeatureInfo,
} from '@beauty-pos/api';

export default function FeaturesScreen() {
  const { company, staff } = useAuthStore();
  const { showToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [features, setFeatures] = useState<Record<FeatureType, FeatureConfig>>({} as Record<FeatureType, FeatureConfig>);
  const [featureInfos] = useState<FeatureInfo[]>(featureSettingsService.getFeatureDefinitions());
  const [categories] = useState(featureSettingsService.getCategories());
  const [saving, setSaving] = useState<FeatureType | null>(null);

  const isAdmin = staff?.role === 'owner' || staff?.role === 'manager';

  const loadFeatures = useCallback(async () => {
    if (!company?.id) return;
    try {
      const settings = await featureSettingsService.getAll(company.id);
      setFeatures(settings.features);
    } catch (error) {
      console.error('Failed to load features:', error);
      showToast('機能設定の読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [company?.id, showToast]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFeatures();
  };

  const getFeatureInfo = (type: FeatureType): FeatureInfo | undefined => {
    return featureInfos.find(f => f.type === type);
  };

  const handleToggleFeature = async (type: FeatureType, enabled: boolean) => {
    if (!company?.id) return;

    if (!isAdmin) {
      Alert.alert('権限エラー', '機能設定を変更する権限がありません');
      return;
    }

    const info = getFeatureInfo(type);

    // Check if integration is required
    if (enabled && info?.requiresIntegration) {
      Alert.alert(
        '外部連携が必要',
        `この機能を有効にするには「${info.requiresIntegration}」の連携設定が必要です。外部連携設定画面で設定してください。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '連携設定へ',
            onPress: () => router.push('/admin/integrations'),
          },
        ]
      );
      return;
    }

    // Premium feature warning
    if (enabled && info?.isPremium) {
      Alert.alert(
        'プレミアム機能',
        'この機能はプレミアムプランに含まれています。有効化しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '有効化',
            onPress: () => doToggleFeature(type, enabled),
          },
        ]
      );
      return;
    }

    await doToggleFeature(type, enabled);
  };

  const doToggleFeature = async (type: FeatureType, enabled: boolean) => {
    if (!company?.id) return;
    setSaving(type);
    try {
      await featureSettingsService.setEnabled(company.id, type, enabled);
      setFeatures(prev => ({
        ...prev,
        [type]: { ...prev[type], enabled },
      }));
      showToast(enabled ? '機能を有効化しました' : '機能を無効化しました', 'success');
    } catch (error) {
      console.error('Failed to toggle feature:', error);
      showToast('設定変更に失敗しました', 'error');
    } finally {
      setSaving(null);
    }
  };

  const renderFeatureItem = (info: FeatureInfo) => {
    const config = features[info.type];
    const isEnabled = config?.enabled ?? false;
    const isSaving = saving === info.type;

    return (
      <View key={info.type} style={styles.featureItem}>
        <View style={styles.featureInfo}>
          <View style={styles.featureTitleRow}>
            <Text style={styles.featureIcon}>{info.icon}</Text>
            <View style={styles.featureTitleContainer}>
              <View style={styles.featureNameRow}>
                <Text style={styles.featureName}>{info.name}</Text>
                {info.isPremium && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>Premium</Text>
                  </View>
                )}
              </View>
              <Text style={styles.featureDescription}>{info.description}</Text>
              {info.requiresIntegration && (
                <Text style={styles.requiresIntegration}>
                  連携必要: {info.requiresIntegration}
                </Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.featureToggle}>
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <Switch
              value={isEnabled}
              onValueChange={(value) => handleToggleFeature(info.type, value)}
              trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
              thumbColor={isEnabled ? colors.primary[500] : colors.neutral[100]}
              disabled={!isAdmin}
            />
          )}
        </View>
      </View>
    );
  };

  const renderCategory = (category: { type: FeatureCategory; name: string; icon: string }) => {
    const categoryFeatures = featureInfos.filter(f => f.category === category.type);
    if (categoryFeatures.length === 0) return null;

    return (
      <View key={category.type} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryIcon}>{category.icon}</Text>
          <Text style={styles.categoryTitle}>{category.name}</Text>
        </View>
        <Card variant="outlined" size="md" style={styles.categoryCard}>
          {categoryFeatures.map((info, index) => (
            <View key={info.type}>
              {renderFeatureItem(info)}
              {index < categoryFeatures.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>
      </View>
    );
  };

  // Summary stats
  const totalFeatures = featureInfos.length;
  const enabledFeatures = Object.values(features).filter(f => f.enabled).length;
  const premiumFeatures = featureInfos.filter(f => f.isPremium).length;
  const enabledPremiumFeatures = featureInfos.filter(f => f.isPremium && features[f.type]?.enabled).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: '機能設定' }} />
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '機能設定',
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
              機能設定の変更にはオーナーまたはマネージャー権限が必要です
            </Text>
          </View>
        )}

        {/* Summary */}
        <Card variant="elevated" size="md" style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>機能利用状況</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>{enabledFeatures}/{totalFeatures}</Text>
              <Text style={styles.summaryStatLabel}>有効な機能</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>{enabledPremiumFeatures}/{premiumFeatures}</Text>
              <Text style={styles.summaryStatLabel}>プレミアム機能</Text>
            </View>
          </View>
        </Card>

        {/* Feature Categories */}
        {categories.map(category => renderCategory(category))}

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            機能のON/OFFは即座に反映されます。
          </Text>
          <Text style={styles.footerText}>
            一部の機能は外部サービスとの連携設定が必要です。
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
  summaryCard: {
    marginBottom: spacing[6],
    padding: spacing[4],
  },
  summaryTitle: {
    ...textStyles.label,
    color: colors.neutral[700],
    marginBottom: spacing[3],
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatValue: {
    ...textStyles.h3,
    color: colors.primary[600],
  },
  summaryStatLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[1],
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.neutral[200],
  },
  categorySection: {
    marginBottom: spacing[5],
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: spacing[2],
  },
  categoryTitle: {
    ...textStyles.h5,
    color: colors.neutral[700],
  },
  categoryCard: {
    padding: 0,
    overflow: 'hidden',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  featureInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: spacing[3],
  },
  featureTitleContainer: {
    flex: 1,
  },
  featureNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  featureName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  premiumBadge: {
    backgroundColor: colors.warning[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.full,
  },
  premiumBadgeText: {
    ...textStyles.caption,
    color: colors.warning[700],
    fontWeight: '600',
    fontSize: 10,
  },
  featureDescription: {
    ...textStyles.bodySmall,
    color: colors.neutral[600],
    marginTop: spacing[1],
  },
  requiresIntegration: {
    ...textStyles.caption,
    color: colors.primary[500],
    marginTop: spacing[1],
  },
  featureToggle: {
    width: 60,
    alignItems: 'flex-end',
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginHorizontal: spacing[4],
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  footerText: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  integrationLink: {
    marginTop: spacing[2],
    paddingVertical: spacing[2],
  },
  integrationLinkText: {
    ...textStyles.body,
    color: colors.primary[500],
    fontWeight: '600',
  },
});
