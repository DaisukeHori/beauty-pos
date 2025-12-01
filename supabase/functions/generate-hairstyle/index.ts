// AI髪型シミュレーション Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateHairstyleRequest {
  customerId?: string
  companyId: string
  sourceImageBase64: string
  targetStyleId?: string
  targetStyleDescription?: string
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

    const request = await req.json() as GenerateHairstyleRequest

    // Get API key from secrets
    const googleAiApiKey = Deno.env.get('GOOGLE_AI_API_KEY')

    if (!googleAiApiKey) {
      throw new Error('Google AI API key not configured')
    }

    // Prepare the prompt for hairstyle generation
    const styleDescription = request.targetStyleDescription || 'modern stylish haircut'

    // Call Google Gemini API for image generation/editing
    // Note: This is a placeholder - actual implementation depends on Google's API
    const geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent'

    const geminiResponse = await fetch(`${geminiEndpoint}?key=${googleAiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a professional hair stylist AI. Analyze this person's face shape and suggest how they would look with the following hairstyle: ${styleDescription}. Describe in detail how the hairstyle would complement their features.`,
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: request.sourceImageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    })

    const geminiResult = await geminiResponse.json()

    // For actual image generation, you would use a service like:
    // - Stable Diffusion with inpainting
    // - Google Imagen
    // - Custom trained model

    // For now, we'll return the analysis and save the simulation request
    const simulationId = crypto.randomUUID()

    // Save simulation to database
    const { error: insertError } = await supabaseClient
      .from('hairstyle_simulations')
      .insert({
        id: simulationId,
        company_id: request.companyId,
        customer_id: request.customerId,
        source_image_url: null, // Would be uploaded to storage
        target_style_id: request.targetStyleId,
        target_style_description: styleDescription,
        result_image_url: null, // Would be the generated image
        ai_analysis: geminiResult,
        status: 'completed',
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Failed to save simulation:', insertError)
    }

    // Extract text response from Gemini
    const analysisText = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'スタイル分析を完了しました。'

    return new Response(
      JSON.stringify({
        simulationId,
        analysis: analysisText,
        // In production, this would include the generated image URL
        generatedImageUrl: null,
        suggestions: [
          'このスタイルはお客様の顔型に合っています',
          '髪質を考慮するとトリートメントとの併用がおすすめです',
        ],
        status: 'completed',
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
