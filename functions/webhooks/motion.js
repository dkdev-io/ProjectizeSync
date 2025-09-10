const { createClient } = require('@supabase/supabase-js')

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

  motionToTrello(motionTask) {
    return {
      name: motionTask.name || motionTask.title,
      desc: motionTask.description || '',
      due: motionTask.dueDate ? new Date(motionTask.dueDate).toISOString() : null,
      pos: motionTask.priority === 'URGENT' ? 'top' : 'bottom'
    }
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

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Initialize sync components
const taskMapper = new TaskMapper()
const syncQueueManager = new SyncQueueManager(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Motion Webhook Handler
 * Processes webhook events from Motion API
 */
exports.handler = async (event, context) => {
  console.log('Motion webhook received:', {
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Motion-Signature',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    }
  }

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify webhook signature (if Motion provides one)
    if (process.env.MOTION_WEBHOOK_SECRET) {
      const signature = event.headers['x-motion-signature'] || event.headers['X-Motion-Signature']
      if (!verifyMotionSignature(event.body, signature, process.env.MOTION_WEBHOOK_SECRET)) {
        console.error('Invalid Motion webhook signature')
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

    console.log('Processing Motion webhook:', payload.event_type, payload.data?.id)

    // Process webhook based on event type
    const result = await processMotionWebhook(payload)

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
    console.error('Motion webhook error:', error)
    
    // Log error to sync_logs table
    await logWebhookError('motion', error.message, event.body)

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
 * Process Motion webhook based on event type
 */
async function processMotionWebhook(payload) {
  const { event_type, data, user_id } = payload

  switch (event_type) {
    case 'task.created':
      return await handleTaskCreated(data, user_id)
    
    case 'task.updated':
      return await handleTaskUpdated(data, user_id)
    
    case 'task.deleted':
      return await handleTaskDeleted(data, user_id)
    
    case 'project.created':
      return await handleProjectCreated(data, user_id)
    
    case 'project.updated':
      return await handleProjectUpdated(data, user_id)
    
    default:
      console.log(`Unhandled Motion event type: ${event_type}`)
      return { message: `Event type ${event_type} not handled` }
  }
}

/**
 * Handle Motion task created event
 */
async function handleTaskCreated(taskData, userId) {
  console.log('Processing Motion task created:', taskData.id)

  try {
    // Find if this task belongs to a synced project
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('motion_project_id', taskData.project_id)
      .eq('sync_enabled', true)

    if (error) {
      throw new Error(`Failed to find synced project: ${error.message}`)
    }

    if (!projects || projects.length === 0) {
      console.log(`No synced project found for Motion project ${taskData.project_id}`)
      return { message: 'Project not synced' }
    }

    const project = projects[0]

    // Generate custom key for new task mapping
    const customKey = taskMapper.generateCustomKey(taskData.id)

    // Create task mapping record
    const { data: taskMapping, error: mappingError } = await supabase
      .from('task_syncs')
      .insert({
        project_id: project.id,
        motion_task_id: taskData.id,
        sync_status: 'active',
        last_motion_update: new Date().toISOString(),
        sync_direction: 'bidirectional'
      })
      .select()
      .single()

    if (mappingError) {
      throw new Error(`Failed to create task mapping: ${mappingError.message}`)
    }

    // Convert Motion task to Trello format
    const trelloCardData = taskMapper.motionToTrello(taskData)

    // Add to sync queue for Trello creation
    await syncQueueManager.addToQueue({
      taskMappingId: taskMapping.id,
      type: 'create',
      payload: {
        platform: 'motion',
        targetPlatform: 'trello',
        taskData: trelloCardData,
        motionTaskId: taskData.id,
        projectId: project.id,
        trelloBoardId: project.trello_board_id
      }
    })

    console.log(`Queued Trello card creation for Motion task ${taskData.id}`)

    return {
      message: 'Task creation queued for sync',
      taskMappingId: taskMapping.id,
      motionTaskId: taskData.id
    }

  } catch (error) {
    console.error('Error handling Motion task created:', error)
    throw error
  }
}

/**
 * Handle Motion task updated event
 */
async function handleTaskUpdated(taskData, userId) {
  console.log('Processing Motion task updated:', taskData.id)

  try {
    // Find existing task mapping
    const { data: taskMappings, error } = await supabase
      .from('task_syncs')
      .select('*, projects(*)')
      .eq('motion_task_id', taskData.id)
      .eq('sync_status', 'active')

    if (error) {
      throw new Error(`Failed to find task mapping: ${error.message}`)
    }

    if (!taskMappings || taskMappings.length === 0) {
      console.log(`No active sync found for Motion task ${taskData.id}`)
      return { message: 'Task not synced' }
    }

    const taskMapping = taskMappings[0]

    // Update last Motion update timestamp
    await supabase
      .from('task_syncs')
      .update({ last_motion_update: new Date().toISOString() })
      .eq('id', taskMapping.id)

    // Convert Motion task to Trello format
    const trelloCardData = taskMapper.motionToTrello(taskData)

    // Add to sync queue for Trello update
    await syncQueueManager.addToQueue({
      taskMappingId: taskMapping.id,
      type: 'update',
      payload: {
        platform: 'motion',
        targetPlatform: 'trello',
        taskId: taskMapping.trello_card_id,
        updates: trelloCardData,
        motionTaskId: taskData.id,
        projectId: taskMapping.project_id
      }
    })

    console.log(`Queued Trello card update for Motion task ${taskData.id}`)

    return {
      message: 'Task update queued for sync',
      taskMappingId: taskMapping.id,
      motionTaskId: taskData.id,
      trelloCardId: taskMapping.trello_card_id
    }

  } catch (error) {
    console.error('Error handling Motion task updated:', error)
    throw error
  }
}

/**
 * Handle Motion task deleted event
 */
async function handleTaskDeleted(taskData, userId) {
  console.log('Processing Motion task deleted:', taskData.id)

  try {
    // Find existing task mapping
    const { data: taskMappings, error } = await supabase
      .from('task_syncs')
      .select('*')
      .eq('motion_task_id', taskData.id)

    if (error) {
      throw new Error(`Failed to find task mapping: ${error.message}`)
    }

    if (!taskMappings || taskMappings.length === 0) {
      console.log(`No sync found for deleted Motion task ${taskData.id}`)
      return { message: 'Task was not synced' }
    }

    const taskMapping = taskMappings[0]

    // Mark task mapping as deleted
    await supabase
      .from('task_syncs')
      .update({ sync_status: 'deleted' })
      .eq('id', taskMapping.id)

    // Add to sync queue for Trello deletion (if Trello card exists)
    if (taskMapping.trello_card_id) {
      await syncQueueManager.addToQueue({
        taskMappingId: taskMapping.id,
        type: 'delete',
        payload: {
          platform: 'motion',
          targetPlatform: 'trello',
          taskId: taskMapping.trello_card_id,
          motionTaskId: taskData.id,
          projectId: taskMapping.project_id
        }
      })

      console.log(`Queued Trello card deletion for Motion task ${taskData.id}`)
    }

    return {
      message: 'Task deletion queued for sync',
      taskMappingId: taskMapping.id,
      motionTaskId: taskData.id,
      trelloCardId: taskMapping.trello_card_id
    }

  } catch (error) {
    console.error('Error handling Motion task deleted:', error)
    throw error
  }
}

/**
 * Handle Motion project created event
 */
async function handleProjectCreated(projectData, userId) {
  console.log('Motion project created:', projectData.id)
  // Project creation typically handled through UI, not webhooks
  return { message: 'Project creation noted' }
}

/**
 * Handle Motion project updated event
 */
async function handleProjectUpdated(projectData, userId) {
  console.log('Motion project updated:', projectData.id)
  // Could sync project name/description changes if needed
  return { message: 'Project update noted' }
}

/**
 * Verify Motion webhook signature (placeholder - Motion might not provide this)
 */
function verifyMotionSignature(payload, signature, secret) {
  // Motion webhook signature verification would go here
  // This is a placeholder since Motion's exact signature method is unknown
  return true
}

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