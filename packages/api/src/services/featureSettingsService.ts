import { getSupabaseClient } from '../client';

// Feature types
export type FeatureType =
  // Notifications
  | 'notification_line'
  | 'notification_sms'
  | 'notification_email'
  | 'notification_push'
  // Reminders
  | 'reminder_reservation'
  | 'reminder_followup'
  // Payments
  | 'payment_credit_card'
  | 'payment_electronic_money'
  | 'payment_qr'
  // AI Features
  | 'ai_hairstyle_simulation'
  | 'ai_customer_analysis'
  | 'ai_upsell_suggestion'
  | 'ai_conversation_transcription'
  // Customer Features
  | 'customer_points'
  | 'customer_member_rank'
  | 'customer_coupons'
  | 'customer_tickets'
  // Operations
  | 'operation_shift_management'
  | 'operation_inventory_management'
  | 'operation_daily_report'
  // External
  | 'external_hotpepper_sync'
  | 'external_pinterest';

export interface FeatureConfig {
  type: FeatureType;
  enabled: boolean;
  settings?: Record<string, unknown>;
  updated_at?: string;
}

export interface FeatureSettings {
  company_id: string;
  store_id?: string;
  features: Record<FeatureType, FeatureConfig>;
}

// Feature category grouping
export type FeatureCategory =
  | 'notifications'
  | 'reminders'
  | 'payments'
  | 'ai'
  | 'customer'
  | 'operations'
  | 'external';

export interface FeatureInfo {
  type: FeatureType;
  name: string;
  description: string;
  category: FeatureCategory;
  icon: string;
  requiresIntegration?: string; // Integration type required
  isPremium?: boolean; // Premium feature flag
}

// All feature definitions
const featureDefinitions: FeatureInfo[] = [
  // Notifications
  {
    type: 'notification_line',
    name: 'LINE通知',
    description: 'LINEで予約確認・リマインダーを送信',
    category: 'notifications',
    icon: '💬',
    requiresIntegration: 'line',
  },
  {
    type: 'notification_sms',
    name: 'SMS通知',
    description: 'SMSで予約リマインダーを送信',
    category: 'notifications',
    icon: '📱',
    requiresIntegration: 'sms_twilio',
  },
  {
    type: 'notification_email',
    name: 'メール通知',
    description: 'メールで予約確認・リマインダーを送信',
    category: 'notifications',
    icon: '📧',
    requiresIntegration: 'email_sendgrid',
  },
  {
    type: 'notification_push',
    name: 'プッシュ通知',
    description: 'アプリでプッシュ通知を送信',
    category: 'notifications',
    icon: '🔔',
  },
  // Reminders
  {
    type: 'reminder_reservation',
    name: '予約リマインダー',
    description: '予約前日・当日に自動リマインダー送信',
    category: 'reminders',
    icon: '⏰',
  },
  {
    type: 'reminder_followup',
    name: 'フォローアップ',
    description: '来店後のフォローアップメッセージ送信',
    category: 'reminders',
    icon: '💌',
  },
  // Payments
  {
    type: 'payment_credit_card',
    name: 'クレジットカード決済',
    description: 'クレジットカードでの支払いを受け付け',
    category: 'payments',
    icon: '💳',
    requiresIntegration: 'stripe',
  },
  {
    type: 'payment_electronic_money',
    name: '電子マネー決済',
    description: '電子マネーでの支払いを受け付け',
    category: 'payments',
    icon: '📲',
  },
  {
    type: 'payment_qr',
    name: 'QRコード決済',
    description: 'PayPay等QRコード決済を受け付け',
    category: 'payments',
    icon: '📷',
  },
  // AI Features
  {
    type: 'ai_hairstyle_simulation',
    name: 'AIヘアスタイルシミュレーション',
    description: 'AIで髪型をシミュレーション',
    category: 'ai',
    icon: '✨',
    requiresIntegration: 'google_ai',
    isPremium: true,
  },
  {
    type: 'ai_customer_analysis',
    name: 'AI顧客分析',
    description: 'AIで顧客の傾向を分析',
    category: 'ai',
    icon: '📊',
    isPremium: true,
  },
  {
    type: 'ai_upsell_suggestion',
    name: 'AIアップセル提案',
    description: 'AIで最適なメニュー・商品を提案',
    category: 'ai',
    icon: '💡',
    isPremium: true,
  },
  {
    type: 'ai_conversation_transcription',
    name: 'AI会話文字起こし',
    description: 'カウンセリング会話を自動文字起こし',
    category: 'ai',
    icon: '🎙️',
    requiresIntegration: 'openai',
    isPremium: true,
  },
  // Customer Features
  {
    type: 'customer_points',
    name: 'ポイント機能',
    description: '来店・購入でポイント付与',
    category: 'customer',
    icon: '🎁',
  },
  {
    type: 'customer_member_rank',
    name: '会員ランク',
    description: '利用額に応じた会員ランク制度',
    category: 'customer',
    icon: '👑',
  },
  {
    type: 'customer_coupons',
    name: 'クーポン機能',
    description: '割引クーポンの発行・管理',
    category: 'customer',
    icon: '🎟️',
  },
  {
    type: 'customer_tickets',
    name: '回数券機能',
    description: '回数券の販売・管理',
    category: 'customer',
    icon: '🎫',
  },
  // Operations
  {
    type: 'operation_shift_management',
    name: 'シフト管理',
    description: 'スタッフのシフト・勤怠管理',
    category: 'operations',
    icon: '📅',
  },
  {
    type: 'operation_inventory_management',
    name: '在庫管理',
    description: '商品の在庫管理・発注アラート',
    category: 'operations',
    icon: '📦',
  },
  {
    type: 'operation_daily_report',
    name: '日報機能',
    description: '日次の売上・来店レポート',
    category: 'operations',
    icon: '📝',
  },
  // External
  {
    type: 'external_hotpepper_sync',
    name: 'ホットペッパー連携',
    description: 'ホットペッパーとの予約同期',
    category: 'external',
    icon: '🔥',
    requiresIntegration: 'hotpepper',
    isPremium: true,
  },
  {
    type: 'external_pinterest',
    name: 'Pinterest連携',
    description: 'Pinterestからヘアスタイル検索',
    category: 'external',
    icon: '📌',
    isPremium: true,
  },
];

