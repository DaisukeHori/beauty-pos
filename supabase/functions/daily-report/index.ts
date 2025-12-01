// 日次レポート生成 Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DailyReportRequest {
  companyId: string
  storeId: string
  date: string // YYYY-MM-DD
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

    const { companyId, storeId, date } = await req.json() as DailyReportRequest

    const startOfDay = `${date}T00:00:00`
    const endOfDay = `${date}T23:59:59`

    // Get sales data
    const { data: sales, error: salesError } = await supabaseClient
      .from('sales')
      .select(`
        *,
        items:sale_items(*),
        payments:sale_payments(*),
        discounts:sale_discounts(*)
      `)
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .gte('sale_date', startOfDay)
      .lte('sale_date', endOfDay)

    if (salesError) throw salesError

    // Get visits data
    const { data: visits, error: visitsError } = await supabaseClient
      .from('visits')
      .select('*')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .gte('check_in_at', startOfDay)
      .lte('check_in_at', endOfDay)

    if (visitsError) throw visitsError

    // Get reservations data
    const { data: reservations, error: reservationsError } = await supabaseClient
      .from('reservations')
      .select('*')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)

    if (reservationsError) throw reservationsError

    // Calculate totals
    const completedSales = sales?.filter(s => s.status === 'completed') || []
    const voidedSales = sales?.filter(s => s.status === 'voided') || []

    const grossSales = completedSales.reduce((sum, s) => sum + s.subtotal, 0)
    const totalDiscounts = completedSales.reduce((sum, s) => sum + s.discount_total, 0)
    const netSales = completedSales.reduce((sum, s) => sum + s.total, 0)
    const tax10Total = completedSales.reduce((sum, s) => sum + (s.tax_10_amount || 0), 0)
    const tax8Total = completedSales.reduce((sum, s) => sum + (s.tax_8_amount || 0), 0)
    const taxTotal = tax10Total + tax8Total

    // Payment breakdown
    const paymentBreakdown: Record<string, number> = {}
    for (const sale of completedSales) {
      const payments = sale.payments || []
      for (const payment of payments) {
        const method = payment.payment_method
        paymentBreakdown[method] = (paymentBreakdown[method] || 0) + payment.amount
      }
    }

    // Points summary
    const pointsUsed = completedSales.reduce((sum, s) => sum + (s.points_used || 0), 0)
    const pointsEarned = completedSales.reduce((sum, s) => sum + (s.points_earned || 0), 0)

    // Menu sales breakdown
    const menuSales: Record<string, { count: number; amount: number }> = {}
    for (const sale of completedSales) {
      const items = sale.items || []
      for (const item of items) {
        if (item.item_type === 'menu') {
          const key = item.name
          if (!menuSales[key]) {
            menuSales[key] = { count: 0, amount: 0 }
          }
          menuSales[key].count += item.quantity
          menuSales[key].amount += item.subtotal
        }
      }
    }

    // Product sales breakdown
    const productSales: Record<string, { count: number; amount: number }> = {}
    for (const sale of completedSales) {
      const items = sale.items || []
      for (const item of items) {
        if (item.item_type === 'product') {
          const key = item.name
          if (!productSales[key]) {
            productSales[key] = { count: 0, amount: 0 }
          }
          productSales[key].count += item.quantity
          productSales[key].amount += item.subtotal
        }
      }
    }

    // Staff sales
    const { data: staffAssignments } = await supabaseClient
      .from('sale_item_staff_assignments')
      .select(`
        *,
        staff:staff(id, first_name, last_name),
        sale_item:sale_items(
          sale:sales(sale_date, status, company_id, store_id)
        )
      `)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    const staffSales: Record<string, { name: string; salesAmount: number; customerCount: number }> = {}
    const staffCustomers: Record<string, Set<string>> = {}

    for (const assignment of staffAssignments || []) {
      const sale = assignment.sale_item?.sale
      if (sale?.status !== 'completed' || sale?.company_id !== companyId || sale?.store_id !== storeId) continue

      const staffId = assignment.staff_id
      const staffName = assignment.staff ? `${assignment.staff.last_name} ${assignment.staff.first_name}` : 'Unknown'

      if (!staffSales[staffId]) {
        staffSales[staffId] = { name: staffName, salesAmount: 0, customerCount: 0 }
        staffCustomers[staffId] = new Set()
      }

      staffSales[staffId].salesAmount += assignment.sales_amount || 0
    }

    // Visit statistics
    const visitStats = {
      total: visits?.length || 0,
      completed: visits?.filter(v => v.status === 'completed').length || 0,
      cancelled: visits?.filter(v => v.status === 'cancelled').length || 0,
      noShow: visits?.filter(v => v.status === 'no_show').length || 0,
    }

    // Reservation statistics
    const reservationStats = {
      total: reservations?.length || 0,
      confirmed: reservations?.filter(r => r.status === 'confirmed').length || 0,
      cancelled: reservations?.filter(r => r.status === 'cancelled').length || 0,
      noShow: reservations?.filter(r => r.status === 'no_show').length || 0,
    }

    // Calculate average customer spend
    const averageSpend = completedSales.length > 0 ? Math.round(netSales / completedSales.length) : 0

    // Create or update daily report
    const reportData = {
      company_id: companyId,
      store_id: storeId,
      report_date: date,
      gross_sales: grossSales,
      discount_total: totalDiscounts,
      net_sales: netSales,
      tax_total: taxTotal,
      tax_10_total: tax10Total,
      tax_8_total: tax8Total,
      transaction_count: completedSales.length,
      voided_count: voidedSales.length,
      voided_amount: voidedSales.reduce((sum, s) => sum + s.total, 0),
      cash_sales: paymentBreakdown['cash'] || 0,
      card_sales: paymentBreakdown['card'] || 0,
      electronic_money_sales: paymentBreakdown['electronic_money'] || 0,
      qr_sales: paymentBreakdown['qr_payment'] || 0,
      credit_sales: paymentBreakdown['credit'] || 0,
      points_used: pointsUsed,
      points_earned: pointsEarned,
      customer_count: visitStats.completed,
      new_customer_count: 0, // TODO: Calculate from customer data
      average_spend: averageSpend,
      menu_sales_breakdown: menuSales,
      product_sales_breakdown: productSales,
      staff_sales_breakdown: staffSales,
    }

    const { data: existingReport } = await supabaseClient
      .from('daily_reports')
      .select('id')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('report_date', date)
      .single()

    if (existingReport) {
      await supabaseClient
        .from('daily_reports')
        .update(reportData)
        .eq('id', existingReport.id)
    } else {
      await supabaseClient
        .from('daily_reports')
        .insert(reportData)
    }

    return new Response(
      JSON.stringify({
        date,
        sales: {
          gross: grossSales,
          discounts: totalDiscounts,
          net: netSales,
          tax: taxTotal,
          tax10: tax10Total,
          tax8: tax8Total,
          transactionCount: completedSales.length,
          averageSpend,
        },
        payments: paymentBreakdown,
        points: {
          used: pointsUsed,
          earned: pointsEarned,
        },
        visits: visitStats,
        reservations: reservationStats,
        menuSales,
        productSales,
        staffSales,
        voidedSales: {
          count: voidedSales.length,
          amount: voidedSales.reduce((sum, s) => sum + s.total, 0),
        },
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
