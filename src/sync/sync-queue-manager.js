import { createClient } from '@supabase/supabase-js'

// SyncQueueManager - Handles sync queue operations and rate limiting
class SyncQueueManager {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.rateLimits = {
      motion: {
        requestsPerMinute: 100,
        batchSize: 50,
        backoffStrategy: 'exponential'
      },
      trello: {
        requestsPerMinute: 100,
        batchSize: 50,
        backoffStrategy: 'linear'
      }
    }
    this.processingLocks = new Set() // Prevent concurrent processing of same item
  }

  /**
   * Add a sync action to the queue
   * @param {Object} action - Sync action object
   * @returns {Promise<Object>} Queue item result
   */
  async addToQueue(action) {
    try {
      const queueItem = {
        task_mapping_id: action.taskMappingId,
        action_type: action.type, // 'create', 'update', 'delete', 'sync'
        payload: action.payload,
        status: 'pending',
        retry_count: 0,
        max_retries: action.maxRetries || 3,
        scheduled_for: action.scheduleFor || new Date().toISOString(),
        created_at: new Date().toISOString()
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

  /**
   * Process pending items in the sync queue
   * @param {number} batchSize - Number of items to process in this batch
   * @returns {Promise<Object>} Processing results
   */
  async processQueue(batchSize = 10) {
    try {
      // Get pending items that are scheduled to run
      const { data: pendingItems, error } = await this.supabase
        .from('sync_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(batchSize)

      if (error) {
        throw new Error(`Failed to fetch queue items: ${error.message}`)
      }

      if (!pendingItems || pendingItems.length === 0) {
        return { processed: 0, successful: 0, failed: 0 }
      }

      console.log(`Processing ${pendingItems.length} queue items`)

      const results = {
        processed: 0,
        successful: 0,
        failed: 0,
        items: []
      }

      // Process items concurrently but with rate limiting
      const processingPromises = pendingItems.map(item => 
        this.processQueueItem(item)
          .then(result => {
            results.processed++
            if (result.success) {
              results.successful++
            } else {
              results.failed++
            }
            results.items.push(result)
            return result
          })
          .catch(error => {
            results.processed++
            results.failed++
            const errorResult = {
              id: item.id,
              success: false,
              error: error.message
            }
            results.items.push(errorResult)
            return errorResult
          })
      )

      await Promise.all(processingPromises)

      return results
    } catch (error) {
      console.error('Error processing sync queue:', error)
      throw error
    }
  }

  /**
   * Process a single queue item
   * @param {Object} queueItem - Queue item to process
   * @returns {Promise<Object>} Processing result
   */
  async processQueueItem(queueItem) {
    // Prevent concurrent processing of the same item
    if (this.processingLocks.has(queueItem.id)) {
      return { id: queueItem.id, success: false, error: 'Already processing' }
    }

    this.processingLocks.add(queueItem.id)

    try {
      // Mark as processing
      await this.updateQueueItemStatus(queueItem.id, 'processing')

      let result
      switch (queueItem.action_type) {
        case 'create':
          result = await this.processCreateAction(queueItem)
          break
        case 'update':
          result = await this.processUpdateAction(queueItem)
          break
        case 'delete':
          result = await this.processDeleteAction(queueItem)
          break
        case 'sync':
          result = await this.processSyncAction(queueItem)
          break
        default:
          throw new Error(`Unknown action type: ${queueItem.action_type}`)
      }

      // Mark as completed
      await this.updateQueueItemStatus(queueItem.id, 'completed', result)
      
      return {
        id: queueItem.id,
        success: true,
        result: result
      }

    } catch (error) {
      console.error(`Error processing queue item ${queueItem.id}:`, error)

      // Handle retries
      const shouldRetry = queueItem.retry_count < queueItem.max_retries
      
      if (shouldRetry) {
        const nextRetry = this.calculateRetryDelay(
          queueItem.retry_count + 1,
          queueItem.payload.platform
        )
        
        await this.scheduleRetry(queueItem.id, nextRetry, error.message)
        
        return {
          id: queueItem.id,
          success: false,
          error: error.message,
          retryScheduled: true
        }
      } else {
        // Max retries reached, mark as failed
        await this.updateQueueItemStatus(queueItem.id, 'failed', { error: error.message })
        
        return {
          id: queueItem.id,
          success: false,
          error: error.message,
          maxRetriesReached: true
        }
      }
    } finally {
      this.processingLocks.delete(queueItem.id)
    }
  }

  /**
   * Process a create action
   * @param {Object} queueItem - Queue item
   * @returns {Promise<Object>} Result
   */
  async processCreateAction(queueItem) {
    const { platform, taskData, targetPlatform } = queueItem.payload
    
    // This would integrate with TaskMapper and API clients
    console.log(`Processing create action from ${platform} to ${targetPlatform}`)
    
    // TODO: Implement actual API calls using Motion/Trello clients
    // For now, return mock success
    return {
      action: 'create',
      platform: targetPlatform,
      taskId: `mock_${Date.now()}`,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Process an update action
   * @param {Object} queueItem - Queue item
   * @returns {Promise<Object>} Result
   */
  async processUpdateAction(queueItem) {
    const { platform, taskId, updates, targetPlatform } = queueItem.payload
    
    console.log(`Processing update action from ${platform} to ${targetPlatform}`)
    
    // TODO: Implement actual API calls
    return {
      action: 'update',
      platform: targetPlatform,
      taskId: taskId,
      fieldsUpdated: Object.keys(updates),
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Process a delete action
   * @param {Object} queueItem - Queue item
   * @returns {Promise<Object>} Result
   */
  async processDeleteAction(queueItem) {
    const { platform, taskId, targetPlatform } = queueItem.payload
    
    console.log(`Processing delete action from ${platform} to ${targetPlatform}`)
    
    // TODO: Implement actual API calls
    return {
      action: 'delete',
      platform: targetPlatform,
      taskId: taskId,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Process a bidirectional sync action
   * @param {Object} queueItem - Queue item
   * @returns {Promise<Object>} Result
   */
  async processSyncAction(queueItem) {
    const { taskMappingId } = queueItem.payload
    
    console.log(`Processing bidirectional sync for task mapping: ${taskMappingId}`)
    
    // TODO: Implement full sync logic with conflict detection
    return {
      action: 'sync',
      taskMappingId: taskMappingId,
      syncedFields: ['title', 'description', 'status'],
      conflicts: [],
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Retry failed sync operations
   * @returns {Promise<Object>} Retry results
   */
  async retryFailed() {
    try {
      // Get failed items that haven't exceeded max retries
      const { data: failedItems, error } = await this.supabase
        .from('sync_queue')
        .select('*')
        .eq('status', 'failed')
        .lt('retry_count', 'max_retries')

      if (error) {
        throw new Error(`Failed to fetch failed items: ${error.message}`)
      }

      if (!failedItems || failedItems.length === 0) {
        return { retried: 0 }
      }

      // Reset status to pending for retry
      const itemIds = failedItems.map(item => item.id)
      const { error: updateError } = await this.supabase
        .from('sync_queue')
        .update({
          status: 'pending',
          scheduled_for: new Date().toISOString()
        })
        .in('id', itemIds)

      if (updateError) {
        throw new Error(`Failed to reset failed items: ${updateError.message}`)
      }

      console.log(`Reset ${itemIds.length} failed items for retry`)
      return { retried: itemIds.length }

    } catch (error) {
      console.error('Error retrying failed items:', error)
      throw error
    }
  }

  /**
   * Update queue item status
   * @param {string} itemId - Queue item ID
   * @param {string} status - New status
   * @param {Object} result - Processing result (optional)
   * @returns {Promise<void>}
   */
  async updateQueueItemStatus(itemId, status, result = null) {
    const updates = {
      status: status,
      processed_at: new Date().toISOString()
    }

    if (result) {
      updates.details = result
    }

    const { error } = await this.supabase
      .from('sync_queue')
      .update(updates)
      .eq('id', itemId)

    if (error) {
      console.error('Failed to update queue item status:', error)
    }
  }

  /**
   * Schedule a retry for a failed item
   * @param {string} itemId - Queue item ID
   * @param {Date} retryTime - When to retry
   * @param {string} errorMessage - Error that caused the failure
   * @returns {Promise<void>}
   */
  async scheduleRetry(itemId, retryTime, errorMessage) {
    const { error } = await this.supabase
      .from('sync_queue')
      .update({
        status: 'pending',
        retry_count: this.supabase.rpc('increment', { x: 1 }),
        scheduled_for: retryTime.toISOString(),
        error_message: errorMessage
      })
      .eq('id', itemId)

    if (error) {
      console.error('Failed to schedule retry:', error)
    }
  }

  /**
   * Calculate retry delay based on backoff strategy
   * @param {number} retryCount - Current retry attempt
   * @param {string} platform - Platform for rate limit rules
   * @returns {Date} Next retry time
   */
  calculateRetryDelay(retryCount, platform) {
    const config = this.rateLimits[platform] || this.rateLimits.motion
    let delaySeconds

    if (config.backoffStrategy === 'exponential') {
      delaySeconds = Math.pow(2, retryCount) * 30 // 30s, 1m, 2m, 4m, 8m...
    } else {
      delaySeconds = retryCount * 60 // 1m, 2m, 3m, 4m...
    }

    return new Date(Date.now() + delaySeconds * 1000)
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} Queue stats
   */
  async getQueueStats() {
    try {
      const { data, error } = await this.supabase
        .from('sync_queue')
        .select('status')

      if (error) {
        throw new Error(`Failed to get queue stats: ${error.message}`)
      }

      const stats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: data.length
      }

      data.forEach(item => {
        stats[item.status] = (stats[item.status] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error getting queue stats:', error)
      return { error: error.message }
    }
  }

  /**
   * Clean up old completed queue items (should be run periodically)
   * @param {number} daysOld - Remove items older than this many days
   * @returns {Promise<number>} Number of items cleaned up
   */
  async cleanupOldItems(daysOld = 7) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
      
      const { data, error } = await this.supabase
        .from('sync_queue')
        .delete()
        .eq('status', 'completed')
        .lt('processed_at', cutoffDate.toISOString())
        .select('id')

      if (error) {
        throw new Error(`Failed to cleanup old items: ${error.message}`)
      }

      return data?.length || 0
    } catch (error) {
      console.error('Error cleaning up old queue items:', error)
      return 0
    }
  }
}

export default SyncQueueManager