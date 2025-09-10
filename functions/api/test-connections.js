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
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { userId, platforms } = JSON.parse(event.body || '{}')

    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'User ID required' })
      }
    }

    // Get user integrations
    const { data: integrations, error: integrationsError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (integrationsError) {
      throw new Error(`Failed to fetch integrations: ${integrationsError.message}`)
    }

    const results = {
      timestamp: new Date().toISOString(),
      user_id: userId,
      tests: {}
    }

    // Test each platform
    for (const integration of integrations) {
      const { platform, access_token } = integration

      // Skip if specific platforms requested and this isn't one of them
      if (platforms && !platforms.includes(platform)) {
        continue
      }

      console.log(`Testing ${platform} integration...`)
      
      try {
        if (platform === 'motion') {
          results.tests.motion = await testMotionConnection(access_token)
        } else if (platform === 'trello') {
          results.tests.trello = await testTrelloConnection(access_token)
        }
      } catch (error) {
        results.tests[platform] = {
          status: 'error',
          message: error.message,
          connected: false
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(results)
    }

  } catch (error) {
    console.error('Connection test failed:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Connection test failed',
        message: error.message
      })
    }
  }
}

// Test Motion API connection
async function testMotionConnection(accessToken) {
  const startTime = Date.now()
  
  try {
    // Test basic user endpoint
    const userResponse = await fetch('https://api.usemotion.com/v1/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!userResponse.ok) {
      const errorData = await userResponse.json().catch(() => ({}))
      throw new Error(`Motion API error: ${userResponse.status} - ${errorData.message || userResponse.statusText}`)
    }

    const userData = await userResponse.json()

    // Test workspaces endpoint
    const workspacesResponse = await fetch('https://api.usemotion.com/v1/workspaces', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    const workspacesData = workspacesResponse.ok 
      ? await workspacesResponse.json().catch(() => null)
      : null

    return {
      status: 'success',
      connected: true,
      platform: 'motion',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name
      },
      capabilities: {
        workspaces: !!workspacesData,
        workspace_count: workspacesData ? workspacesData.length : 0
      },
      response_time: Date.now() - startTime
    }

  } catch (error) {
    return {
      status: 'error',
      connected: false,
      platform: 'motion',
      message: error.message,
      response_time: Date.now() - startTime
    }
  }
}

// Test Trello API connection
async function testTrelloConnection(accessToken) {
  const startTime = Date.now()
  
  try {
    // Test basic user endpoint
    const userResponse = await fetch(`https://api.trello.com/1/members/me?key=${process.env.TRELLO_API_KEY}&token=${accessToken}`)

    if (!userResponse.ok) {
      throw new Error(`Trello API error: ${userResponse.status} - ${userResponse.statusText}`)
    }

    const userData = await userResponse.json()

    // Test boards endpoint
    const boardsResponse = await fetch(`https://api.trello.com/1/members/me/boards?key=${process.env.TRELLO_API_KEY}&token=${accessToken}`)
    
    const boardsData = boardsResponse.ok 
      ? await boardsResponse.json().catch(() => null)
      : null

    return {
      status: 'success',
      connected: true,
      platform: 'trello',
      user: {
        id: userData.id,
        username: userData.username,
        fullName: userData.fullName,
        email: userData.email
      },
      capabilities: {
        boards: !!boardsData,
        board_count: boardsData ? boardsData.length : 0
      },
      response_time: Date.now() - startTime
    }

  } catch (error) {
    return {
      status: 'error',
      connected: false,
      platform: 'trello',
      message: error.message,
      response_time: Date.now() - startTime
    }
  }
}