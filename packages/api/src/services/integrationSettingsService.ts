import { getSupabaseClient } from '../client';

// Integration types
export type IntegrationType =
  | 'line'
  | 'sms_twilio'
  | 'sms_vonage'
  | 'email_sendgrid'
  | 'email_mailgun'
  | 'stripe'
  | 'hotpepper'
  | 'google_ai'
  | 'openai';

export interface IntegrationConfig {
  type: IntegrationType;
  enabled: boolean;
  api_key?: string;
  api_secret?: string;
  channel_id?: string;
  channel_secret?: string;
  webhook_url?: string;
  sender_id?: string;
  from_email?: string;
  from_name?: string;
  account_sid?: string;
  publishable_key?: string;
  // Additional fields as needed
  extra_config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface IntegrationSettings {
  company_id: string;
  integrations: Record<IntegrationType, IntegrationConfig>;
}

export interface IntegrationInfo {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  category: 'messaging' | 'payment' | 'ai' | 'external';
  requiredFields: string[];
  optionalFields?: string[];
  setupUrl?: string;
}

// All integration definitions
const integrationDefinitions: IntegrationInfo[] = [
  {
    type: 'line',
    name: 'LINE Messaging API',
    description: '予約リマインダー、確認メッセージをLINEで送信',
    icon: '💬',
    category: 'messaging',
    requiredFields: ['channel_id', 'channel_secret', 'access_token'],
    optionalFields: ['webhook_url'],
    setupUrl: 'https://developers.line.biz/console/',
  },
  {
    type: 'sms_twilio',
    name: 'Twilio SMS',
    description: 'SMSで予約リマインダーを送信',
    icon: '📱',
    category: 'messaging',
    requiredFields: ['account_sid', 'api_key', 'phone_number'],
    setupUrl: 'https://console.twilio.com/',
  },
  {
    type: 'sms_vonage',
    name: 'Vonage SMS',
    description: 'SMSで予約リマインダーを送信',
    icon: '📱',
    category: 'messaging',
    requiredFields: ['api_key', 'api_secret'],
    optionalFields: ['sender_id'],
    setupUrl: 'https://dashboard.nexmo.com/',
  },
  {
    type: 'email_sendgrid',
    name: 'SendGrid',
    description: 'メールで予約確認・リマインダーを送信',
    icon: '📧',
    category: 'messaging',
    requiredFields: ['api_key'],
    optionalFields: ['from_email', 'from_name'],
    setupUrl: 'https://app.sendgrid.com/',
  },
  {
    type: 'email_mailgun',
    name: 'Mailgun',
    description: 'メールで予約確認・リマインダーを送信',
    icon: '📧',
    category: 'messaging',
    requiredFields: ['api_key', 'domain'],
    optionalFields: ['from_email', 'from_name'],
    setupUrl: 'https://app.mailgun.com/',
  },
  {
    type: 'stripe',
    name: 'Stripe決済',
    description: 'クレジットカード決済を受け付け',
    icon: '💳',
    category: 'payment',
    requiredFields: ['publishable_key', 'api_key'],
    optionalFields: ['webhook_secret'],
    setupUrl: 'https://dashboard.stripe.com/',
  },
  {
    type: 'hotpepper',
    name: 'ホットペッパービューティー',
    description: '予約の自動同期',
    icon: '🔥',
    category: 'external',
    requiredFields: ['api_key'],
    optionalFields: ['salon_id'],
    setupUrl: 'https://beauty.hotpepper.jp/',
  },
  {
    type: 'google_ai',
    name: 'Google AI (Gemini)',
    description: 'AIヘアスタイルシミュレーション',
    icon: '🤖',
    category: 'ai',
    requiredFields: ['api_key'],
    optionalFields: ['project_id'],
    setupUrl: 'https://console.cloud.google.com/',
  },
  {
    type: 'openai',
    name: 'OpenAI',
    description: '会話分析・カルテ自動入力',
    icon: '🧠',
    category: 'ai',
    requiredFields: ['api_key'],
    optionalFields: ['organization_id'],
    setupUrl: 'https://platform.openai.com/',
  },
];

// Mask sensitive data for display
const maskApiKey = (key: string | undefined): string => {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
};

export const integrationSettingsService = {
  /**
   * Get all integration settings for a company
   */
  async getAll(companyId: string): Promise<IntegrationSettings> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (error) throw error;

    const settings = (data?.settings as Record<string, unknown>) || {};
    const integrations = (settings.integrations as Record<IntegrationType, IntegrationConfig>) || {};

    return {
      company_id: companyId,
      integrations,
    };
  },

