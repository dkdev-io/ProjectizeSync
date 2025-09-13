const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const { verifyTrelloSignature } = require('./verify.js')

// Temporary simple implementations until we can fix module imports
class TaskMapper {
  generateCustomKey(motionId = null, trelloId = null) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    
    if (motionId && trelloId) {
      return `sync_${motionId}_${trelloId}_${timestamp}`
    } else if (motionId) {
      return `motion_${motionId}_${timestamp}_${random}`
    } else if (trelloId) {
      return `trello_${trelloId}_${timestamp}_${random}`
    } else {
      return `manual_${timestamp}_${random}`
    }
  }

  trelloToMotion(trelloCard) {
    return {
      name: trelloCard.name,
      description: trelloCard.desc || '',
      dueDate: trelloCard.due ? new Date(trelloCard.due).toISOString() : null,
      priority: this._mapTrelloPriorityToMotion(trelloCard.labels || [])
    }
  }

  _mapTrelloPriorityToMotion(trelloLabels) {
    const priorityLabel = trelloLabels.find(label => 
      ['urgent', 'high', 'medium', 'low'].includes(label.name?.toLowerCase())
    )
    
    if (priorityLabel) {
      const priorityMap = {
        'urgent': 'URGENT',
        'high': 'HIGH', 
        'medium': 'MEDIUM',
        'low': 'LOW'
      }
      return priorityMap[priorityLabel.name.toLowerCase()] || 'MEDIUM'
    }
    
    return 'MEDIUM'
  }
}

