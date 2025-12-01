// AIアップセル提案 Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpsellRequest {
  customerId?: string
  companyId: string
  storeId: string
  currentMenus: string[]
  visitId?: string
}

interface Suggestion {
  type: 'upsell' | 'cross_sell' | 'addon'
  itemType: 'menu' | 'product'
  itemId?: string
  name: string
  price: number
  reason: string
  priority: number
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

    const { customerId, companyId, storeId, currentMenus } = await req.json() as UpsellRequest

    const suggestions: Suggestion[] = []

    // Get menus for the store
    const { data: menus } = await supabaseClient
      .from('menus')
      .select('*')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('is_active', true)

    // Get products for the store
    const { data: products } = await supabaseClient
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('is_active', true)

    // Rule-based suggestions
    const currentMenusLower = currentMenus.map(m => m.toLowerCase())

    // カット → トリートメント提案
    if (currentMenusLower.some(m => m.includes('カット'))) {
      const treatment = menus?.find(m => m.name.includes('トリートメント'))
      if (treatment && !currentMenusLower.some(m => m.includes('トリートメント'))) {
        suggestions.push({
          type: 'cross_sell',
          itemType: 'menu',
          itemId: treatment.id,
          name: treatment.name,
          price: treatment.base_price,
          reason: 'カットとセットでツヤ髪に！',
          priority: 1,
        })
      }
    }

    // カラー → トリートメント・ヘッドスパ提案
    if (currentMenusLower.some(m => m.includes('カラー'))) {
      const treatment = menus?.find(m => m.name.includes('トリートメント'))
      if (treatment && !currentMenusLower.some(m => m.includes('トリートメント'))) {
        suggestions.push({
          type: 'cross_sell',
          itemType: 'menu',
          itemId: treatment.id,
          name: treatment.name,
          price: treatment.base_price,
          reason: 'カラー後のダメージケアに最適',
          priority: 1,
        })
      }

      const headspa = menus?.find(m => m.name.includes('ヘッドスパ'))
      if (headspa && !currentMenusLower.some(m => m.includes('ヘッドスパ'))) {
        suggestions.push({
          type: 'cross_sell',
          itemType: 'menu',
          itemId: headspa.id,
          name: headspa.name,
          price: headspa.base_price,
          reason: 'カラー後の頭皮ケアにおすすめ',
          priority: 2,
        })
      }

      // カラーケアシャンプー提案
      const colorShampoo = products?.find(p =>
        p.name.includes('カラー') && p.name.includes('シャンプー')
      )
      if (colorShampoo) {
        suggestions.push({
          type: 'addon',
          itemType: 'product',
          itemId: colorShampoo.id,
          name: colorShampoo.name,
          price: colorShampoo.price,
          reason: 'カラーの色持ちを良くするホームケア',
          priority: 3,
        })
      }
    }

    // パーマ → トリートメント提案
    if (currentMenusLower.some(m => m.includes('パーマ'))) {
      const treatment = menus?.find(m => m.name.includes('トリートメント'))
      if (treatment && !currentMenusLower.some(m => m.includes('トリートメント'))) {
        suggestions.push({
          type: 'cross_sell',
          itemType: 'menu',
          itemId: treatment.id,
          name: treatment.name,
          price: treatment.base_price,
          reason: 'パーマのもちを良くするケア',
          priority: 1,
        })
      }
    }

    // Customer-specific suggestions
    if (customerId) {
      const { data: customer } = await supabaseClient
        .from('customers')
        .select('*, ai_analysis')
        .eq('id', customerId)
        .single()

      if (customer?.ai_analysis?.recommendedTreatments) {
        for (const recommended of customer.ai_analysis.recommendedTreatments) {
          const menu = menus?.find(m => m.name.includes(recommended))
          if (menu && !currentMenusLower.some(m => m.includes(recommended.toLowerCase()))) {
            suggestions.push({
              type: 'upsell',
              itemType: 'menu',
              itemId: menu.id,
              name: menu.name,
              price: menu.base_price,
              reason: `${customer.last_name}様におすすめ`,
              priority: 0,
            })
          }
        }
      }

      // Check if customer has hair concerns
      if (customer?.hair_concerns) {
        const concerns = customer.hair_concerns as string[]
        if (concerns.includes('パサつき') || concerns.includes('乾燥')) {
          const moistureProduct = products?.find(p =>
            p.name.includes('モイスチャー') || p.name.includes('保湿')
          )
          if (moistureProduct) {
            suggestions.push({
              type: 'addon',
              itemType: 'product',
              itemId: moistureProduct.id,
              name: moistureProduct.name,
              price: moistureProduct.price,
              reason: '乾燥・パサつき対策に',
              priority: 2,
            })
          }
        }
      }
    }

    // Sort by priority and limit
    const sortedSuggestions = suggestions
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5)

    return new Response(
      JSON.stringify({
        suggestions: sortedSuggestions,
        totalPotentialUpsell: sortedSuggestions.reduce((sum, s) => sum + s.price, 0),
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
