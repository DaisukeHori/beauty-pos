// 請求書番号採番 Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvoiceNumberRequest {
  companyId: string
  storeId: string
  type: 'sale' | 'receipt' | 'invoice'
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

    const { companyId, storeId, type } = await req.json() as InvoiceNumberRequest

    // Get current date in JST
    const now = new Date()
    const jstOffset = 9 * 60 * 60 * 1000
    const jstDate = new Date(now.getTime() + jstOffset)
    const dateStr = jstDate.toISOString().split('T')[0].replace(/-/g, '')

    // Get or create today's sequence
    const { data: existing, error: selectError } = await supabaseClient
      .from('invoice_numbers')
      .select('*')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('number_type', type)
      .eq('date', jstDate.toISOString().split('T')[0])
      .single()

    let sequence: number

    if (existing) {
      // Increment existing sequence
      sequence = existing.last_sequence + 1
      const { error: updateError } = await supabaseClient
        .from('invoice_numbers')
        .update({ last_sequence: sequence })
        .eq('id', existing.id)

      if (updateError) throw updateError
    } else {
      // Create new sequence for today
      sequence = 1
      const { error: insertError } = await supabaseClient
        .from('invoice_numbers')
        .insert({
          company_id: companyId,
          store_id: storeId,
          number_type: type,
          date: jstDate.toISOString().split('T')[0],
          prefix: type === 'sale' ? 'S' : type === 'receipt' ? 'R' : 'I',
          last_sequence: sequence,
        })

      if (insertError) throw insertError
    }

    // Generate invoice number: PREFIX + YYYYMMDD + SEQUENCE (4 digits)
    const prefix = type === 'sale' ? 'S' : type === 'receipt' ? 'R' : 'I'
    const invoiceNumber = `${prefix}${dateStr}${String(sequence).padStart(4, '0')}`

    return new Response(
      JSON.stringify({ invoiceNumber, sequence }),
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
