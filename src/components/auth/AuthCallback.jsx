import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function AuthCallback() {
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current URL
        const urlParams = new URLSearchParams(window.location.search)
        const error = urlParams.get('error')
        const errorDescription = urlParams.get('error_description')

        if (error) {
          setError(errorDescription || error)
          setStatus('error')
          return
        }

        // If we have a user, redirect to dashboard
        if (user) {
          setStatus('success')
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 2000)
          return
        }

        // Wait a bit for the auth state to update
        setTimeout(() => {
          if (!user) {
            setError('Authentication failed. Please try again.')
            setStatus('error')
          }
        }, 5000)

      } catch (err) {
        console.error('Auth callback error:', err)
        setError('An unexpected error occurred')
        setStatus('error')
      }
    }

    handleAuthCallback()
  }, [user])

  const getStatusContent = () => {
    switch (status) {
      case 'processing':
        return {
          title: 'Completing sign in...',
          message: 'Please wait while we complete your authentication.',
          showSpinner: true
        }
      case 'success':
        return {
          title: 'Success!',
          message: 'You have been signed in successfully. Redirecting to your dashboard...',
          showSpinner: false
        }
      case 'error':
        return {
          title: 'Authentication Error',
          message: error || 'Something went wrong during authentication.',
          showSpinner: false
        }
      default:
        return {
          title: 'Processing...',
          message: 'Please wait.',
          showSpinner: true
        }
    }
  }

  const { title, message, showSpinner } = getStatusContent()

  return (
    <div className="auth-callback">
      <div className="callback-container">
        <div className="callback-content">
          {showSpinner && (
            <div className="callback-spinner">
              <div className="spinner"></div>
            </div>
          )}
          
          <h2 className={`callback-title ${status}`}>
            {title}
          </h2>
          
          <p className="callback-message">
            {message}
          </p>

          {status === 'error' && (
            <div className="callback-actions">
              <button 
                onClick={() => window.location.href = '/'}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .auth-callback {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .callback-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          padding: 48px;
          text-align: center;
          max-width: 400px;
          width: 90%;
        }

        .callback-spinner {
          margin-bottom: 24px;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-left: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .callback-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 12px;
          color: #1a202c;
        }

        .callback-title.success {
          color: #2d7d47;
        }

        .callback-title.error {
          color: #c53030;
        }

        .callback-message {
          color: #718096;
          font-size: 1rem;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .callback-actions {
          margin-top: 24px;
        }

        .btn-primary {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }
      `}</style>
    </div>
  )
}