export const featureSettingsService = {
  /**
   * Get all feature settings for a company (or store)
   */
  async getAll(companyId: string, storeId?: string): Promise<FeatureSettings> {
    const supabase = getSupabaseClient();

    // Get from company settings
    const { data, error } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (error) throw error;

    const settings = (data?.settings as Record<string, unknown>) || {};
    let features = (settings.features as Record<FeatureType, FeatureConfig>) || {};

    // If store-specific settings exist, merge them
    if (storeId) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('settings')
        .eq('id', storeId)
        .single();

      if (storeData?.settings) {
        const storeSettings = storeData.settings as Record<string, unknown>;
        const storeFeatures = (storeSettings.features as Record<FeatureType, FeatureConfig>) || {};
        features = { ...features, ...storeFeatures };
      }
    }

    // Ensure all features have a default config
    const defaultFeatures: Record<string, FeatureConfig> = {};
    for (const def of featureDefinitions) {
      defaultFeatures[def.type] = features[def.type] || {
        type: def.type,
        enabled: !def.isPremium, // Default enabled for non-premium features
      };
    }

    return {
      company_id: companyId,
      store_id: storeId,
      features: defaultFeatures as Record<FeatureType, FeatureConfig>,
    };
  },

  /**
   * Get a specific feature config
   */
  async get(companyId: string, type: FeatureType, storeId?: string): Promise<FeatureConfig> {
    const settings = await this.getAll(companyId, storeId);
    return settings.features[type];
  },

  /**
   * Update feature settings
   */
  async update(
    companyId: string,
    type: FeatureType,
    config: Partial<FeatureConfig>,
    storeId?: string
  ): Promise<FeatureConfig> {
    const supabase = getSupabaseClient();
    const table = storeId ? 'stores' : 'companies';
    const id = storeId || companyId;

    // Get current settings
    const { data: current } = await supabase
      .from(table)
      .select('settings')
      .eq('id', id)
      .single();

    const settings = (current?.settings as Record<string, unknown>) || {};
    const features = (settings.features as Record<string, FeatureConfig>) || {};

    // Merge with existing config
    const existingConfig = features[type] || { type, enabled: false };
    const updatedConfig: FeatureConfig = {
      ...existingConfig,
      ...config,
      type,
      updated_at: new Date().toISOString(),
    };

    features[type] = updatedConfig;

    // Save to database
    const { error } = await supabase
      .from(table)
      .update({
        settings: { ...settings, features },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    return updatedConfig;
  },

  /**
   * Enable/disable a feature
   */
  async setEnabled(
    companyId: string,
    type: FeatureType,
    enabled: boolean,
    storeId?: string
  ): Promise<void> {
    await this.update(companyId, type, { enabled }, storeId);
  },

  /**
   * Batch update multiple features
   */
  async batchUpdate(
    companyId: string,
    updates: { type: FeatureType; enabled: boolean }[],
    storeId?: string
  ): Promise<void> {
    for (const update of updates) {
      await this.setEnabled(companyId, update.type, update.enabled, storeId);
    }
  },

  /**
   * Check if a feature is enabled
   */
  async isEnabled(companyId: string, type: FeatureType, storeId?: string): Promise<boolean> {
    const config = await this.get(companyId, type, storeId);
    return config.enabled;
  },

  /**
   * Get all feature definitions
   */
  getFeatureDefinitions(): FeatureInfo[] {
    return featureDefinitions;
  },

  /**
   * Get feature definitions by category
   */
  getFeaturesByCategory(category: FeatureCategory): FeatureInfo[] {
    return featureDefinitions.filter((f) => f.category === category);
  },

  /**
   * Get feature info
   */
  getFeatureInfo(type: FeatureType): FeatureInfo | undefined {
    return featureDefinitions.find((f) => f.type === type);
  },

  /**
   * Get all categories
   */
  getCategories(): { type: FeatureCategory; name: string; icon: string }[] {
    return [
      { type: 'notifications', name: '通知', icon: '🔔' },
      { type: 'reminders', name: 'リマインダー', icon: '⏰' },
      { type: 'payments', name: '決済', icon: '💳' },
      { type: 'ai', name: 'AI機能', icon: '🤖' },
      { type: 'customer', name: '顧客管理', icon: '👥' },
      { type: 'operations', name: '業務管理', icon: '📋' },
      { type: 'external', name: '外部連携', icon: '🔗' },
    ];
  },
};
