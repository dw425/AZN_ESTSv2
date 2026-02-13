import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login.jsx'
import GameWrapper from './components/GameWrapper.jsx'

const API_BASE = import.meta.env.PROD
  ? 'https://azn-ests-api.onrender.com'
  : ''

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('tnt_token')
    const username = localStorage.getItem('tnt_username')
    if (token && username) {
      setUser({ username, token })
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    localStorage.setItem('tnt_token', userData.token)
    localStorage.setItem('tnt_username', userData.username)
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('tnt_token')
    localStorage.removeItem('tnt_username')
    setUser(null)
  }

  if (loading) return null

  return (
    <BrowserRouter basename="/AZN_ESTSv2">
      <Routes>
        <Route
          path="/login"
          element={
            user
              ? <Navigate to="/" />
              : <Login onLogin={handleLogin} apiBase={API_BASE} />
          }
        />
        <Route
          path="/"
          element={
            user
              ? <GameWrapper user={user} onLogout={handleLogout} apiBase={API_BASE} />
              : <Navigate to="/login" />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
