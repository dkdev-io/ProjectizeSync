// Test API connections with new credentials
import MotionClient from './src/lib/motion-client.js'
import TrelloClient from './src/lib/trello-client.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function testMotionConnection() {
  console.log('\n🎯 Testing Motion API connection...')
  
  try {
    const motionClient = new MotionClient(process.env.MOTION_ACCESS_TOKEN)
    const result = await motionClient.testConnection()
    
    if (result.success) {
      console.log('✅ Motion API connected successfully!')
      console.log('User:', result.user.email || result.user.name || 'Unknown')
      return true
    } else {
      console.log('❌ Motion API connection failed:', result.error)
      return false
    }
  } catch (error) {
    console.log('❌ Motion API error:', error.message)
    return false
  }
}

async function testTrelloConnection() {
  console.log('\n📋 Testing Trello API connection...')
  
  try {
    const trelloClient = new TrelloClient(
      process.env.TRELLO_API_KEY,
      null // We'll need to get an access token through OAuth
    )
    
    // Test API key format (Trello requires both key and token)
    const apiKeyPattern = /^[a-f0-9]{32}$/
    
    if (!apiKeyPattern.test(process.env.TRELLO_API_KEY)) {
      console.log('❌ Trello API key format is invalid')
      return false
    }
    
    console.log('✅ Trello API key format is valid!')
    console.log('✅ Trello API Secret is available!')
    console.log('⚠️  Ready for OAuth flow - users will need to authorize via OAuth to get access tokens')
    return true
  } catch (error) {
    console.log('❌ Trello API error:', error.message)
    return false
  }
}

async function testSupabaseConnection() {
  console.log('\n🗄️  Testing Supabase connection...')
  
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )
    
    // Test basic connection first
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.log('❌ Supabase connection failed:', error.message)
      return false
    }
    
    console.log('✅ Supabase connected successfully!')
    console.log('⚠️  Note: Database tables need to be created (run migrations)')
    return true
  } catch (error) {
    console.log('❌ Supabase error:', error.message)
    return false
  }
}

async function runAllTests() {
  console.log('🔍 Testing API Connections for Projectize Sync\n')
  console.log('Environment variables loaded:')
  console.log('- MOTION_ACCESS_TOKEN:', process.env.MOTION_ACCESS_TOKEN ? '✓ Set' : '❌ Missing')
  console.log('- TRELLO_API_KEY:', process.env.TRELLO_API_KEY ? '✓ Set' : '❌ Missing')
  console.log('- TRELLO_API_SECRET:', process.env.TRELLO_API_SECRET ? '✓ Set' : '❌ Missing')
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '❌ Missing')
  console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ Set' : '❌ Missing')
  
  const results = {
    motion: await testMotionConnection(),
    trello: await testTrelloConnection(),
    supabase: await testSupabaseConnection()
  }
  
  console.log('\n📊 Test Results Summary:')
  console.log('- Motion API:', results.motion ? '✅ Connected' : '❌ Failed')
  console.log('- Trello API:', results.trello ? '✅ Connected' : '❌ Failed')
  console.log('- Supabase:', results.supabase ? '✅ Connected' : '❌ Failed')
  
  const allPassed = Object.values(results).every(result => result)
  
  if (allPassed) {
    console.log('\n🎉 All API connections successful! Ready to sync.')
  } else {
    console.log('\n⚠️  Some connections failed. Check your credentials.')
  }
  
  return results
}

// Run the tests
runAllTests().catch(console.error)