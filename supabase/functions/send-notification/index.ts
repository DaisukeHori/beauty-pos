// プッシュ通知送信 Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  type: 'reservation_reminder' | 'reservation_confirmed' | 'campaign' | 'custom'
  recipientType: 'customer' | 'staff' | 'all_customers'
  recipientId?: string
  companyId: string
  storeId?: string
  title: string
  body: string
  data?: Record<string, string>
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

    const request = await req.json() as NotificationRequest

    // Get push tokens
    let pushTokens: string[] = []

    if (request.recipientType === 'customer' && request.recipientId) {
      const { data: customer } = await supabaseClient
        .from('customers')
        .select('push_token')
        .eq('id', request.recipientId)
        .single()

      if (customer?.push_token) {
        pushTokens.push(customer.push_token)
      }
    } else if (request.recipientType === 'staff' && request.recipientId) {
      const { data: staff } = await supabaseClient
        .from('staff')
        .select('push_token')
        .eq('id', request.recipientId)
        .single()

      if (staff?.push_token) {
        pushTokens.push(staff.push_token)
      }
    } else if (request.recipientType === 'all_customers') {
      const { data: customers } = await supabaseClient
        .from('customers')
        .select('push_token')
        .eq('company_id', request.companyId)
        .not('push_token', 'is', null)

      pushTokens = customers?.map(c => c.push_token).filter(Boolean) || []
    }

    if (pushTokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No push tokens found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Send via Expo Push Notification Service
    const expoPushEndpoint = 'https://exp.host/--/api/v2/push/send'

    const messages = pushTokens.map(token => ({
      to: token,
      sound: 'default',
      title: request.title,
      body: request.body,
      data: request.data || {},
    }))

    // Batch send (Expo recommends max 100 per request)
    const batches = []
    for (let i = 0; i < messages.length; i += 100) {
      batches.push(messages.slice(i, i + 100))
    }

    const results = []
    for (const batch of batches) {
      const response = await fetch(expoPushEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      })

      const result = await response.json()
      results.push(result)
    }

    // Log notification
    await supabaseClient
      .from('notification_logs')
      .insert({
        company_id: request.companyId,
        store_id: request.storeId,
        notification_type: request.type,
        recipient_type: request.recipientType,
        recipient_id: request.recipientId,
        title: request.title,
        body: request.body,
        sent_count: pushTokens.length,
        sent_at: new Date().toISOString(),
      })

    return new Response(
      JSON.stringify({
        success: true,
        sentCount: pushTokens.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
