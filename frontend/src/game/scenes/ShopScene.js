import Phaser from 'phaser'
import { loadSave, purchaseUpgrade, getUpgradeCost, UPGRADE_DEFS } from '../SaveManager.js'

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene')
  }

  create() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height
    const cx = w / 2

    // Clean up on scene shutdown
    this.events.once('shutdown', () => {
      this.tweens.killAll()
      this.time.removeAllEvents()
    })

    // Background
    if (this.textures.exists('loading_bg')) {
      const bg = this.add.image(cx, h / 2, 'loading_bg')
      bg.setDisplaySize(w, h)
      bg.setTint(0x332244)
    }

    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.6)
    overlay.fillRect(0, 0, w, h)

    // Title
    this.add.text(cx, 30, 'UPGRADE SHOP', {
      fontSize: '28px',
      color: '#9b59b6',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5)

    // Gem display
    this.save = loadSave()
    this.gemText = this.add.text(cx, 58, '', {
      fontSize: '18px',
      color: '#9b59b6',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5)
    this.updateGemDisplay()

    // Upgrade grid
    const upgrades = Object.entries(UPGRADE_DEFS)
    const cols = 3
    const cardW = 200
    const cardH = 80
    const gapX = 20
    const gapY = 10
    const totalW = cols * cardW + (cols - 1) * gapX
    const startX = cx - totalW / 2 + cardW / 2
    const startY = 90

    this.upgradeCards = []

    upgrades.forEach(([key, def], i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = startX + col * (cardW + gapX)
      const y = startY + row * (cardH + gapY)

      const currentLevel = this.save.upgrades[key] || 0
      const cost = getUpgradeCost(key, currentLevel)
      const maxed = currentLevel >= def.maxLevel

      // Card background
      const bg = this.add.graphics()
      bg.fillStyle(maxed ? 0x1a3a1a : 0x16213e, 0.9)
      bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 6)
      bg.lineStyle(1, maxed ? 0x2ecc71 : 0x9b59b6, 0.5)
      bg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 6)

      // Icon
      if (this.textures.exists(def.icon)) {
        this.add.image(x - cardW / 2 + 25, y, def.icon)
          .setDisplaySize(28, 28)
      }

      // Name + description
      this.add.text(x - cardW / 2 + 45, y - 20, def.name, {
        fontSize: '12px', color: '#fff', fontStyle: 'bold',
      })
      this.add.text(x - cardW / 2 + 45, y - 5, def.desc, {
        fontSize: '9px', color: '#aaa',
      })

      // Level indicator
      const levelText = this.add.text(x - cardW / 2 + 45, y + 12, `Lv ${currentLevel}/${def.maxLevel}`, {
        fontSize: '10px', color: maxed ? '#2ecc71' : '#ddd',
      })

      // Buy button
      if (!maxed) {
        const canAfford = this.save.gems >= cost
        const buyBtn = this.add.text(x + cardW / 2 - 15, y + 12, `${cost}`, {
          fontSize: '11px',
          color: canAfford ? '#9b59b6' : '#555',
          fontStyle: 'bold',
        }).setOrigin(1, 0).setInteractive({ useHandCursor: canAfford })

        // Gem icon next to price
        this.add.text(x + cardW / 2 - 12, y + 12, '\u25C6', {
          fontSize: '10px', color: canAfford ? '#9b59b6' : '#555',
        })

        if (canAfford) {
          buyBtn.on('pointerdown', () => {
            const result = purchaseUpgrade(key)
            if (result) {
              this.save = result
              // Refresh the scene
              this.scene.restart()
            }
          })
          buyBtn.on('pointerover', () => buyBtn.setColor('#c39bd3'))
          buyBtn.on('pointerout', () => buyBtn.setColor('#9b59b6'))
        }

        this.upgradeCards.push({ key, bg, levelText, buyBtn })
      } else {
        this.add.text(x + cardW / 2 - 15, y + 12, 'MAX', {
          fontSize: '11px', color: '#2ecc71', fontStyle: 'bold',
        }).setOrigin(1, 0)
      }
    })

    // Back button — use asset if available
    if (this.textures.exists('back_button')) {
      const backImg = this.add.image(45, h - 28, 'back_button')
        .setDisplaySize(70, 30).setInteractive({ useHandCursor: true }).setDepth(10)
      backImg.on('pointerdown', () => {
        try { this.scene.start('LevelSelectScene') } catch (e) { this.scene.start('MenuScene') }
      })
      backImg.on('pointerover', () => backImg.setTint(0xddaa66))
      backImg.on('pointerout', () => backImg.clearTint())
    } else {
      const backBtn = this.add.text(60, h - 35, '< Back', {
        fontSize: '20px',
        color: '#aaa',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 2,
      }).setInteractive({ useHandCursor: true })
      backBtn.on('pointerdown', () => {
        try { this.scene.start('LevelSelectScene') } catch (e) { this.scene.start('MenuScene') }
      })
      backBtn.on('pointerover', () => backBtn.setColor('#9b59b6'))
      backBtn.on('pointerout', () => backBtn.setColor('#aaa'))
    }
  }

  updateGemDisplay() {
    this.gemText.setText(`\u25C6 ${this.save.gems} gems`)
  }
}
