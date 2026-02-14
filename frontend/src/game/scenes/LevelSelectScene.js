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

    // Clean up on scene shutdown
    this.events.on('shutdown', () => {
      this.tweens.killAll()
      this.time.removeAllEvents()
    })

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

    // Title — positioned safely below top edge
    this.add.text(cx, 28, 'SELECT LEVEL', {
      fontSize: '24px',
      color: '#e94560',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5)

    // Load progress from persistent save
    const save = loadSave()
    const progress = save.levelsUnlocked || 1

    // Show gem count
    if (this.textures.exists('hud_gem')) {
      this.add.image(w - 60, 28, 'hud_gem').setDisplaySize(16, 16).setDepth(5)
    }
    this.add.text(w - 45, 21, `${save.gems}`, {
      fontSize: '13px', color: '#9b59b6', fontStyle: 'bold',
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
      const prevBtn = this.add.text(20, h / 2, '\u25C0', {
        fontSize: '24px', color: '#aaa', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10)
      prevBtn.on('pointerdown', () => { if (this.currentPage > 0) { this.currentPage--; this.drawPage() } })
      prevBtn.on('pointerover', () => prevBtn.setColor('#e94560'))
      prevBtn.on('pointerout', () => prevBtn.setColor('#aaa'))

      const nextBtn = this.add.text(w - 20, h / 2, '\u25B6', {
        fontSize: '24px', color: '#aaa', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10)
      nextBtn.on('pointerdown', () => { if (this.currentPage < this.totalPages - 1) { this.currentPage++; this.drawPage() } })
      nextBtn.on('pointerover', () => nextBtn.setColor('#e94560'))
      nextBtn.on('pointerout', () => nextBtn.setColor('#aaa'))

      // Page indicator
      this.pageText = this.add.text(cx, h - 50, '', {
        fontSize: '12px', color: '#888',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(10)
    }

    // Back button using asset
    if (this.textures.exists('back_button')) {
      const backImg = this.add.image(45, h - 28, 'back_button')
        .setDisplaySize(70, 30).setInteractive({ useHandCursor: true }).setDepth(10)
      backImg.on('pointerdown', () => this.scene.start('MenuScene'))
      backImg.on('pointerover', () => backImg.setTint(0xddaa66))
      backImg.on('pointerout', () => backImg.clearTint())
    } else {
      const backBtn = this.add.text(50, h - 32, '< Back', {
        fontSize: '16px', color: '#aaa', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setInteractive({ useHandCursor: true }).setDepth(10)
      backBtn.on('pointerdown', () => this.scene.start('MenuScene'))
      backBtn.on('pointerover', () => backBtn.setColor('#e94560'))
      backBtn.on('pointerout', () => backBtn.setColor('#aaa'))
    }

    // Difficulty popup container (hidden)
    this.diffPopup = null

    // Endless mode button — shows difficulty popup with endless flag
    this.endlessMode = false
    const endlessBtn = this.add.text(cx, h - 28, '\u221E Endless', {
      fontSize: '14px', color: '#ff4500', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10)
    endlessBtn.on('pointerdown', () => {
      this.endlessMode = !this.endlessMode
      endlessBtn.setColor(this.endlessMode ? '#fff' : '#ff4500')
      endlessBtn.setText(this.endlessMode ? '\u221E ENDLESS ON' : '\u221E Endless')
    })
    endlessBtn.on('pointerover', () => endlessBtn.setAlpha(0.7))
    endlessBtn.on('pointerout', () => endlessBtn.setAlpha(1))

    // Shop button
    const shopBtn = this.add.text(w - 70, h - 28, 'Shop', {
      fontSize: '16px',
      color: '#9b59b6',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10)
    shopBtn.on('pointerdown', () => this.scene.start('ShopScene'))
    shopBtn.on('pointerover', () => shopBtn.setColor('#c39bd3'))
    shopBtn.on('pointerout', () => shopBtn.setColor('#9b59b6'))
  }

  drawPage() {
    if (this.diffPopup) { this.diffPopup.destroy(); this.diffPopup = null }
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

    // Layout: 5 columns, up to 4 rows
    // Available area: top=55, bottom=h-65, sides=45
    const cols = 5
    const topMargin = 55
    const bottomMargin = h - 60
    const sideMargin = 45
    const availW = w - sideMargin * 2
    const availH = bottomMargin - topMargin
    const rows = Math.ceil(pageLevels.length / cols)

    const cardW = Math.min(90, (availW - (cols - 1) * 8) / cols)
    const cardH = Math.min(100, (availH - (rows - 1) * 6) / rows)
    const gapX = (availW - cols * cardW) / Math.max(cols - 1, 1)
    const gapY = (availH - rows * cardH) / Math.max(rows - 1, 1)

    const startX = sideMargin + cardW / 2
    const startY = topMargin + cardH / 2

    pageLevels.forEach((level, idx) => {
      const i = startIdx + idx
      const col = idx % cols
      const row = Math.floor(idx / cols)
      const x = startX + col * (cardW + gapX)
      const y = startY + row * (cardH + gapY)
      const unlocked = i < progress

      // Card background — use map icons if available
      const iconKey = unlocked ? 'map_icon' : 'map_icon_locked'
      if (this.textures.exists(iconKey)) {
        const tablet = this.add.image(x, y - 5, iconKey).setDisplaySize(cardW * 0.75, cardH * 0.7)
        if (!unlocked) tablet.setTint(0x555555)
        this.pageContainer.add(tablet)
      } else {
        const bg = this.add.graphics()
        bg.fillStyle(unlocked ? 0x16213e : 0x111111, 0.9)
        bg.fillRoundedRect(x - cardW / 2 + 4, y - cardH / 2 + 2, cardW - 8, cardH - 8, 5)
        if (unlocked) { bg.lineStyle(1, 0xe94560, 0.6); bg.strokeRoundedRect(x - cardW / 2 + 4, y - cardH / 2 + 2, cardW - 8, cardH - 8, 5) }
        this.pageContainer.add(bg)
      }

      // World icon image or level number
      const worldKey = `world_${level.world || (i + 1)}`
      if (unlocked && this.textures.exists(worldKey)) {
        this.pageContainer.add(this.add.image(x, y - 8, worldKey).setDisplaySize(cardW * 0.5, cardH * 0.35))
      } else {
        this.pageContainer.add(this.add.text(x, y - 10, `${i + 1}`, {
          fontSize: '18px', color: unlocked ? '#fff' : '#444', fontStyle: 'bold',
          stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5))
      }

      // Level name
      this.pageContainer.add(this.add.text(x, y + cardH * 0.28, level.name, {
        fontSize: '11px', color: unlocked ? '#ddd' : '#555', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5))

      // Star display
      const starCount = save.levelStars[String(i)] || 0
      if (starCount > 0) {
        let starStr = ''
        for (let s = 0; s < 3; s++) starStr += s < starCount ? '\u2605' : '\u2606'
        this.pageContainer.add(this.add.text(x, y + cardH * 0.4, starStr, {
          fontSize: '9px', color: '#f1c40f', stroke: '#000', strokeThickness: 1,
        }).setOrigin(0.5))
      }

      // Interactive zone for unlocked levels
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

    // Backdrop — interactive so clicking outside panel closes popup
    const backdrop = this.add.graphics()
    backdrop.fillStyle(0x000000, 0.7)
    backdrop.fillRect(-cx, -cy, cx * 2, cy * 2)
    backdrop.setInteractive(new Phaser.Geom.Rectangle(-cx, -cy, cx * 2, cy * 2), Phaser.Geom.Rectangle.Contains)
    backdrop.on('pointerdown', () => { container.destroy(); this.diffPopup = null })
    container.add(backdrop)

    // Panel — taller to fit all content
    const panelW = 300
    const panelH = 260
    const panel = this.add.graphics()
    panel.fillStyle(0x16213e, 0.95)
    panel.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 10)
    panel.lineStyle(2, 0xe94560)
    panel.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 10)
    container.add(panel)

    // Level name
    const levelName = LEVELS[levelIndex]?.name || `Level ${levelIndex + 1}`
    container.add(this.add.text(0, -panelH / 2 + 20, levelName, {
      fontSize: '18px', color: '#fff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5))

    // Difficulty options — two-line layout to avoid overlap
    const difficulties = [
      { key: 'casual', label: 'Casual', color: '#2ecc71', desc: 'More gold & lives' },
      { key: 'normal', label: 'Normal', color: '#f1c40f', desc: 'Standard challenge' },
      { key: 'brutal', label: 'Brutal', color: '#e74c3c', desc: 'Tough enemies' },
      { key: 'inferno', label: 'Inferno', color: '#ff4500', desc: '2x enemy HP' },
    ]

    const optionSpacing = 46
    const firstY = -panelH / 2 + 55

    difficulties.forEach((diff, i) => {
      const y = firstY + i * optionSpacing
      const starKey = `${levelIndex}_${diff.key}`
      const stars = save.levelStars[starKey] || 0

      // Difficulty label (left) — clickable
      const btn = this.add.text(-panelW / 2 + 25, y, diff.label, {
        fontSize: '16px', color: diff.color, fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true })

      btn.on('pointerdown', () => {
        this.scene.start('GameScene', { levelIndex, difficulty: diff.key, endless: this.endlessMode || false })
      })
      btn.on('pointerover', () => btn.setAlpha(0.7))
      btn.on('pointerout', () => btn.setAlpha(1))
      container.add(btn)

      // Stars (right of label on same line)
      let starStr = ''
      for (let s = 0; s < 3; s++) starStr += s < stars ? '\u2605' : '\u2606'
      container.add(this.add.text(panelW / 2 - 20, y + 2, starStr, {
        fontSize: '12px', color: '#f1c40f',
      }).setOrigin(1, 0))

      // Description (below label, second line)
      container.add(this.add.text(-panelW / 2 + 25, y + 20, diff.desc, {
        fontSize: '9px', color: '#666',
      }))

      // Separator line
      if (i < difficulties.length - 1) {
        const sep = this.add.graphics()
        sep.lineStyle(1, 0xffffff, 0.08)
        sep.lineBetween(-panelW / 2 + 20, y + optionSpacing - 6, panelW / 2 - 20, y + optionSpacing - 6)
        container.add(sep)
      }
    })

    // Close button
    const closeBtn = this.add.text(panelW / 2 - 20, -panelH / 2 + 10, '\u2715', {
      fontSize: '16px', color: '#888', fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true })
    closeBtn.on('pointerdown', () => { container.destroy(); this.diffPopup = null })
    closeBtn.on('pointerover', () => closeBtn.setColor('#e94560'))
    closeBtn.on('pointerout', () => closeBtn.setColor('#888'))
    container.add(closeBtn)

    this.diffPopup = container
  }
}
