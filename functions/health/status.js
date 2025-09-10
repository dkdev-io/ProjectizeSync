const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    }
  }

  try {
    const startTime = Date.now()
    const checks = {}
    
    // Check Supabase connection
    console.log('Checking Supabase connection...')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      checks.supabase = {
        status: error ? 'error' : 'ok',
        message: error ? error.message : 'Connected successfully',
        response_time: Date.now() - startTime
      }
    } catch (error) {
      checks.supabase = {
        status: 'error',
        message: error.message,
        response_time: Date.now() - startTime
      }
    }

    // Check environment variables
    console.log('Checking environment variables...')
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ANON_KEY'
    ]

    const missingEnvVars = requiredEnvVars.filter(env => !process.env[env])
    
    checks.environment = {
      status: missingEnvVars.length === 0 ? 'ok' : 'warning',
      message: missingEnvVars.length === 0 
        ? 'All required environment variables present'
        : `Missing: ${missingEnvVars.join(', ')}`,
      missing_vars: missingEnvVars
    }

    // Check optional OAuth credentials
    const oauthVars = {
      motion: ['MOTION_CLIENT_ID', 'MOTION_CLIENT_SECRET'],
      trello: ['TRELLO_API_KEY', 'TRELLO_API_SECRET']
    }

    checks.oauth = {}
    Object.entries(oauthVars).forEach(([platform, vars]) => {
      const missingVars = vars.filter(env => !process.env[env])
      checks.oauth[platform] = {
        status: missingVars.length === 0 ? 'ok' : 'not_configured',
        configured: missingVars.length === 0,
        missing_vars: missingVars
      }
    })

    // Overall system status
    const hasErrors = Object.values(checks).some(check => 
      check.status === 'error' || (check.supabase && check.supabase.status === 'error')
    )
    
    const overallStatus = hasErrors ? 'degraded' : 'operational'

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: checks,
      response_time: Date.now() - startTime
    }

    return {
      statusCode: hasErrors ? 503 : 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify(response, null, 2)
    }

  } catch (error) {
    console.error('Health check failed:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        checks: {
          system: {
            status: 'error',
            message: 'Health check system failure'
          }
        }
      }, null, 2)
    }
  }
}