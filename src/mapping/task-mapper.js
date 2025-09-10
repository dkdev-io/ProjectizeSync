// TaskMapper - Handles data transformation between Motion and Trello
class TaskMapper {
  constructor() {
    this.conflictThreshold = 30000 // 30 seconds for edit conflict detection
  }

  /**
   * Convert Motion task to Trello card format
   * @param {Object} motionTask - Motion task object
   * @param {Array} fieldMappings - Custom field mappings (optional for MVP)
   * @returns {Object} Trello card object
   */
  motionToTrello(motionTask, fieldMappings = []) {
    const trelloCard = {
      name: motionTask.name || motionTask.title,
      desc: motionTask.description || '',
      pos: motionTask.priority === 'URGENT' ? 'top' : 'bottom',
      due: motionTask.dueDate ? new Date(motionTask.dueDate).toISOString() : null,
      labels: this._mapMotionLabelsToTrello(motionTask.labels || []),
    }

    // Map status to list position (basic mapping for MVP)
    if (motionTask.status) {
      trelloCard.idList = this._mapMotionStatusToTrelloList(motionTask.status)
    }

    // Apply custom field mappings if provided
    if (fieldMappings.length > 0) {
      trelloCard.customFields = this._applyCustomFieldMappings(
        motionTask.customFields || {},
        fieldMappings,
        'motion_to_trello'
      )
    }

    return trelloCard
  }

  /**
   * Convert Trello card to Motion task format
   * @param {Object} trelloCard - Trello card object
   * @param {Array} fieldMappings - Custom field mappings (optional for MVP)
   * @returns {Object} Motion task object
   */
  trelloToMotion(trelloCard, fieldMappings = []) {
    const motionTask = {
      name: trelloCard.name,
      description: trelloCard.desc || '',
      dueDate: trelloCard.due ? new Date(trelloCard.due).toISOString() : null,
      priority: this._mapTrelloPriorityToMotion(trelloCard.labels || []),
      labels: this._mapTrelloLabelsToMotion(trelloCard.labels || []),
    }

    // Map list position to status
    if (trelloCard.list) {
      motionTask.status = this._mapTrelloListToMotionStatus(trelloCard.list.name)
    }

    // Apply custom field mappings if provided
    if (fieldMappings.length > 0) {
      motionTask.customFields = this._applyCustomFieldMappings(
        trelloCard.customFieldItems || [],
        fieldMappings,
        'trello_to_motion'
      )
    }

    return motionTask
  }

  /**
   * Generate unique custom key for task mapping
   * @param {string} motionId - Motion task ID (optional)
   * @param {string} trelloId - Trello card ID (optional)
   * @returns {string} Unique mapping key
   */
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

  /**
   * Detect conflicts between Motion task and Trello card
   * @param {Object} motionTask - Motion task with last_updated timestamp
   * @param {Object} trelloCard - Trello card with dateLastActivity
   * @returns {Array} Array of conflict objects
   */
  detectConflicts(motionTask, trelloCard) {
    const conflicts = []
    
    // Get last update timestamps
    const motionLastUpdate = new Date(motionTask.dateModified || motionTask.updatedAt)
    const trelloLastUpdate = new Date(trelloCard.dateLastActivity)
    
    // Check if both were updated within the conflict threshold
    const timeDiff = Math.abs(motionLastUpdate.getTime() - trelloLastUpdate.getTime())
    
    if (timeDiff < this.conflictThreshold) {
      // Simultaneous edit detected - check specific fields
      conflicts.push({
        type: 'simultaneous_edit',
        field: 'metadata',
        motionValue: motionLastUpdate.toISOString(),
        trelloValue: trelloLastUpdate.toISOString(),
        timeDifference: timeDiff,
        severity: 'high'
      })
    }

    // Check for field-specific conflicts
    if (motionTask.name !== trelloCard.name) {
      conflicts.push({
        type: 'field_mismatch',
        field: 'title',
        motionValue: motionTask.name,
        trelloValue: trelloCard.name,
        severity: 'medium'
      })
    }

    if ((motionTask.description || '') !== (trelloCard.desc || '')) {
      conflicts.push({
        type: 'field_mismatch',
        field: 'description',
        motionValue: motionTask.description || '',
        trelloValue: trelloCard.desc || '',
        severity: 'low'
      })
    }

    // Check due date conflicts
    const motionDue = motionTask.dueDate ? new Date(motionTask.dueDate) : null
    const trelloDue = trelloCard.due ? new Date(trelloCard.due) : null
    
    if ((motionDue?.getTime() || null) !== (trelloDue?.getTime() || null)) {
      conflicts.push({
        type: 'field_mismatch',
        field: 'due_date',
        motionValue: motionDue?.toISOString() || null,
        trelloValue: trelloDue?.toISOString() || null,
        severity: 'medium'
      })
    }

    return conflicts
  }

