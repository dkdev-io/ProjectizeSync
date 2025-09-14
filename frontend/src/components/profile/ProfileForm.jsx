import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function ProfileForm() {
  const { user, profile, updateProfile, loading } = useAuth()
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    avatar_url: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (user && profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || user.email || '',
        avatar_url: profile.avatar_url || ''
      })
    } else if (user) {
      setFormData({
        full_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        avatar_url: user.user_metadata?.avatar_url || ''
      })
    }
  }, [user, profile])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await updateProfile({
        full_name: formData.full_name,
        email: formData.email,
        avatar_url: formData.avatar_url
      })

      if (error) {
        throw error
      }

      setMessage({
        type: 'success',
        text: 'Profile updated successfully!'
      })
    } catch (error) {
      console.error('Profile update error:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Failed to update profile'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="profile-form-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-form-container">
      <div className="profile-form">
        <div className="profile-header">
          <h2>Profile Settings</h2>
          <p>Manage your account information</p>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="full_name">Full Name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              disabled={true} // Email changes should go through proper auth flow
            />
            <small className="form-help">
              Email changes require verification. Contact support to change your email.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="avatar_url">Avatar URL</label>
            <input
              id="avatar_url"
              name="avatar_url"
              type="url"
              value={formData.avatar_url}
              onChange={handleInputChange}
              placeholder="https://example.com/your-avatar.jpg"
              disabled={isSubmitting}
            />
            <small className="form-help">
              Enter a URL to your profile picture
            </small>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {formData.avatar_url && (
          <div className="avatar-preview">
            <h3>Avatar Preview</h3>
            <img
              src={formData.avatar_url}
              alt="Avatar preview"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
              onLoad={(e) => {
                e.target.style.display = 'block'
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .profile-form-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
        }

        .profile-form {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          padding: 32px;
        }

        .profile-header {
          margin-bottom: 32px;
          text-align: center;
        }

        .profile-header h2 {
          color: #1a202c;
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .profile-header p {
          color: #718096;
          margin: 0;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
          font-size: 0.875rem;
        }

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-group input:disabled {
          background-color: #f9fafb;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .form-help {
          display: block;
          margin-top: 4px;
          color: #6b7280;
          font-size: 0.75rem;
        }

        .form-actions {
          margin-top: 32px;
          text-align: center;
        }

        .btn-primary {
          padding: 12px 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 0.875rem;
        }

        .message.success {
          background: #c6f6d5;
          color: #2d7d47;
          border: 1px solid #9ae6b4;
        }

        .message.error {
          background: #fed7e2;
          color: #c53030;
          border: 1px solid #fbb6ce;
        }

        .avatar-preview {
          margin-top: 32px;
          padding-top: 32px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
        }

        .avatar-preview h3 {
          color: #374151;
          font-size: 1rem;
          font-weight: 500;
          margin-bottom: 16px;
        }

        .avatar-preview img {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #e5e7eb;
          display: none;
        }

        .loading-spinner {
          text-align: center;
          padding: 48px;
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
          margin: 0;
        }
      `}</style>
    </div>
  )
}