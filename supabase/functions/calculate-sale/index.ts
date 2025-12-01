// 会計計算 Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SaleItem {
  itemType: 'menu' | 'product' | 'other'
  itemId?: string
  name: string
  quantity: number
  unitPrice: number
  hairLength?: 'short' | 'medium' | 'long'
  hairLengthCharge?: number
  nominationType?: 'nomination' | 'free'
  nominationFee?: number
  taxRate: number
  discounts?: Discount[]
}

interface Discount {
  type: 'manual' | 'coupon' | 'ticket' | 'points'
  sourceId?: string
  name: string
  value: number
  valueType: 'percentage' | 'fixed'
}

interface Payment {
  method: 'cash' | 'card' | 'electronic_money' | 'qr_payment' | 'credit'
  amount: number
}

interface CalculateSaleRequest {
  companyId: string
  storeId: string
  customerId?: string
  items: SaleItem[]
  globalDiscounts?: Discount[]
  pointsUsed?: number
  payments: Payment[]
}

interface TaxBreakdown {
  rate: number
  taxableAmount: number
  taxAmount: number
  totalWithTax: number
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

    const request = await req.json() as CalculateSaleRequest

    // Calculate item totals
    let subtotal = 0
    let itemDiscountTotal = 0
    const taxBreakdowns: Map<number, TaxBreakdown> = new Map()

    const calculatedItems = request.items.map(item => {
      const itemBasePrice = item.unitPrice + (item.hairLengthCharge || 0) + (item.nominationFee || 0)
      const itemSubtotal = itemBasePrice * item.quantity

      // Calculate item discounts
      let itemDiscountAmount = 0
      for (const discount of item.discounts || []) {
        if (discount.valueType === 'percentage') {
          itemDiscountAmount += Math.floor(itemSubtotal * discount.value / 100)
        } else {
          itemDiscountAmount += discount.value
        }
      }

      const taxableAmount = itemSubtotal - itemDiscountAmount
      const taxAmount = Math.floor(taxableAmount * item.taxRate / (100 + item.taxRate))
      const preTaxAmount = taxableAmount - taxAmount

      // Accumulate tax breakdown
      const existing = taxBreakdowns.get(item.taxRate)
      if (existing) {
        existing.taxableAmount += preTaxAmount
        existing.taxAmount += taxAmount
        existing.totalWithTax += taxableAmount
      } else {
        taxBreakdowns.set(item.taxRate, {
          rate: item.taxRate,
          taxableAmount: preTaxAmount,
          taxAmount: taxAmount,
          totalWithTax: taxableAmount,
        })
      }

      subtotal += itemSubtotal
      itemDiscountTotal += itemDiscountAmount

      return {
        ...item,
        itemSubtotal,
        discountAmount: itemDiscountAmount,
        taxableAmount: preTaxAmount,
        taxAmount,
        totalWithTax: taxableAmount,
      }
    })

    // Calculate global discounts
    let globalDiscountTotal = 0
    for (const discount of request.globalDiscounts || []) {
      if (discount.valueType === 'percentage') {
        globalDiscountTotal += Math.floor(subtotal * discount.value / 100)
      } else {
        globalDiscountTotal += discount.value
      }
    }

    const totalDiscounts = itemDiscountTotal + globalDiscountTotal
    const pointsUsed = request.pointsUsed || 0

    // Calculate final total
    const totalBeforePoints = subtotal - totalDiscounts
    const total = Math.max(0, totalBeforePoints - pointsUsed)

    // Calculate points earned (1% of total)
    const pointsEarned = Math.floor(total * 0.01)

    // Calculate payment totals
    const paymentTotal = request.payments.reduce((sum, p) => sum + p.amount, 0)
    const change = paymentTotal - total

    // Get customer current points if customerId provided
    let customerPoints = 0
    if (request.customerId) {
      const { data: customer } = await supabaseClient
        .from('customers')
        .select('points_balance')
        .eq('id', request.customerId)
        .single()
      customerPoints = customer?.points_balance || 0
    }

    // Convert tax breakdowns to array
    const taxBreakdownArray = Array.from(taxBreakdowns.values())

    return new Response(
      JSON.stringify({
        items: calculatedItems,
        subtotal,
        itemDiscountTotal,
        globalDiscountTotal,
        totalDiscounts,
        taxBreakdowns: taxBreakdownArray,
        tax10Amount: taxBreakdowns.get(10)?.taxAmount || 0,
        tax10Base: taxBreakdowns.get(10)?.taxableAmount || 0,
        tax8Amount: taxBreakdowns.get(8)?.taxAmount || 0,
        tax8Base: taxBreakdowns.get(8)?.taxableAmount || 0,
        totalBeforePoints,
        pointsUsed,
        pointsEarned,
        total,
        paymentTotal,
        change: Math.max(0, change),
        customerCurrentPoints: customerPoints,
        customerNewPoints: customerPoints - pointsUsed + pointsEarned,
        isValid: paymentTotal >= total,
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
