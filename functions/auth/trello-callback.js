const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event, context) => {
  console.log('Trello OAuth callback received:', event.queryStringParameters)

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
    const { token, error } = event.queryStringParameters || {}

    // Handle OAuth errors
    if (error) {
      console.error('Trello OAuth error:', error)
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'text/html',
        },
        body: `
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Authentication Error</h2>
              <p>Trello authentication failed: ${error}</p>
              <button onclick="window.close()">Close</button>
            </body>
          </html>
        `
      }
    }

    if (!token) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'text/html',
        },
        body: `
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Authentication Error</h2>
              <p>No access token received from Trello</p>
              <button onclick="window.close()">Close</button>
            </body>
          </html>
        `
      }
    }

    // Get user info from Trello
    const userResponse = await fetch(`https://api.trello.com/1/members/me?key=${process.env.TRELLO_API_KEY}&token=${token}`)

    if (!userResponse.ok) {
      throw new Error('Failed to get Trello user info')
    }

    const trelloUser = await userResponse.json()

    // Try to extract user ID from fragment/state (Trello auth flow is a bit different)
    // For now, we'll handle this in the frontend and pass the userId via state
    let userId = null
    
    // In a real implementation, you might extract this from a state parameter
    // For now, we'll store the token and let the frontend handle the user association

    // Store the integration in Supabase (if we have a user ID)
    if (userId) {
      const { error: integrationError } = await supabase
        .from('user_integrations')
        .upsert({
          user_id: userId,
          platform: 'trello',
          access_token: token,
          refresh_token: null, // Trello tokens don't expire by default
          token_expires_at: null,
          is_active: true,
          last_sync: new Date().toISOString()
        })

      if (integrationError) {
        console.error('Failed to save Trello integration:', integrationError)
        // Don't throw error, let frontend handle it
      }
    }

    // Return success page with token for frontend to handle
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `
        <html>
          <head>
            <title>Trello Connected</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 50px;
                background: linear-gradient(135deg, #0079bf 0%, #005a8b 100%);
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
                background: #0079bf;
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
              <h2>Trello Connected Successfully!</h2>
              <p>Your Trello account (${trelloUser.fullName || trelloUser.username}) has been connected to ProjectizeSync.</p>
              <p>You can now close this window and return to the app.</p>
              <button onclick="window.close()">Close Window</button>
            </div>
            
            <script>
              // Try to communicate with parent window
              if (window.opener) {
                window.opener.postMessage({
                  type: 'TRELLO_AUTH_SUCCESS',
                  data: {
                    platform: 'trello',
                    token: '${token}',
                    user: ${JSON.stringify(trelloUser)},
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
    console.error('Trello callback error:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Connection Error</h2>
            <p>Failed to connect Trello account: ${error.message}</p>
            <button onclick="window.close()">Close</button>
          </body>
        </html>
      `
    }
  }
}