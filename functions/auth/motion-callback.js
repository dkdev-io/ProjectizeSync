const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event, context) => {
  console.log('Motion OAuth callback received:', event.queryStringParameters)

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      }
    }
  }

  try {
    const { code, state, error, error_description } = event.queryStringParameters || {}

    // Handle OAuth errors
    if (error) {
      console.error('Motion OAuth error:', error, error_description)
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'text/html',
        },
        body: `
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Authentication Error</h2>
              <p>Motion authentication failed: ${error_description || error}</p>
              <button onclick="window.close()">Close</button>
            </body>
          </html>
        `
      }
    }

    if (!code) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'text/html',
        },
        body: `
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Authentication Error</h2>
              <p>No authorization code received from Motion</p>
              <button onclick="window.close()">Close</button>
            </body>
          </html>
        `
      }
    }

    // Extract user ID from state (if provided)
    let userId = null
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        userId = stateData.userId
      } catch (e) {
        console.log('Could not parse state:', e.message)
      }
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.usemotion.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.MOTION_CLIENT_ID,
        client_secret: process.env.MOTION_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.APP_URL}/api/auth/motion/callback`
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      throw new Error(`Token exchange failed: ${errorData.error_description || tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokenData

    // Get user info from Motion
    const userResponse = await fetch('https://api.usemotion.com/v1/user', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    })

    if (!userResponse.ok) {
      throw new Error('Failed to get Motion user info')
    }

    const motionUser = await userResponse.json()

    // Calculate expiration time
    const expiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    // Store or update the integration in Supabase
    if (userId) {
      const { error: integrationError } = await supabase
        .from('user_integrations')
        .upsert({
          user_id: userId,
          platform: 'motion',
          access_token: access_token,
          refresh_token: refresh_token,
          token_expires_at: expiresAt,
          is_active: true,
          last_sync: new Date().toISOString()
        })

      if (integrationError) {
        throw new Error(`Failed to save integration: ${integrationError.message}`)
      }
    }

    // Return success page
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `
        <html>
          <head>
            <title>Motion Connected</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 0;
              }
              .container {
                background: white;
                color: #333;
                padding: 40px;
                border-radius: 10px;
                display: inline-block;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
              }
              .success-icon {
                font-size: 48px;
                color: #4CAF50;
                margin-bottom: 20px;
              }
              button {
                background: #4CAF50;
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✅</div>
              <h2>Motion Connected Successfully!</h2>
              <p>Your Motion account (${motionUser.email || 'account'}) has been connected to ProjectizeSync.</p>
              <p>You can now close this window and return to the app.</p>
              <button onclick="window.close()">Close Window</button>
            </div>
            
            <script>
              // Try to communicate with parent window
              if (window.opener) {
                window.opener.postMessage({
                  type: 'MOTION_AUTH_SUCCESS',
                  data: {
                    platform: 'motion',
                    user: ${JSON.stringify(motionUser)},
                    success: true
                  }
                }, '*');
              }
              
              // Auto-close after 5 seconds
              setTimeout(() => {
                window.close();
              }, 5000);
            </script>
          </body>
        </html>
      `
    }

  } catch (error) {
    console.error('Motion callback error:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Connection Error</h2>
            <p>Failed to connect Motion account: ${error.message}</p>
            <button onclick="window.close()">Close</button>
          </body>
        </html>
      `
    }
  }
}