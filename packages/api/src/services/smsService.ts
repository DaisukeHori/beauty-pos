import { getSupabaseClient } from '../client';

export interface SmsConfig {
  provider: 'twilio' | 'aws_sns' | 'vonage';
  accountSid?: string;
  authToken?: string;
  fromNumber: string;
  region?: string;
}

export interface SendSmsRequest {
  to: string;
  message: string;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const smsService = {
  /**
   * Get SMS configuration for a company
   */
  async getConfig(companyId: string): Promise<SmsConfig | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('external_integrations')
      .select('config')
      .eq('company_id', companyId)
      .eq('provider', 'sms')
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    return (data as { config: SmsConfig }).config;
  },

  /**
   * Save SMS configuration for a company
   */
  async saveConfig(companyId: string, config: SmsConfig): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await (supabase
      .from('external_integrations') as ReturnType<typeof supabase.from>)
      .upsert({
        company_id: companyId,
        provider: 'sms',
        config,
        is_active: true,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>, {
        onConflict: 'company_id,provider',
      });

    if (error) throw error;
  },

  /**
   * Send SMS via configured provider
   */
  async send(companyId: string, request: SendSmsRequest): Promise<SendSmsResult> {
    const config = await this.getConfig(companyId);
    if (!config) {
      return { success: false, error: 'SMS not configured' };
    }

    // Normalize phone number for Japan
    const phoneNumber = this.normalizePhoneNumber(request.to);
    if (!phoneNumber) {
      return { success: false, error: 'Invalid phone number' };
    }

    try {
      let result: SendSmsResult;

      switch (config.provider) {
        case 'twilio':
          result = await this.sendViaTwilio(config, phoneNumber, request.message);
          break;
        case 'aws_sns':
          result = await this.sendViaAwsSns(config, phoneNumber, request.message);
          break;
        case 'vonage':
          result = await this.sendViaVonage(config, phoneNumber, request.message);
          break;
        default:
          result = { success: false, error: 'Unknown SMS provider' };
      }

      // Log the SMS
      await this.logSms(companyId, phoneNumber, request.message, result.success, result.messageId);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logSms(companyId, phoneNumber, request.message, false);
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Send SMS via Twilio
   */
  async sendViaTwilio(config: SmsConfig, to: string, message: string): Promise<SendSmsResult> {
    const { accountSid, authToken, fromNumber } = config;
    if (!accountSid || !authToken) {
      return { success: false, error: 'Twilio credentials not configured' };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message,
      }).toString(),
    });

    if (response.ok) {
      const data = await response.json() as { sid: string };
      return { success: true, messageId: data.sid };
    } else {
      const errorData = await response.json() as { message?: string };
      return { success: false, error: errorData.message || 'Twilio API error' };
    }
  },

  /**
   * Send SMS via AWS SNS
   */
  async sendViaAwsSns(config: SmsConfig, to: string, message: string): Promise<SendSmsResult> {
    // AWS SNS implementation would use AWS SDK
    // For now, return a placeholder
    console.log('AWS SNS SMS:', { to, message, config });
    return { success: false, error: 'AWS SNS not implemented - use Edge Function' };
  },

  /**
   * Send SMS via Vonage (Nexmo)
   */
  async sendViaVonage(config: SmsConfig, to: string, message: string): Promise<SendSmsResult> {
    const { accountSid: apiKey, authToken: apiSecret, fromNumber } = config;
    if (!apiKey || !apiSecret) {
      return { success: false, error: 'Vonage credentials not configured' };
    }

    const response = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        api_secret: apiSecret,
        to,
        from: fromNumber,
        text: message,
      }),
    });

    if (response.ok) {
      const data = await response.json() as { messages?: Array<{ status: string; 'message-id'?: string; 'error-text'?: string }> };
      if (data.messages?.[0]?.status === '0') {
        return { success: true, messageId: data.messages[0]['message-id'] };
      } else {
        return { success: false, error: data.messages?.[0]?.['error-text'] || 'Vonage error' };
      }
    } else {
      return { success: false, error: 'Vonage API error' };
    }
  },

  /**
   * Normalize Japanese phone number to E.164 format
   */
  normalizePhoneNumber(phone: string): string | null {
    // Remove spaces, dashes, and parentheses
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Japanese mobile numbers: 090, 080, 070
    // Japanese landline: starts with area code (0x, 0xx, 0xxx)
    if (cleaned.startsWith('+81')) {
      return cleaned;
    }

    if (cleaned.startsWith('0') && cleaned.length >= 10) {
      return '+81' + cleaned.substring(1);
    }

    // Already in international format without +
    if (cleaned.startsWith('81') && cleaned.length >= 11) {
      return '+' + cleaned;
    }

    return null;
  },

  /**
   * Send reservation reminder SMS
   */
  async sendReservationReminder(
    companyId: string,
    phoneNumber: string,
    details: {
      customerName: string;
      storeName: string;
      date: string;
      time: string;
      storePhone?: string;
    }
  ): Promise<SendSmsResult> {
    const { customerName, storeName, date, time, storePhone } = details;

    const message = `【${storeName}】
${customerName}様
明日のご予約リマインダーです。

日時: ${date} ${time}

ご来店をお待ちしております。${storePhone ? `\nお問合せ: ${storePhone}` : ''}`;

    return this.send(companyId, { to: phoneNumber, message });
  },

  /**
   * Send reservation confirmation SMS
   */
  async sendReservationConfirmation(
    companyId: string,
    phoneNumber: string,
    details: {
      customerName: string;
      storeName: string;
      date: string;
      time: string;
      storePhone?: string;
    }
  ): Promise<SendSmsResult> {
    const { customerName, storeName, date, time, storePhone } = details;

    const message = `【${storeName}】
${customerName}様
ご予約ありがとうございます。

日時: ${date} ${time}

ご来店をお待ちしております。${storePhone ? `\nお問合せ: ${storePhone}` : ''}`;

    return this.send(companyId, { to: phoneNumber, message });
  },

  /**
   * Log SMS sending
   */
  async logSms(
    companyId: string,
    phoneNumber: string,
    message: string,
    success: boolean,
    messageId?: string
  ): Promise<void> {
    const supabase = getSupabaseClient();
    await (supabase
      .from('notification_logs') as ReturnType<typeof supabase.from>)
      .insert({
        company_id: companyId,
        channel: 'sms',
        recipient: phoneNumber,
        content: message.substring(0, 500), // Truncate for storage
        status: success ? 'sent' : 'failed',
        external_id: messageId,
        sent_at: new Date().toISOString(),
      } as Record<string, unknown>);
  },
};
