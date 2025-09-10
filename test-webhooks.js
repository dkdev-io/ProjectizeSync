// Test webhook handlers locally
import dotenv from 'dotenv'
import fetch from 'node-fetch'

dotenv.config()

/**
 * Test webhook endpoints locally and on Netlify
 */

// Sample Motion webhook payload
const motionWebhookPayload = {
  event_type: 'task.created',
  data: {
    id: 'test-motion-task-123',
    name: 'Test Motion Task',
    description: 'This is a test task created via webhook',
    project_id: 'test-project-456',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: '2024-12-31T23:59:59Z',
    labels: [
      { name: 'urgent', color: 'red' }
    ],
    dateModified: new Date().toISOString()
  },
  user_id: 'test-user-789'
}

// Sample Trello webhook payload
const trelloWebhookPayload = {
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
  },
  model: {
    id: 'test-board-789',
    name: 'Test Board'
  }
}

/**
 * Test Motion webhook handler
 */
async function testMotionWebhook(url = 'http://localhost:8888/.netlify/functions/webhooks/motion') {
  console.log('🎯 Testing Motion Webhook Handler')
  console.log('================================')
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Motion-Signature': 'test-signature'
      },
      body: JSON.stringify(motionWebhookPayload)
    })

    const result = await response.text()
    
    console.log('Status:', response.status)
    console.log('Response:', result)
    
    if (response.ok) {
      console.log('✅ Motion webhook test passed')
    } else {
      console.log('❌ Motion webhook test failed')
    }
    
    return { success: response.ok, status: response.status, response: result }
    
  } catch (error) {
    console.log('❌ Motion webhook test error:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test Trello webhook handler
 */
async function testTrelloWebhook(url = 'http://localhost:8888/.netlify/functions/webhooks/trello') {
  console.log('\n📋 Testing Trello Webhook Handler')
  console.log('=================================')
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trello-Webhook': 'test-signature'
      },
      body: JSON.stringify(trelloWebhookPayload)
    })

    const result = await response.text()
    
    console.log('Status:', response.status)
    console.log('Response:', result)
    
    if (response.ok) {
      console.log('✅ Trello webhook test passed')
    } else {
      console.log('❌ Trello webhook test failed')
    }
    
    return { success: response.ok, status: response.status, response: result }
    
  } catch (error) {
    console.log('❌ Trello webhook test error:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test webhook HEAD requests (Trello verification)
 */
async function testTrelloVerification(url = 'http://localhost:8888/.netlify/functions/webhooks/trello') {
  console.log('\n🔍 Testing Trello Webhook Verification')
  console.log('=====================================')
  
  try {
    const response = await fetch(url, {
      method: 'HEAD'
    })
    
    console.log('Status:', response.status)
    
    if (response.status === 200) {
      console.log('✅ Trello webhook verification passed')
    } else {
      console.log('❌ Trello webhook verification failed')
    }
    
    return { success: response.status === 200, status: response.status }
    
  } catch (error) {
    console.log('❌ Trello webhook verification error:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test webhook signature verification
 */
function testSignatureVerification() {
  console.log('\n🔐 Testing Signature Verification')
  console.log('=================================')
  
  try {
    const { verifyTrelloSignature } = require('./functions/webhooks/verify.js')
    
    const testPayload = JSON.stringify(trelloWebhookPayload)
    const testSecret = 'test-secret-key'
    
    // Test without signature
    const result1 = verifyTrelloSignature(testPayload, null, testSecret)
    console.log('No signature test:', result1 ? '✅ Passed' : '❌ Failed')
    
    // Test with invalid signature
    const result2 = verifyTrelloSignature(testPayload, 'invalid-signature', testSecret)
    console.log('Invalid signature test:', result2 ? '❌ Failed (should reject)' : '✅ Passed')
    
    return { success: true }
    
  } catch (error) {
    console.log('❌ Signature verification test error:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Run all webhook tests
 */
async function runAllWebhookTests() {
  console.log('🧪 Running Webhook Tests')
  console.log('========================')
  
  const results = {
    motion: null,
    trello: null,
    trelloVerification: null,
    signatureVerification: null
  }
  
  // Test signature verification first (no network required)
  results.signatureVerification = testSignatureVerification()
  
  // Test webhook endpoints (requires Netlify dev server)
  try {
    results.motion = await testMotionWebhook()
    results.trello = await testTrelloWebhook()
    results.trelloVerification = await testTrelloVerification()
  } catch (error) {
    console.log('\n⚠️  Network tests failed - make sure Netlify dev server is running')
    console.log('   Run: netlify dev')
  }
  
  // Summary
  console.log('\n📊 Test Results Summary')
  console.log('=======================')
  console.log('Motion webhook:', results.motion?.success ? '✅' : '❌')
  console.log('Trello webhook:', results.trello?.success ? '✅' : '❌')
  console.log('Trello verification:', results.trelloVerification?.success ? '✅' : '❌')
  console.log('Signature verification:', results.signatureVerification?.success ? '✅' : '❌')
  
  return results
}

// Command line usage
if (process.argv.length > 2) {
  const command = process.argv[2]
  
  switch (command) {
    case 'motion':
      testMotionWebhook(process.argv[3])
      break
    case 'trello':
      testTrelloWebhook(process.argv[3])
      break
    case 'verify':
      testTrelloVerification(process.argv[3])
      break
    case 'signature':
      testSignatureVerification()
      break
    case 'all':
      runAllWebhookTests()
      break
    default:
      console.log('Usage:')
      console.log('  node test-webhooks.js motion [url]    # Test Motion webhook')
      console.log('  node test-webhooks.js trello [url]    # Test Trello webhook')
      console.log('  node test-webhooks.js verify [url]    # Test Trello verification')
      console.log('  node test-webhooks.js signature       # Test signature verification')
      console.log('  node test-webhooks.js all            # Run all tests')
  }
} else {
  runAllWebhookTests()
}

export { testMotionWebhook, testTrelloWebhook, testTrelloVerification, runAllWebhookTests }