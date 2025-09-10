import { supabase } from './supabase'
import MotionClient from './motion-client'
import TrelloClient from './trello-client'

class IntegrationManager {
  constructor(userId) {
    this.userId = userId
    this.motionClient = null
    this.trelloClient = null
  }

  // Initialize clients with stored credentials
  async initialize() {
    const integrations = await this.getUserIntegrations()
    
    for (const integration of integrations) {
      if (integration.platform === 'motion' && integration.is_active) {
        this.motionClient = new MotionClient(integration.access_token)
      } else if (integration.platform === 'trello' && integration.is_active) {
        this.trelloClient = new TrelloClient(
          process.env.TRELLO_API_KEY, 
          integration.access_token
        )
      }
    }

    return {
      motion: !!this.motionClient,
      trello: !!this.trelloClient
    }
  }

  // Get user integrations from database
  async getUserIntegrations() {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', this.userId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching integrations:', error)
      return []
    }

    return data || []
  }

  // Save integration credentials
  async saveIntegration(platform, credentials) {
    const integrationData = {
      user_id: this.userId,
      platform: platform,
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || null,
      token_expires_at: credentials.expires_at || null,
      is_active: true,
      last_sync: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('user_integrations')
      .upsert(integrationData)
      .select()

    if (error) {
      console.error('Error saving integration:', error)
      throw error
    }

    // Reinitialize client with new credentials
    if (platform === 'motion') {
      this.motionClient = new MotionClient(credentials.access_token)
    } else if (platform === 'trello') {
      this.trelloClient = new TrelloClient(
        process.env.TRELLO_API_KEY, 
        credentials.access_token
      )
    }

    return data[0]
  }

  // Test connections for both platforms
  async testConnections() {
    const results = {
      motion: { connected: false, error: null, user: null },
      trello: { connected: false, error: null, user: null }
    }

    // Test Motion connection
    if (this.motionClient) {
      try {
        const motionResult = await this.motionClient.testConnection()
        results.motion = {
          connected: motionResult.success,
          error: motionResult.error || null,
          user: motionResult.user || null
        }
      } catch (error) {
        results.motion = {
          connected: false,
          error: error.message,
          user: null
        }
      }
    }

    // Test Trello connection
    if (this.trelloClient) {
      try {
        const trelloResult = await this.trelloClient.testConnection()
        results.trello = {
          connected: trelloResult.success,
          error: trelloResult.error || null,
          user: trelloResult.user || null
        }
      } catch (error) {
        results.trello = {
          connected: false,
          error: error.message,
          user: null
        }
      }
    }

    return results
  }

  // Get Motion workspaces and projects
  async getMotionData() {
    if (!this.motionClient) {
      throw new Error('Motion client not initialized')
    }

    try {
      const [workspaces, projects] = await Promise.all([
        this.motionClient.getWorkspaces(),
        this.motionClient.getProjects()
      ])

      return {
        workspaces: workspaces || [],
        projects: projects || []
      }
    } catch (error) {
      console.error('Error fetching Motion data:', error)
      throw error
    }
  }

  // Get Trello organizations and boards
  async getTrelloData() {
    if (!this.trelloClient) {
      throw new Error('Trello client not initialized')
    }

    try {
      const [organizations, boards] = await Promise.all([
        this.trelloClient.getOrganizations(),
        this.trelloClient.getBoards()
      ])

      return {
        organizations: organizations || [],
        boards: boards || []
      }
    } catch (error) {
      console.error('Error fetching Trello data:', error)
      throw error
    }
  }

  // Disconnect an integration
  async disconnectIntegration(platform) {
    const { error } = await supabase
      .from('user_integrations')
      .update({ is_active: false })
      .eq('user_id', this.userId)
      .eq('platform', platform)

    if (error) {
      console.error('Error disconnecting integration:', error)
      throw error
    }

    // Clear the client
    if (platform === 'motion') {
      this.motionClient = null
    } else if (platform === 'trello') {
      this.trelloClient = null
    }

    return true
  }

  // Start OAuth flow for a platform
  startOAuthFlow(platform, redirectUri = null) {
    const baseUrl = redirectUri || `${window.location.origin}/api/auth/${platform}/callback`
    
    if (platform === 'motion') {
      if (!process.env.MOTION_CLIENT_ID) {
        throw new Error('Motion Client ID not configured')
      }
      
      const authUrl = MotionClient.getAuthUrl(
        process.env.MOTION_CLIENT_ID,
        baseUrl,
        btoa(JSON.stringify({ userId: this.userId }))
      )
      
      return this.openAuthWindow(authUrl, 'motion')
    } 
    else if (platform === 'trello') {
      if (!process.env.TRELLO_API_KEY) {
        throw new Error('Trello API Key not configured')
      }
      
      const authUrl = TrelloClient.getAuthUrl(
        process.env.TRELLO_API_KEY,
        'ProjectizeSync',
        baseUrl
      )
      
      return this.openAuthWindow(authUrl, 'trello')
    }
    else {
      throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  // Open OAuth popup window
  openAuthWindow(url, platform) {
    return new Promise((resolve, reject) => {
      const popup = window.open(
        url,
        `${platform}_auth`,
        'width=600,height=700,scrollbars=yes,resizable=yes'
      )

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          reject(new Error('Authentication window was closed'))
        }
      }, 1000)

      // Listen for messages from popup
      const messageHandler = (event) => {
        if (event.data?.type === `${platform.toUpperCase()}_AUTH_SUCCESS`) {
          clearInterval(checkClosed)
          window.removeEventListener('message', messageHandler)
          popup.close()
          resolve(event.data.data)
        }
      }

      window.addEventListener('message', messageHandler)

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkClosed)
        window.removeEventListener('message', messageHandler)
        if (!popup.closed) {
          popup.close()
        }
        reject(new Error('Authentication timed out'))
      }, 300000)
    })
  }

  // Get connection status summary
  getConnectionStatus() {
    return {
      motion: {
        connected: !!this.motionClient,
        platform: 'Motion'
      },
      trello: {
        connected: !!this.trelloClient,
        platform: 'Trello'
      }
    }
  }
}

export default IntegrationManager