import React, { useState } from 'react'
import axios from 'axios'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    color: '#e0e0e0',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: '0.5rem',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#888',
    marginBottom: '2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '300px',
    padding: '2rem',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #333',
    background: '#1a1a2e',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
  },
  button: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: '#e94560',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  toggle: {
    marginTop: '1rem',
    color: '#888',
    cursor: 'pointer',
    fontSize: '0.9rem',
    background: 'none',
    border: 'none',
  },
  error: {
    color: '#ff6b6b',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
}

export default function Login({ onLogin, onPlayAsGuest, apiBase }) {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'
      const res = await axios.post(`${apiBase}${endpoint}`, { username, password })
      onLogin({ username, token: res.data.token })
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Towers N' Trolls</div>
      <div style={styles.subtitle}>Tower Defense</div>
      <form style={styles.form} onSubmit={handleSubmit}>
        <input
          style={styles.input}
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div style={styles.error}>{error}</div>}
        <button style={styles.button} type="submit">
          {isRegister ? 'Create Account' : 'Login'}
        </button>
        <button
          style={styles.toggle}
          type="button"
          onClick={() => { setIsRegister(!isRegister); setError('') }}
        >
          {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
        </button>
      </form>
      <button
        style={{ ...styles.button, marginTop: '1.5rem', width: '300px', background: '#0f3460' }}
        onClick={onPlayAsGuest}
      >
        Play as Guest
      </button>
      <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.5rem' }}>
        Guest mode — no cloud saves
      </div>
    </div>
  )
}
