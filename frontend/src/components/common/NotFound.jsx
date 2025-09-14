import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      padding: '20px'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <div style={{
          fontSize: '6rem',
          marginBottom: '20px'
        }}>
          🔍
        </div>
        
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#1a202c',
          marginBottom: '16px'
        }}>
          Page Not Found
        </h1>
        
        <p style={{
          color: '#6b7280',
          fontSize: '1.1rem',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        
        <Link
          to="/dashboard"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-1px)'
            e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'none'
            e.target.style.boxShadow = 'none'
          }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}