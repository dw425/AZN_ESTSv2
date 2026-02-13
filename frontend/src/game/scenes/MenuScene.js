import Phaser from 'phaser'
import { loadSave } from '../SaveManager.js'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene')
  }

  create() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height
    const cx = w / 2
    const cy = h / 2

    // Clean up on scene shutdown
    this.events.on('shutdown', () => {
      this.stopMenuMusic()
      this.tweens.killAll()
      this.time.removeAllEvents()
    })

    // Background
    if (this.textures.exists('menu_bg')) {
      const bg = this.add.image(cx, cy, 'menu_bg')
      bg.setDisplaySize(w, h)
    }

    // Title logo
    if (this.textures.exists('title_logo')) {
      this.add.image(cx, cy - 100, 'title_logo').setScale(0.5)
    } else {
      this.add.text(cx, cy - 120, "TOWERS N' TROLLS", {
        fontSize: '48px',
        fontFamily: 'Georgia, serif',
        color: '#e94560',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5)
    }

    // Play button — use wood panel asset if available
    const btnKey = this.textures.exists('wood_button') ? 'wood_button' : 'button'
    const playBtn = this.add.image(cx, cy + 50, btnKey)
      .setDisplaySize(180, 55)
      .setInteractive({ useHandCursor: true })
    this.add.text(cx, cy + 50, 'PLAY', {
      fontSize: '24px',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5)

    playBtn.on('pointerover', () => playBtn.setTint(0xddaa66))
    playBtn.on('pointerout', () => playBtn.clearTint())
    playBtn.on('pointerdown', () => {
      this.scene.start('LevelSelectScene')
    })

    // Start menu music (only if not already playing)
    this.startMenuMusic()

    // Stats button
    const statsBtn = this.add.text(cx, cy + 110, 'STATS', {
      fontSize: '16px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      color: '#f1c40f', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    statsBtn.on('pointerover', () => statsBtn.setColor('#fff'))
    statsBtn.on('pointerout', () => statsBtn.setColor('#f1c40f'))
    statsBtn.on('pointerdown', () => {
      this.scene.start('StatsScene')
    })

    // Settings button
    const settingsBtn = this.add.text(cx, cy + 145, 'SETTINGS', {
      fontSize: '16px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      color: '#aaa', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    settingsBtn.on('pointerover', () => settingsBtn.setColor('#fff'))
    settingsBtn.on('pointerout', () => settingsBtn.setColor('#aaa'))
    settingsBtn.on('pointerdown', () => {
      this.scene.start('SettingsScene')
    })

    // Credits
    this.add.text(cx, cy + 180, 'Inspired by Towers N\' Trolls by Ember Entertainment', {
      fontSize: '12px',
      color: '#aaa',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5)

    this.add.text(cx, h - 15, 'v2.0.0 | Web Edition', {
      fontSize: '11px',
      color: '#666',
      stroke: '#000',
      strokeThickness: 1,
    }).setOrigin(0.5)
  }

  startMenuMusic() {
    try {
      // Check if music is already playing globally to prevent duplicates
      const existing = this.sound.get('music_menu')
      if (existing && existing.isPlaying) {
        this.menuMusic = existing
        return
      }
      // Stop and destroy any stopped music instance to prevent memory leak
      this.stopMenuMusic()
      if (existing) existing.destroy()
      if (this.cache.audio.exists('music_menu')) {
        const save = loadSave()
        const musicVol = save.settings ? save.settings.musicVolume : 0.3
        this.menuMusic = this.sound.add('music_menu', { loop: true, volume: musicVol })
        this.menuMusic.play()
      }
    } catch (e) { /* audio not available */ }
  }

  stopMenuMusic() {
    try {
      if (this.menuMusic && this.menuMusic.isPlaying) this.menuMusic.stop()
    } catch (e) { /* ignore */ }
  }
}
