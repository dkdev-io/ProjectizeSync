import React from 'react'
import ConnectionStatus from '../common/ConnectionStatus'

export default function Integrations() {
  return (
    <div className="integrations-page">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: '#1a202c',
            marginBottom: '8px'
          }}>
            Platform Integrations
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '1.1rem',
            margin: '0'
          }}>
            Manage your connections to Motion and Trello
          </p>
        </div>

        <ConnectionStatus showDetails={true} />
        
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
            Integration Settings
          </h2>
          
          <div style={{
            background: '#f8fafc',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚙️</div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#6b7280',
              marginBottom: '8px'
            }}>
              Advanced Settings Coming Soon
            </h3>
            <p style={{
              color: '#9ca3af',
              margin: '0',
              maxWidth: '400px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              Webhook configuration, sync frequency, and custom field mapping settings will be available here.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}