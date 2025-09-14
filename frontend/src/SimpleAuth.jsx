import React, { useState } from 'react'

export default function SimpleAuth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    alert(`${mode} with ${email}`)
  }

  const connectToMotion = () => {
    window.open('https://api.usemotion.com/oauth/authorize?client_id=your-client-id&redirect_uri=' + encodeURIComponent('http://localhost:5177/auth/motion/callback') + '&response_type=code&scope=tasks:read+tasks:write+projects:read+projects:write+workspaces:read', '_blank')
  }

  const connectToTrello = () => {
    window.open('https://trello.com/1/authorize?key=d4cfad653c1688c8e1027ff23d0eca90&name=ProjectizeSync&scope=read,write&response_type=token&return_url=' + encodeURIComponent('http://localhost:5177/auth/trello/callback') + '&expiration=never', '_blank')
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '2rem', 
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#2563eb', marginBottom: '0.5rem' }}>🚀 ProjectizeSync</h1>
          <p style={{ color: '#6b7280' }}>Sync your tasks between Motion and Trello</p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button 
              onClick={() => setMode('login')}
              style={{ 
                flex: 1, 
                padding: '0.5rem', 
                background: mode === 'login' ? '#2563eb' : '#e5e7eb',
                color: mode === 'login' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Login
            </button>
            <button 
              onClick={() => setMode('signup')}
              style={{ 
                flex: 1, 
                padding: '0.5rem', 
                background: mode === 'signup' ? '#2563eb' : '#e5e7eb',
                color: mode === 'signup' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                margin: '0.5rem 0',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                margin: '0.5rem 0',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              required
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.75rem',
                margin: '0.5rem 0',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              {mode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '1rem', color: '#374151' }}>Connect Your Apps</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={connectToMotion}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              🎯 Connect Motion
            </button>
            <button
              onClick={connectToTrello}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#0079bf',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              📋 Connect Trello
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            After connecting, you'll be able to create sync projects between your Motion and Trello accounts.
          </p>
        </div>
      </div>
    </div>
  )
}