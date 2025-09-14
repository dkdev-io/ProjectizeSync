import React, { useState } from 'react'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import './AuthPage.css'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' or 'signup'

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <h1>ProjectizeSync</h1>
          <p>Seamlessly sync your tasks between Motion and Trello</p>
        </div>
        
        <div className="auth-content">
          {mode === 'login' ? (
            <LoginForm onToggleMode={toggleMode} />
          ) : (
            <SignupForm onToggleMode={toggleMode} />
          )}
        </div>
      </div>
      
      <div className="auth-background">
        <div className="bg-pattern"></div>
      </div>
    </div>
  )
}