import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AuthPage from './components/auth/AuthPage'
import AuthCallback from './components/auth/AuthCallback'
import Dashboard from './components/dashboard/Dashboard'
import Profile from './components/profile/Profile'
import Integrations from './components/integrations/Integrations'
import Projects from './components/projects/Projects'
import NotFound from './components/common/NotFound'
import Layout from './components/layout/Layout'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route 
              path="/auth" 
              element={
                <ProtectedRoute requireAuth={false} fallback={<Navigate to="/dashboard" replace />}>
                  <AuthPage />
                </ProtectedRoute>
              } 
            />
            
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/integrations" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Integrations />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/projects" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Projects />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App