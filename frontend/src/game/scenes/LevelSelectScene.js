import Phaser from 'phaser'
import { LEVELS } from '../maps/levels.js'

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

    // Load progress
    const progress = this.registry.get('gameState')?.levelsUnlocked || 1

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

      // Completed indicator
      if (i < progress - 1) {
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
          this.scene.start('GameScene', { levelIndex: i })
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
  }
}
