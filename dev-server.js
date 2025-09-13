#!/usr/bin/env node

/**
 * Development Server for ProjectizeSync
 * Runs API clients and webhook handlers locally for testing
 */

const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.raw({ type: 'application/json', limit: '10mb' }))

// Initialize Supabase client (will work with remote or local)
let supabase
try {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  console.log('✅ Supabase client initialized')
} catch (error) {
  console.warn('⚠️ Supabase client failed to initialize:', error.message)
}

// Import API clients
let MotionClient, TrelloClient
try {
  MotionClient = require('./src/lib/motion-client.js').default || require('./src/lib/motion-client.js')
  TrelloClient = require('./src/lib/trello-client.js').default || require('./src/lib/trello-client.js')
  console.log('✅ API clients loaded')
} catch (error) {
  console.warn('⚠️ API clients failed to load:', error.message)
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      supabase: supabase ? 'connected' : 'disconnected',
      motion: MotionClient ? 'loaded' : 'failed',
      trello: TrelloClient ? 'loaded' : 'failed'
    }
  })
})

// Test endpoints for API clients
app.get('/test/motion', async (req, res) => {
  try {
    if (!MotionClient) {
      return res.status(500).json({ error: 'MotionClient not available' })
    }

    const authUrl = MotionClient.getAuthUrl(
      process.env.MOTION_CLIENT_ID || 'test-client-id',
      `${process.env.APP_URL}/auth/motion/callback`
    )

    res.json({
      message: 'Motion client is working',
      authUrl,
      configured: !!(process.env.MOTION_CLIENT_ID && process.env.MOTION_CLIENT_SECRET)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/test/trello', async (req, res) => {
  try {
    if (!TrelloClient) {
      return res.status(500).json({ error: 'TrelloClient not available' })
    }

    const authUrl = TrelloClient.getAuthUrl(
      process.env.TRELLO_API_KEY || 'test-api-key',
      'ProjectizeSync',
      `${process.env.APP_URL}/auth/trello/callback`
    )

    res.json({
      message: 'Trello client is working',
      authUrl,
      configured: !!(process.env.TRELLO_API_KEY && process.env.TRELLO_API_SECRET)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Test Supabase connection
app.get('/test/supabase', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not available' })
    }

    // Simple query to test connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })

    if (error) {
      throw error
    }

    res.json({
      message: 'Supabase connection successful',
      profileCount: data?.length || 0,
      url: process.env.SUPABASE_URL
    })
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      details: 'Make sure Supabase is running and accessible'
    })
  }
})

// Webhook test endpoints (for development)
app.post('/webhooks/motion', async (req, res) => {
  try {
    console.log('📥 Motion webhook test received:', req.body)
    
    // Import and call the actual webhook handler
    const motionHandler = require('./functions/webhooks/motion.js')
    
    // Create a mock Netlify event object
    const mockEvent = {
      httpMethod: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.body)
    }

    const result = await motionHandler.handler(mockEvent, {})
    
    res.status(result.statusCode).json(JSON.parse(result.body))
  } catch (error) {
    console.error('Motion webhook error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/webhooks/trello', async (req, res) => {
  try {
    console.log('📥 Trello webhook test received:', req.body)
    
    // Import and call the actual webhook handler
    const trelloHandler = require('./functions/webhooks/trello.js')
    
    // Create a mock Netlify event object
    const mockEvent = {
      httpMethod: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.body)
    }

    const result = await trelloHandler.handler(mockEvent, {})
    
    res.status(result.statusCode).json(JSON.parse(result.body))
  } catch (error) {
    console.error('Trello webhook error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Mock data endpoints for frontend testing
app.get('/api/projects', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .limit(10)

      if (error) throw error

      res.json(data)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    // Return mock data
    res.json([
      {
        id: 'mock-1',
        name: 'Sample Project',
        motion_project_id: 'motion-123',
        trello_board_id: 'trello-456',
        sync_enabled: true,
        created_at: new Date().toISOString()
      }
    ])
  }
})

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error)
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ProjectizeSync Development Server')
  console.log('=' .repeat(40))
  console.log(`🌐 Server running at: http://localhost:${PORT}`)
  console.log(`🏥 Health check: http://localhost:${PORT}/health`)
  console.log(`🔧 Motion test: http://localhost:${PORT}/test/motion`)
  console.log(`🔧 Trello test: http://localhost:${PORT}/test/trello`)
  console.log(`🔧 Supabase test: http://localhost:${PORT}/test/supabase`)
  console.log('=' .repeat(40))
  
  if (!process.env.MOTION_CLIENT_ID || !process.env.TRELLO_API_KEY) {
    console.log('\n⚠️ API credentials not configured:')
    if (!process.env.MOTION_CLIENT_ID) console.log('   - Motion API credentials missing')
    if (!process.env.TRELLO_API_KEY) console.log('   - Trello API credentials missing')
    console.log('   Set them in your .env file when ready to test with real APIs')
  }
  
  console.log('\n✨ Ready for development!')
})