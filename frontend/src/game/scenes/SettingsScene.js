import Phaser from 'phaser'
import { loadSave, saveSave, SAVE_KEY } from '../SaveManager.js'

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene')
  }

  create() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height
    const cx = w / 2

    this.events.on('shutdown', () => {
      saveSave(this.save)
      this.tweens.killAll()
      this.time.removeAllEvents()
    })
    this._confirmReset = false

    // Background
    if (this.textures.exists('loading_bg')) {
      const bg = this.add.image(cx, h / 2, 'loading_bg')
      bg.setDisplaySize(w, h)
      bg.setTint(0x333355)
    }

    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.6)
    overlay.fillRect(0, 0, w, h)

    // Title
    this.add.text(cx, 35, 'SETTINGS', {
      fontSize: '28px',
      color: '#e94560',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5)

    // Load current settings
    this.save = loadSave()
    if (!this.save.settings) {
      this.save.settings = { musicVolume: 0.3, sfxVolume: 0.5, showDamageNumbers: true, showTutorials: true }
    }
    const settings = this.save.settings

    let y = 100

    // Music Volume slider
    this.createSlider(cx, y, 'Music Volume', settings.musicVolume, (val) => {
      settings.musicVolume = val
      // Adjust only currently playing music tracks, not global volume
      this.sound.sounds.forEach(s => {
        if (s.key && s.key.startsWith('music_')) s.setVolume(val)
      })
    })
    y += 70

    // SFX Volume slider
    this.createSlider(cx, y, 'SFX Volume', settings.sfxVolume, (val) => {
      settings.sfxVolume = val
    })
    y += 70

    // Show Damage Numbers toggle
    this.createToggle(cx, y, 'Show Damage Numbers', settings.showDamageNumbers, (val) => {
      settings.showDamageNumbers = val
    })
    y += 50

    // Show Tutorials toggle
    this.createToggle(cx, y, 'Show Tutorials', settings.showTutorials, (val) => {
      settings.showTutorials = val
    })
    y += 50

    // Reset Tutorials button
    const resetBtn = this.add.text(cx, y, 'Reset All Tutorials', {
      fontSize: '14px', color: '#f39c12', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    resetBtn.on('pointerdown', () => {
      this.save.tutorialsSeen = {}
      saveSave(this.save)
      this.showFloatingText(cx, y - 20, 'Tutorials Reset!', '#2ecc71')
    })
    resetBtn.on('pointerover', () => resetBtn.setColor('#fff'))
    resetBtn.on('pointerout', () => resetBtn.setColor('#f39c12'))
    y += 50

    // Reset All Progress button
    const resetAllBtn = this.add.text(cx, y, 'RESET ALL PROGRESS', {
      fontSize: '14px', color: '#e74c3c', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    resetAllBtn.on('pointerdown', () => {
      if (this._confirmReset) {
        localStorage.removeItem(SAVE_KEY)
        this.showFloatingText(cx, y - 20, 'Progress Reset! Restarting...', '#e74c3c')
        this.time.delayedCall(1500, () => this.scene.start('MenuScene'))
      } else {
        this._confirmReset = true
        resetAllBtn.setText('TAP AGAIN TO CONFIRM')
        this.time.delayedCall(3000, () => {
          this._confirmReset = false
          resetAllBtn.setText('RESET ALL PROGRESS')
        })
      }
    })
    resetAllBtn.on('pointerover', () => resetAllBtn.setAlpha(0.7))
    resetAllBtn.on('pointerout', () => resetAllBtn.setAlpha(1))

    // Back button
    if (this.textures.exists('back_button')) {
      const backImg = this.add.image(45, h - 28, 'back_button')
        .setDisplaySize(70, 30).setInteractive({ useHandCursor: true }).setDepth(10)
      backImg.on('pointerdown', () => {
        saveSave(this.save)
        this.scene.start('MenuScene')
      })
      backImg.on('pointerover', () => backImg.setTint(0xddaa66))
      backImg.on('pointerout', () => backImg.clearTint())
    } else {
      const backBtn = this.add.text(50, h - 32, '< Back', {
        fontSize: '16px', color: '#aaa', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setInteractive({ useHandCursor: true }).setDepth(10)
      backBtn.on('pointerdown', () => {
        saveSave(this.save)
        this.scene.start('MenuScene')
      })
      backBtn.on('pointerover', () => backBtn.setColor('#e94560'))
      backBtn.on('pointerout', () => backBtn.setColor('#aaa'))
    }
  }

  createSlider(cx, y, label, initialValue, onChange) {
    this.add.text(cx, y - 15, label, {
      fontSize: '14px', color: '#fff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5)

    const sliderW = 200
    const sliderX = cx - sliderW / 2
    const sliderY = y + 10

    // Track
    const track = this.add.graphics()
    track.fillStyle(0x333333)
    track.fillRoundedRect(sliderX, sliderY - 3, sliderW, 6, 3)

    // Fill
    const fill = this.add.graphics()
    const drawFill = (val) => {
      fill.clear()
      fill.fillStyle(0xe94560)
      fill.fillRoundedRect(sliderX, sliderY - 3, sliderW * val, 6, 3)
    }
    drawFill(initialValue)

    // Handle
    const handleX = sliderX + sliderW * initialValue
    const handle = this.add.graphics()
    handle.fillStyle(0xffffff)
    handle.fillCircle(0, 0, 8)
    handle.setPosition(handleX, sliderY)

    // Value text
    const valText = this.add.text(cx + sliderW / 2 + 25, sliderY, `${Math.round(initialValue * 100)}%`, {
      fontSize: '12px', color: '#ccc',
    }).setOrigin(0, 0.5)

    // Interactive zone
    const zone = this.add.zone(cx, sliderY, sliderW + 20, 30).setInteractive()
    zone.on('pointerdown', (pointer) => {
      const val = Phaser.Math.Clamp((pointer.x - sliderX) / sliderW, 0, 1)
      handle.setPosition(sliderX + sliderW * val, sliderY)
      drawFill(val)
      valText.setText(`${Math.round(val * 100)}%`)
      onChange(Math.round(val * 100) / 100)
    })
    zone.on('pointermove', (pointer) => {
      if (!pointer.isDown) return
      const val = Phaser.Math.Clamp((pointer.x - sliderX) / sliderW, 0, 1)
      handle.setPosition(sliderX + sliderW * val, sliderY)
      drawFill(val)
      valText.setText(`${Math.round(val * 100)}%`)
      onChange(Math.round(val * 100) / 100)
    })
  }

  createToggle(cx, y, label, initialValue, onChange) {
    this.add.text(cx - 60, y, label, {
      fontSize: '14px', color: '#fff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(1, 0.5)

    let value = initialValue
    const btn = this.add.text(cx + 60, y, value ? 'ON' : 'OFF', {
      fontSize: '16px',
      color: value ? '#2ecc71' : '#e74c3c',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 2,
      backgroundColor: '#16213e',
      padding: { x: 12, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    btn.on('pointerdown', () => {
      value = !value
      btn.setText(value ? 'ON' : 'OFF')
      btn.setColor(value ? '#2ecc71' : '#e74c3c')
      onChange(value)
    })
  }

  showFloatingText(x, y, text, color) {
    const ft = this.add.text(x, y, text, {
      fontSize: '14px', color, fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(25)
    this.tweens.add({
      targets: ft, y: y - 30, alpha: 0, duration: 800,
      onComplete: () => ft.destroy(),
    })
  }
}
