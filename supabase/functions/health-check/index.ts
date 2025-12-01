// Health Check Edge Function for monitoring
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  checks: {
    database: CheckResult
    storage: CheckResult
    auth: CheckResult
  }
  responseTime: number
}

interface CheckResult {
  status: 'pass' | 'fail'
  message?: string
  latency?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = performance.now()

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  const supabaseClient = createClient(supabaseUrl, supabaseKey)

  const checks: HealthStatus['checks'] = {
    database: { status: 'fail' },
    storage: { status: 'fail' },
    auth: { status: 'fail' },
  }

  // Check database
  try {
    const dbStart = performance.now()
    const { error } = await supabaseClient
      .from('companies')
      .select('id')
      .limit(1)

    checks.database = {
      status: error ? 'fail' : 'pass',
      message: error?.message,
      latency: Math.round(performance.now() - dbStart),
    }
  } catch (error) {
    checks.database = {
      status: 'fail',
      message: error.message,
    }
  }

  // Check storage
  try {
    const storageStart = performance.now()
    const { error } = await supabaseClient.storage.listBuckets()

    checks.storage = {
      status: error ? 'fail' : 'pass',
      message: error?.message,
      latency: Math.round(performance.now() - storageStart),
    }
  } catch (error) {
    checks.storage = {
      status: 'fail',
      message: error.message,
    }
  }

  // Check auth (just verifying the service is reachable)
  try {
    const authStart = performance.now()
    const { error } = await supabaseClient.auth.getSession()

    checks.auth = {
      status: error ? 'fail' : 'pass',
      message: error?.message,
      latency: Math.round(performance.now() - authStart),
    }
  } catch (error) {
    checks.auth = {
      status: 'fail',
      message: error.message,
    }
  }

  // Determine overall status
  const allPass = Object.values(checks).every((c) => c.status === 'pass')
  const anyFail = Object.values(checks).some((c) => c.status === 'fail')

  let overallStatus: HealthStatus['status']
  if (allPass) {
    overallStatus = 'healthy'
  } else if (anyFail) {
    overallStatus = 'unhealthy'
  } else {
    overallStatus = 'degraded'
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
    responseTime: Math.round(performance.now() - startTime),
  }

  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

  return new Response(
    JSON.stringify(healthStatus),
    {
      status: httpStatus,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  )
})
