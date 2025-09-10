// Verify production deployment
const { fetch } = require('node-fetch')

async function verifyProductionWebhooks() {
  console.log('🔍 Verifying Production Deployment')
  console.log('===================================')
  
  const baseUrl = 'https://projectize-sync.netlify.app'
  
  const tests = [
    {
      name: 'Frontend',
      url: `${baseUrl}`,
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'Motion Webhook (HEAD)',
      url: `${baseUrl}/.netlify/functions/webhooks/motion`,
      method: 'HEAD',
      expectedStatus: 405 // Should reject HEAD for Motion
    },
    {
      name: 'Trello Webhook (HEAD)',
      url: `${baseUrl}/.netlify/functions/webhooks/trello`,
      method: 'HEAD',
      expectedStatus: 200 // Should accept HEAD for Trello verification
    },
    {
      name: 'Health Check',
      url: `${baseUrl}/.netlify/functions/health/status`,
      method: 'GET',
      expectedStatus: 200
    }
  ]
  
  const results = []
  
  for (const test of tests) {
    console.log(`\n🧪 Testing ${test.name}...`)
    
    try {
      const response = await fetch(test.url, {
        method: test.method,
        timeout: 10000
      })
      
      const success = response.status === test.expectedStatus
      
      console.log(`   Status: ${response.status} (expected: ${test.expectedStatus})`)
      console.log(`   Result: ${success ? '✅ PASS' : '❌ FAIL'}`)
      
      results.push({
        name: test.name,
        success,
        status: response.status,
        expected: test.expectedStatus
      })
      
    } catch (error) {
      console.log(`   Error: ${error.message}`)
      console.log(`   Result: ❌ FAIL`)
      
      results.push({
        name: test.name,
        success: false,
        error: error.message
      })
    }
  }
  
  console.log('\n📊 Production Deployment Results')
  console.log('=================================')
  
  let allPassed = true
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.name}`)
    if (!result.success) allPassed = false
  })
  
  console.log('\n' + (allPassed ? '🎉 All production tests passed!' : '⚠️  Some production tests failed'))
  
  return results
}

async function testProductionWebhookPost() {
  console.log('\n🎯 Testing Production Webhook POST')
  console.log('===================================')
  
  const testPayload = {
    action: {
      type: 'createCard',
      data: {
        card: {
          id: 'prod-test-card-123',
          name: 'Production Test Card',
          desc: 'Testing production webhook',
          due: null,
          idList: 'test-list',
          labels: [],
          dateLastActivity: new Date().toISOString()
        },
        board: {
          id: 'test-board-prod',
          name: 'Test Board'
        }
      },
      memberCreator: {
        id: 'test-member',
        username: 'testuser'
      }
    }
  }
  
  try {
    const response = await fetch('https://projectize-sync.netlify.app/.netlify/functions/webhooks/trello', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload),
      timeout: 15000
    })
    
    const result = await response.text()
    
    console.log('Status:', response.status)
    console.log('Response:', result)
    
    if (response.status === 200) {
      console.log('✅ Production webhook POST test passed')
      return true
    } else {
      console.log('❌ Production webhook POST test failed')
      return false
    }
    
  } catch (error) {
    console.log('❌ Production webhook POST error:', error.message)
    return false
  }
}

// Run verification
async function runFullVerification() {
  await verifyProductionWebhooks()
  await testProductionWebhookPost()
}

if (require.main === module) {
  runFullVerification().catch(console.error)
}

module.exports = { verifyProductionWebhooks, testProductionWebhookPost }