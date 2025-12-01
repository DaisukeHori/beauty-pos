// Audit Logging Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AuditAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'payment'
  | 'refund'
  | 'export'
  | 'settings_change'

interface AuditLogRequest {
  action: AuditAction
  entity_type: string
  entity_id?: string
  details?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const request = await req.json() as AuditLogRequest

    if (!request.action || !request.entity_type) {
      return new Response(
        JSON.stringify({ error: 'action and entity_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get staff info if available
    const { data: staff } = await supabaseClient
      .from('staff')
      .select('id, company_id, last_name, first_name')
      .eq('user_id', user.id)
      .single()

    // Create audit log entry
    const { data: auditLog, error: insertError } = await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        staff_id: staff?.id || null,
        company_id: staff?.company_id || null,
        action: request.action,
        entity_type: request.entity_type,
        entity_id: request.entity_id || null,
        details: request.details || {},
        ip_address: request.ip_address || req.headers.get('x-forwarded-for') || null,
        user_agent: request.user_agent || req.headers.get('user-agent') || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create audit log:', insertError)
      // Don't fail the request if audit logging fails
      return new Response(
        JSON.stringify({ success: true, logged: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, logged: true, id: auditLog.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Audit log error:', error.message)
    // Don't fail the request if audit logging fails
    return new Response(
      JSON.stringify({ success: true, logged: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
