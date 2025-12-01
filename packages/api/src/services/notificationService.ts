import { getSupabaseClient } from '../client';

export interface Notification {
  id: string;
  company_id: string;
  store_id: string | null;
  staff_id: string | null;
  customer_id: string | null;
  type: 'reservation' | 'reminder' | 'promotion' | 'system' | 'alert';
  channel: 'push' | 'email' | 'sms' | 'in_app';
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  scheduled_at: string | null;
  sent_at: string | null;
  read_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationInsert {
  company_id: string;
  store_id?: string;
  staff_id?: string;
  customer_id?: string;
  type: 'reservation' | 'reminder' | 'promotion' | 'system' | 'alert';
  channel: 'push' | 'email' | 'sms' | 'in_app';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  scheduled_at?: string;
}

export interface NotificationTemplate {
  id: string;
  company_id: string;
  name: string;
  type: 'reservation' | 'reminder' | 'promotion' | 'system' | 'alert';
  channel: 'push' | 'email' | 'sms' | 'in_app';
  subject: string;
  body_template: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: string;
  customer_id: string;
  channel: 'push' | 'email' | 'sms';
  reservation_confirm: boolean;
  reservation_reminder: boolean;
  promotion: boolean;
  created_at: string;
  updated_at: string;
}

export const notificationService = {
  // Create a notification
  async create(notification: NotificationInsert): Promise<Notification> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        ...notification,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  },

  // Create multiple notifications (bulk)
  async createBulk(notifications: NotificationInsert[]): Promise<Notification[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications.map(n => ({ ...n, status: 'pending' })))
      .select();

    if (error) throw error;
    return data as Notification[];
  },

  // Get notifications for a staff member
  async getForStaff(staffId: string, limit = 50): Promise<Notification[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Notification[];
  },

  // Get notifications for a customer
  async getForCustomer(customerId: string, limit = 50): Promise<Notification[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Notification[];
  },

  // Get unread count
  async getUnreadCount(staffId: string): Promise<number> {
    const supabase = getSupabaseClient();

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', staffId)
      .is('read_at', null)
      .in('status', ['sent', 'delivered']);

    if (error) throw error;
    return count || 0;
  },

  // Mark as read
  async markAsRead(notificationId: string): Promise<Notification> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  },

  // Mark all as read
  async markAllAsRead(staffId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('staff_id', staffId)
      .is('read_at', null);

    if (error) throw error;
  },

  // Send reservation confirmation
  async sendReservationConfirmation(
    companyId: string,
    storeId: string,
    customerId: string,
    reservationDetails: {
      date: string;
      time: string;
      staffName: string;
      menuName: string;
      storeName: string;
    }
  ): Promise<Notification> {
    const title = '予約確定のお知らせ';
    const body = `${reservationDetails.date} ${reservationDetails.time}に${reservationDetails.storeName}のご予約が確定しました。\n担当: ${reservationDetails.staffName}\nメニュー: ${reservationDetails.menuName}`;

    return this.create({
      company_id: companyId,
      store_id: storeId,
      customer_id: customerId,
      type: 'reservation',
      channel: 'in_app',
      title,
      body,
      data: reservationDetails,
    });
  },

  // Send reservation reminder
  async sendReservationReminder(
    companyId: string,
    storeId: string,
    customerId: string,
    reservationDetails: {
      date: string;
      time: string;
      staffName: string;
      storeName: string;
    }
  ): Promise<Notification> {
    const title = '予約リマインダー';
    const body = `明日 ${reservationDetails.time}に${reservationDetails.storeName}のご予約があります。`;

    return this.create({
      company_id: companyId,
      store_id: storeId,
      customer_id: customerId,
      type: 'reminder',
      channel: 'in_app',
      title,
      body,
      data: reservationDetails,
    });
  },

  // Send point expiry notification
  async sendPointExpiryNotification(
    companyId: string,
    customerId: string,
    expiringPoints: number,
    expiryDate: string
  ): Promise<Notification> {
    const title = 'ポイント有効期限のお知らせ';
    const body = `${expiringPoints}ポイントが${expiryDate}に失効します。お早めにご利用ください。`;

    return this.create({
      company_id: companyId,
      customer_id: customerId,
      type: 'reminder',
      channel: 'in_app',
      title,
      body,
      data: { expiringPoints, expiryDate },
    });
  },

  // Send promotion notification
  async sendPromotion(
    companyId: string,
    storeId: string | null,
    customerIds: string[],
    title: string,
    body: string,
    promoData?: Record<string, unknown>
  ): Promise<Notification[]> {
    const notifications: NotificationInsert[] = customerIds.map(customerId => ({
      company_id: companyId,
      store_id: storeId || undefined,
      customer_id: customerId,
      type: 'promotion' as const,
      channel: 'in_app' as const,
      title,
      body,
      data: promoData,
    }));

    return this.createBulk(notifications);
  },

  // Send staff notification
  async sendToStaff(
    companyId: string,
    storeId: string,
    staffId: string,
    type: 'reservation' | 'system' | 'alert',
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<Notification> {
    return this.create({
      company_id: companyId,
      store_id: storeId,
      staff_id: staffId,
      type,
      channel: 'in_app',
      title,
      body,
      data,
    });
  },

  // Send to all store staff
  async sendToAllStoreStaff(
    companyId: string,
    storeId: string,
    staffIds: string[],
    type: 'system' | 'alert',
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<Notification[]> {
    const notifications: NotificationInsert[] = staffIds.map(staffId => ({
      company_id: companyId,
      store_id: storeId,
      staff_id: staffId,
      type,
      channel: 'in_app' as const,
      title,
      body,
      data,
    }));

    return this.createBulk(notifications);
  },

  // Get pending scheduled notifications
  async getPendingScheduled(): Promise<Notification[]> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(100);

    if (error) throw error;
    return data as Notification[];
  },

  // Update notification status
  async updateStatus(
    notificationId: string,
    status: 'sent' | 'delivered' | 'failed',
    errorMessage?: string
  ): Promise<Notification> {
    const supabase = getSupabaseClient();

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { data, error } = await supabase
      .from('notifications')
      .update(updateData)
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  },

  // Delete old notifications
  async deleteOld(daysOld: number = 90): Promise<number> {
    const supabase = getSupabaseClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { error, count } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate.toISOString());

    if (error) throw error;
    return count || 0;
  },
};

// Customer notification preferences
export const notificationPreferenceService = {
  // Get preferences for customer
  async getByCustomer(customerId: string): Promise<NotificationPreference[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('customer_id', customerId);

    if (error) throw error;
    return data as NotificationPreference[];
  },

  // Update preferences
  async update(
    customerId: string,
    channel: 'push' | 'email' | 'sms',
    preferences: {
      reservation_confirm?: boolean;
      reservation_reminder?: boolean;
      promotion?: boolean;
    }
  ): Promise<NotificationPreference> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        customer_id: customerId,
        channel,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as NotificationPreference;
  },
};
