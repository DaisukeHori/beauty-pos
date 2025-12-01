// Create Stripe Payment Intent Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreatePaymentIntentRequest {
  saleId: string
  amount: number
  currency?: string
  customerId?: string
  customerEmail?: string
  description?: string
  metadata?: Record<string, string>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

  if (!stripeSecretKey) {
    return new Response(
      JSON.stringify({ error: 'Stripe configuration missing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const request = await req.json() as CreatePaymentIntentRequest

    if (!request.saleId || !request.amount) {
      return new Response(
        JSON.stringify({ error: 'saleId and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get sale details
    const { data: sale, error: saleError } = await supabaseClient
      .from('sales')
      .select(`
        *,
        customer:customers(id, email, last_name, first_name, stripe_customer_id),
        store:stores(name)
      `)
      .eq('id', request.saleId)
      .single()

    if (saleError || !sale) {
      return new Response(
        JSON.stringify({ error: 'Sale not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get or create Stripe customer
    let stripeCustomerId = sale.customer?.stripe_customer_id

    if (!stripeCustomerId && sale.customer) {
      // Create Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: sale.customer.email || undefined,
        name: `${sale.customer.last_name} ${sale.customer.first_name}`,
        metadata: {
          beauty_pos_customer_id: sale.customer.id,
        },
      })

      stripeCustomerId = stripeCustomer.id

      // Save Stripe customer ID to our database
      await supabaseClient
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', sale.customer.id)
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(request.amount), // Amount in yen (smallest unit for JPY)
      currency: request.currency || 'jpy',
      customer: stripeCustomerId || undefined,
      description: request.description || `${sale.store?.name || 'Beauty Salon'} - Sale #${sale.sale_number}`,
      metadata: {
        sale_id: request.saleId,
        sale_number: sale.sale_number,
        ...(request.metadata || {}),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Update sale with payment intent ID
    await supabaseClient
      .from('sale_payments')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
      })
      .eq('sale_id', request.saleId)
      .eq('method', 'credit_card')

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Create payment intent error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
