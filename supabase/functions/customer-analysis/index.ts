// 顧客分析 Edge Function (AI連携)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CustomerAnalysisRequest {
  customerId: string
  companyId: string
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

    const { customerId, companyId } = await req.json() as CustomerAnalysisRequest

    // Get customer data
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (customerError) throw customerError

    // Get visit history
    const { data: visits } = await supabaseClient
      .from('visits')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('check_in_at', { ascending: false })
      .limit(50)

    // Get sales history
    const { data: sales } = await supabaseClient
      .from('sales')
      .select(`
        *,
        items:sale_items(*)
      `)
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('sale_date', { ascending: false })
      .limit(50)

    // Calculate visit pattern
    const visitDates = visits?.map(v => new Date(v.check_in_at)) || []
    let averageInterval = 0
    if (visitDates.length >= 2) {
      let totalInterval = 0
      for (let i = 0; i < visitDates.length - 1; i++) {
        const diff = visitDates[i].getTime() - visitDates[i + 1].getTime()
        totalInterval += diff / (1000 * 60 * 60 * 24) // Convert to days
      }
      averageInterval = Math.round(totalInterval / (visitDates.length - 1))
    }

    // Predict next visit
    let nextVisitPrediction = ''
    if (visitDates.length > 0 && averageInterval > 0) {
      const lastVisit = visitDates[0]
      const predictedDate = new Date(lastVisit.getTime() + averageInterval * 24 * 60 * 60 * 1000)
      nextVisitPrediction = predictedDate.toISOString().split('T')[0]
    }

    // Calculate spending trend
    const recentSales = sales?.slice(0, 5) || []
    const olderSales = sales?.slice(5, 10) || []
    const recentAvg = recentSales.length > 0
      ? recentSales.reduce((sum, s) => sum + s.total, 0) / recentSales.length
      : 0
    const olderAvg = olderSales.length > 0
      ? olderSales.reduce((sum, s) => sum + s.total, 0) / olderSales.length
      : 0

    let spendingTrend = '安定'
    if (olderAvg > 0) {
      const changeRate = (recentAvg - olderAvg) / olderAvg
      if (changeRate > 0.1) spendingTrend = '上昇傾向'
      else if (changeRate < -0.1) spendingTrend = '下降傾向'
    }

    // Calculate churn risk
    let churnRisk: 'low' | 'medium' | 'high' = 'low'
    if (visitDates.length > 0) {
      const daysSinceLastVisit = Math.floor(
        (Date.now() - visitDates[0].getTime()) / (1000 * 60 * 60 * 24)
      )
      if (averageInterval > 0) {
        if (daysSinceLastVisit > averageInterval * 2) {
          churnRisk = 'high'
        } else if (daysSinceLastVisit > averageInterval * 1.5) {
          churnRisk = 'medium'
        }
      } else if (daysSinceLastVisit > 90) {
        churnRisk = 'high'
      } else if (daysSinceLastVisit > 60) {
        churnRisk = 'medium'
      }
    }

    // Analyze preferred services
    const serviceCount: Record<string, number> = {}
    for (const sale of sales || []) {
      for (const item of sale.items || []) {
        if (item.item_type === 'menu') {
          serviceCount[item.name] = (serviceCount[item.name] || 0) + 1
        }
      }
    }
    const preferredServices = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name)

    // Generate recommendations based on history
    const recommendations: string[] = []

    // Check if customer hasn't tried certain services
    const allMenus = ['トリートメント', 'ヘッドスパ', 'カラー', 'パーマ', '縮毛矯正']
    for (const menu of allMenus) {
      if (!serviceCount[menu] && preferredServices.length > 0) {
        recommendations.push(menu)
        if (recommendations.length >= 3) break
      }
    }

    // If frequent color customer, recommend treatment
    if (serviceCount['カラー'] >= 3 && !serviceCount['トリートメント']) {
      recommendations.unshift('髪質改善トリートメント')
    }

    // Build analysis result
    const analysis = {
      customerId,
      analyzedAt: new Date().toISOString(),
      visitPattern: averageInterval > 0 ? `${averageInterval}日ごと` : '不定期',
      averageVisitInterval: averageInterval,
      nextVisitPrediction,
      spendingTrend,
      averageSpend: sales?.length ? Math.round(sales.reduce((sum, s) => sum + s.total, 0) / sales.length) : 0,
      churnRisk,
      totalVisits: customer.total_visits || visits?.length || 0,
      totalSpend: customer.total_spend || 0,
      preferredServices,
      recommendedTreatments: recommendations,
      lastVisitDate: visitDates[0]?.toISOString().split('T')[0] || null,
    }

    // Save analysis to customer record
    await supabaseClient
      .from('customers')
      .update({
        ai_analysis: analysis,
        last_analysis_at: new Date().toISOString(),
      })
      .eq('id', customerId)

    return new Response(
      JSON.stringify(analysis),
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
