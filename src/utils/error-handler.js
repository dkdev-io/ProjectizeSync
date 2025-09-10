import { logger } from './logger'

// Error types
export class AppError extends Error {
  constructor(message, type = 'GENERIC_ERROR', statusCode = 500, isOperational = true) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.timestamp = new Date().toISOString()
    
    Error.captureStackTrace(this, this.constructor)
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401)
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403)
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 'VALIDATION_ERROR', 400)
    this.details = details
  }
}

export class IntegrationError extends AppError {
  constructor(platform, message, originalError = null) {
    super(`${platform}: ${message}`, 'INTEGRATION_ERROR', 502)
    this.platform = platform
    this.originalError = originalError
  }
}

export class SyncError extends AppError {
  constructor(message, platform = null, taskId = null) {
    super(message, 'SYNC_ERROR', 500)
    this.platform = platform
    this.taskId = taskId
  }
}

// Error Handler class
class ErrorHandler {
  // Handle different types of errors
  static handle(error, context = 'Unknown') {
    logger.error(`Error in ${context}:`, error)

    // Return user-friendly error information
    if (error instanceof AppError) {
      return {
        type: error.type,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: error.timestamp,
        ...(error.details && { details: error.details }),
        ...(error.platform && { platform: error.platform })
      }
    }

    // Handle specific error types
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      return {
        type: 'VALIDATION_ERROR',
        message: 'Please check your input and try again',
        statusCode: 400
      }
    }

    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        type: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection and try again.',
        statusCode: 503
      }
    }

    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      return {
        type: 'AUTHENTICATION_ERROR',
        message: 'Please sign in to continue',
        statusCode: 401
      }
    }

    if (error.message.includes('forbidden') || error.message.includes('403')) {
      return {
        type: 'AUTHORIZATION_ERROR',
        message: 'You do not have permission to perform this action',
        statusCode: 403
      }
    }

    // Generic error
    return {
      type: 'GENERIC_ERROR',
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Something went wrong. Please try again.',
      statusCode: 500
    }
  }

  // Handle async function with error catching
  static async withErrorHandling(asyncFunction, context = 'Operation') {
    try {
      return await asyncFunction()
    } catch (error) {
      const handledError = this.handle(error, context)
      throw new AppError(
        handledError.message,
        handledError.type,
        handledError.statusCode
      )
    }
  }

  // Handle React component errors
  static handleReactError(error, errorInfo, context = 'Component') {
    logger.error(`React error in ${context}:`, error, {
      componentStack: errorInfo.componentStack
    })

    return {
      type: 'COMPONENT_ERROR',
      message: 'A component error occurred. Please refresh the page.',
      hasError: true
    }
  }

  // Handle API response errors
  static handleApiError(response, context = 'API') {
    const error = new Error(`API Error: ${response.status} ${response.statusText}`)
    
    if (response.status === 401) {
      throw new AuthenticationError('Please sign in to continue')
    }
    
    if (response.status === 403) {
      throw new AuthorizationError('You do not have permission to perform this action')
    }
    
    if (response.status >= 400 && response.status < 500) {
      throw new ValidationError(`Request failed: ${response.statusText}`)
    }
    
    if (response.status >= 500) {
      throw new AppError('Server error. Please try again later.', 'SERVER_ERROR', response.status)
    }

    throw error
  }

  // Handle integration-specific errors
  static handleIntegrationError(platform, error, context = 'Integration') {
    logger.error(`${platform} integration error in ${context}:`, error)

    // Check for specific error patterns
    if (error.message.includes('rate limit')) {
      throw new IntegrationError(
        platform,
        'Rate limit exceeded. Please try again in a few minutes.',
        error
      )
    }

    if (error.message.includes('token') || error.message.includes('401')) {
      throw new IntegrationError(
        platform,
        'Authentication expired. Please reconnect your account.',
        error
      )
    }

    if (error.message.includes('permission') || error.message.includes('403')) {
      throw new IntegrationError(
        platform,
        'Insufficient permissions. Please check your account settings.',
        error
      )
    }

    throw new IntegrationError(
      platform,
      `Connection failed: ${error.message}`,
      error
    )
  }
}

// Global error handler for unhandled promises
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection:', event.reason)
    event.preventDefault()
  })

  window.addEventListener('error', (event) => {
    logger.error('Global error:', event.error)
  })
}

export default ErrorHandler