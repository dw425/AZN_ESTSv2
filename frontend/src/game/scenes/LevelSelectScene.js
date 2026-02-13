import Phaser from 'phaser'
import { LEVELS } from '../maps/levels.js'
import { loadSave } from '../SaveManager.js'

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene')
  }

  create() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height
    const cx = w / 2

    // Background
    if (this.textures.exists('loading_bg')) {
      const bg = this.add.image(cx, h / 2, 'loading_bg')
      bg.setDisplaySize(w, h)
      bg.setTint(0x444466)
    }

    // Dark overlay for readability
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.5)
    overlay.fillRect(0, 0, w, h)

    // Title
    this.add.text(cx, 35, 'SELECT LEVEL', {
      fontSize: '32px',
      color: '#e94560',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5)

    // Load progress from persistent save
    const save = loadSave()
    const progress = save.levelsUnlocked || 1

    // Show gem count
    if (this.textures.exists('hud_gem')) {
      this.add.image(w - 60, 35, 'hud_gem').setDisplaySize(20, 20).setDepth(5)
    }
    this.add.text(w - 45, 27, `${save.gems}`, {
      fontSize: '16px', color: '#9b59b6', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(5)

    // Layout: center the level cards
    const cardW = 120
    const cardH = 140
    const gap = 20
    const cols = Math.min(LEVELS.length, 5)
    const rows = Math.ceil(LEVELS.length / cols)
    const totalW = cols * cardW + (cols - 1) * gap
    const totalH = rows * cardH + (rows - 1) * gap
    const startX = cx - totalW / 2 + cardW / 2
    const startY = (h - totalH) / 2 + 30

    LEVELS.forEach((level, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = startX + col * (cardW + gap)
      const y = startY + row * (cardH + gap)
      const unlocked = i < progress

      // Stone tablet background (map_icon or map_icon_locked)
      const iconKey = unlocked ? 'map_icon' : 'map_icon_locked'
      if (this.textures.exists(iconKey)) {
        const tablet = this.add.image(x, y - 10, iconKey)
          .setDisplaySize(80, 90)
        if (!unlocked) tablet.setTint(0x555555)
      } else {
        // Fallback colored box
        const bg = this.add.graphics()
        bg.fillStyle(unlocked ? 0x16213e : 0x111111, 0.9)
        bg.fillRoundedRect(x - 45, y - 55, 90, 100, 8)
        if (unlocked) {
          bg.lineStyle(2, 0xe94560)
          bg.strokeRoundedRect(x - 45, y - 55, 90, 100, 8)
        }
      }

      // World icon image on top of the tablet
      const worldKey = `world_${level.world || (i + 1)}`
      if (unlocked && this.textures.exists(worldKey)) {
        this.add.image(x, y - 15, worldKey)
          .setDisplaySize(60, 50)
          .setDepth(2)
      } else {
        // Level number fallback
        this.add.text(x, y - 15, `${i + 1}`, {
          fontSize: '28px',
          color: unlocked ? '#fff' : '#444',
          fontStyle: 'bold',
          stroke: '#000',
          strokeThickness: 2,
        }).setOrigin(0.5).setDepth(2)
      }

      // Level name
      this.add.text(x, y + 40, level.name, {
        fontSize: '13px',
        color: unlocked ? '#ddd' : '#555',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(2)

      // Star display for completed levels
      const starCount = save.levelStars[String(i)] || 0
      if (starCount > 0) {
        let starStr = ''
        for (let s = 0; s < 3; s++) {
          starStr += s < starCount ? '\u2605' : '\u2606'
        }
        this.add.text(x, y + 55, starStr, {
          fontSize: '12px',
          color: '#f1c40f',
          stroke: '#000',
          strokeThickness: 1,
        }).setOrigin(0.5).setDepth(2)
      } else if (i < progress - 1) {
        this.add.text(x, y + 55, 'CLEAR', {
          fontSize: '10px',
          color: '#2ecc71',
          fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(2)
      }

      // Interactive zone
      if (unlocked) {
        const zone = this.add.zone(x, y, cardW, cardH).setInteractive({ useHandCursor: true })
        zone.on('pointerover', () => {
          this.tweens.add({ targets: zone, scaleX: 1.05, scaleY: 1.05, duration: 100 })
        })
        zone.on('pointerout', () => {
          this.tweens.add({ targets: zone, scaleX: 1, scaleY: 1, duration: 100 })
        })
        zone.on('pointerdown', () => {
          this.showDifficultyPopup(i, save)
        })
      }
    })

    // Back button
    const backBtn = this.add.text(60, h - 35, '< Back', {
      fontSize: '20px',
      color: '#aaa',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 2,
    }).setInteractive({ useHandCursor: true })
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'))
    backBtn.on('pointerover', () => backBtn.setColor('#e94560'))
    backBtn.on('pointerout', () => backBtn.setColor('#aaa'))

    // Difficulty popup container (hidden)
    this.diffPopup = null

    // Shop button
    const shopBtn = this.add.text(w - 80, h - 35, 'Shop', {
      fontSize: '20px',
      color: '#9b59b6',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 2,
    }).setInteractive({ useHandCursor: true })
    shopBtn.on('pointerdown', () => this.scene.start('ShopScene'))
    shopBtn.on('pointerover', () => shopBtn.setColor('#c39bd3'))
    shopBtn.on('pointerout', () => shopBtn.setColor('#9b59b6'))
  }

  showDifficultyPopup(levelIndex, save) {
    if (this.diffPopup) this.diffPopup.destroy()

    const cx = this.cameras.main.width / 2
    const cy = this.cameras.main.height / 2

    const container = this.add.container(cx, cy).setDepth(50)

    // Backdrop
    const backdrop = this.add.graphics()
    backdrop.fillStyle(0x000000, 0.7)
    backdrop.fillRect(-cx, -cy, cx * 2, cy * 2)
    container.add(backdrop)

    // Panel
    const panel = this.add.graphics()
    panel.fillStyle(0x16213e, 0.95)
    panel.fillRoundedRect(-140, -90, 280, 180, 10)
    panel.lineStyle(2, 0xe94560)
    panel.strokeRoundedRect(-140, -90, 280, 180, 10)
    container.add(panel)

    const levelName = LEVELS[levelIndex]?.name || `Level ${levelIndex + 1}`
    container.add(this.add.text(0, -70, levelName, {
      fontSize: '20px', color: '#fff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5))

    const difficulties = [
      { key: 'casual', label: 'Casual', color: '#2ecc71', desc: 'More gold, more lives' },
      { key: 'normal', label: 'Normal', color: '#f1c40f', desc: 'Standard challenge' },
      { key: 'brutal', label: 'Brutal', color: '#e74c3c', desc: 'Less gold, tougher enemies' },
    ]

    difficulties.forEach((diff, i) => {
      const y = -25 + i * 35
      const starKey = `${levelIndex}_${diff.key}`
      const stars = save.levelStars[starKey] || 0
      let starStr = ''
      for (let s = 0; s < 3; s++) starStr += s < stars ? '\u2605' : '\u2606'

      const btn = this.add.text(-100, y, `${diff.label}  ${starStr}`, {
        fontSize: '16px', color: diff.color, fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true })

      btn.on('pointerdown', () => {
        this.scene.start('GameScene', { levelIndex, difficulty: diff.key })
      })
      btn.on('pointerover', () => btn.setAlpha(0.7))
      btn.on('pointerout', () => btn.setAlpha(1))
      container.add(btn)

      container.add(this.add.text(100, y + 2, diff.desc, {
        fontSize: '10px', color: '#888',
      }).setOrigin(1, 0))
    })

    // Close button
    const closeBtn = this.add.text(120, -80, 'X', {
      fontSize: '18px', color: '#888', fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true })
    closeBtn.on('pointerdown', () => container.destroy())
    container.add(closeBtn)

    this.diffPopup = container
  }
}