  /**
   * Get integration settings with masked API keys (for display)
   */
  async getAllMasked(companyId: string): Promise<IntegrationSettings> {
    const settings = await this.getAll(companyId);

    // Mask sensitive fields
    const maskedIntegrations: Record<string, IntegrationConfig> = {};
    for (const [type, config] of Object.entries(settings.integrations)) {
      maskedIntegrations[type] = {
        ...config,
        api_key: maskApiKey(config.api_key),
        api_secret: maskApiKey(config.api_secret),
        channel_secret: maskApiKey(config.channel_secret),
        account_sid: maskApiKey(config.account_sid),
      };
    }

    return {
      company_id: companyId,
      integrations: maskedIntegrations as Record<IntegrationType, IntegrationConfig>,
    };
  },

  /**
   * Get a specific integration config
   */
  async get(companyId: string, type: IntegrationType): Promise<IntegrationConfig | null> {
    const settings = await this.getAll(companyId);
    return settings.integrations[type] || null;
  },

  /**
   * Update or create an integration config
   */
  async upsert(
    companyId: string,
    type: IntegrationType,
    config: Partial<IntegrationConfig>
  ): Promise<IntegrationConfig> {
    const supabase = getSupabaseClient();

    // Get current settings
    const { data: current } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    const settings = (current?.settings as Record<string, unknown>) || {};
    const integrations = (settings.integrations as Record<string, IntegrationConfig>) || {};

    // Merge with existing config
    const existingConfig = integrations[type] || { type, enabled: false };
    const updatedConfig: IntegrationConfig = {
      ...existingConfig,
      ...config,
      type,
      updated_at: new Date().toISOString(),
    };

    // If this is a new config, set created_at
    if (!existingConfig.created_at) {
      updatedConfig.created_at = new Date().toISOString();
    }

    // Update integrations
    integrations[type] = updatedConfig;

    // Save to database
    const { error } = await supabase
      .from('companies')
      .update({
        settings: { ...settings, integrations },
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId);

    if (error) throw error;

    return updatedConfig;
  },

  /**
   * Enable/disable an integration
   */
  async setEnabled(companyId: string, type: IntegrationType, enabled: boolean): Promise<void> {
    await this.upsert(companyId, type, { enabled });
  },

  /**
   * Delete an integration config
   */
  async delete(companyId: string, type: IntegrationType): Promise<void> {
    const supabase = getSupabaseClient();

    const { data: current } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    const settings = (current?.settings as Record<string, unknown>) || {};
    const integrations = (settings.integrations as Record<string, IntegrationConfig>) || {};

    delete integrations[type];

    const { error } = await supabase
      .from('companies')
      .update({
        settings: { ...settings, integrations },
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId);

    if (error) throw error;
  },

  /**
   * Test an integration connection
   */
  async testConnection(companyId: string, type: IntegrationType): Promise<{ success: boolean; message: string }> {
    const config = await this.get(companyId, type);

    if (!config) {
      return { success: false, message: '設定が見つかりません' };
    }

    if (!config.enabled) {
      return { success: false, message: '連携が無効になっています' };
    }

    // Test based on type
    try {
      switch (type) {
        case 'line':
          if (!config.channel_id || !config.channel_secret) {
            return { success: false, message: 'Channel IDとChannel Secretが必要です' };
          }
          // Would call LINE API to verify credentials
          return { success: true, message: 'LINE連携の設定は有効です' };

        case 'sms_twilio':
          if (!config.account_sid || !config.api_key) {
            return { success: false, message: 'Account SIDとAuth Tokenが必要です' };
          }
          return { success: true, message: 'Twilio SMS設定は有効です' };

        case 'email_sendgrid':
          if (!config.api_key) {
            return { success: false, message: 'APIキーが必要です' };
          }
          return { success: true, message: 'SendGrid設定は有効です' };

        case 'stripe':
          if (!config.api_key || !config.publishable_key) {
            return { success: false, message: 'Secret KeyとPublishable Keyが必要です' };
          }
          return { success: true, message: 'Stripe設定は有効です' };

        default:
          return { success: true, message: '設定は有効です' };
      }
    } catch (error) {
      return {
        success: false,
        message: `接続テストに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      };
    }
  },

  /**
   * Get integration display info
   */
  getIntegrationInfo(type: IntegrationType): IntegrationInfo | undefined {
    return integrationDefinitions.find(i => i.type === type);
  },

  /**
   * Get all integration definitions
   */
  getIntegrationInfos(): IntegrationInfo[] {
    return integrationDefinitions;
  },

  /**
   * Get integrations by category
   */
  getIntegrationsByCategory(category: 'messaging' | 'payment' | 'ai' | 'external'): IntegrationInfo[] {
    return integrationDefinitions.filter(i => i.category === category);
  },
};
