export type NotificationType =
  | 'reservation_reminder'
  | 'reservation_confirmed'
  | 'reservation_cancelled'
  | 'birthday'
  | 'thank_you'
  | 'ticket_expiry'
  | 'point_expiry'
  | 'promotion'
  | 'review_request';

export type NotificationChannel = 'line' | 'email' | 'sms' | 'push';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface NotificationTemplate {
  id: string;
  companyId: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  companyId: string;
  customerId?: string;
  staffId?: string;
  templateId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  status: NotificationStatus;
  sentAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface CreateNotificationTemplateInput {
  companyId: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  variables?: string[];
}

export interface UpdateNotificationTemplateInput extends Partial<Omit<CreateNotificationTemplateInput, 'companyId'>> {
  isActive?: boolean;
}

export interface SendNotificationInput {
  templateId?: string;
  customerId?: string;
  staffId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  variables?: Record<string, string>;
}

export function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return result;
}
