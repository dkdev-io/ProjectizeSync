import React from 'react'

export default function Projects() {
  return (
    <div className="projects-page">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: '700', 
              color: '#1a202c',
              marginBottom: '8px'
            }}>
              Sync Projects
            </h1>
            <p style={{
              color: '#6b7280',
              fontSize: '1.1rem',
              margin: '0'
            }}>
              Create and manage your Motion ↔ Trello sync projects
            </p>
          </div>
          
          <button style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'transform 0.2s ease'
          }}>
            Create Project
          </button>
        </div>

        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '40px 20px'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: '0.5' }}>
              📁
            </div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#6b7280',
              marginBottom: '12px'
            }}>
              No Projects Yet
            </h3>
            <p style={{
              color: '#9ca3af',
              margin: '0 0 24px 0',
              maxWidth: '400px'
            }}>
              Create your first sync project to start synchronizing tasks between Motion and Trello.
            </p>
            
            <button style={{
              padding: '12px 24px',
              background: 'white',
              border: '2px solid #667eea',
              color: '#667eea',
              borderRadius: '8px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              Create Your First Project
            </button>
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          marginTop: '24px'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1a202c',
            marginBottom: '16px'
          }}>
            How Sync Projects Work
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            <div style={{
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎯</div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Connect Motion Project
              </h3>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: '0'
              }}>
                Select a Motion workspace and project to sync from
              </p>
            </div>
            
            <div style={{
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📋</div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Map Trello Board
              </h3>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: '0'
              }}>
                Choose the Trello board to sync tasks with
              </p>
            </div>
            
            <div style={{
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚡</div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Real-time Sync
              </h3>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: '0'
              }}>
                Tasks sync automatically between both platforms
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}