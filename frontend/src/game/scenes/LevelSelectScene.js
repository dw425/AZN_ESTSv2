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
    this.add.text(cx, 30, 'SELECT LEVEL', {
      fontSize: '28px',
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
      this.add.image(w - 60, 30, 'hud_gem').setDisplaySize(18, 18).setDepth(5)
    }
    this.add.text(w - 45, 23, `${save.gems}`, {
      fontSize: '14px', color: '#9b59b6', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(5)

    // Pagination setup — 20 levels per page (5 cols x 4 rows)
    this.currentPage = 0
    this.levelsPerPage = 20
    this.totalPages = Math.ceil(LEVELS.length / this.levelsPerPage)
    this.save = save
    this.progress = progress
    this.pageContainer = null

    this.drawPage()

    // Page navigation arrows
    if (this.totalPages > 1) {
      const prevBtn = this.add.text(30, h / 2, '\u25C0', {
        fontSize: '30px', color: '#aaa', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10)
      prevBtn.on('pointerdown', () => { if (this.currentPage > 0) { this.currentPage--; this.drawPage() } })
      prevBtn.on('pointerover', () => prevBtn.setColor('#e94560'))
      prevBtn.on('pointerout', () => prevBtn.setColor('#aaa'))

      const nextBtn = this.add.text(w - 30, h / 2, '\u25B6', {
        fontSize: '30px', color: '#aaa', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10)
      nextBtn.on('pointerdown', () => { if (this.currentPage < this.totalPages - 1) { this.currentPage++; this.drawPage() } })
      nextBtn.on('pointerover', () => nextBtn.setColor('#e94560'))
      nextBtn.on('pointerout', () => nextBtn.setColor('#aaa'))

      // Page indicator
      this.pageText = this.add.text(cx, h - 55, '', {
        fontSize: '13px', color: '#888',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(10)
    }

    // Back button using asset
    if (this.textures.exists('back_button')) {
      const backImg = this.add.image(45, h - 30, 'back_button')
        .setDisplaySize(80, 35).setInteractive({ useHandCursor: true }).setDepth(10)
      backImg.on('pointerdown', () => this.scene.start('MenuScene'))
      backImg.on('pointerover', () => backImg.setTint(0xddaa66))
      backImg.on('pointerout', () => backImg.clearTint())
    } else {
      const backBtn = this.add.text(60, h - 35, '< Back', {
        fontSize: '20px', color: '#aaa', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setInteractive({ useHandCursor: true }).setDepth(10)
      backBtn.on('pointerdown', () => this.scene.start('MenuScene'))
      backBtn.on('pointerover', () => backBtn.setColor('#e94560'))
      backBtn.on('pointerout', () => backBtn.setColor('#aaa'))
    }

    // Difficulty popup container (hidden)
    this.diffPopup = null

    // Shop button
    const shopBtn = this.add.text(w - 80, h - 30, 'Shop', {
      fontSize: '18px',
      color: '#9b59b6',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 2,
    }).setInteractive({ useHandCursor: true }).setDepth(10)
    shopBtn.on('pointerdown', () => this.scene.start('ShopScene'))
    shopBtn.on('pointerover', () => shopBtn.setColor('#c39bd3'))
    shopBtn.on('pointerout', () => shopBtn.setColor('#9b59b6'))
  }

  drawPage() {
    if (this.pageContainer) this.pageContainer.destroy()
    this.pageContainer = this.add.container(0, 0).setDepth(5)

    const w = this.cameras.main.width
    const h = this.cameras.main.height
    const cx = w / 2
    const save = this.save
    const progress = this.progress
    const startIdx = this.currentPage * this.levelsPerPage
    const endIdx = Math.min(startIdx + this.levelsPerPage, LEVELS.length)
    const pageLevels = LEVELS.slice(startIdx, endIdx)

    const cols = 5
    const cardW = 105
    const cardH = 120
    const gap = 12
    const rows = Math.ceil(pageLevels.length / cols)
    const totalW = cols * cardW + (cols - 1) * gap
    const totalH = rows * cardH + (rows - 1) * gap
    const startX = cx - totalW / 2 + cardW / 2
    const startY = 60 + (h - 120 - totalH) / 2

    pageLevels.forEach((level, idx) => {
      const i = startIdx + idx
      const col = idx % cols
      const row = Math.floor(idx / cols)
      const x = startX + col * (cardW + gap)
      const y = startY + row * (cardH + gap)
      const unlocked = i < progress

      // Stone tablet background
      const iconKey = unlocked ? 'map_icon' : 'map_icon_locked'
      if (this.textures.exists(iconKey)) {
        const tablet = this.add.image(x, y - 8, iconKey).setDisplaySize(70, 80)
        if (!unlocked) tablet.setTint(0x555555)
        this.pageContainer.add(tablet)
      } else {
        const bg = this.add.graphics()
        bg.fillStyle(unlocked ? 0x16213e : 0x111111, 0.9)
        bg.fillRoundedRect(x - 40, y - 48, 80, 88, 6)
        if (unlocked) { bg.lineStyle(2, 0xe94560); bg.strokeRoundedRect(x - 40, y - 48, 80, 88, 6) }
        this.pageContainer.add(bg)
      }

      // World icon image
      const worldKey = `world_${level.world || (i + 1)}`
      if (unlocked && this.textures.exists(worldKey)) {
        this.pageContainer.add(this.add.image(x, y - 12, worldKey).setDisplaySize(52, 44))
      } else {
        this.pageContainer.add(this.add.text(x, y - 12, `${i + 1}`, {
          fontSize: '24px', color: unlocked ? '#fff' : '#444', fontStyle: 'bold',
          stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5))
      }

      // Level name
      this.pageContainer.add(this.add.text(x, y + 34, level.name, {
        fontSize: '11px', color: unlocked ? '#ddd' : '#555', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5))

      // Star display
      const starCount = save.levelStars[String(i)] || 0
      if (starCount > 0) {
        let starStr = ''
        for (let s = 0; s < 3; s++) starStr += s < starCount ? '\u2605' : '\u2606'
        this.pageContainer.add(this.add.text(x, y + 48, starStr, {
          fontSize: '11px', color: '#f1c40f', stroke: '#000', strokeThickness: 1,
        }).setOrigin(0.5))
      } else if (i < progress - 1) {
        this.pageContainer.add(this.add.text(x, y + 48, 'CLEAR', {
          fontSize: '9px', color: '#2ecc71', fontStyle: 'bold',
        }).setOrigin(0.5))
      }

      // Interactive zone
      if (unlocked) {
        const zone = this.add.zone(x, y, cardW, cardH).setInteractive({ useHandCursor: true })
        zone.on('pointerdown', () => this.showDifficultyPopup(i, save))
        this.pageContainer.add(zone)
      }
    })

    // Update page text
    if (this.pageText) {
      this.pageText.setText(`Page ${this.currentPage + 1} / ${this.totalPages}`)
    }
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
    panel.fillRoundedRect(-140, -100, 280, 210, 10)
    panel.lineStyle(2, 0xe94560)
    panel.strokeRoundedRect(-140, -100, 280, 210, 10)
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
      { key: 'inferno', label: 'Inferno', color: '#ff4500', desc: 'Minimal gold, 2x enemy HP' },
    ]

    difficulties.forEach((diff, i) => {
      const y = -30 + i * 30
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
