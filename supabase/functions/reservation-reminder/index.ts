// 予約リマインダー自動送信 Edge Function
// Supabase Cron Jobまたは外部スケジューラから呼び出される
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderResult {
  reservationId: string;
  customerId: string;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body for optional parameters
    let reminderHours = 24; // Default: 24 hours before
    let dryRun = false;

    try {
      const body = await req.json();
      if (body.reminderHours) reminderHours = body.reminderHours;
      if (body.dryRun) dryRun = body.dryRun;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Calculate reminder window
    const now = new Date();
    const reminderStart = new Date(now.getTime() + (reminderHours - 1) * 60 * 60 * 1000);
    const reminderEnd = new Date(now.getTime() + (reminderHours + 1) * 60 * 60 * 1000);

    console.log(`Fetching reservations between ${reminderStart.toISOString()} and ${reminderEnd.toISOString()}`);

    // Get reservations that need reminders
    const { data: reservations, error: fetchError } = await supabaseClient
      .from('reservations')
      .select(`
        id,
        start_time,
        customer_id,
        staff_id,
        store_id,
        company_id,
        reminder_sent_at,
        customer:customers (
          id,
          first_name,
          last_name,
          email,
          push_token
        ),
        staff:staff (
          first_name,
          last_name
        ),
        store:stores (
          name
        )
      `)
      .gte('start_time', reminderStart.toISOString())
      .lte('start_time', reminderEnd.toISOString())
      .in('status', ['pending', 'confirmed'])
      .is('reminder_sent_at', null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${reservations?.length || 0} reservations needing reminders`);

    if (!reservations || reservations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No reservations need reminders',
          processedCount: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const results: ReminderResult[] = [];
    const pushMessages: Array<{
      to: string;
      sound: string;
      title: string;
      body: string;
      data: Record<string, string>;
    }> = [];

    // Process each reservation
    for (const reservation of reservations) {
      const customer = reservation.customer as {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        push_token?: string;
      } | null;

      const staff = reservation.staff as { first_name: string; last_name: string } | null;
      const store = reservation.store as { name: string } | null;

      if (!customer) {
        results.push({
          reservationId: reservation.id,
          customerId: reservation.customer_id,
          success: false,
          error: 'Customer not found',
        });
        continue;
      }

      // Format reminder message
      const reservationDate = new Date(reservation.start_time);
      const dateStr = reservationDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = reservationDate.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const staffName = staff ? `${staff.last_name} ${staff.first_name}` : '';
      const storeName = store?.name || '';

      const title = '予約リマインダー';
      const body = staffName
        ? `明日 ${timeStr}に${storeName}でのご予約があります。担当: ${staffName}`
        : `明日 ${timeStr}に${storeName}でのご予約があります。`;

      // Create in-app notification
      if (!dryRun) {
        await supabaseClient
          .from('notifications')
          .insert({
            company_id: reservation.company_id,
            store_id: reservation.store_id,
            customer_id: customer.id,
            type: 'reminder',
            channel: 'in_app',
            title,
            body,
            status: 'sent',
            sent_at: new Date().toISOString(),
            data: {
              reservationId: reservation.id,
              date: dateStr,
              time: timeStr,
              staffName,
              storeName,
            },
          });
      }

      // Queue push notification if customer has push token
      if (customer.push_token) {
        pushMessages.push({
          to: customer.push_token,
          sound: 'default',
          title,
          body,
          data: {
            type: 'reservation_reminder',
            reservationId: reservation.id,
          },
        });
      }

      // Mark reservation as reminder sent
      if (!dryRun) {
        await supabaseClient
          .from('reservations')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', reservation.id);
      }

      results.push({
        reservationId: reservation.id,
        customerId: customer.id,
        success: true,
      });
    }

    // Send push notifications in batch
    if (!dryRun && pushMessages.length > 0) {
      const expoPushEndpoint = 'https://exp.host/--/api/v2/push/send';

      // Batch in groups of 100
      for (let i = 0; i < pushMessages.length; i += 100) {
        const batch = pushMessages.slice(i, i + 100);
        try {
          await fetch(expoPushEndpoint, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(batch),
          });
        } catch (pushError) {
          console.error('Push notification error:', pushError);
        }
      }
    }

    // Log the batch operation
    if (!dryRun) {
      await supabaseClient
        .from('notification_logs')
        .insert({
          company_id: 'system',
          notification_type: 'reservation_reminder',
          recipient_type: 'customer',
          title: 'Batch Reminder Send',
          body: `Sent ${results.filter(r => r.success).length} reminders`,
          sent_count: results.filter(r => r.success).length,
          sent_at: new Date().toISOString(),
        });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        processedCount: results.length,
        successCount,
        failCount,
        pushCount: pushMessages.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Reminder error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
