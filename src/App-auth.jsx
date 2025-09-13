import React, { useState } from 'react'
import './App.css'

function App() {
  const [step, setStep] = useState('signup') // signup, integrations, dashboard
  const [user, setUser] = useState(null)
  const [integrations, setIntegrations] = useState({
    motion: { connected: false, status: 'disconnected' },
    trello: { connected: false, status: 'disconnected' }
  })

  const handleSignup = (email, password) => {
    // Mock signup for now - replace with real Supabase auth
    setUser({ email, id: 'mock-user-123' })
    setStep('integrations')
  }

  const connectMotion = async () => {
    setIntegrations(prev => ({ 
      ...prev, 
      motion: { connected: false, status: 'connecting...' }
    }))
    
    try {
      // Test real Motion API connection
      const response = await fetch('http://localhost:3001/test/motion')
      const result = await response.json()
      
      if (response.ok) {
        setIntegrations(prev => ({ 
          ...prev, 
          motion: { connected: true, status: 'connected' }
        }))
      } else {
        throw new Error(result.error || 'Connection failed')
      }
    } catch (error) {
      console.error('Motion connection failed:', error)
      setIntegrations(prev => ({ 
        ...prev, 
        motion: { connected: false, status: 'connection failed' }
      }))
    }
  }

  const connectTrello = () => {
    setIntegrations(prev => ({ 
      ...prev, 
      trello: { connected: false, status: 'connecting...' }
    }))
    
    // Real Trello OAuth URL with correct return URL
    const trelloAuthUrl = `https://trello.com/1/authorize?key=d4cfad653c1688c8e1027ff23d0eca90&name=ProjectizeSync&scope=read%2Cwrite&response_type=token&return_url=${encodeURIComponent(window.location.origin)}&expiration=never`
    
    // Open in popup or redirect
    window.open(trelloAuthUrl, 'trello-auth', 'width=600,height=600')
    
    // Mock success for demo
    setTimeout(() => {
      setIntegrations(prev => ({ 
        ...prev, 
        trello: { connected: true, status: 'connected' }
      }))
    }, 3000)
  }

  const goToDashboard = () => {
    setStep('dashboard')
  }

  if (step === 'signup') {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
        <h1>🎯 ProjectizeSync</h1>
        <p>Motion & Trello Bidirectional Sync</p>
        
        <div style={{ marginTop: '30px' }}>
          <h3>Create Account</h3>
          <SignupForm onSignup={handleSignup} />
        </div>
      </div>
    )
  }

  if (step === 'integrations') {
    return (
      <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px' }}>
        <h1>Connect Your Apps</h1>
        <p>Welcome {user?.email}! Let's connect your Motion and Trello accounts.</p>
        
        <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
          <IntegrationCard
            name="Motion"
            description="Task and project management"
            status={integrations.motion.status}
            connected={integrations.motion.connected}
            onConnect={connectMotion}
          />
          
          <IntegrationCard
            name="Trello"
            description="Kanban boards and cards"
            status={integrations.trello.status}
            connected={integrations.trello.connected}
            onConnect={connectTrello}
          />
        </div>

        {integrations.motion.connected && integrations.trello.connected && (
          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <button 
              onClick={goToDashboard}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Go to Dashboard →
            </button>
          </div>
        )}
      </div>
    )
  }

  if (step === 'dashboard') {
    return (
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1>🎯 ProjectizeSync Dashboard</h1>
        <p>Welcome {user?.email}!</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>✅ Motion Connected</h3>
            <p>Ready to sync tasks and projects</p>
          </div>
          
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>✅ Trello Connected</h3>
            <p>Ready to sync boards and cards</p>
          </div>
          
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', gridColumn: '1 / -1' }}>
            <h3>🚀 Next Steps</h3>
            <ul>
              <li>Create your first sync project</li>
              <li>Map Motion workspace to Trello board</li>
              <li>Start bidirectional sync</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }
}

function SignupForm({ onSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (email && password) {
      onSignup(email, password)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        required
      />
      <button
        type="submit"
        style={{
          backgroundColor: '#2196F3',
          color: 'white',
          padding: '12px',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        Create Account
      </button>
    </form>
  )
}

function IntegrationCard({ name, description, status, connected, onConnect, needsSetup, setupMessage, isDemoMode }) {
  return (
    <div style={{
      flex: 1,
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <h3>{name}</h3>
      <p style={{ color: '#666', marginBottom: '20px' }}>{description}</p>
      
      <div style={{ marginBottom: '20px' }}>
        {connected ? (
          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>✅ Connected</span>
        ) : status === 'connecting...' ? (
          <span style={{ color: '#FF9800' }}>🔄 {status}</span>
        ) : needsSetup ? (
          <span style={{ color: '#f44336' }}>⚠️ Setup Required</span>
        ) : (
          <span style={{ color: '#666' }}>Not connected</span>
        )}
      </div>

      {(needsSetup || isDemoMode) && setupMessage && (
        <p style={{ color: isDemoMode ? '#FF9800' : '#f44336', fontSize: '12px', marginBottom: '15px' }}>
          {setupMessage}
        </p>
      )}
      
      <button
        onClick={onConnect}
        disabled={connected || status === 'connecting...' || needsSetup}
        style={{
          backgroundColor: needsSetup ? '#ccc' : connected ? '#4CAF50' : isDemoMode ? '#FF9800' : '#2196F3',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: needsSetup ? 'not-allowed' : connected ? 'default' : 'pointer',
          opacity: needsSetup ? 0.6 : 1
        }}
      >
        {connected ? (isDemoMode ? 'Connected (Demo)' : 'Connected') : 
         status === 'connecting...' ? 'Connecting...' : 
         needsSetup ? 'Need Setup' : 
         isDemoMode ? `Try ${name} (Demo)` : `Connect ${name}`}
      </button>
    </div>
  )
}

export default App