import Phaser from 'phaser'
import { loadSave, UPGRADE_DEFS } from '../SaveManager.js'
import { LEVELS, BONUS_MISSIONS } from '../maps/levels.js'

export class StatsScene extends Phaser.Scene {
  constructor() {
    super('StatsScene')
  }

  create() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height
    const cx = w / 2
    const save = loadSave()

    // Clean up on scene shutdown
    this.events.on('shutdown', () => {
      this.tweens.killAll()
      this.time.removeAllEvents()
    })

    // Background
    if (this.textures.exists('loading_bg')) {
      const bg = this.add.image(cx, h / 2, 'loading_bg')
      bg.setDisplaySize(w, h)
      bg.setTint(0x222244)
    }
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.6)
    overlay.fillRect(0, 0, w, h)

    // Title
    this.add.text(cx, 30, 'PLAYER STATS', {
      fontSize: '28px', color: '#f1c40f', fontFamily: 'Georgia, serif',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5)

    // Stats panel
    const panelX = cx - 200
    const panelY = 65
    const panel = this.add.graphics()
    panel.fillStyle(0x16213e, 0.9)
    panel.fillRoundedRect(panelX, panelY, 400, 480, 10)
    panel.lineStyle(2, 0xf1c40f, 0.5)
    panel.strokeRoundedRect(panelX, panelY, 400, 480, 10)

    // Calculate stats
    const levelsCleared = Math.max(0, (save.levelsUnlocked || 1) - 1)
    const totalLevels = LEVELS.length
    let totalStars = 0
    // Only count per-level best stars (numeric keys like "0", "1") — skip per-difficulty
    // keys like "0_normal" to avoid double-counting the same stars
    Object.entries(save.levelStars).forEach(([key, s]) => {
      if (/^\d+$/.test(key)) totalStars += s
    })
    const maxStars = totalLevels * 4 * 3 // 4 difficulties, 3 stars each
    const bonusDone = Object.values(save.bonusMissions || {}).filter(Boolean).length
    const totalBonus = BONUS_MISSIONS.length
    const totalKills = save.totalKills || 0
    const totalGems = save.totalGemsEarned || 0
    const currentGems = save.gems || 0

    // Upgrade progress
    let upgradeCount = 0
    let upgradeMax = 0
    Object.entries(save.upgrades || {}).forEach(([key, val]) => {
      upgradeCount += val
      upgradeMax += (UPGRADE_DEFS[key] ? UPGRADE_DEFS[key].maxLevel : 5)
    })

    const stats = [
      { label: 'Levels Cleared', value: `${levelsCleared} / ${totalLevels}`, color: '#2ecc71' },
      { label: 'Total Stars', value: `${totalStars}`, color: '#f1c40f' },
      { label: 'Current Gems', value: `${currentGems}`, color: '#9b59b6' },
      { label: 'Lifetime Gems Earned', value: `${totalGems}`, color: '#9b59b6' },
      { label: 'Total Enemies Killed', value: `${totalKills}`, color: '#e74c3c' },
      { label: 'Bonus Missions', value: `${bonusDone} / ${totalBonus}`, color: '#3498db' },
      { label: 'Upgrades Purchased', value: `${upgradeCount}`, color: '#e67e22' },
      { label: 'Completion %', value: `${Math.round((levelsCleared / totalLevels) * 100)}%`, color: '#2ecc71' },
    ]

    stats.forEach((stat, i) => {
      const y = panelY + 30 + i * 38
      this.add.text(panelX + 25, y, stat.label, {
        fontSize: '15px', color: '#ccc',
      })
      this.add.text(panelX + 375, y, stat.value, {
        fontSize: '15px', color: stat.color, fontStyle: 'bold',
      }).setOrigin(1, 0)

      // Separator line
      if (i < stats.length - 1) {
        const sep = this.add.graphics()
        sep.lineStyle(1, 0xffffff, 0.1)
        sep.lineBetween(panelX + 20, y + 28, panelX + 380, y + 28)
      }
    })

    // Personal bests section
    const pbY = panelY + 340
    this.add.text(cx, pbY, '--- PERSONAL BESTS ---', {
      fontSize: '14px', color: '#f1c40f', fontStyle: 'bold',
    }).setOrigin(0.5)

    const bests = save.personalBests || {}
    const bestEntries = Object.entries(bests).sort((a, b) => (b[1].score || 0) - (a[1].score || 0)).slice(0, 5)
    if (bestEntries.length === 0) {
      this.add.text(cx, pbY + 30, 'No records yet — play some levels!', {
        fontSize: '12px', color: '#666',
      }).setOrigin(0.5)
    } else {
      bestEntries.forEach(([key, score], i) => {
        const lvlIdx = parseInt(key)
        const name = LEVELS[lvlIdx] ? LEVELS[lvlIdx].name : `Level ${lvlIdx + 1}`
        this.add.text(panelX + 25, pbY + 25 + i * 22, `${name}`, {
          fontSize: '12px', color: '#aaa',
        })
        this.add.text(panelX + 375, pbY + 25 + i * 22, `${score.score ?? 0} pts`, {
          fontSize: '12px', color: '#f1c40f', fontStyle: 'bold',
        }).setOrigin(1, 0)
      })
    }

    // Back button
    if (this.textures.exists('back_button')) {
      const backImg = this.add.image(45, h - 30, 'back_button')
        .setDisplaySize(80, 35).setInteractive({ useHandCursor: true })
      backImg.on('pointerdown', () => this.scene.start('MenuScene'))
      backImg.on('pointerover', () => backImg.setTint(0xddaa66))
      backImg.on('pointerout', () => backImg.clearTint())
    } else {
      const backBtn = this.add.text(60, h - 35, '< Back', {
        fontSize: '20px', color: '#aaa', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setInteractive({ useHandCursor: true })
      backBtn.on('pointerdown', () => this.scene.start('MenuScene'))
    }
  }
}
