'use client'

import { useState, useEffect } from 'react'
import LoginForm from './components/LoginForm'
import AdminDashboard from './components/AdminDashboard'
import OperatorDashboard from './components/OperatorDashboard'

interface User {
  id: string
  username: string
  role: 'admin' | 'operator'
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing authentication
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          try {
            const response = await fetch('/api/user/me', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })

            if (response.ok) {
              const data = await response.json()
              if (data.success) {
                setUser(data.user)
              } else {
                localStorage.removeItem('token')
              }
            } else {
              localStorage.removeItem('token')
            }
          } catch (error) {
            console.error('Auth check failed:', error)
            localStorage.removeItem('token')
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogin = (token: string, userData: User) => {
    setUser(userData)
    localStorage.setItem('token', token)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('token')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />
  }

  return user.role === 'admin' ? (
    <AdminDashboard user={user} onLogout={handleLogout} />
  ) : (
    <OperatorDashboard user={user} onLogout={handleLogout} />
  )
} 