// Trello API Client
class TrelloClient {
  constructor(apiKey = null, accessToken = null) {
    this.baseUrl = 'https://api.trello.com/1'
    this.apiKey = apiKey
    this.accessToken = accessToken
  }

  // Set credentials after OAuth
  setCredentials(apiKey, accessToken) {
    this.apiKey = apiKey
    this.accessToken = accessToken
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    
    // Add API key and token to all requests
    if (this.apiKey) url.searchParams.append('key', this.apiKey)
    if (this.accessToken) url.searchParams.append('token', this.accessToken)
    
    // Add any additional query parameters
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const config = {
      method: 'GET',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body)
    }

    try {
      const response = await fetch(url.toString(), config)
      
      if (!response.ok) {
        const error = await response.text().catch(() => '')
        throw new Error(`Trello API Error: ${response.status} - ${error || response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Trello API Request Failed:', error)
      throw error
    }
  }

  // Authentication & OAuth
  static getAuthUrl(apiKey, appName, redirectUri, scope = 'read,write') {
    const params = new URLSearchParams({
      key: apiKey,
      name: appName,
      scope: scope,
      response_type: 'token',
      return_url: redirectUri,
      expiration: 'never'
    })
    
    return `https://trello.com/1/authorize?${params.toString()}`
  }

  // User/Member info
  async getMe() {
    return this.request('/members/me')
  }

  async getMember(memberId) {
    return this.request(`/members/${memberId}`)
  }

  // Organizations/Teams
  async getOrganizations() {
    return this.request('/members/me/organizations')
  }

  async getOrganization(orgId) {
    return this.request(`/organizations/${orgId}`)
  }

  async getOrganizationBoards(orgId) {
    return this.request(`/organizations/${orgId}/boards`)
  }

  // Boards
  async getBoards() {
    return this.request('/members/me/boards')
  }

  async getBoard(boardId) {
    return this.request(`/boards/${boardId}`)
  }

  async createBoard(boardData) {
    return this.request('/boards', {
      method: 'POST',
      body: boardData
    })
  }

  async updateBoard(boardId, updates) {
    return this.request(`/boards/${boardId}`, {
      method: 'PUT',
      body: updates
    })
  }

  // Lists
  async getBoardLists(boardId) {
    return this.request(`/boards/${boardId}/lists`)
  }

  async getList(listId) {
    return this.request(`/lists/${listId}`)
  }

  async createList(listData) {
    return this.request('/lists', {
      method: 'POST',
      body: listData
    })
  }

  async updateList(listId, updates) {
    return this.request(`/lists/${listId}`, {
      method: 'PUT',
      body: updates
    })
  }

  // Cards
  async getBoardCards(boardId) {
    return this.request(`/boards/${boardId}/cards`)
  }

  async getListCards(listId) {
    return this.request(`/lists/${listId}/cards`)
  }

  async getCard(cardId) {
    return this.request(`/cards/${cardId}`)
  }

  async createCard(cardData) {
    return this.request('/cards', {
      method: 'POST',
      body: cardData
    })
  }

  async updateCard(cardId, updates) {
    return this.request(`/cards/${cardId}`, {
      method: 'PUT',
      body: updates
    })
  }

  async deleteCard(cardId) {
    return this.request(`/cards/${cardId}`, {
      method: 'DELETE'
    })
  }

  // Custom Fields
  async getBoardCustomFields(boardId) {
    return this.request(`/boards/${boardId}/customFields`)
  }

  async getCardCustomFields(cardId) {
    return this.request(`/cards/${cardId}/customFieldItems`)
  }

  async updateCardCustomField(cardId, customFieldId, value) {
    return this.request(`/cards/${cardId}/customField/${customFieldId}/item`, {
      method: 'PUT',
      body: { value }
    })
  }

  // Labels
  async getBoardLabels(boardId) {
    return this.request(`/boards/${boardId}/labels`)
  }

  async addLabelToCard(cardId, labelId) {
    return this.request(`/cards/${cardId}/idLabels`, {
      method: 'POST',
      body: { value: labelId }
    })
  }

  // Members
  async getBoardMembers(boardId) {
    return this.request(`/boards/${boardId}/members`)
  }

  async addMemberToCard(cardId, memberId) {
    return this.request(`/cards/${cardId}/idMembers`, {
      method: 'POST',
      body: { value: memberId }
    })
  }

  // Webhooks
  async createWebhook(webhookData) {
    return this.request('/webhooks', {
      method: 'POST',
      body: webhookData
    })
  }

  async getWebhooks() {
    return this.request('/members/me/webhooks')
  }

  async deleteWebhook(webhookId) {
    return this.request(`/webhooks/${webhookId}`, {
      method: 'DELETE'
    })
  }

  // Actions (for webhook processing)
  async getAction(actionId) {
    return this.request(`/actions/${actionId}`)
  }

  // Helper method to test connection
  async testConnection() {
    try {
      const user = await this.getMe()
      return { success: true, user }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Helper method to find board by name
  async findBoardByName(name) {
    const boards = await this.getBoards()
    return boards.find(board => board.name.toLowerCase() === name.toLowerCase())
  }

  // Helper method to find list by name in board
  async findListByName(boardId, name) {
    const lists = await this.getBoardLists(boardId)
    return lists.find(list => list.name.toLowerCase() === name.toLowerCase())
  }
}

module.exports = TrelloClient