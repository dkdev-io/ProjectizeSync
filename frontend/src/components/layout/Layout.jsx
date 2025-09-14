import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import ConnectionStatus from '../common/ConnectionStatus'
import './Layout.css'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut, loading } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/auth')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: '📊',
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Projects',
      href: '/projects',
      icon: '📁',
      current: location.pathname === '/projects'
    },
    {
      name: 'Integrations',
      href: '/integrations',
      icon: '🔗',
      current: location.pathname === '/integrations'
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: '👤',
      current: location.pathname === '/profile'
    }
  ]

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-title">
            <span className="sidebar-logo">⚡</span>
            ProjectizeSync
          </h1>
          <button
            className="sidebar-toggle desktop-hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`nav-item ${item.current ? 'nav-item-current' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <ConnectionStatus />
          
          <div className="user-menu">
            <div className="user-info">
              <div className="user-avatar">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" />
                ) : (
                  <span>{profile?.full_name?.[0] || user?.email?.[0] || '?'}</span>
                )}
              </div>
              <div className="user-details">
                <div className="user-name">
                  {profile?.full_name || 'User'}
                </div>
                <div className="user-email">
                  {user?.email}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="sign-out-btn"
              disabled={loading}
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <header className="top-bar">
          <button
            className="sidebar-toggle mobile-only"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          
          <div className="top-bar-content">
            <h1 className="page-title">
              {navigation.find(item => item.current)?.name || 'ProjectizeSync'}
            </h1>
          </div>
        </header>

        <main className="content">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay mobile-only"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}