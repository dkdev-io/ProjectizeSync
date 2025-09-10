import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function SignupForm({ onToggleMode }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    const { data, error } = await signUp(email, password, {
      fullName: fullName
    })
    
    if (error) {
      setError(error.message)
    } else if (data?.user && !data?.user?.email_confirmed_at) {
      setSuccess(true)
      setError('')
    }
    
    setIsLoading(false)
  }

  if (success) {
    return (
      <div className="auth-form">
        <div className="auth-header">
          <h2>Check your email</h2>
          <p>We sent a confirmation link to <strong>{email}</strong></p>
        </div>
        
        <div className="success-message">
          <p>Click the link in the email to confirm your account, then come back to sign in.</p>
        </div>

        <div className="auth-footer">
          <p>
            Already confirmed?{' '}
            <button 
              type="button" 
              onClick={onToggleMode}
              className="link-button"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-form">
      <div className="auth-header">
        <h2>Create your account</h2>
        <p>Start syncing between Motion and Trello</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form-fields">
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            required
            disabled={isLoading}
            minLength={6}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
            disabled={isLoading}
            minLength={6}
          />
        </div>

        <button 
          type="submit" 
          className="btn-primary full-width"
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Already have an account?{' '}
          <button 
            type="button" 
            onClick={onToggleMode}
            className="link-button"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}