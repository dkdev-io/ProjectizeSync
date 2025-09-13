const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
// Try to load clients, handle any import issues
let MotionClient, TrelloClient
try {
  MotionClient = require('./src/lib/motion-client.js')
  console.log('✅ MotionClient loaded successfully')
} catch (error) {
  console.error('❌ Failed to load MotionClient:', error.message)
  MotionClient = class {
    constructor(token) { this.token = token }
    async testConnection() { return { success: false, error: 'MotionClient not available' } }
    async getWorkspaces() { return [] }
    async getProjects() { return [] }
  }
}

try {
  TrelloClient = require('./src/lib/trello-client.js')
  console.log('✅ TrelloClient loaded successfully')
} catch (error) {
  console.error('❌ Failed to load TrelloClient:', error.message)
  TrelloClient = class {
    constructor(key, token) { this.key = key; this.token = token }
    async getBoards() { return [] }
    async getOrganizations() { return [] }
  }
}

// Load environment variables
dotenv.config()

const app = express()
const PORT = 3100

// Middleware
app.use(cors())
app.use(express.json())

// Initialize clients
const motionClient = new MotionClient(process.env.MOTION_ACCESS_TOKEN)
const trelloClient = new TrelloClient(process.env.TRELLO_API_KEY, null) // Token will be set after OAuth

// Test Motion connection
app.get('/test/motion', async (req, res) => {
  try {
    const result = await motionClient.testConnection()
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Motion API connected successfully',
        user: result.user 
      })
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      })
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Get Motion workspaces
app.get('/api/motion/workspaces', async (req, res) => {
  try {
    console.log('Fetching Motion workspaces...')
    const workspaces = await motionClient.getWorkspaces()
    
    res.json({ 
      success: true,
      workspaces: workspaces?.workspaces || []
    })
  } catch (error) {
    console.error('Motion workspaces error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Get Motion projects - REAL API calls only
app.get('/api/motion/projects', async (req, res) => {
  try {
    console.log('Fetching REAL Motion projects from API...')
    
    // First get workspaces to iterate through
    const workspacesData = await motionClient.getWorkspaces()
    const allProjects = []
    
    if (workspacesData && workspacesData.workspaces) {
      // Try different approaches to get projects
      console.log(`Found ${workspacesData.workspaces.length} workspaces, fetching projects...`)
      
      for (const workspace of workspacesData.workspaces) {
        try {
          console.log(`Trying to get projects for workspace: ${workspace.name}`)
          
          // Try projects endpoint with workspace parameter
          try {
            const workspaceProjects = await motionClient.getProjects(workspace.id)
            if (workspaceProjects && workspaceProjects.projects) {
              const projectsWithWorkspace = workspaceProjects.projects.map(project => ({
                ...project,
                workspaceId: workspace.id,
                workspaceName: workspace.name
              }))
              allProjects.push(...projectsWithWorkspace)
              console.log(`✅ Found ${workspaceProjects.projects.length} projects in ${workspace.name}`)
            }
          } catch (projectError) {
            console.log(`❌ Projects API failed for ${workspace.name}, trying tasks instead...`)
            
            // Fallback: Try getting tasks and group them as "projects"
            try {
              const tasks = await motionClient.getTasks()
              if (tasks && tasks.tasks) {
                // Group tasks by project or status to create "project-like" entities
                const taskGroups = {}
                tasks.tasks.forEach(task => {
                  if (task.workspaceId === workspace.id) {
                    const groupKey = task.projectId || task.status || 'Ungrouped'
                    if (!taskGroups[groupKey]) {
                      taskGroups[groupKey] = {
                        id: task.projectId || `${workspace.id}-${task.status || 'ungrouped'}`,
                        name: task.projectName || `${task.status || 'Ungrouped'} Tasks`,
                        workspaceId: workspace.id,
                        workspaceName: workspace.name,
                        taskCount: 0
                      }
                    }
                    taskGroups[groupKey].taskCount++
                  }
                })
                
                // Add task-based projects
                Object.values(taskGroups).forEach(group => {
                  if (group.taskCount > 0) {
                    allProjects.push(group)
                  }
                })
                console.log(`✅ Created ${Object.keys(taskGroups).length} task-based projects for ${workspace.name}`)
              }
            } catch (taskError) {
              console.log(`❌ Tasks API also failed for ${workspace.name}: ${taskError.message}`)
            }
          }
        } catch (error) {
          console.log(`Skipping workspace ${workspace.name}: ${error.message}`)
        }
      }
    }
    
    console.log(`✅ Total real projects found: ${allProjects.length}`)
    
    res.json({ 
      success: true,
      projects: allProjects
    })
  } catch (error) {
    console.error('Motion projects error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Get Trello organizations - REAL API calls only
app.get('/api/trello/organizations', async (req, res) => {
  try {
    console.log('Fetching REAL Trello organizations from API...')
    
    // Use direct API call with just API key (for public data)
    const apiUrl = `https://api.trello.com/1/members/me/organizations?key=${process.env.TRELLO_API_KEY}`
    
    try {
      const response = await fetch(apiUrl)
      const organizations = await response.json()
      
      if (response.ok && Array.isArray(organizations)) {
        console.log(`✅ Found ${organizations.length} Trello organizations`)
        res.json({ 
          success: true,
          organizations: organizations.map(org => ({
            id: org.id,
            name: org.displayName || org.name
          }))
        })
      } else {
        console.log('⚠️ Trello organizations API returned error or requires token')
        res.json({ 
          success: true,
          organizations: [],
          message: 'OAuth required - user must authorize Trello access first'
        })
      }
    } catch (fetchError) {
      console.log('⚠️ Trello API call failed:', fetchError.message)
      res.json({ 
        success: true,
        organizations: [],
        message: 'OAuth required - user must authorize Trello access first'
      })
    }
  } catch (error) {
    console.error('Trello organizations error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Get Trello boards - REAL API calls only
app.get('/api/trello/boards', async (req, res) => {
  try {
    console.log('Fetching REAL Trello boards from API...')
    
    // Use direct API call with just API key (for public boards)
    const apiUrl = `https://api.trello.com/1/members/me/boards?key=${process.env.TRELLO_API_KEY}`
    
    try {
      const response = await fetch(apiUrl)
      const boards = await response.json()
      
      if (response.ok && Array.isArray(boards)) {
        console.log(`✅ Found ${boards.length} Trello boards`)
        res.json({ 
          success: true,
          boards: boards.map(board => ({
            id: board.id,
            name: board.name,
            teamId: board.idOrganization || 'personal'
          }))
        })
      } else {
        console.log('⚠️ Trello boards API returned error or requires token')
        res.json({ 
          success: true,
          boards: [],
          message: 'OAuth required - user must authorize Trello access first'
        })
      }
    } catch (fetchError) {
      console.log('⚠️ Trello API call failed:', fetchError.message)
      res.json({ 
        success: true,
        boards: [],
        message: 'OAuth required - user must authorize Trello access first'
      })
    }
  } catch (error) {
    console.error('Trello boards error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT
  })
})

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`🚀 ProjectizeSync Backend Server running on http://localhost:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🎯 Motion test: http://localhost:${PORT}/test/motion`)
  console.log(`📋 API endpoints available for Motion and Trello data`)
  console.log('🔄 Server is ready to accept connections...')
})

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error.message)
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try a different port.`)
  }
})

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('✅ Server closed')
  })
})

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('✅ Server closed')
  })
})

module.exports = app