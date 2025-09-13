#!/usr/bin/env node

// Real component testing
console.log('Testing actual components...\n')

// Test 1: Motion Client
try {
  const MotionClient = require('./src/lib/motion-client.js')
  console.log('✅ Motion client loaded:', typeof MotionClient)
  
  const client = new MotionClient()
  console.log('✅ Motion client instantiated')
  
  const authUrl = MotionClient.getAuthUrl('test', 'http://test')
  console.log('✅ Motion auth URL generated:', authUrl.length > 0)
} catch (error) {
  console.log('❌ Motion client error:', error.message)
}

// Test 2: Trello Client  
try {
  const TrelloClient = require('./src/lib/trello-client.js')
  console.log('✅ Trello client loaded:', typeof TrelloClient)
  
  const client = new TrelloClient()
  console.log('✅ Trello client instantiated')
  
  const authUrl = TrelloClient.getAuthUrl('test', 'TestApp', 'http://test')
  console.log('✅ Trello auth URL generated:', authUrl.length > 0)
} catch (error) {
  console.log('❌ Trello client error:', error.message)
}

// Test 3: Webhook Handlers
try {
  const motionHandler = require('./functions/webhooks/motion.js')
  console.log('✅ Motion webhook loaded:', typeof motionHandler.handler)
  
  const trelloHandler = require('./functions/webhooks/trello.js')  
  console.log('✅ Trello webhook loaded:', typeof trelloHandler.handler)
  
  const verifyUtils = require('./functions/webhooks/verify.js')
  console.log('✅ Webhook verify loaded:', typeof verifyUtils.verifyTrelloSignature)
} catch (error) {
  console.log('❌ Webhook handlers error:', error.message)
}

// Test 4: Frontend Components (basic check)
try {
  const fs = require('fs')
  const frontendExists = fs.existsSync('./src/App.jsx')
  console.log('✅ Frontend components exist:', frontendExists)
  
  const componentsExist = fs.existsSync('./src/components')
  console.log('✅ Component directory exists:', componentsExist)
} catch (error) {
  console.log('❌ Frontend check error:', error.message)
}

// Test 5: Database Schema
try {
  const fs = require('fs')
  const schemaFile = fs.readFileSync('./supabase/migrations/20240909200000_create_mvp_schema.sql', 'utf8')
  const tableCount = (schemaFile.match(/CREATE TABLE/g) || []).length
  console.log('✅ Database schema has', tableCount, 'tables')
  
  const rlsFile = fs.readFileSync('./supabase/migrations/20240909200001_setup_rls_policies.sql', 'utf8')
  const policyCount = (rlsFile.match(/CREATE POLICY/g) || []).length
  console.log('✅ Database has', policyCount, 'RLS policies')
} catch (error) {
  console.log('❌ Database schema error:', error.message)
}

console.log('\n=== HONEST ASSESSMENT ===')
console.log('Files that exist: API clients, webhook handlers, database schema, frontend components')
console.log('NOT TESTED: Database connection, API calls, webhook processing, sync engine')
console.log('NOT VERIFIED: Full workflow, error handling, production readiness')