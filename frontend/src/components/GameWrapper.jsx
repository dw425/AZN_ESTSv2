import React, { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { BootScene } from '../game/scenes/BootScene.js'
import { MenuScene } from '../game/scenes/MenuScene.js'
import { GameScene } from '../game/scenes/GameScene.js'
import { LevelSelectScene } from '../game/scenes/LevelSelectScene.js'
import SaveManager from './SaveManager.jsx'

export default function GameWrapper({ user, onLogout, apiBase }) {
  const gameRef = useRef(null)
  const containerRef = useRef(null)
  const [showSaves, setShowSaves] = useState(false)

  useEffect(() => {
    if (gameRef.current) return

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 960,
      height: 640,
      backgroundColor: '#1a1a2e',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [BootScene, MenuScene, LevelSelectScene, GameScene],
      physics: {
        default: 'arcade',
        arcade: { debug: false },
      },
      input: {
        activePointers: 3,
      },
    }

    gameRef.current = new Phaser.Game(config)

    // Pass user data to the game registry for save/load
    gameRef.current.registry.set('user', user)
    gameRef.current.registry.set('apiBase', apiBase)

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* HUD overlay */}
      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        display: 'flex',
        gap: '8px',
        zIndex: 10,
      }}>
        <button
          onClick={() => setShowSaves(true)}
          style={hudButton}
        >
          Save/Load
        </button>
        <button
          onClick={onLogout}
          style={{ ...hudButton, background: 'rgba(233,69,96,0.8)' }}
        >
          Logout
        </button>
      </div>

      {showSaves && (
        <SaveManager
          user={user}
          apiBase={apiBase}
          game={gameRef.current}
          onClose={() => setShowSaves(false)}
        />
      )}
    </div>
  )
}

const hudButton = {
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(22,33,62,0.8)',
  color: '#e0e0e0',
  fontSize: '0.8rem',
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
}
