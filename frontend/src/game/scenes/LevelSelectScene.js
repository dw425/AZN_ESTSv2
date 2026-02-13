import Phaser from 'phaser'
import { LEVELS } from '../maps/levels.js'

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene')
  }

  create() {
    const cx = this.cameras.main.centerX

    this.add.text(cx, 40, 'SELECT LEVEL', {
      fontSize: '32px',
      color: '#e94560',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5)

    // Load progress from registry or default
    const progress = this.registry.get('gameState')?.levelsUnlocked || 1

    const cols = 5
    const startX = cx - (cols - 1) * 55
    const startY = 100

    LEVELS.forEach((level, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = startX + col * 110
      const y = startY + row * 110
      const unlocked = i < progress

      const bg = this.add.graphics()
      if (unlocked) {
        bg.fillStyle(0x16213e)
        bg.fillRoundedRect(x - 40, y - 30, 80, 80, 8)
        bg.lineStyle(2, 0xe94560)
        bg.strokeRoundedRect(x - 40, y - 30, 80, 80, 8)
      } else {
        bg.fillStyle(0x111111)
        bg.fillRoundedRect(x - 40, y - 30, 80, 80, 8)
      }

      const label = this.add.text(x, y, `${i + 1}`, {
        fontSize: '28px',
        color: unlocked ? '#fff' : '#444',
        fontStyle: 'bold',
      }).setOrigin(0.5)

      const name = this.add.text(x, y + 25, level.name, {
        fontSize: '10px',
        color: unlocked ? '#aaa' : '#333',
      }).setOrigin(0.5)

      if (unlocked) {
        const zone = this.add.zone(x, y + 10, 80, 80).setInteractive({ useHandCursor: true })
        zone.on('pointerdown', () => {
          this.scene.start('GameScene', { levelIndex: i })
        })
        zone.on('pointerover', () => bg.setAlpha(0.7))
        zone.on('pointerout', () => bg.setAlpha(1))
      }
    })

    // Back button
    const backBtn = this.add.text(60, this.cameras.main.height - 40, '< Back', {
      fontSize: '18px',
      color: '#888',
    }).setInteractive({ useHandCursor: true })
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'))
    backBtn.on('pointerover', () => backBtn.setColor('#e94560'))
    backBtn.on('pointerout', () => backBtn.setColor('#888'))
  }
}
