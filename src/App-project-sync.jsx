import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [step, setStep] = useState('signup') // signup, integrations, dashboard, create-project
  const [user, setUser] = useState(null)
  const [integrations, setIntegrations] = useState({
    motion: { connected: false, status: 'disconnected' },
    trello: { connected: false, status: 'disconnected' }
  })
  
  // Project creation state
  const [motionData, setMotionData] = useState({ workspaces: [], projects: [] })
  const [trelloData, setTrelloData] = useState({ teams: [], boards: [] })
  const [selectedMapping, setSelectedMapping] = useState({
    motionWorkspace: null,
    motionProject: null,
    trelloTeam: null,
    trelloBoard: null
  })
  const [existingProjects, setExistingProjects] = useState([])

  const handleSignup = (email, password) => {
    setUser({ email, id: 'mock-user-123' })
    setStep('integrations')
  }

  const connectMotion = async () => {
    setIntegrations(prev => ({ 
      ...prev, 
      motion: { connected: false, status: 'connecting...' }
    }))
    
    try {
      const response = await fetch('http://localhost:3100/test/motion')
      const result = await response.json()
      
      if (response.ok) {
        setIntegrations(prev => ({ 
          ...prev, 
          motion: { connected: true, status: 'connected' }
        }))
        
        // Fetch Motion workspaces and projects
        await fetchMotionData()
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
    
    // Real Trello OAuth URL with correct return URL (must match registered URL)
    const trelloAuthUrl = `https://trello.com/1/authorize?key=d4cfad653c1688c8e1027ff23d0eca90&name=ProjectizeSync&scope=read%2Cwrite&response_type=token&return_url=${encodeURIComponent('http://localhost:3000')}&expiration=never`
    
    // Open in popup or redirect
    window.open(trelloAuthUrl, 'trello-auth', 'width=600,height=600')
    
    // Mock success for demo - in real app, handle OAuth callback
    setTimeout(() => {
      setIntegrations(prev => ({ 
        ...prev, 
        trello: { connected: true, status: 'connected' }
      }))
      
      // Fetch Trello teams and boards
      fetchTrelloData()
    }, 3000)
  }

  const fetchMotionData = async () => {
    try {
      console.log('Fetching Motion workspaces and projects...')
      
      // Fetch workspaces
      const workspacesResponse = await fetch('http://localhost:3100/api/motion/workspaces')
      const workspacesData = await workspacesResponse.json()
      
      // Fetch projects
      const projectsResponse = await fetch('http://localhost:3100/api/motion/projects')
      const projectsData = await projectsResponse.json()
      
      if (workspacesResponse.ok && projectsResponse.ok) {
        setMotionData({
          workspaces: workspacesData.workspaces || [],
          projects: projectsData.projects || []
        })
        console.log('Motion data loaded:', { workspaces: workspacesData.workspaces?.length, projects: projectsData.projects?.length })
      } else {
        console.error('Motion API error:', workspacesData.error || projectsData.error)
        // Fallback to empty arrays
        setMotionData({ workspaces: [], projects: [] })
      }
    } catch (error) {
      console.error('Failed to fetch Motion data:', error)
      // Fallback to empty arrays
      setMotionData({ workspaces: [], projects: [] })
    }
  }

  const fetchTrelloData = async () => {
    try {
      console.log('Fetching Trello organizations and boards...')
      
      // Fetch organizations (teams)
      const orgsResponse = await fetch('http://localhost:3100/api/trello/organizations')
      const orgsData = await orgsResponse.json()
      
      // Fetch boards
      const boardsResponse = await fetch('http://localhost:3100/api/trello/boards')
      const boardsData = await boardsResponse.json()
      
      if (orgsResponse.ok && boardsResponse.ok) {
        setTrelloData({
          teams: orgsData.organizations || [],
          boards: boardsData.boards || []
        })
        console.log('Trello data loaded:', { teams: orgsData.organizations?.length, boards: boardsData.boards?.length })
      } else {
        console.error('Trello API error:', orgsData.error || boardsData.error)
        // Fallback to empty arrays
        setTrelloData({ teams: [], boards: [] })
      }
    } catch (error) {
      console.error('Failed to fetch Trello data:', error)
      // Fallback to empty arrays
      setTrelloData({ teams: [], boards: [] })
    }
  }

  const goToDashboard = () => {
    setStep('dashboard')
  }

  const startProjectCreation = () => {
    setStep('create-project')
  }

  const createSyncProject = async () => {
    if (!selectedMapping.motionProject || !selectedMapping.trelloBoard) {
      alert('Please select both a Motion project and Trello board')
      return
    }

    const newProject = {
      id: `sync-${Date.now()}`,
      name: `${getMotionProjectName(selectedMapping.motionProject)} ↔ ${getTrelloBoardName(selectedMapping.trelloBoard)}`,
      motionWorkspaceId: selectedMapping.motionWorkspace,
      motionProjectId: selectedMapping.motionProject,
      trelloTeamId: selectedMapping.trelloTeam,
      trelloBoardId: selectedMapping.trelloBoard,
      status: 'active',
      createdAt: new Date().toISOString()
    }

    setExistingProjects(prev => [...prev, newProject])
    
    // Reset form
    setSelectedMapping({
      motionWorkspace: null,
      motionProject: null,
      trelloTeam: null,
      trelloBoard: null
    })

    // Go back to dashboard
    setStep('dashboard')
  }

  const getMotionProjectName = (projectId) => {
    const project = motionData.projects.find(p => p.id === projectId)
    return project?.name || projectId
  }

  const getTrelloBoardName = (boardId) => {
    const board = trelloData.boards.find(b => b.id === boardId)
    return board?.name || boardId
  }

  const getFilteredMotionProjects = () => {
    if (!selectedMapping.motionWorkspace) return []
    return motionData.projects.filter(p => p.workspaceId === selectedMapping.motionWorkspace)
  }

  const getFilteredTrelloBoards = () => {
    if (!selectedMapping.trelloTeam) return []
    return trelloData.boards.filter(b => b.teamId === selectedMapping.trelloTeam)
  }

  if (step === 'signup') {
    return <AuthPage onAuth={handleSignup} />
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

  if (step === 'create-project') {
    return (
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1>🔗 Create Sync Project</h1>
        <p>Select a Motion project and Trello board to sync bidirectionally.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px' }}>
          {/* Motion Selection */}
          <div>
            <h3>📋 Motion</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Workspace:</label>
              <select 
                value={selectedMapping.motionWorkspace || ''}
                onChange={(e) => setSelectedMapping(prev => ({ 
                  ...prev, 
                  motionWorkspace: e.target.value,
                  motionProject: null // Reset project when workspace changes
                }))}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">Select workspace...</option>
                {motionData.workspaces.map(workspace => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Project:</label>
              <select 
                value={selectedMapping.motionProject || ''}
                onChange={(e) => setSelectedMapping(prev => ({ ...prev, motionProject: e.target.value }))}
                disabled={!selectedMapping.motionWorkspace}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ccc',
                  opacity: selectedMapping.motionWorkspace ? 1 : 0.5
                }}
              >
                <option value="">Select project...</option>
                {getFilteredMotionProjects().map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Trello Selection */}
          <div>
            <h3>📋 Trello</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Team:</label>
              <select 
                value={selectedMapping.trelloTeam || ''}
                onChange={(e) => setSelectedMapping(prev => ({ 
                  ...prev, 
                  trelloTeam: e.target.value,
                  trelloBoard: null // Reset board when team changes
                }))}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">
                  {trelloData.teams.length === 0 ? 'Complete Trello OAuth first' : 'Select team...'}
                </option>
                {trelloData.teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Board:</label>
              <select 
                value={selectedMapping.trelloBoard || ''}
                onChange={(e) => setSelectedMapping(prev => ({ ...prev, trelloBoard: e.target.value }))}
                disabled={!selectedMapping.trelloTeam}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ccc',
                  opacity: selectedMapping.trelloTeam ? 1 : 0.5
                }}
              >
                <option value="">
                  {trelloData.boards.length === 0 ? 'Complete Trello OAuth first' : 'Select board...'}
                </option>
                {getFilteredTrelloBoards().map(board => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Preview and Actions */}
        {selectedMapping.motionProject && selectedMapping.trelloBoard && (
          <div style={{ 
            marginTop: '30px', 
            padding: '20px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '8px',
            border: '2px dashed #4CAF50'
          }}>
            <h4>🔄 Sync Preview</h4>
            <p style={{ margin: '10px 0', fontSize: '16px' }}>
              <strong>{getMotionProjectName(selectedMapping.motionProject)}</strong> ↔ <strong>{getTrelloBoardName(selectedMapping.trelloBoard)}</strong>
            </p>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Tasks will sync bidirectionally between these platforms. Changes in Motion will appear in Trello and vice versa.
            </p>
          </div>
        )}

        <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button 
            onClick={() => setStep('dashboard')}
            style={{
              backgroundColor: '#757575',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          
          <button 
            onClick={createSyncProject}
            disabled={!selectedMapping.motionProject || !selectedMapping.trelloBoard}
            style={{
              backgroundColor: selectedMapping.motionProject && selectedMapping.trelloBoard ? '#4CAF50' : '#ccc',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: selectedMapping.motionProject && selectedMapping.trelloBoard ? 'pointer' : 'not-allowed'
            }}
          >
            Create Sync Project
          </button>
        </div>
      </div>
    )
  }

  if (step === 'dashboard') {
    return (
      <div style={{ maxWidth: '900px', margin: '50px auto', padding: '20px' }}>
        <h1>🎯 ProjectizeSync Dashboard</h1>
        <p>Welcome {user?.email}!</p>
        
        {/* Connection Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>✅ Motion Connected</h3>
            <p>Ready to sync tasks and projects</p>
          </div>
          
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>✅ Trello Connected</h3>
            <p>Ready to sync boards and cards</p>
          </div>
        </div>

        {/* Sync Projects */}
        <div style={{ marginTop: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>🔄 Active Sync Projects</h2>
            <button 
              onClick={startProjectCreation}
              style={{
                backgroundColor: '#2196F3',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              + New Sync Project
            </button>
          </div>

          {existingProjects.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              border: '2px dashed #ddd', 
              borderRadius: '8px',
              color: '#666'
            }}>
              <h3>No sync projects yet</h3>
              <p>Create your first sync project to start syncing Motion and Trello</p>
              <button 
                onClick={startProjectCreation}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  marginTop: '15px'
                }}
              >
                Create First Project
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {existingProjects.map(project => (
                <SyncProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
}

function SyncProjectCard({ project }) {
  const [isActive, setIsActive] = useState(project.status === 'active')

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#fafafa'
    }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 10px 0' }}>{project.name}</h4>
        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
          Created: {new Date(project.createdAt).toLocaleDateString()}
        </p>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ 
          color: isActive ? '#4CAF50' : '#f44336',
          fontWeight: 'bold'
        }}>
          {isActive ? '🟢 Active' : '🔴 Paused'}
        </span>
        
        <button 
          onClick={() => setIsActive(!isActive)}
          style={{
            backgroundColor: isActive ? '#f44336' : '#4CAF50',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          {isActive ? 'Pause' : 'Resume'}
        </button>
        
        <button 
          style={{
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Configure
        </button>
      </div>
    </div>
  )
}

function AuthPage({ onAuth }) {
  const [isSignUp, setIsSignUp] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (email && password) {
      onAuth(email, password)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>🎯 ProjectizeSync</h1>
      <p>Motion & Trello Bidirectional Sync</p>
      
      {/* Toggle Buttons */}
      <div style={{ 
        display: 'flex', 
        marginTop: '30px', 
        marginBottom: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => setIsSignUp(false)}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            backgroundColor: !isSignUp ? '#2196F3' : '#f5f5f5',
            color: !isSignUp ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => setIsSignUp(true)}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            backgroundColor: isSignUp ? '#2196F3' : '#f5f5f5',
            color: isSignUp ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Sign Up
        </button>
      </div>

      <div>
        <h3>{isSignUp ? 'Create Account' : 'Welcome Back'}</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          {isSignUp 
            ? 'Create your account to start syncing Motion and Trello' 
            : 'Sign in to access your sync projects'
          }
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
            required
          />
          <button
            type="submit"
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              padding: '14px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* Additional Options */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          {!isSignUp && (
            <p style={{ margin: '10px 0' }}>
              <a href="#" style={{ color: '#2196F3', textDecoration: 'none', fontSize: '14px' }}>
                Forgot your password?
              </a>
            </p>
          )}
          
          <p style={{ fontSize: '14px', color: '#666' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#2196F3', 
                textDecoration: 'underline', 
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {isSignUp ? 'Sign in here' : 'Sign up here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function IntegrationCard({ name, description, status, connected, onConnect }) {
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
        ) : (
          <span style={{ color: '#666' }}>Not connected</span>
        )}
      </div>
      
      <button
        onClick={onConnect}
        disabled={connected || status === 'connecting...'}
        style={{
          backgroundColor: connected ? '#4CAF50' : '#2196F3',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: connected ? 'default' : 'pointer'
        }}
      >
        {connected ? 'Connected' : status === 'connecting...' ? 'Connecting...' : `Connect ${name}`}
      </button>
    </div>
  )
}

export default App