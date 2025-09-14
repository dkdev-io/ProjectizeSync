// Motion API Client
class MotionClient {
  constructor(accessToken = null) {
    this.baseUrl = 'https://api.usemotion.com/v1'
    this.accessToken = accessToken
  }

  // Set access token after OAuth
  setAccessToken(token) {
    this.accessToken = token
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.accessToken,
        ...options.headers,
      },
    }

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body)
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(`Motion API Error: ${response.status} - ${error.message || response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Motion API Request Failed:', error)
      throw error
    }
  }

  // Authentication & OAuth
  static getAuthUrl(clientId, redirectUri, state = null) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'tasks:read tasks:write projects:read projects:write workspaces:read',
      ...(state && { state })
    })
    
    return `https://api.usemotion.com/oauth/authorize?${params.toString()}`
  }

  static async exchangeCodeForToken(clientId, clientSecret, code, redirectUri) {
    const response = await fetch('https://api.usemotion.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Token exchange failed: ${error.error_description || response.statusText}`)
    }

    return await response.json()
  }

  // User info
  async getUser() {
    return this.request('/users/me')
  }

  // Workspaces
  async getWorkspaces() {
    return this.request('/workspaces')
  }

  async getWorkspace(workspaceId) {
    return this.request(`/workspaces/${workspaceId}`)
  }

  // Projects
  async getProjects(workspaceId = null) {
    const params = workspaceId ? `?workspaceId=${workspaceId}` : ''
    return this.request(`/projects${params}`)
  }

  async getProject(projectId) {
    return this.request(`/projects/${projectId}`)
  }

  async createProject(projectData) {
    return this.request('/projects', {
      method: 'POST',
      body: projectData
    })
  }

  async updateProject(projectId, updates) {
    return this.request(`/projects/${projectId}`, {
      method: 'PATCH',
      body: updates
    })
  }

  // Tasks
  async getTasks(projectId = null, options = {}) {
    let params = new URLSearchParams()
    
    if (projectId) params.append('projectId', projectId)
    if (options.limit) params.append('limit', options.limit)
    if (options.offset) params.append('offset', options.offset)
    if (options.status) params.append('status', options.status)
    
    const queryString = params.toString()
    return this.request(`/tasks${queryString ? `?${queryString}` : ''}`)
  }

  async getTask(taskId) {
    return this.request(`/tasks/${taskId}`)
  }

  async createTask(taskData) {
    return this.request('/tasks', {
      method: 'POST',
      body: taskData
    })
  }

  async updateTask(taskId, updates) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: updates
    })
  }

  async deleteTask(taskId) {
    return this.request(`/tasks/${taskId}`, {
      method: 'DELETE'
    })
  }

  // Custom Fields
  async getCustomFields(projectId) {
    return this.request(`/projects/${projectId}/custom-fields`)
  }

  // Webhooks
  async createWebhook(webhookData) {
    return this.request('/webhooks', {
      method: 'POST',
      body: webhookData
    })
  }

  async getWebhooks() {
    return this.request('/webhooks')
  }

  async deleteWebhook(webhookId) {
    return this.request(`/webhooks/${webhookId}`, {
      method: 'DELETE'
    })
  }

  // Helper method to test connection
  async testConnection() {
    try {
      const user = await this.getUser()
      return { success: true, user }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

export default MotionClient