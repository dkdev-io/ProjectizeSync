import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import IntegrationManager from '../../lib/integration-manager'
import ConnectionStatus from '../common/ConnectionStatus'
import './Dashboard.css'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [integrationManager, setIntegrationManager] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState({
    motion: { connected: false },
    trello: { connected: false }
  })
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    projects: 0,
    synced_tasks: 0,
    last_sync: null,
    sync_status: 'idle'
  })

  useEffect(() => {
    if (user?.id) {
      initializeIntegrations()
    }
  }, [user])

  const initializeIntegrations = async () => {
    try {
      setLoading(true)
      const manager = new IntegrationManager(user.id)
      await manager.initialize()
      
      setIntegrationManager(manager)
      setConnectionStatus(manager.getConnectionStatus())
      
      // Load basic stats (placeholder for now)
      setStats({
        projects: 0,
        synced_tasks: 0,
        last_sync: null,
        sync_status: 'idle'
      })
      
    } catch (error) {
      console.error('Failed to initialize integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = (platform) => {
    if (integrationManager) {
      integrationManager.startOAuthFlow(platform)
        .then(() => {
          // Refresh connection status
          initializeIntegrations()
        })
        .catch((error) => {
          console.error(`Failed to connect to ${platform}:`, error)
        })
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <section className="welcome-section">
        <div className="welcome-content">
          <h1>Welcome back, {profile?.full_name || user?.email || 'User'}!</h1>
          <p>Manage your Motion and Trello sync projects from here.</p>
        </div>
        <div className="welcome-actions">
          <button className="btn-primary">
            Create New Project
          </button>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">{stats.projects}</div>
              <div className="stat-label">Active Projects</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <div className="stat-number">{stats.synced_tasks}</div>
              <div className="stat-label">Synced Tasks</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-content">
              <div className="stat-number">{stats.sync_status}</div>
              <div className="stat-label">Sync Status</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🕒</div>
            <div className="stat-content">
              <div className="stat-number">
                {stats.last_sync ? 'Recently' : 'Never'}
              </div>
              <div className="stat-label">Last Sync</div>
            </div>
          </div>
        </div>
      </section>

      {/* Connection Status */}
      <section className="connections-section">
        <h2>Platform Connections</h2>
        <div className="connections-grid">
          {/* Motion Connection */}
          <div className="connection-card">
            <div className="connection-header">
              <div className="platform-info">
                <div className="platform-icon motion">🎯</div>
                <div className="platform-details">
                  <h3>Motion</h3>
                  <p>Task and project management</p>
                </div>
              </div>
              <div className={`connection-status ${connectionStatus.motion.connected ? 'connected' : 'disconnected'}`}>
                {connectionStatus.motion.connected ? 'Connected' : 'Not Connected'}
              </div>
            </div>
            
            {!connectionStatus.motion.connected && (
              <div className="connection-actions">
                <button 
                  className="btn-outline"
                  onClick={() => handleConnect('motion')}
                >
                  Connect Motion
                </button>
              </div>
            )}
            
            {connectionStatus.motion.connected && (
              <div className="connection-details">
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">Active</span>
                </div>
                <div className="connection-actions">
                  <button className="btn-outline btn-sm">Test Connection</button>
                  <button className="btn-danger btn-sm">Disconnect</button>
                </div>
              </div>
            )}
          </div>

          {/* Trello Connection */}
          <div className="connection-card">
            <div className="connection-header">
              <div className="platform-info">
                <div className="platform-icon trello">📋</div>
                <div className="platform-details">
                  <h3>Trello</h3>
                  <p>Board and card management</p>
                </div>
              </div>
              <div className={`connection-status ${connectionStatus.trello.connected ? 'connected' : 'disconnected'}`}>
                {connectionStatus.trello.connected ? 'Connected' : 'Not Connected'}
              </div>
            </div>
            
            {!connectionStatus.trello.connected && (
              <div className="connection-actions">
                <button 
                  className="btn-outline"
                  onClick={() => handleConnect('trello')}
                >
                  Connect Trello
                </button>
              </div>
            )}
            
            {connectionStatus.trello.connected && (
              <div className="connection-details">
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">Active</span>
                </div>
                <div className="connection-actions">
                  <button className="btn-outline btn-sm">Test Connection</button>
                  <button className="btn-danger btn-sm">Disconnect</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="activity-section">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          <div className="activity-empty">
            <div className="empty-icon">📝</div>
            <h3>No recent activity</h3>
            <p>Connect your platforms and create projects to see sync activity here.</p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button className="action-btn">
            <span className="action-icon">➕</span>
            <span className="action-text">Create Project</span>
          </button>
          
          <button className="action-btn">
            <span className="action-icon">🔗</span>
            <span className="action-text">Manage Connections</span>
          </button>
          
          <button className="action-btn">
            <span className="action-icon">⚙️</span>
            <span className="action-text">Sync Settings</span>
          </button>
          
          <button className="action-btn">
            <span className="action-icon">📊</span>
            <span className="action-text">View Reports</span>
          </button>
        </div>
      </section>
    </div>
  )
}