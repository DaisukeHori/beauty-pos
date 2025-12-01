// Pinterest Hairstyle Fetcher Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PinterestSearchRequest {
  companyId: string
  query: string
  limit?: number
}

interface PinterestPin {
  id: string
  title: string
  description: string
  image_url: string
  link: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const pinterestAccessToken = Deno.env.get('PINTEREST_ACCESS_TOKEN')

  if (!pinterestAccessToken) {
    return new Response(
      JSON.stringify({ error: 'Pinterest configuration missing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const request = await req.json() as PinterestSearchRequest

    if (!request.companyId || !request.query) {
      return new Response(
        JSON.stringify({ error: 'companyId and query are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const limit = request.limit || 20

    // Build search query for hairstyles
    const searchQuery = encodeURIComponent(`${request.query} hairstyle ヘアスタイル`)

    // Call Pinterest API v5
    const pinterestResponse = await fetch(
      `https://api.pinterest.com/v5/search/pins?query=${searchQuery}&page_size=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${pinterestAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!pinterestResponse.ok) {
      const errorText = await pinterestResponse.text()
      console.error('Pinterest API error:', errorText)

      // Return cached/fallback styles if Pinterest API fails
      const { data: cachedStyles } = await supabaseClient
        .from('hair_styles')
        .select('*')
        .eq('company_id', request.companyId)
        .eq('source', 'pinterest')
        .limit(limit)

      return new Response(
        JSON.stringify({
          styles: cachedStyles || [],
          source: 'cache',
          message: 'Using cached Pinterest styles',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const pinterestData = await pinterestResponse.json()
    const pins = pinterestData.items || []

    // Transform Pinterest pins to our hair style format
    const styles: PinterestPin[] = pins.map((pin: any) => ({
      id: pin.id,
      title: pin.title || 'Untitled Style',
      description: pin.description || '',
      image_url: pin.media?.images?.['600x']?.url || pin.media?.images?.originals?.url || '',
      link: pin.link || `https://www.pinterest.com/pin/${pin.id}/`,
    }))

    // Optionally save to database for caching
    for (const style of styles.slice(0, 10)) {
      if (style.image_url) {
        const { error } = await supabaseClient
          .from('hair_styles')
          .upsert({
            company_id: request.companyId,
            name: style.title.substring(0, 100),
            description: style.description.substring(0, 500),
            image_url: style.image_url,
            source: 'pinterest',
            source_url: style.link,
            is_active: true,
          }, {
            onConflict: 'company_id,source_url',
            ignoreDuplicates: true,
          })

        if (error) {
          console.warn('Failed to cache Pinterest style:', error)
        }
      }
    }

    return new Response(
      JSON.stringify({
        styles,
        source: 'pinterest',
        total: styles.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Pinterest styles error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
