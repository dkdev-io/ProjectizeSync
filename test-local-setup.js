#!/usr/bin/env node

/**
 * Local Development Setup Test
 * Tests basic functionality without requiring API credentials
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Test configurations
const TEST_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
}

console.log('🚀 ProjectizeSync - Local Setup Test')
console.log('=' .repeat(50))

async function testEnvironmentVariables() {
  console.log('\n📋 Testing Environment Variables...')
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'APP_URL'
  ]
  
  const missing = requiredVars.filter(varName => !process.env[varName])
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '))
    return false
  }
  
  console.log('✅ All required environment variables are set')
  return true
}

async function testSupabaseConnection() {
  console.log('\n🔗 Testing Supabase Connection...')
  
  try {
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey)
    
    // Test basic connection with a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message)
      return false
    }
    
    console.log('✅ Supabase connection successful')
    return true
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message)
    return false
  }
}

async function testDatabaseSchema() {
  console.log('\n🗄️  Testing Database Schema...')
  
  try {
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.serviceKey)
    
    // Test each table exists
    const tables = ['profiles', 'projects', 'project_members', 'task_syncs', 'user_integrations', 'sync_logs']
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.error(`❌ Table '${table}' not accessible:`, error.message)
        return false
      }
    }
    
    console.log('✅ All database tables are accessible')
    return true
  } catch (error) {
    console.error('❌ Database schema test failed:', error.message)
    return false
  }
}

async function testAPIClients() {
  console.log('\n🔌 Testing API Client Classes...')
  
  try {
    // Test importing API clients (without making actual API calls)
    const MotionClient = require('./src/lib/motion-client.js').default || require('./src/lib/motion-client.js')
    const TrelloClient = require('./src/lib/trello-client.js').default || require('./src/lib/trello-client.js')
    
    // Test basic instantiation
    const motionClient = new MotionClient()
    const trelloClient = new TrelloClient()
    
    // Test static methods exist
    if (typeof MotionClient.getAuthUrl !== 'function') {
      throw new Error('MotionClient.getAuthUrl method not found')
    }
    
    if (typeof TrelloClient.getAuthUrl !== 'function') {
      throw new Error('TrelloClient.getAuthUrl method not found')
    }
    
    console.log('✅ API client classes loaded successfully')
    return true
  } catch (error) {
    console.error('❌ API client test failed:', error.message)
    return false
  }
}

async function testWebhookHandlers() {
  console.log('\n🎣 Testing Webhook Handler Files...')
  
  try {
    const fs = require('fs')
    const path = require('path')
    
    const webhookFiles = [
      './functions/webhooks/motion.js',
      './functions/webhooks/trello.js',
      './functions/webhooks/verify.js'
    ]
    
    for (const file of webhookFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Webhook file not found: ${file}`)
      }
      
      // Test file can be required (basic syntax check)
      const handler = require(path.resolve(file))
      
      // Special case for verify.js which exports utility functions, not a handler
      if (file.includes('verify.js')) {
        if (typeof handler.verifyMotionSignature !== 'function') {
          throw new Error(`Invalid verify utility in ${file}`)
        }
      } else {
        if (typeof handler.handler !== 'function') {
          throw new Error(`Invalid webhook handler in ${file}`)
        }
      }
    }
    
    console.log('✅ All webhook handlers are valid')
    return true
  } catch (error) {
    console.error('❌ Webhook handler test failed:', error.message)
    return false
  }
}

async function runAllTests() {
  console.log('Starting comprehensive local setup tests...\n')
  
  const tests = [
    testEnvironmentVariables,
    testSupabaseConnection, 
    testDatabaseSchema,
    testAPIClients,
    testWebhookHandlers
  ]
  
  let passed = 0
  let failed = 0
  
  for (const test of tests) {
    try {
      const result = await test()
      if (result) {
        passed++
      } else {
        failed++
      }
    } catch (error) {
      console.error(`❌ Test failed with error: ${error.message}`)
      failed++
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Local setup is ready for development.')
    console.log('\nNext steps:')
    console.log('1. Get Motion API credentials from user')
    console.log('2. Get Trello API credentials from user') 
    console.log('3. Start development server: npm run dev')
    console.log('4. Test actual API connections')
  } else {
    console.log('⚠️  Some tests failed. Please fix the issues above before continuing.')
    process.exit(1)
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Critical test error:', error)
  process.exit(1)
})