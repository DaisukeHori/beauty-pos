// AI Conversation Analysis Edge Function using Claude
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzeConversationRequest {
  transcriptId: string
  transcript: string
  customerId?: string
  visitId?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

  if (!anthropicApiKey) {
    return new Response(
      JSON.stringify({ error: 'Anthropic API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const request = await req.json() as AnalyzeConversationRequest

    if (!request.transcript) {
      return new Response(
        JSON.stringify({ error: 'transcript is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get customer history if available
    let customerContext = ''
    if (request.customerId) {
      const { data: customer } = await supabaseClient
        .from('customers')
        .select(`
          last_name, first_name,
          total_visits, total_spend,
          customer_kartes(hair_type, hair_volume, damage_level, face_shape, lifestyle)
        `)
        .eq('id', request.customerId)
        .single()

      if (customer) {
        customerContext = `
顧客情報:
- 氏名: ${customer.last_name} ${customer.first_name}
- 来店回数: ${customer.total_visits}回
- 総利用額: ¥${customer.total_spend?.toLocaleString() || 0}
- 髪質: ${customer.customer_kartes?.[0]?.hair_type || '不明'}
- 髪のボリューム: ${customer.customer_kartes?.[0]?.hair_volume || '不明'}
- ダメージレベル: ${customer.customer_kartes?.[0]?.damage_level || '不明'}
- 顔型: ${customer.customer_kartes?.[0]?.face_shape || '不明'}
- ライフスタイル: ${customer.customer_kartes?.[0]?.lifestyle || '不明'}
`
      }
    }

    // Call Claude API for analysis
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `あなたは美容室の会話分析AIアシスタントです。以下の美容師と顧客の会話を分析してください。

${customerContext}

会話内容:
${request.transcript}

以下の形式でJSON形式で分析結果を返してください:
{
  "summary": "会話の要約（2-3文）",
  "topics": ["話題1", "話題2", ...],
  "sentiment": {
    "overall": "positive/neutral/negative",
    "score": 0.0-1.0,
    "details": "感情分析の詳細"
  },
  "customer_preferences": ["好み1", "好み2", ...],
  "concerns": ["気になる点1", "気になる点2", ...],
  "upsell_opportunities": [
    {
      "product_or_service": "商品/サービス名",
      "reason": "提案理由",
      "confidence": 0.0-1.0
    }
  ],
  "next_visit_suggestions": ["次回提案1", "次回提案2", ...],
  "conversation_quality_score": 0.0-1.0,
  "key_insights": ["重要な洞察1", "重要な洞察2", ...]
}

JSON形式のみを返してください。説明文は不要です。`,
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', errorText)
      throw new Error('Failed to analyze conversation')
    }

    const claudeResult = await claudeResponse.json()
    const analysisText = claudeResult.content?.[0]?.text || '{}'

    // Parse the JSON response
    let analysis
    try {
      // Remove markdown code blocks if present
      const cleanedText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysis = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError)
      analysis = {
        summary: analysisText,
        topics: [],
        sentiment: { overall: 'neutral', score: 0.5 },
        customer_preferences: [],
        concerns: [],
        upsell_opportunities: [],
        next_visit_suggestions: [],
        conversation_quality_score: 0.5,
        key_insights: [],
      }
    }

    // Save analysis to database
    if (request.transcriptId) {
      await supabaseClient
        .from('conversation_analyses')
        .insert({
          transcript_id: request.transcriptId,
          summary: analysis.summary,
          topics: analysis.topics,
          sentiment: analysis.sentiment?.overall,
          sentiment_score: analysis.sentiment?.score,
          upsell_opportunities: analysis.upsell_opportunities,
          crosssell_opportunities: [],
          key_insights: analysis.key_insights,
          next_visit_suggestions: analysis.next_visit_suggestions,
          conversation_quality_score: analysis.conversation_quality_score,
        })
    }

    // Create AI suggestions from analysis
    if (request.visitId && analysis.upsell_opportunities?.length > 0) {
      for (const opportunity of analysis.upsell_opportunities) {
        if (opportunity.confidence >= 0.6) {
          await supabaseClient
            .from('ai_suggestions')
            .insert({
              company_id: request.customerId ? undefined : null,
              visit_id: request.visitId,
              customer_id: request.customerId,
              type: 'upsell',
              suggestion: `${opportunity.product_or_service}: ${opportunity.reason}`,
              confidence: opportunity.confidence,
              context: { source: 'conversation_analysis' },
              status: 'pending',
            })
        }
      }
    }

    return new Response(
      JSON.stringify({
        analysis,
        suggestions_created: analysis.upsell_opportunities?.filter((o: any) => o.confidence >= 0.6).length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Conversation analysis error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
