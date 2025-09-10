// Direct test of webhook functions (bypass Netlify dev)
const dotenv = require('dotenv')
dotenv.config()

// Mock Netlify event structure
function createMockEvent(method, body, headers = {}) {
  return {
    httpMethod: method,
    headers: headers,
    body: body ? JSON.stringify(body) : null,
    queryStringParameters: null
  }
}

// Test Motion webhook handler directly
async function testMotionWebhookDirect() {
  console.log('🎯 Testing Motion Webhook Handler (Direct)')
  console.log('=========================================')
  
  try {
    // Import the handler
    const { handler } = require('./functions/webhooks/motion.js')
    
    // Create test payload
    const testPayload = {
      event_type: 'task.created',
      data: {
        id: 'test-motion-task-123',
        name: 'Test Motion Task',
        description: 'This is a test task created via webhook',
        project_id: 'test-project-456',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: '2024-12-31T23:59:59Z',
        dateModified: new Date().toISOString()
      },
      user_id: 'test-user-789'
    }
    
    // Create mock event
    const event = createMockEvent('POST', testPayload, {
      'content-type': 'application/json',
      'x-motion-signature': 'test-signature'
    })
    
    // Call handler
    const result = await handler(event, {})
    
    console.log('Status Code:', result.statusCode)
    console.log('Response Body:', result.body)
    
    if (result.statusCode === 200) {
      console.log('✅ Motion webhook handler test passed')
      return true
    } else {
      console.log('❌ Motion webhook handler test failed')
      return false
    }
    
  } catch (error) {
    console.log('❌ Motion webhook handler error:', error.message)
    return false
  }
}

// Test Trello webhook handler directly
async function testTrelloWebhookDirect() {
  console.log('\n📋 Testing Trello Webhook Handler (Direct)')
  console.log('==========================================')
  
  try {
    // Import the handler
    const { handler } = require('./functions/webhooks/trello.js')
    
    // Create test payload
    const testPayload = {
      action: {
        type: 'createCard',
        data: {
          card: {
            id: 'test-trello-card-123',
            name: 'Test Trello Card',
            desc: 'This is a test card created via webhook',
            due: '2024-12-31T23:59:59Z',
            idList: 'test-list-456',
            labels: [
              { name: 'high', color: 'orange' }
            ],
            dateLastActivity: new Date().toISOString()
          },
          board: {
            id: 'test-board-789',
            name: 'Test Board'
          }
        },
        memberCreator: {
          id: 'test-member-111',
          username: 'testuser'
        }
      }
    }
    
    // Create mock event
    const event = createMockEvent('POST', testPayload, {
      'content-type': 'application/json',
      'x-trello-webhook': 'test-signature'
    })
    
    // Call handler
    const result = await handler(event, {})
    
    console.log('Status Code:', result.statusCode)
    console.log('Response Body:', result.body)
    
    if (result.statusCode === 200) {
      console.log('✅ Trello webhook handler test passed')
      return true
    } else {
      console.log('❌ Trello webhook handler test failed')
      return false
    }
    
  } catch (error) {
    console.log('❌ Trello webhook handler error:', error.message)
    return false
  }
}

// Test HEAD request (Trello verification)
async function testTrelloVerificationDirect() {
  console.log('\n🔍 Testing Trello Verification (Direct)')
  console.log('======================================')
  
  try {
    const { handler } = require('./functions/webhooks/trello.js')
    
    const event = createMockEvent('HEAD', null)
    const result = await handler(event, {})
    
    console.log('Status Code:', result.statusCode)
    
    if (result.statusCode === 200) {
      console.log('✅ Trello verification test passed')
      return true
    } else {
      console.log('❌ Trello verification test failed')
      return false
    }
    
  } catch (error) {
    console.log('❌ Trello verification error:', error.message)
    return false
  }
}

// Run all direct tests
async function runDirectTests() {
  console.log('🧪 Running Direct Webhook Tests')
  console.log('================================')
  console.log('Environment:')
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✓' : '❌')
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '❌')
  console.log('')
  
  const results = {
    motion: await testMotionWebhookDirect(),
    trello: await testTrelloWebhookDirect(),
    trelloVerification: await testTrelloVerificationDirect()
  }
  
  console.log('\n📊 Direct Test Results')
  console.log('======================')
  console.log('Motion webhook:', results.motion ? '✅' : '❌')
  console.log('Trello webhook:', results.trello ? '✅' : '❌')
  console.log('Trello verification:', results.trelloVerification ? '✅' : '❌')
  
  const allPassed = Object.values(results).every(result => result)
  
  if (allPassed) {
    console.log('\n🎉 All webhook handlers work correctly!')
  } else {
    console.log('\n⚠️  Some webhook handlers have issues')
  }
  
  return results
}

// Run the tests
runDirectTests().catch(console.error)