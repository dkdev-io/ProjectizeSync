import { createClient } from '@supabase/supabase-js'

// ConflictResolver - Handles field-level locking and conflict resolution
class ConflictResolver {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.lockDuration = 30000 // 30 seconds in milliseconds
  }

  /**
   * Acquire a field-level edit lock
   * @param {string} taskMappingId - Task mapping ID
   * @param {string} fieldName - Field to lock (title, description, status, etc.)
   * @param {string} userId - User acquiring the lock
   * @param {string} platform - Platform making the change ('motion' or 'trello')
   * @returns {Promise<boolean>} True if lock acquired, false if already locked
   */
  async acquireFieldLock(taskMappingId, fieldName, userId, platform) {
    try {
      const expiresAt = new Date(Date.now() + this.lockDuration).toISOString()
      
      // Try to insert lock - will fail if lock already exists due to unique constraint
      const { data, error } = await this.supabase
        .from('edit_locks')
        .upsert({
          task_mapping_id: taskMappingId,
          field_name: fieldName,
          locked_by: userId,
          platform: platform,
          expires_at: expiresAt
        }, {
          onConflict: 'task_mapping_id,field_name'
        })
        .select()

      if (error) {
        console.error('Failed to acquire lock:', error)
        return false
      }

      // Check if we successfully acquired the lock or if it's expired
      const existingLock = await this.getFieldLock(taskMappingId, fieldName)
      
      if (existingLock && existingLock.locked_by !== userId) {
        // Lock exists and is owned by someone else
        if (new Date(existingLock.expires_at) > new Date()) {
          // Lock is still valid
          return false
        } else {
          // Lock is expired, clean it up and try again
          await this.releaseFieldLock(taskMappingId, fieldName)
          return this.acquireFieldLock(taskMappingId, fieldName, userId, platform)
        }
      }

      return true
    } catch (error) {
      console.error('Error acquiring field lock:', error)
      return false
    }
  }

  /**
   * Release a field-level edit lock
   * @param {string} taskMappingId - Task mapping ID
   * @param {string} fieldName - Field to unlock
   * @returns {Promise<void>}
   */
  async releaseFieldLock(taskMappingId, fieldName) {
    try {
      await this.supabase
        .from('edit_locks')
        .delete()
        .eq('task_mapping_id', taskMappingId)
        .eq('field_name', fieldName)
    } catch (error) {
      console.error('Error releasing field lock:', error)
    }
  }

  /**
   * Get current lock for a field
   * @param {string} taskMappingId - Task mapping ID
   * @param {string} fieldName - Field name
   * @returns {Promise<Object|null>} Lock object or null
   */
  async getFieldLock(taskMappingId, fieldName) {
    try {
      const { data, error } = await this.supabase
        .from('edit_locks')
        .select('*')
        .eq('task_mapping_id', taskMappingId)
        .eq('field_name', fieldName)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error getting field lock:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error getting field lock:', error)
      return null
    }
  }

  /**
   * Check if a field is currently locked
   * @param {string} taskMappingId - Task mapping ID
   * @param {string} fieldName - Field name
   * @returns {Promise<boolean>} True if locked, false otherwise
   */
  async isFieldLocked(taskMappingId, fieldName) {
    const lock = await this.getFieldLock(taskMappingId, fieldName)
    
    if (!lock) return false
    
    // Check if lock is expired
    if (new Date(lock.expires_at) <= new Date()) {
      // Clean up expired lock
      await this.releaseFieldLock(taskMappingId, fieldName)
      return false
    }
    
    return true
  }

  /**
   * Resolve a detected conflict using specified strategy
   * @param {Object} conflict - Conflict object from TaskMapper.detectConflicts()
   * @param {Object} resolution - Resolution strategy and data
   * @returns {Promise<Object>} Resolution result
   */
  async resolveConflict(conflict, resolution) {
    try {
      const result = {
        success: false,
        resolvedValue: null,
        strategy: resolution.strategy,
        timestamp: new Date().toISOString()
      }

      switch (resolution.strategy) {
        case 'motion_wins':
          result.resolvedValue = conflict.motionValue
          result.platform = 'motion'
          result.success = true
          break

        case 'trello_wins':
          result.resolvedValue = conflict.trelloValue
          result.platform = 'trello'
          result.success = true
          break

        case 'manual_merge':
          if (resolution.mergedValue !== undefined) {
            result.resolvedValue = resolution.mergedValue
            result.platform = 'manual'
            result.success = true
          } else {
            throw new Error('Manual merge requires mergedValue')
          }
          break

        case 'latest_wins':
          // Use the value from the most recently updated platform
          if (conflict.motionLastUpdate && conflict.trelloLastUpdate) {
            const motionTime = new Date(conflict.motionLastUpdate)
            const trelloTime = new Date(conflict.trelloLastUpdate)
            
            if (motionTime > trelloTime) {
              result.resolvedValue = conflict.motionValue
              result.platform = 'motion'
            } else {
              result.resolvedValue = conflict.trelloValue
              result.platform = 'trello'
            }
            result.success = true
          } else {
            throw new Error('Latest wins strategy requires timestamp data')
          }
          break

        case 'concatenate':
          // Useful for descriptions or notes
          result.resolvedValue = `${conflict.motionValue}\n\n---\n\n${conflict.trelloValue}`
          result.platform = 'merged'
          result.success = true
          break

        case 'skip':
          // Skip this sync and leave both platforms unchanged
          result.resolvedValue = null
          result.platform = 'skip'
          result.success = true
          break

        default:
          throw new Error(`Unknown resolution strategy: ${resolution.strategy}`)
      }

      // Log the resolution
      await this.logConflictResolution(conflict, result)

      return result
    } catch (error) {
      console.error('Error resolving conflict:', error)
      return {
        success: false,
        error: error.message,
        strategy: resolution.strategy,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Get all active locks for a task mapping
   * @param {string} taskMappingId - Task mapping ID
   * @returns {Promise<Array>} Array of active locks
   */
  async getActiveLocks(taskMappingId) {
    try {
      const { data, error } = await this.supabase
        .from('edit_locks')
        .select('*')
        .eq('task_mapping_id', taskMappingId)
        .gt('expires_at', new Date().toISOString())

      if (error) {
        console.error('Error getting active locks:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error getting active locks:', error)
      return []
    }
  }

  /**
   * Clean up expired locks (should be run periodically)
   * @returns {Promise<number>} Number of locks cleaned up
   */
  async cleanupExpiredLocks() {
    try {
      const { data, error } = await this.supabase
        .from('edit_locks')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id')

      if (error) {
        console.error('Error cleaning up expired locks:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Error cleaning up expired locks:', error)
      return 0
    }
  }

  /**
   * Force release all locks for a task (admin function)
   * @param {string} taskMappingId - Task mapping ID
   * @returns {Promise<boolean>} Success status
   */
  async forceReleaseAllLocks(taskMappingId) {
    try {
      await this.supabase
        .from('edit_locks')
        .delete()
        .eq('task_mapping_id', taskMappingId)

      return true
    } catch (error) {
      console.error('Error force releasing locks:', error)
      return false
    }
  }

  /**
   * Get conflict resolution suggestions based on conflict type
   * @param {Object} conflict - Conflict object
   * @returns {Array} Array of suggested resolution strategies
   */
  getResolutionSuggestions(conflict) {
    const suggestions = []

    switch (conflict.type) {
      case 'simultaneous_edit':
        suggestions.push(
          { strategy: 'latest_wins', description: 'Use the most recent change' },
          { strategy: 'manual_merge', description: 'Manually resolve the conflict' }
        )
        break

      case 'field_mismatch':
        if (conflict.field === 'description') {
          suggestions.push(
            { strategy: 'concatenate', description: 'Combine both descriptions' },
            { strategy: 'motion_wins', description: 'Use Motion version' },
            { strategy: 'trello_wins', description: 'Use Trello version' }
          )
        } else {
          suggestions.push(
            { strategy: 'motion_wins', description: 'Use Motion version' },
            { strategy: 'trello_wins', description: 'Use Trello version' },
            { strategy: 'latest_wins', description: 'Use the most recent change' }
          )
        }
        break

      default:
        suggestions.push(
          { strategy: 'skip', description: 'Skip this sync' },
          { strategy: 'manual_merge', description: 'Manually resolve' }
        )
    }

    return suggestions
  }

  /**
   * Log conflict resolution for audit purposes
   * @param {Object} conflict - Original conflict
   * @param {Object} resolution - Resolution result
   * @returns {Promise<void>}
   */
  async logConflictResolution(conflict, resolution) {
    try {
      await this.supabase
        .from('sync_logs')
        .insert({
          action_type: 'conflict_resolution',
          platform: 'both',
          success: resolution.success,
          details: {
            conflict_type: conflict.type,
            field: conflict.field,
            strategy: resolution.strategy,
            resolved_value: resolution.resolvedValue,
            motion_value: conflict.motionValue,
            trello_value: conflict.trelloValue
          }
        })
    } catch (error) {
      console.error('Error logging conflict resolution:', error)
    }
  }
}

export default ConflictResolver