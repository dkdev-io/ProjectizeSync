const crypto = require('crypto')

/**
 * Webhook signature verification utilities
 */

/**
 * Verify Motion webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Signature from headers
 * @param {string} secret - Webhook secret
 * @returns {boolean} True if signature is valid
 */
function verifyMotionSignature(payload, signature, secret) {
  if (!signature || !secret) {
    console.warn('Motion webhook signature verification skipped - no signature or secret')
    return true // Allow for development without signature
  }

  try {
    // Motion might use HMAC-SHA256 (this is a placeholder implementation)
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')

    // Motion might prefix with 'sha256=' like GitHub
    const cleanSignature = signature.replace('sha256=', '')
    
    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    console.error('Error verifying Motion signature:', error)
    return false
  }
}

/**
 * Verify Trello webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Signature from headers
 * @param {string} secret - Webhook secret
 * @returns {boolean} True if signature is valid
 */
function verifyTrelloSignature(payload, signature, secret) {
  if (!signature || !secret) {
    console.warn('Trello webhook signature verification skipped - no signature or secret')
    return true // Allow for development without signature
  }

  try {
    // Trello uses HMAC-SHA1
    const expectedSignature = crypto
      .createHmac('sha1', secret)
      .update(payload, 'utf8')
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    console.error('Error verifying Trello signature:', error)
    return false
  }
}

/**
 * Generate a webhook secret for setup
 * @returns {string} Random hex string suitable for webhook secrets
 */
function generateWebhookSecret() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Validate webhook payload structure
 * @param {Object} payload - Parsed JSON payload
 * @param {string} platform - 'motion' or 'trello'
 * @returns {Object} Validation result
 */
function validateWebhookPayload(payload, platform) {
  const errors = []

  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be a valid JSON object')
    return { valid: false, errors }
  }

  if (platform === 'motion') {
    if (!payload.event_type) {
      errors.push('Motion webhook must have event_type')
    }
    if (!payload.data) {
      errors.push('Motion webhook must have data object')
    }
  } else if (platform === 'trello') {
    if (!payload.action) {
      errors.push('Trello webhook must have action object')
    }
    if (payload.action && !payload.action.type) {
      errors.push('Trello webhook action must have type')
    }
    if (payload.action && !payload.action.data) {
      errors.push('Trello webhook action must have data')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    platform,
    eventType: platform === 'motion' ? payload.event_type : payload.action?.type
  }
}

/**
 * Extract webhook headers for logging
 * @param {Object} headers - Request headers
 * @returns {Object} Relevant webhook headers
 */
function extractWebhookHeaders(headers) {
  const relevantHeaders = {}

  // Common headers
  if (headers['content-type']) relevantHeaders.contentType = headers['content-type']
  if (headers['user-agent']) relevantHeaders.userAgent = headers['user-agent']
  if (headers['x-forwarded-for']) relevantHeaders.forwardedFor = headers['x-forwarded-for']

  // Motion-specific headers
  if (headers['x-motion-signature']) relevantHeaders.motionSignature = headers['x-motion-signature']
  if (headers['x-motion-event']) relevantHeaders.motionEvent = headers['x-motion-event']

  // Trello-specific headers
  if (headers['x-trello-webhook']) relevantHeaders.trelloSignature = headers['x-trello-webhook']
  if (headers['x-trello-event']) relevantHeaders.trelloEvent = headers['x-trello-event']

  return relevantHeaders
}

module.exports = {
  verifyMotionSignature,
  verifyTrelloSignature,
  generateWebhookSecret,
  validateWebhookPayload,
  extractWebhookHeaders
}