import { getSupabaseClient } from '../client';
import { notificationService } from './notificationService';

export interface ReminderStats {
  pendingCount: number;
  sentTodayCount: number;
  lastSentAt: string | null;
}

export interface UpcomingReminder {
  reservationId: string;
  customerId: string;
  customerName: string;
  staffName: string;
  storeName: string;
  startTime: string;
  reminderSentAt: string | null;
}

export const reminderSchedulerService = {
  // Get reminder statistics
  async getStats(companyId: string): Promise<ReminderStats> {
    const supabase = getSupabaseClient();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();

    // Get pending reminders (reservations tomorrow without reminder sent)
    const { count: pendingCount } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('start_time', now.toISOString())
      .lte('start_time', tomorrow.toISOString())
      .in('status', ['pending', 'confirmed'])
      .is('reminder_sent_at', null);

    // Get sent today count
    const { count: sentTodayCount } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('reminder_sent_at', todayStart);

    // Get last sent reminder
    const { data: lastReminder } = await supabase
      .from('reservations')
      .select('reminder_sent_at')
      .eq('company_id', companyId)
      .not('reminder_sent_at', 'is', null)
      .order('reminder_sent_at', { ascending: false })
      .limit(1)
      .single();

    return {
      pendingCount: pendingCount || 0,
      sentTodayCount: sentTodayCount || 0,
      lastSentAt: lastReminder?.reminder_sent_at || null,
    };
  },

  // Get upcoming reservations that need reminders
  async getUpcomingReminders(
    companyId: string,
    storeId?: string,
    hoursAhead: number = 24
  ): Promise<UpcomingReminder[]> {
    const supabase = getSupabaseClient();
    const now = new Date();
    const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    let query = supabase
      .from('reservations')
      .select(`
        id,
        start_time,
        customer_id,
        reminder_sent_at,
        customer:customers (
          first_name,
          last_name
        ),
        staff:staff (
          first_name,
          last_name
        ),
        store:stores (
          name
        )
      `)
      .eq('company_id', companyId)
      .gte('start_time', now.toISOString())
      .lte('start_time', futureTime.toISOString())
      .in('status', ['pending', 'confirmed'])
      .order('start_time', { ascending: true });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((r) => {
      const customer = r.customer as { first_name: string; last_name: string } | null;
      const staff = r.staff as { first_name: string; last_name: string } | null;
      const store = r.store as { name: string } | null;

      return {
        reservationId: r.id,
        customerId: r.customer_id,
        customerName: customer ? `${customer.last_name} ${customer.first_name}` : '',
        staffName: staff ? `${staff.last_name} ${staff.first_name}` : '',
        storeName: store?.name || '',
        startTime: r.start_time,
        reminderSentAt: r.reminder_sent_at,
      };
    });
  },

  // Manually send reminder for a single reservation
  async sendReminder(reservationId: string): Promise<boolean> {
    const supabase = getSupabaseClient();

    // Get reservation details
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select(`
        id,
        start_time,
        customer_id,
        staff_id,
        store_id,
        company_id,
        customer:customers (
          first_name,
          last_name
        ),
        staff:staff (
          first_name,
          last_name
        ),
        store:stores (
          name
        )
      `)
      .eq('id', reservationId)
      .single();

    if (fetchError || !reservation) {
      throw new Error('Reservation not found');
    }

    const customer = reservation.customer as { first_name: string; last_name: string } | null;
    const staff = reservation.staff as { first_name: string; last_name: string } | null;
    const store = reservation.store as { name: string } | null;

    const reservationDate = new Date(reservation.start_time);
    const timeStr = reservationDate.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const staffName = staff ? `${staff.last_name} ${staff.first_name}` : '';
    const storeName = store?.name || '';

    // Send notification
    await notificationService.sendReservationReminder(
      reservation.company_id,
      reservation.store_id,
      reservation.customer_id,
      {
        date: reservationDate.toLocaleDateString('ja-JP'),
        time: timeStr,
        staffName,
        storeName,
      }
    );

    // Mark as sent
    const { error: updateError } = await supabase
      .from('reservations')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', reservationId);

    if (updateError) throw updateError;

    return true;
  },

  // Batch send reminders for all pending reservations
  async sendBatchReminders(
    companyId: string,
    storeId?: string,
    hoursAhead: number = 24
  ): Promise<{ sent: number; failed: number }> {
    const pending = await this.getUpcomingReminders(companyId, storeId, hoursAhead);
    const needsReminder = pending.filter(r => !r.reminderSentAt);

    let sent = 0;
    let failed = 0;

    for (const reminder of needsReminder) {
      try {
        await this.sendReminder(reminder.reservationId);
        sent++;
      } catch {
        failed++;
      }
    }

    return { sent, failed };
  },

  // Trigger the Edge Function for scheduled reminders
  async triggerScheduledReminders(
    hoursAhead: number = 24,
    dryRun: boolean = false
  ): Promise<{ success: boolean; processedCount: number }> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.functions.invoke('reservation-reminder', {
      body: {
        reminderHours: hoursAhead,
        dryRun,
      },
    });

    if (error) throw error;

    return {
      success: data?.success || false,
      processedCount: data?.processedCount || 0,
    };
  },

  // Check if a reservation has pending reminder
  async hasPendingReminder(reservationId: string): Promise<boolean> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('reservations')
      .select('reminder_sent_at')
      .eq('id', reservationId)
      .single();

    if (error) return false;
    return data?.reminder_sent_at === null;
  },
};
