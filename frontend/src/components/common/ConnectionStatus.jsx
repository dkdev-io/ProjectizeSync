import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import './ConnectionStatus.css'

export default function ConnectionStatus({ showDetails = false }) {
  const { user } = useAuth()
  const [status, setStatus] = useState({
    overall: 'unknown',
    platforms: {
      motion: { connected: false, status: 'unknown' },
      trello: { connected: false, status: 'unknown' }
    },
    lastChecked: null,
    checking: false
  })

  useEffect(() => {
    if (user?.id) {
      checkConnectionStatus()
      
      // Check status every 30 seconds
      const interval = setInterval(checkConnectionStatus, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const checkConnectionStatus = async () => {
    if (!user?.id || status.checking) return

    setStatus(prev => ({ ...prev, checking: true }))

    try {
      // Call our health check endpoint
      const response = await fetch('/api/test-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        const newStatus = {
          platforms: {
            motion: {
              connected: data.tests?.motion?.connected || false,
              status: data.tests?.motion?.status || 'unknown',
              message: data.tests?.motion?.message || null
            },
            trello: {
              connected: data.tests?.trello?.connected || false,
              status: data.tests?.trello?.status || 'unknown',
              message: data.tests?.trello?.message || null
            }
          },
          lastChecked: new Date(),
          checking: false
        }

        // Determine overall status
        const connectedPlatforms = Object.values(newStatus.platforms)
          .filter(platform => platform.connected).length
        
        if (connectedPlatforms === 2) {
          newStatus.overall = 'connected'
        } else if (connectedPlatforms === 1) {
          newStatus.overall = 'partial'
        } else {
          newStatus.overall = 'disconnected'
        }

        setStatus(newStatus)
      } else {
        throw new Error('Health check failed')
      }
    } catch (error) {
      console.error('Connection status check failed:', error)
      setStatus(prev => ({
        ...prev,
        overall: 'error',
        checking: false,
        lastChecked: new Date()
      }))
    }
  }

  const getStatusColor = (statusType) => {
    switch (statusType) {
      case 'connected': return '#10b981'
      case 'partial': return '#f59e0b'
      case 'disconnected': return '#6b7280'
      case 'error': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusText = () => {
    switch (status.overall) {
      case 'connected': return 'All Connected'
      case 'partial': return 'Partially Connected'
      case 'disconnected': return 'Not Connected'
      case 'error': return 'Connection Error'
      default: return 'Checking...'
    }
  }

  const getStatusIcon = () => {
    switch (status.overall) {
      case 'connected': return '🟢'
      case 'partial': return '🟡'
      case 'disconnected': return '⚪'
      case 'error': return '🔴'
      default: return '⚪'
    }
  }

  if (!showDetails) {
    // Compact version for sidebar
    return (
      <div className="connection-status-compact">
        <div className="status-header">
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{getStatusText()}</span>
          {status.checking && <div className="status-spinner" />}
        </div>
        
        <div className="status-platforms">
          <div className={`platform-indicator ${status.platforms.motion.connected ? 'connected' : 'disconnected'}`}>
            <span className="platform-name">Motion</span>
          </div>
          <div className={`platform-indicator ${status.platforms.trello.connected ? 'connected' : 'disconnected'}`}>
            <span className="platform-name">Trello</span>
          </div>
        </div>
        
        {status.lastChecked && (
          <div className="last-checked">
            Last checked: {status.lastChecked.toLocaleTimeString()}
          </div>
        )}
      </div>
    )
  }

  // Detailed version for dashboard
  return (
    <div className="connection-status-detailed">
      <div className="status-header">
        <h3>Connection Status</h3>
        <button
          onClick={checkConnectionStatus}
          disabled={status.checking}
          className="refresh-btn"
        >
          {status.checking ? '⏳' : '🔄'}
        </button>
      </div>

      <div className="overall-status">
        <div 
          className="status-indicator"
          style={{ backgroundColor: getStatusColor(status.overall) }}
        />
        <span className="status-label">{getStatusText()}</span>
      </div>

      <div className="platforms-status">
        <div className="platform-status">
          <div className="platform-header">
            <span className="platform-icon">🎯</span>
            <span className="platform-name">Motion</span>
          </div>
          <div className={`platform-indicator ${status.platforms.motion.connected ? 'connected' : 'disconnected'}`}>
            {status.platforms.motion.connected ? 'Connected' : 'Disconnected'}
          </div>
          {status.platforms.motion.message && (
            <div className="platform-message">
              {status.platforms.motion.message}
            </div>
          )}
        </div>

        <div className="platform-status">
          <div className="platform-header">
            <span className="platform-icon">📋</span>
            <span className="platform-name">Trello</span>
          </div>
          <div className={`platform-indicator ${status.platforms.trello.connected ? 'connected' : 'disconnected'}`}>
            {status.platforms.trello.connected ? 'Connected' : 'Disconnected'}
          </div>
          {status.platforms.trello.message && (
            <div className="platform-message">
              {status.platforms.trello.message}
            </div>
          )}
        </div>
      </div>

      {status.lastChecked && (
        <div className="last-checked">
          Last updated: {status.lastChecked.toLocaleString()}
        </div>
      )}
    </div>
  )
}