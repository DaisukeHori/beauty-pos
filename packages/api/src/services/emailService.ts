import { getSupabaseClient } from '../client';

export interface EmailConfig {
  provider: 'sendgrid' | 'ses' | 'mailgun' | 'smtp';
  apiKey?: string;
  fromEmail: string;
  fromName: string;
  // SMTP specific
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const emailService = {
  /**
   * Get email configuration for a company
   */
  async getConfig(companyId: string): Promise<EmailConfig | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('external_integrations')
      .select('config')
      .eq('company_id', companyId)
      .eq('provider', 'email')
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    return data.config as EmailConfig;
  },

  /**
   * Save email configuration for a company
   */
  async saveConfig(companyId: string, config: EmailConfig): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('external_integrations')
      .upsert({
        company_id: companyId,
        provider: 'email',
        config,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'company_id,provider',
      });

    if (error) throw error;
  },

  /**
   * Send email via configured provider
   */
  async send(companyId: string, request: SendEmailRequest): Promise<SendEmailResult> {
    const config = await this.getConfig(companyId);
    if (!config) {
      return { success: false, error: 'Email not configured' };
    }

    try {
      let result: SendEmailResult;

      switch (config.provider) {
        case 'sendgrid':
          result = await this.sendViaSendGrid(config, request);
          break;
        case 'ses':
          result = await this.sendViaAWSSes(config, request);
          break;
        case 'mailgun':
          result = await this.sendViaMailgun(config, request);
          break;
        case 'smtp':
          result = { success: false, error: 'SMTP not implemented - use Edge Function' };
          break;
        default:
          result = { success: false, error: 'Unknown email provider' };
      }

      // Log the email
      await this.logEmail(companyId, request.to, request.subject, result.success, result.messageId);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logEmail(companyId, request.to, request.subject, false);
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Send email via SendGrid
   */
  async sendViaSendGrid(config: EmailConfig, request: SendEmailRequest): Promise<SendEmailResult> {
    const { apiKey, fromEmail, fromName } = config;
    if (!apiKey) {
      return { success: false, error: 'SendGrid API key not configured' };
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: request.to }] }],
        from: { email: fromEmail, name: fromName },
        reply_to: request.replyTo ? { email: request.replyTo } : undefined,
        subject: request.subject,
        content: [
          ...(request.text ? [{ type: 'text/plain', value: request.text }] : []),
          ...(request.html ? [{ type: 'text/html', value: request.html }] : []),
        ],
      }),
    });

    if (response.ok || response.status === 202) {
      const messageId = response.headers.get('X-Message-Id') || undefined;
      return { success: true, messageId };
    } else {
      const error = await response.json();
      return { success: false, error: error.errors?.[0]?.message || 'SendGrid API error' };
    }
  },

  /**
   * Send email via AWS SES
   */
  async sendViaAWSSes(config: EmailConfig, request: SendEmailRequest): Promise<SendEmailResult> {
    // AWS SES implementation would use AWS SDK
    console.log('AWS SES Email:', { to: request.to, subject: request.subject, config });
    return { success: false, error: 'AWS SES not implemented - use Edge Function' };
  },

  /**
   * Send email via Mailgun
   */
  async sendViaMailgun(config: EmailConfig, request: SendEmailRequest): Promise<SendEmailResult> {
    const { apiKey, fromEmail, fromName } = config;
    if (!apiKey) {
      return { success: false, error: 'Mailgun API key not configured' };
    }

    // Extract domain from fromEmail
    const domain = fromEmail.split('@')[1];
    const url = `https://api.mailgun.net/v3/${domain}/messages`;
    const auth = Buffer.from(`api:${apiKey}`).toString('base64');

    const formData = new URLSearchParams();
    formData.append('from', `${fromName} <${fromEmail}>`);
    formData.append('to', request.to);
    formData.append('subject', request.subject);
    if (request.text) formData.append('text', request.text);
    if (request.html) formData.append('html', request.html);
    if (request.replyTo) formData.append('h:Reply-To', request.replyTo);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, messageId: data.id };
    } else {
      const error = await response.json();
      return { success: false, error: error.message || 'Mailgun API error' };
    }
  },

  /**
   * Send reservation reminder email
   */
  async sendReservationReminder(
    companyId: string,
    email: string,
    details: {
      customerName: string;
      storeName: string;
      storeAddress?: string;
      storePhone?: string;
      date: string;
      time: string;
      menuNames: string[];
      staffName?: string;
    }
  ): Promise<SendEmailResult> {
    const { customerName, storeName, storeAddress, storePhone, date, time, menuNames, staffName } = details;

    const subject = `【ご予約リマインダー】${date} ${time} - ${storeName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Sans', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8f8f8; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table th { text-align: left; padding: 10px; background: #f8f8f8; width: 100px; }
    .info-table td { padding: 10px; }
    .footer { text-align: center; color: #888; font-size: 12px; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>ご予約のリマインダー</h2>
    </div>
    <div class="content">
      <p>${customerName} 様</p>
      <p>明日のご予約についてお知らせいたします。</p>

      <table class="info-table">
        <tr>
          <th>日時</th>
          <td>${date} ${time}</td>
        </tr>
        <tr>
          <th>店舗</th>
          <td>${storeName}${storeAddress ? `<br><small>${storeAddress}</small>` : ''}</td>
        </tr>
        <tr>
          <th>メニュー</th>
          <td>${menuNames.join(', ')}</td>
        </tr>
        ${staffName ? `<tr><th>担当</th><td>${staffName}</td></tr>` : ''}
      </table>

      <p>ご来店をお待ちしております。</p>

      <p>キャンセル・変更をご希望の場合は、お電話にてご連絡ください。${storePhone ? `<br>TEL: ${storePhone}` : ''}</p>
    </div>
    <div class="footer">
      <p>${storeName}</p>
    </div>
  </div>
</body>
</html>`;

    const text = `【${storeName}】ご予約のリマインダー

${customerName} 様

明日のご予約についてお知らせいたします。

日時: ${date} ${time}
店舗: ${storeName}${storeAddress ? `\n住所: ${storeAddress}` : ''}
メニュー: ${menuNames.join(', ')}${staffName ? `\n担当: ${staffName}` : ''}

ご来店をお待ちしております。

キャンセル・変更をご希望の場合は、お電話にてご連絡ください。${storePhone ? `\nTEL: ${storePhone}` : ''}

${storeName}`;

    return this.send(companyId, { to: email, subject, html, text });
  },

  /**
   * Send reservation confirmation email
   */
  async sendReservationConfirmation(
    companyId: string,
    email: string,
    details: {
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
  ): Promise<SendEmailResult> {
    const { customerName, storeName, storeAddress, storePhone, date, time, menuNames, staffName, totalPrice } = details;

    const subject = `【ご予約確定】${date} ${time} - ${storeName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Sans', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table th { text-align: left; padding: 10px; background: #f8f8f8; width: 100px; }
    .info-table td { padding: 10px; }
    .footer { text-align: center; color: #888; font-size: 12px; padding: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>ご予約ありがとうございます</h2>
    </div>
    <div class="content">
      <p>${customerName} 様</p>
      <p>以下の内容でご予約を承りました。</p>

      <table class="info-table">
        <tr>
          <th>日時</th>
          <td>${date} ${time}</td>
        </tr>
        <tr>
          <th>店舗</th>
          <td>${storeName}${storeAddress ? `<br><small>${storeAddress}</small>` : ''}</td>
        </tr>
        <tr>
          <th>メニュー</th>
          <td>${menuNames.join(', ')}</td>
        </tr>
        ${staffName ? `<tr><th>担当</th><td>${staffName}</td></tr>` : ''}
        ${totalPrice ? `<tr><th>予定金額</th><td>¥${totalPrice.toLocaleString()}</td></tr>` : ''}
      </table>

      <p>ご来店をお待ちしております。</p>

      <p>キャンセル・変更をご希望の場合は、お電話にてご連絡ください。${storePhone ? `<br>TEL: ${storePhone}` : ''}</p>
    </div>
    <div class="footer">
      <p>${storeName}</p>
    </div>
  </div>
</body>
</html>`;

    const text = `【${storeName}】ご予約確定

${customerName} 様

以下の内容でご予約を承りました。

日時: ${date} ${time}
店舗: ${storeName}${storeAddress ? `\n住所: ${storeAddress}` : ''}
メニュー: ${menuNames.join(', ')}${staffName ? `\n担当: ${staffName}` : ''}${totalPrice ? `\n予定金額: ¥${totalPrice.toLocaleString()}` : ''}

ご来店をお待ちしております。

キャンセル・変更をご希望の場合は、お電話にてご連絡ください。${storePhone ? `\nTEL: ${storePhone}` : ''}

${storeName}`;

    return this.send(companyId, { to: email, subject, html, text });
  },

  /**
   * Send thank you email after visit
   */
  async sendThankYouEmail(
    companyId: string,
    email: string,
    details: {
      customerName: string;
      storeName: string;
      visitDate: string;
      pointsEarned?: number;
      pointsBalance?: number;
      nextRecommendation?: string;
    }
  ): Promise<SendEmailResult> {
    const { customerName, storeName, visitDate, pointsEarned, pointsBalance, nextRecommendation } = details;

    const subject = `【ご来店ありがとうございました】${storeName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Sans', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .points-box { background: #FFF3E0; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .recommendation { background: #E3F2FD; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; color: #888; font-size: 12px; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>ご来店ありがとうございました</h2>
    </div>
    <div class="content">
      <p>${customerName} 様</p>
      <p>${visitDate}のご来店、誠にありがとうございました。</p>

      ${(pointsEarned || pointsBalance) ? `
      <div class="points-box">
        <h3>ポイント情報</h3>
        ${pointsEarned ? `<p>今回獲得: <strong>${pointsEarned} pt</strong></p>` : ''}
        ${pointsBalance ? `<p>現在の残高: <strong>${pointsBalance} pt</strong></p>` : ''}
      </div>
      ` : ''}

      ${nextRecommendation ? `
      <div class="recommendation">
        <h3>おすすめ情報</h3>
        <p>${nextRecommendation}</p>
      </div>
      ` : ''}

      <p>またのご来店をお待ちしております。</p>
    </div>
    <div class="footer">
      <p>${storeName}</p>
    </div>
  </div>
</body>
</html>`;

    const text = `【${storeName}】ご来店ありがとうございました

${customerName} 様

${visitDate}のご来店、誠にありがとうございました。
${pointsEarned ? `\n今回獲得ポイント: ${pointsEarned} pt` : ''}${pointsBalance ? `\n現在のポイント残高: ${pointsBalance} pt` : ''}
${nextRecommendation ? `\n【おすすめ】\n${nextRecommendation}` : ''}

またのご来店をお待ちしております。

${storeName}`;

    return this.send(companyId, { to: email, subject, html, text });
  },

  /**
   * Log email sending
   */
  async logEmail(
    companyId: string,
    emailAddress: string,
    subject: string,
    success: boolean,
    messageId?: string
  ): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase
      .from('notification_logs')
      .insert({
        company_id: companyId,
        channel: 'email',
        recipient: emailAddress,
        content: subject,
        status: success ? 'sent' : 'failed',
        external_id: messageId,
        sent_at: new Date().toISOString(),
      });
  },
};
