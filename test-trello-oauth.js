// Test Trello OAuth flow
import dotenv from 'dotenv'

dotenv.config()

/**
 * Test Trello OAuth flow
 * This generates an OAuth URL that you can visit to authorize the app
 */
function testTrelloOAuth() {
  const apiKey = process.env.TRELLO_API_KEY
  const appName = 'Projectize Sync'
  const returnUrl = process.env.APP_URL || 'https://projectize-sync.netlify.app'
  const scope = 'read,write'
  const expiration = 'never' // Options: 1hour, 1day, 30days, never
  
  console.log('🔗 Trello OAuth Test')
  console.log('==================')
  
  if (!apiKey) {
    console.error('❌ TRELLO_API_KEY not found in environment variables')
    return
  }
  
  // Construct OAuth URL
  const oauthUrl = new URL('https://trello.com/1/authorize')
  oauthUrl.searchParams.set('key', apiKey)
  oauthUrl.searchParams.set('name', appName)
  oauthUrl.searchParams.set('response_type', 'token')
  oauthUrl.searchParams.set('scope', scope)
  oauthUrl.searchParams.set('expiration', expiration)
  oauthUrl.searchParams.set('return_url', returnUrl)
  
  console.log('✅ Trello OAuth URL generated!')
  console.log('')
  console.log('🌐 Visit this URL to authorize the app:')
  console.log('==========================================')
  console.log(oauthUrl.toString())
  console.log('==========================================')
  console.log('')
  console.log('📋 After authorization:')
  console.log('1. You\'ll be redirected to your return URL')
  console.log('2. The URL will contain a token parameter')
  console.log('3. Copy that token - it\'s the access token for API calls')
  console.log('')
  console.log('🔧 Test the token with:')
  console.log(`curl "https://api.trello.com/1/members/me?key=${apiKey}&token=YOUR_TOKEN"`)
  
  return oauthUrl.toString()
}

// For use in webhook callback URLs
function generateTrelloWebhookAuthUrl(callbackUrl) {
  const apiKey = process.env.TRELLO_API_KEY
  const appName = 'Projectize Sync Webhooks'
  const scope = 'read,write'
  
  if (!callbackUrl) {
    callbackUrl = `${process.env.APP_URL}/.netlify/functions/auth/trello-callback`
  }
  
  const oauthUrl = new URL('https://trello.com/1/authorize')
  oauthUrl.searchParams.set('key', apiKey)
  oauthUrl.searchParams.set('name', appName)
  oauthUrl.searchParams.set('response_type', 'token')
  oauthUrl.searchParams.set('scope', scope)
  oauthUrl.searchParams.set('expiration', 'never')
  oauthUrl.searchParams.set('callback_method', 'postMessage')
  oauthUrl.searchParams.set('return_url', callbackUrl)
  
  return oauthUrl.toString()
}

// Test token validation
async function testTrelloToken(token) {
  const apiKey = process.env.TRELLO_API_KEY
  
  try {
    const response = await fetch(`https://api.trello.com/1/members/me?key=${apiKey}&token=${token}`)
    
    if (response.ok) {
      const user = await response.json()
      console.log('✅ Token is valid!')
      console.log('User:', user.fullName || user.username)
      console.log('Email:', user.email || 'Not provided')
      return { valid: true, user }
    } else {
      console.log('❌ Token is invalid:', response.status, response.statusText)
      return { valid: false, error: response.statusText }
    }
  } catch (error) {
    console.log('❌ Error testing token:', error.message)
    return { valid: false, error: error.message }
  }
}

// Main execution
if (process.argv.length > 2) {
  const command = process.argv[2]
  
  if (command === 'test-token' && process.argv[3]) {
    const token = process.argv[3]
    testTrelloToken(token).then(result => {
      console.log('Test result:', result)
    })
  } else if (command === 'webhook-url') {
    const callbackUrl = process.argv[3]
    const url = generateTrelloWebhookAuthUrl(callbackUrl)
    console.log('Webhook OAuth URL:', url)
  } else {
    console.log('Usage:')
    console.log('  node test-trello-oauth.js                    # Generate OAuth URL')
    console.log('  node test-trello-oauth.js test-token TOKEN   # Test a token')
    console.log('  node test-trello-oauth.js webhook-url URL    # Generate webhook OAuth URL')
  }
} else {
  testTrelloOAuth()
}

export { testTrelloOAuth, generateTrelloWebhookAuthUrl, testTrelloToken }