class SyncQueueManager {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async addToQueue(action) {
    try {
      const queueItem = {
        task_mapping_id: action.taskMappingId,
        action_type: action.type,
        payload: action.payload,
        status: 'pending',
        retry_count: 0,
        max_retries: action.maxRetries || 3,
        scheduled_for: action.scheduleFor || new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('sync_queue')
        .insert(queueItem)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to add to queue: ${error.message}`)
      }

      console.log(`Added ${action.type} action to sync queue:`, data.id)
      return data
    } catch (error) {
      console.error('Error adding to sync queue:', error)
      throw error
    }
  }
}

// Initialize Supabase client (with fallback for development)
let supabase = null
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
} else {
  console.warn('⚠️ Supabase credentials not found - webhook will run in test mode')
}

// Initialize sync components
const taskMapper = new TaskMapper()
const syncQueueManager = process.env.SUPABASE_URL ? new SyncQueueManager(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
) : null

// Helper function to check if we're in test mode
function isTestMode() {
  return !supabase || !syncQueueManager || process.env.SUPABASE_URL === 'http://127.0.0.1:54321'
}

/**
 * Trello Webhook Handler
 * Processes webhook events from Trello API
 */
exports.handler = async (event, context) => {
  console.log('Trello webhook received:', {
    method: event.httpMethod,
    headers: event.headers,
    body: event.body?.substring(0, 500) // Log first 500 chars
  })

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Trello-Webhook',
        'Access-Control-Allow-Methods': 'POST, HEAD, OPTIONS'
      }
    }
  }

  // Handle HEAD requests (Trello webhook verification)
  if (event.httpMethod === 'HEAD') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    }
  }

  // Only accept POST requests for webhook events
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify webhook signature (skip in test mode)
    if (process.env.TRELLO_WEBHOOK_SECRET && !isTestMode()) {
      const signature = event.headers['x-trello-webhook'] || event.headers['X-Trello-Webhook']
      if (!verifyTrelloSignature(event.body, signature, process.env.TRELLO_WEBHOOK_SECRET)) {
        console.error('Invalid Trello webhook signature')
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid signature' })
        }
      }
    }

    // Parse webhook payload
    let payload
    try {
      payload = JSON.parse(event.body)
    } catch (error) {
      console.error('Failed to parse webhook payload:', error)
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON payload' })
      }
    }

    console.log('Processing Trello webhook:', payload.action?.type, payload.action?.data?.card?.id)

    // Process webhook based on action type
    const result = await processTrelloWebhook(payload)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        result: result
      })
    }

  } catch (error) {
    console.error('Trello webhook error:', error)
    
    // Log error to sync_logs table
    await logWebhookError('trello', error.message, event.body)

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    }
  }
}

/**
 * Process Trello webhook based on action type
 */
async function processTrelloWebhook(payload) {
  const { action, model } = payload

  if (!action) {
    throw new Error('No action found in webhook payload')
  }

  const { type, data, memberCreator } = action

  switch (type) {
    case 'createCard':
      return await handleCardCreated(data.card, data.board, memberCreator)
    
    case 'updateCard':
      return await handleCardUpdated(data.card, data.board, data.old, memberCreator)
    
    case 'deleteCard':
      return await handleCardDeleted(data.card, data.board, memberCreator)
    
    case 'moveCardFromBoard':
    case 'moveCardToBoard':
      return await handleCardMoved(data.card, data.board, data.boardSource, data.boardTarget, memberCreator)
    
    case 'commentCard':
      return await handleCardComment(data.card, data.text, memberCreator)
    
    case 'addAttachmentToCard':
    case 'deleteAttachmentFromCard':
      return await handleCardAttachment(data.card, data.attachment, type, memberCreator)
    
    default:
      console.log(`Unhandled Trello action type: ${type}`)
      return { message: `Action type ${type} not handled` }
  }
}

/**
 * Handle Trello card created event
 */
async function handleCardCreated(cardData, boardData, member) {
  console.log('Processing Trello card created:', cardData.id)

  if (isTestMode()) {
    console.log('⚠️ Test mode: Trello card created event simulated')
    return { message: 'Test mode - card created event received', cardId: cardData.id }
  }

  try {
    // Find if this card belongs to a synced project
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('trello_board_id', boardData.id)
      .eq('sync_enabled', true)

    if (error) {
      throw new Error(`Failed to find synced project: ${error.message}`)
    }

    if (!projects || projects.length === 0) {
      console.log(`No synced project found for Trello board ${boardData.id}`)
      return { message: 'Board not synced' }
    }

    const project = projects[0]

    // Check if this card already has a mapping (avoid duplicates)
    const { data: existingMapping } = await supabase
      .from('task_syncs')
      .select('id')
      .eq('trello_card_id', cardData.id)
      .single()

    if (existingMapping) {
      console.log(`Card ${cardData.id} already has a mapping`)
      return { message: 'Card already synced' }
    }

    // Create task mapping record
    const { data: taskMapping, error: mappingError } = await supabase
      .from('task_syncs')
      .insert({
        project_id: project.id,
        trello_card_id: cardData.id,
        sync_status: 'active',
        last_trello_update: new Date().toISOString(),
        sync_direction: 'bidirectional'
      })
      .select()
      .single()

    if (mappingError) {
      throw new Error(`Failed to create task mapping: ${mappingError.message}`)
    }

    // Convert Trello card to Motion format
    const motionTaskData = taskMapper.trelloToMotion(cardData)

    // Add to sync queue for Motion creation
    await syncQueueManager.addToQueue({
      taskMappingId: taskMapping.id,
      type: 'create',
      payload: {
        platform: 'trello',
        targetPlatform: 'motion',
        taskData: motionTaskData,
        trelloCardId: cardData.id,
        projectId: project.id,
        motionProjectId: project.motion_project_id
      }
    })

    console.log(`Queued Motion task creation for Trello card ${cardData.id}`)

    return {
      message: 'Card creation queued for sync',
      taskMappingId: taskMapping.id,
      trelloCardId: cardData.id
    }

  } catch (error) {
    console.error('Error handling Trello card created:', error)
    throw error
  }
}

/**
 * Handle Trello card updated event
 */
async function handleCardUpdated(cardData, boardData, oldData, member) {
  console.log('Processing Trello card updated:', cardData.id)

  if (isTestMode()) {
    console.log('⚠️ Test mode: Trello card updated event simulated')
    return { message: 'Test mode - card updated event received', cardId: cardData.id }
  }

  try {
    // Find existing task mapping
    const { data: taskMappings, error } = await supabase
      .from('task_syncs')
      .select('*, projects(*)')
      .eq('trello_card_id', cardData.id)
      .eq('sync_status', 'active')

    if (error) {
      throw new Error(`Failed to find task mapping: ${error.message}`)
    }

    if (!taskMappings || taskMappings.length === 0) {
      console.log(`No active sync found for Trello card ${cardData.id}`)
      return { message: 'Card not synced' }
    }

    const taskMapping = taskMappings[0]

    // Update last Trello update timestamp
    await supabase
      .from('task_syncs')
      .update({ last_trello_update: new Date().toISOString() })
      .eq('id', taskMapping.id)

    // Convert Trello card to Motion format
    const motionTaskData = taskMapper.trelloToMotion(cardData)

    // Determine what changed for more efficient syncing
    const changes = determineCardChanges(cardData, oldData)

    // Add to sync queue for Motion update
    await syncQueueManager.addToQueue({
      taskMappingId: taskMapping.id,
      type: 'update',
      payload: {
        platform: 'trello',
        targetPlatform: 'motion',
        taskId: taskMapping.motion_task_id,
        updates: motionTaskData,
        changes: changes,
        trelloCardId: cardData.id,
        projectId: taskMapping.project_id
      }
    })

    console.log(`Queued Motion task update for Trello card ${cardData.id}`)

    return {
      message: 'Card update queued for sync',
      taskMappingId: taskMapping.id,
      trelloCardId: cardData.id,
      motionTaskId: taskMapping.motion_task_id,
      changes: changes
    }

  } catch (error) {
    console.error('Error handling Trello card updated:', error)
    throw error
  }
}

/**
 * Handle Trello card deleted event
 */
async function handleCardDeleted(cardData, boardData, member) {
  console.log('Processing Trello card deleted:', cardData.id)

  if (isTestMode()) {
    console.log('⚠️ Test mode: Trello card deleted event simulated')
    return { message: 'Test mode - card deleted event received', cardId: cardData.id }
  }

  try {
    // Find existing task mapping
    const { data: taskMappings, error } = await supabase
      .from('task_syncs')
      .select('*')
      .eq('trello_card_id', cardData.id)

    if (error) {
      throw new Error(`Failed to find task mapping: ${error.message}`)
    }

    if (!taskMappings || taskMappings.length === 0) {
      console.log(`No sync found for deleted Trello card ${cardData.id}`)
      return { message: 'Card was not synced' }
    }

    const taskMapping = taskMappings[0]

    // Mark task mapping as deleted
    await supabase
      .from('task_syncs')
      .update({ sync_status: 'deleted' })
      .eq('id', taskMapping.id)

    // Add to sync queue for Motion deletion (if Motion task exists)
    if (taskMapping.motion_task_id) {
      await syncQueueManager.addToQueue({
        taskMappingId: taskMapping.id,
        type: 'delete',
        payload: {
          platform: 'trello',
          targetPlatform: 'motion',
          taskId: taskMapping.motion_task_id,
          trelloCardId: cardData.id,
          projectId: taskMapping.project_id
        }
      })

      console.log(`Queued Motion task deletion for Trello card ${cardData.id}`)
    }

    return {
      message: 'Card deletion queued for sync',
      taskMappingId: taskMapping.id,
      trelloCardId: cardData.id,
      motionTaskId: taskMapping.motion_task_id
    }

  } catch (error) {
    console.error('Error handling Trello card deleted:', error)
    throw error
  }
}

/**
 * Handle Trello card moved between boards
 */
async function handleCardMoved(cardData, currentBoard, sourceBoard, targetBoard, member) {
  console.log('Processing Trello card moved:', cardData.id)

  // For MVP, we'll log this but not implement cross-project moves
  // This would require more complex logic to handle project mappings
  
  return {
    message: 'Card move detected but not synced in MVP',
    cardId: cardData.id,
    sourceBoard: sourceBoard?.id,
    targetBoard: targetBoard?.id
  }
}

/**
 * Handle Trello card comment
 */
async function handleCardComment(cardData, commentText, member) {
  console.log('Processing Trello card comment:', cardData.id)

  // For MVP, we'll just log comments
  // Could sync to Motion task comments if Motion API supports it
  
  return {
    message: 'Card comment noted but not synced in MVP',
    cardId: cardData.id,
    commentLength: commentText?.length || 0
  }
}

/**
 * Handle Trello card attachment changes
 */
async function handleCardAttachment(cardData, attachmentData, actionType, member) {
  console.log('Processing Trello card attachment:', cardData.id, actionType)

  // For MVP, we'll just log attachment changes
  // Could sync to Motion if Motion supports attachments
  
  return {
    message: 'Card attachment change noted but not synced in MVP',
    cardId: cardData.id,
    actionType: actionType,
    attachmentId: attachmentData?.id
  }
}

/**
 * Determine what changed in a card update
 */
function determineCardChanges(newCard, oldCard) {
  const changes = []

  if (!oldCard) return ['all'] // If no old data, assume everything changed

  if (newCard.name !== oldCard.name) changes.push('name')
  if (newCard.desc !== oldCard.desc) changes.push('description')
  if (newCard.due !== oldCard.due) changes.push('dueDate')
  if (newCard.idList !== oldCard.idList) changes.push('list')
  if (newCard.closed !== oldCard.closed) changes.push('closed')
  
  // Check for position changes
  if (newCard.pos !== oldCard.pos) changes.push('position')
  
  // Check for label changes
  if (JSON.stringify(newCard.labels) !== JSON.stringify(oldCard.labels)) {
    changes.push('labels')
  }

  return changes.length > 0 ? changes : ['unknown']
}

// verifyTrelloSignature is now imported from ./verify.js

/**
 * Log webhook errors for debugging
 */
async function logWebhookError(platform, errorMessage, payload) {
  try {
    await supabase
      .from('sync_logs')
      .insert({
        action_type: 'webhook_error',
        platform: platform,
        success: false,
        error_message: errorMessage,
        details: {
          payload: payload?.substring(0, 1000), // Truncate for storage
          timestamp: new Date().toISOString()
        }
      })
  } catch (error) {
    console.error('Failed to log webhook error:', error)
  }
}