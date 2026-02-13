import React, { useState, useEffect } from 'react'
import axios from 'axios'

const LOCAL_SAVES_KEY = 'tnt_local_saves'

function getLocalSaves() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_SAVES_KEY)) || []
  } catch { return [] }
}

function setLocalSaves(saves) {
  localStorage.setItem(LOCAL_SAVES_KEY, JSON.stringify(saves))
}

export default function SaveManager({ user, apiBase, game, onClose }) {
  const [saves, setSaves] = useState([])
  const [loading, setLoading] = useState(true)
  const isGuest = !user.token

  const headers = user.token ? { Authorization: `Bearer ${user.token}` } : {}

  useEffect(() => {
    loadSaves()
  }, [])

  const loadSaves = async () => {
    if (isGuest) {
      setSaves(getLocalSaves())
      setLoading(false)
      return
    }
    try {
      const res = await axios.get(`${apiBase}/api/saves`, { headers })
      setSaves(res.data.saves || [])
    } catch (err) {
      // Fall back to local saves if backend is unavailable
      console.warn('Cloud saves unavailable, using local saves')
      setSaves(getLocalSaves())
    }
    setLoading(false)
  }

  const saveGame = async () => {
    const gameState = game?.registry?.get('gameState')
    if (!gameState) {
      alert('No active game to save')
      return
    }

    const newSave = {
      id: Date.now().toString(),
      name: `Save ${new Date().toLocaleString()}`,
      data: gameState,
      created_at: new Date().toISOString(),
    }

    if (isGuest) {
      const local = getLocalSaves()
      local.unshift(newSave)
      setLocalSaves(local)
      setSaves(local)
      return
    }

    try {
      await axios.post(`${apiBase}/api/saves`, {
        name: newSave.name,
        data: gameState,
      }, { headers })
      loadSaves()
    } catch (err) {
      // Fall back to local save
      console.warn('Cloud save failed, saving locally')
      const local = getLocalSaves()
      local.unshift(newSave)
      setLocalSaves(local)
      setSaves(local)
    }
  }

  const loadGame = async (save) => {
    let data = save.data

    if (!isGuest && !save.local) {
      try {
        const res = await axios.get(`${apiBase}/api/saves/${save.id}`, { headers })
        data = res.data.save.data
      } catch (err) {
        console.warn('Cloud load failed, using cached data')
      }
    }

    game?.registry?.set('loadedState', data)
    game?.registry?.set('gameState', data)
    // Go to level select so player can resume from their unlocked levels
    game?.scene?.getScene('LevelSelectScene')?.scene?.start('LevelSelectScene')
    if (!game?.scene?.getScene('LevelSelectScene')?.scene?.isActive('LevelSelectScene')) {
      game?.scene?.start('LevelSelectScene')
    }
    onClose()
  }

  const deleteSave = async (saveId) => {
    if (isGuest) {
      const local = getLocalSaves().filter(s => s.id !== saveId)
      setLocalSaves(local)
      setSaves(local)
      return
    }

    try {
      await axios.delete(`${apiBase}/api/saves/${saveId}`, { headers })
      loadSaves()
    } catch (err) {
      // Fall back to local delete
      const local = getLocalSaves().filter(s => s.id !== saveId)
      setLocalSaves(local)
      setSaves(local)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, color: '#e94560' }}>Save / Load Game</h2>
          <button onClick={onClose} style={closeBtn}>X</button>
        </div>

        {isGuest && (
          <div style={{ fontSize: '0.8rem', color: '#f39c12', marginBottom: '0.75rem', padding: '8px', background: 'rgba(243,156,18,0.1)', borderRadius: '6px' }}>
            Saves stored locally on this device. Login for cross-device cloud saves.
          </div>
        )}

        <button onClick={saveGame} style={saveBtn}>Save Current Game</button>

        <div style={{ marginTop: '1rem' }}>
          {loading ? (
            <p style={{ color: '#888' }}>Loading saves...</p>
          ) : saves.length === 0 ? (
            <p style={{ color: '#888' }}>No saves yet. Play a level and save your progress!</p>
          ) : (
            saves.map((s) => (
              <div key={s.id} style={saveRow}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{s.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>
                    Level {s.data?.currentLevel || '?'} | Gold: {s.data?.gold || 0}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => loadGame(s)} style={loadBtn}>Load</button>
                  <button onClick={() => deleteSave(s.id)} style={delBtn}>Del</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
}
const modal = {
  background: '#16213e', borderRadius: '12px', padding: '1.5rem',
  width: '90%', maxWidth: '420px', maxHeight: '80vh', overflowY: 'auto',
  color: '#e0e0e0', border: '1px solid rgba(255,255,255,0.1)',
}
const closeBtn = {
  background: 'none', border: 'none', color: '#888', fontSize: '1.2rem', cursor: 'pointer',
}
const saveBtn = {
  width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
  background: '#e94560', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem',
}
const saveRow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginTop: '8px',
}
const loadBtn = {
  padding: '4px 12px', borderRadius: '4px', border: 'none',
  background: '#0f3460', color: '#fff', cursor: 'pointer',
}
const delBtn = {
  padding: '4px 12px', borderRadius: '4px', border: 'none',
  background: '#600f0f', color: '#fff', cursor: 'pointer',
}
