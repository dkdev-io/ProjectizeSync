// Centralized logging utility
class Logger {
  constructor(context = 'App') {
    this.context = context
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  // Create logger for specific context
  static create(context) {
    return new Logger(context)
  }

  // Format log message with context and timestamp
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString()
    const contextString = `[${this.context}]`
    const prefix = `${timestamp} ${level.toUpperCase()} ${contextString}`
    
    if (data) {
      return `${prefix} ${message}`, data
    }
    
    return `${prefix} ${message}`
  }

  // Debug logging (development only)
  debug(message, data = null) {
    if (this.isDevelopment) {
      const [formattedMessage, logData] = this.formatMessage('debug', message, data)
      if (logData) {
        console.debug(formattedMessage, logData)
      } else {
        console.debug(formattedMessage)
      }
    }
  }

  // Info logging
  info(message, data = null) {
    const [formattedMessage, logData] = this.formatMessage('info', message, data)
    if (logData) {
      console.info(formattedMessage, logData)
    } else {
      console.info(formattedMessage)
    }
  }

  // Warning logging
  warn(message, data = null) {
    const [formattedMessage, logData] = this.formatMessage('warn', message, data)
    if (logData) {
      console.warn(formattedMessage, logData)
    } else {
      console.warn(formattedMessage)
    }
  }

  // Error logging
  error(message, error = null, data = null) {
    const [formattedMessage, logData] = this.formatMessage('error', message, { error, ...data })
    
    if (error instanceof Error) {
      console.error(formattedMessage, {
        message: error.message,
        stack: error.stack,
        ...logData
      })
    } else if (logData) {
      console.error(formattedMessage, logData)
    } else {
      console.error(formattedMessage)
    }

    // In production, you might want to send errors to a service like Sentry
    if (!this.isDevelopment && error instanceof Error) {
      this.reportError(error, message, data)
    }
  }

  // Report errors to external service (placeholder)
  reportError(error, context, data = null) {
    // TODO: Integrate with error reporting service (Sentry, LogRocket, etc.)
    console.error('Error reported:', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      data,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    })
  }

  // Performance timing
  time(label) {
    if (this.isDevelopment) {
      console.time(`[${this.context}] ${label}`)
    }
  }

  timeEnd(label) {
    if (this.isDevelopment) {
      console.timeEnd(`[${this.context}] ${label}`)
    }
  }

  // Group related logs
  group(label) {
    if (this.isDevelopment) {
      console.group(`[${this.context}] ${label}`)
    }
  }

  groupEnd() {
    if (this.isDevelopment) {
      console.groupEnd()
    }
  }

  // Log API requests
  logApiRequest(method, url, data = null, response = null) {
    this.group(`API ${method} ${url}`)
    
    if (data) {
      this.debug('Request data:', data)
    }
    
    if (response) {
      if (response.ok) {
        this.info(`Response: ${response.status} ${response.statusText}`)
      } else {
        this.error(`Response: ${response.status} ${response.statusText}`, null, { url, method })
      }
    }
    
    this.groupEnd()
  }

  // Log authentication events
  logAuth(event, data = null) {
    this.info(`Auth: ${event}`, data)
  }

  // Log sync events
  logSync(event, platform = null, data = null) {
    const message = platform ? `Sync [${platform}]: ${event}` : `Sync: ${event}`
    this.info(message, data)
  }

  // Log integration events
  logIntegration(platform, event, data = null) {
    this.info(`Integration [${platform}]: ${event}`, data)
  }
}

// Create default loggers for common contexts
export const logger = Logger.create('App')
export const authLogger = Logger.create('Auth')
export const syncLogger = Logger.create('Sync')
export const apiLogger = Logger.create('API')
export const integrationLogger = Logger.create('Integration')

export default Logger