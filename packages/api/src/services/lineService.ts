import { getSupabaseClient } from '../client';

export interface LineConfig {
  channelAccessToken: string;
  channelSecret: string;
  webhookUrl?: string;
}

export interface LineMessage {
  type: 'text' | 'flex' | 'template';
  text?: string;
  altText?: string;
  contents?: Record<string, unknown>;
  template?: Record<string, unknown>;
}

export interface LinePushRequest {
  to: string; // LINE User ID
  messages: LineMessage[];
}

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LineWebhookEvent {
  type: 'message' | 'follow' | 'unfollow' | 'postback';
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    type: string;
    id: string;
    text?: string;
  };
  postback?: {
    data: string;
  };
}

const LINE_API_BASE = 'https://api.line.me/v2';

export const lineService = {
  /**
   * Get LINE configuration for a company
   */
  async getConfig(companyId: string): Promise<LineConfig | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('external_integrations')
      .select('config')
      .eq('company_id', companyId)
      .eq('provider', 'line')
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    return (data as { config: LineConfig }).config;
  },

  /**
   * Save LINE configuration for a company
   */
  async saveConfig(companyId: string, config: LineConfig): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await (supabase
      .from('external_integrations') as ReturnType<typeof supabase.from>)
      .upsert({
        company_id: companyId,
        provider: 'line',
        config,
        is_active: true,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>, {
        onConflict: 'company_id,provider',
      });

    if (error) throw error;
  },

  /**
   * Send a push message to a LINE user
   */
  async pushMessage(companyId: string, request: LinePushRequest): Promise<boolean> {
    const config = await this.getConfig(companyId);
    if (!config?.channelAccessToken) {
      console.error('LINE not configured for company:', companyId);
      return false;
    }

    try {
      const response = await fetch(`${LINE_API_BASE}/bot/message/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.channelAccessToken}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('LINE push message failed:', error);
        return false;
      }

      // Log the notification
      await this.logNotification(companyId, request.to, 'push', true);
      return true;
    } catch (error) {
      console.error('LINE push message error:', error);
      await this.logNotification(companyId, request.to, 'push', false);
      return false;
    }
  },

  /**
   * Send a text message
   */
  async sendTextMessage(companyId: string, lineUserId: string, text: string): Promise<boolean> {
    return this.pushMessage(companyId, {
      to: lineUserId,
      messages: [{ type: 'text', text }],
    });
  },

  /**
   * Send a reservation reminder via LINE
   */
  async sendReservationReminder(
    companyId: string,
    lineUserId: string,
    reservationDetails: {
      customerName: string;
      storeName: string;
      date: string;
      time: string;
      menuNames: string[];
      staffName?: string;
    }
  ): Promise<boolean> {
    const { customerName, storeName, date, time, menuNames, staffName } = reservationDetails;

    const message: LineMessage = {
      type: 'flex',
      altText: `【ご予約のリマインダー】${date} ${time}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'ご予約のリマインダー',
              weight: 'bold',
              size: 'lg',
              color: '#1a1a1a',
            },
          ],
          backgroundColor: '#f0f0f0',
          paddingAll: '15px',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${customerName} 様`,
              size: 'md',
              margin: 'md',
            },
            {
              type: 'text',
              text: 'ご予約をお待ちしております',
              size: 'sm',
              color: '#666666',
              margin: 'sm',
            },
            {
              type: 'separator',
              margin: 'lg',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    { type: 'text', text: '日時', size: 'sm', color: '#888888', flex: 2 },
                    { type: 'text', text: `${date} ${time}`, size: 'sm', flex: 5 },
                  ],
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  margin: 'md',
                  contents: [
                    { type: 'text', text: '店舗', size: 'sm', color: '#888888', flex: 2 },
                    { type: 'text', text: storeName, size: 'sm', flex: 5 },
                  ],
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  margin: 'md',
                  contents: [
                    { type: 'text', text: 'メニュー', size: 'sm', color: '#888888', flex: 2 },
                    { type: 'text', text: menuNames.join(', '), size: 'sm', flex: 5, wrap: true },
                  ],
                },
                ...(staffName ? [{
                  type: 'box' as const,
                  layout: 'horizontal' as const,
                  margin: 'md',
                  contents: [
                    { type: 'text' as const, text: '担当', size: 'sm' as const, color: '#888888', flex: 2 },
                    { type: 'text' as const, text: staffName, size: 'sm' as const, flex: 5 },
                  ],
                }] : []),
              ],
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'キャンセル・変更はお電話でご連絡ください',
              size: 'xs',
              color: '#888888',
              align: 'center',
            },
          ],
          paddingAll: '12px',
        },
        styles: {
          header: { backgroundColor: '#f8f8f8' },
        },
      },
    };

    return this.pushMessage(companyId, {
      to: lineUserId,
      messages: [message],
    });
  },

  /**
   * Send a new reservation confirmation via LINE
   */
  async sendReservationConfirmation(
    companyId: string,
    lineUserId: string,
    reservationDetails: {
      customerName: string;
      storeName: string;
      storeAddress?: string;
      storePhone?: string;
      date: string;
      time: string;
      menuNames: string[];
      staffName?: string;
      totalPrice?: number;
    }
  ): Promise<boolean> {
    const { customerName, storeName, date, time, menuNames, staffName, totalPrice, storePhone } = reservationDetails;

    const text = `【ご予約確定】
${customerName} 様

ご予約ありがとうございます。
以下の内容で承りました。

■ 日時: ${date} ${time}
■ 店舗: ${storeName}
■ メニュー: ${menuNames.join(', ')}${staffName ? `\n■ 担当: ${staffName}` : ''}${totalPrice ? `\n■ 予定金額: ¥${totalPrice.toLocaleString()}` : ''}

ご来店をお待ちしております。
${storePhone ? `\nお問い合わせ: ${storePhone}` : ''}`;

    return this.sendTextMessage(companyId, lineUserId, text);
  },

  /**
   * Send a visit thank you message
   */
  async sendThankYouMessage(
    companyId: string,
    lineUserId: string,
    details: {
      customerName: string;
      storeName: string;
      visitDate: string;
      pointsEarned?: number;
      pointsBalance?: number;
      nextRecommendation?: string;
    }
  ): Promise<boolean> {
    const { customerName, storeName, visitDate, pointsEarned, pointsBalance, nextRecommendation } = details;

    let text = `【ご来店ありがとうございました】
${customerName} 様

本日は${storeName}をご利用いただきありがとうございました。`;

    if (pointsEarned && pointsEarned > 0) {
      text += `\n\n■ 獲得ポイント: ${pointsEarned} pt`;
    }
    if (pointsBalance && pointsBalance > 0) {
      text += `\n■ ポイント残高: ${pointsBalance} pt`;
    }
    if (nextRecommendation) {
      text += `\n\n【おすすめ】\n${nextRecommendation}`;
    }

    text += '\n\nまたのご来店をお待ちしております。';

    return this.sendTextMessage(companyId, lineUserId, text);
  },

  /**
   * Get LINE user profile
   */
  async getUserProfile(companyId: string, lineUserId: string): Promise<LineUserProfile | null> {
    const config = await this.getConfig(companyId);
    if (!config?.channelAccessToken) return null;

    try {
      const response = await fetch(`${LINE_API_BASE}/bot/profile/${lineUserId}`, {
        headers: {
          'Authorization': `Bearer ${config.channelAccessToken}`,
        },
      });

      if (!response.ok) return null;
      return response.json() as Promise<LineUserProfile>;
    } catch {
      return null;
    }
  },

  /**
   * Link LINE user ID to a customer
   */
  async linkCustomer(customerId: string, lineUserId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await (supabase
      .from('customers') as ReturnType<typeof supabase.from>)
      .update({ line_user_id: lineUserId } as Record<string, unknown>)
      .eq('id', customerId);

    if (error) throw error;
  },

  /**
   * Find customer by LINE user ID
   */
  async findCustomerByLineId(companyId: string, lineUserId: string): Promise<{ id: string; name: string } | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name')
      .eq('company_id', companyId)
      .eq('line_user_id', lineUserId)
      .single();

    if (error || !data) return null;
    const customer = data as { id: string; first_name: string; last_name: string };
    return {
      id: customer.id,
      name: `${customer.last_name} ${customer.first_name}`,
    };
  },

  /**
   * Process LINE webhook event
   */
  async processWebhookEvent(companyId: string, event: LineWebhookEvent): Promise<void> {
    const supabase = getSupabaseClient();

    switch (event.type) {
      case 'follow': {
        // New user followed the official account
        const lineUserId = event.source.userId;
        if (lineUserId) {
          const profile = await this.getUserProfile(companyId, lineUserId);
          // Log the follow event
          await (supabase
            .from('line_events') as ReturnType<typeof supabase.from>)
            .insert({
              company_id: companyId,
              event_type: 'follow',
              line_user_id: lineUserId,
              profile_data: profile,
            } as Record<string, unknown>);
        }
        break;
      }

      case 'unfollow': {
        // User unfollowed
        const lineUserId = event.source.userId;
        if (lineUserId) {
          await (supabase
            .from('line_events') as ReturnType<typeof supabase.from>)
            .insert({
              company_id: companyId,
              event_type: 'unfollow',
              line_user_id: lineUserId,
            } as Record<string, unknown>);
        }
        break;
      }

      case 'message': {
        // User sent a message
        const lineUserId = event.source.userId;
        if (lineUserId && event.message?.text) {
          await (supabase
            .from('line_events') as ReturnType<typeof supabase.from>)
            .insert({
              company_id: companyId,
              event_type: 'message',
              line_user_id: lineUserId,
              message_data: event.message,
            } as Record<string, unknown>);
        }
        break;
      }

      case 'postback': {
        // User clicked a button with postback data
        const lineUserId = event.source.userId;
        if (lineUserId && event.postback?.data) {
          await (supabase
            .from('line_events') as ReturnType<typeof supabase.from>)
            .insert({
              company_id: companyId,
              event_type: 'postback',
              line_user_id: lineUserId,
              postback_data: event.postback.data,
            } as Record<string, unknown>);
        }
        break;
      }
    }
  },

  /**
   * Log notification sending
   */
  async logNotification(
    companyId: string,
    lineUserId: string,
    notificationType: string,
    success: boolean
  ): Promise<void> {
    const supabase = getSupabaseClient();
    await (supabase
      .from('notification_logs') as ReturnType<typeof supabase.from>)
      .insert({
        company_id: companyId,
        channel: 'line',
        recipient: lineUserId,
        notification_type: notificationType,
        status: success ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
      } as Record<string, unknown>);
  },

  /**
   * Send broadcast message to all followers
   */
  async broadcastMessage(companyId: string, message: LineMessage): Promise<boolean> {
    const config = await this.getConfig(companyId);
    if (!config?.channelAccessToken) return false;

    try {
      const response = await fetch(`${LINE_API_BASE}/bot/message/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.channelAccessToken}`,
        },
        body: JSON.stringify({ messages: [message] }),
      });

      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Create a rich menu for the LINE official account
   */
  async createRichMenu(
    companyId: string,
    menuConfig: {
      size: { width: number; height: number };
      selected: boolean;
      name: string;
      chatBarText: string;
      areas: Array<{
        bounds: { x: number; y: number; width: number; height: number };
        action: { type: string; uri?: string; text?: string; data?: string };
      }>;
    }
  ): Promise<string | null> {
    const config = await this.getConfig(companyId);
    if (!config?.channelAccessToken) return null;

    try {
      const response = await fetch(`${LINE_API_BASE}/bot/richmenu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.channelAccessToken}`,
        },
        body: JSON.stringify(menuConfig),
      });

      if (!response.ok) return null;
      const data = await response.json() as { richMenuId: string };
      return data.richMenuId;
    } catch {
      return null;
    }
  },
};