  /**
   * Apply data validation during transformation
   * @param {Object} data - Data to validate
   * @param {string} platform - 'motion' or 'trello'
   * @returns {Object} Validation result
   */
  validateData(data, platform) {
    const errors = []
    const warnings = []

    // Common validations
    if (!data.name && !data.title) {
      errors.push('Task must have a title/name')
    }

    if (platform === 'motion') {
      // Motion-specific validations
      if (data.dueDate && isNaN(new Date(data.dueDate))) {
        errors.push('Invalid due date format for Motion')
      }
      
      if (data.priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(data.priority)) {
        warnings.push('Invalid priority level, defaulting to MEDIUM')
        data.priority = 'MEDIUM'
      }
    }

    if (platform === 'trello') {
      // Trello-specific validations
      if (data.due && isNaN(new Date(data.due))) {
        errors.push('Invalid due date format for Trello')
      }
      
      if (data.name && data.name.length > 16384) {
        errors.push('Trello card name exceeds 16,384 character limit')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data
    }
  }

  // Helper methods for mapping
  _mapMotionStatusToTrelloList(motionStatus) {
    const statusMap = {
      'BACKLOG': 'To Do',
      'TODO': 'To Do', 
      'IN_PROGRESS': 'In Progress',
      'IN_REVIEW': 'Review',
      'COMPLETED': 'Done',
      'ARCHIVED': 'Done'
    }
    return statusMap[motionStatus] || 'To Do'
  }

  _mapTrelloListToMotionStatus(trelloListName) {
    const listMap = {
      'To Do': 'TODO',
      'Doing': 'IN_PROGRESS',
      'In Progress': 'IN_PROGRESS',
      'Review': 'IN_REVIEW',
      'Done': 'COMPLETED',
      'Complete': 'COMPLETED'
    }
    return listMap[trelloListName] || 'TODO'
  }

  _mapMotionLabelsToTrello(motionLabels) {
    return motionLabels.map(label => ({
      name: label.name || label,
      color: label.color || 'blue'
    }))
  }

  _mapTrelloLabelsToMotion(trelloLabels) {
    return trelloLabels.map(label => ({
      name: label.name,
      color: label.color
    }))
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

  _applyCustomFieldMappings(sourceFields, mappings, direction) {
    const mappedFields = {}
    
    mappings.forEach(mapping => {
      if (mapping.mapping_approved) {
        if (direction === 'motion_to_trello' && mapping.motion_field_id) {
          const sourceValue = sourceFields[mapping.motion_field_id]
          if (sourceValue !== undefined) {
            mappedFields[mapping.trello_field_id] = this._convertFieldValue(
              sourceValue, mapping.field_type
            )
          }
        } else if (direction === 'trello_to_motion' && mapping.trello_field_id) {
          const sourceField = sourceFields.find(f => f.idCustomField === mapping.trello_field_id)
          if (sourceField) {
            mappedFields[mapping.motion_field_id] = this._convertFieldValue(
              sourceField.value, mapping.field_type
            )
          }
        }
      }
    })
    
    return mappedFields
  }

  _convertFieldValue(value, fieldType) {
    switch (fieldType) {
      case 'date':
        return value ? new Date(value).toISOString() : null
      case 'number':
        return value ? parseFloat(value) : null
      case 'text':
        return value ? String(value) : ''
      case 'select':
      case 'multi_select':
        return value
      default:
        return value
    }
  }
}

export default TaskMapper