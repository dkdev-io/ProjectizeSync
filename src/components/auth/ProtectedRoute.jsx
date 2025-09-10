import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import AuthPage from './AuthPage'

export default function ProtectedRoute({ children, requireAuth = true, fallback = null }) {
  const { user, loading } = useAuth()

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // If authentication is required and user is not authenticated
  if (requireAuth && !user) {
    return fallback || <AuthPage />
  }

  // If user should not be authenticated (e.g., auth pages) but is authenticated
  if (!requireAuth && user) {
    return fallback || <div>Redirecting...</div>
  }

  return children
}

// Loading styles
const loadingStyles = `
.loading-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}

.loading-spinner {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-left: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner p {
  color: #6b7280;
  font-size: 1rem;
  margin: 0;
}
`

// Inject loading styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.type = 'text/css'
  styleSheet.innerText = loadingStyles
  document.head.appendChild(styleSheet)
}