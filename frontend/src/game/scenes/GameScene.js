import Phaser from 'phaser'
import { LEVELS, TOWER_TYPES, ENEMY_TYPES, BONUS_MISSIONS, DEFEAT_QUOTES, TUTORIALS } from '../maps/levels.js'
import { loadSave, saveSave, unlockLevel, setLevelStars, completeBonusMission, setPersonalBest, markTutorialSeen, hasTutorialSeen, addTotalKills } from '../SaveManager.js'

const TILE = 64

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  init(data) {
    this.levelIndex = data.levelIndex || 0
    this.levelData = LEVELS[this.levelIndex]
    this.difficulty = data.difficulty || 'normal'

    // Difficulty multipliers
    const diffScale = {
      casual:  { gold: 1.5, lives: 1.5, enemyHp: 0.75, enemySpeed: 0.9, gemMult: 0.5 },
      normal:  { gold: 1.0, lives: 1.0, enemyHp: 1.0,  enemySpeed: 1.0, gemMult: 1.0 },
      brutal:  { gold: 0.7, lives: 0.75, enemyHp: 1.5, enemySpeed: 1.1, gemMult: 2.0 },
      inferno: { gold: 0.5, lives: 0.5, enemyHp: 2.0, enemySpeed: 1.25, gemMult: 3.0 },
    }
    this.diffMult = diffScale[this.difficulty] || diffScale.normal

    // Load save and apply upgrades
    this.saveData = loadSave()
    const ups = this.saveData.upgrades

    this.gold = Math.round((this.levelData.startGold + (ups.goldStartBoost || 0) * 20) * this.diffMult.gold)
    this.lives = Math.round((this.levelData.lives + (ups.baseHealthBoost || 0)) * this.diffMult.lives)
    this.startLives = this.lives

    // Store boost multipliers for towers
    this.boosts = {
      damage: 1 + (ups.towerDamageBoost || 0) * 0.03,
      fireRate: 1 - (ups.towerFireRateBoost || 0) * 0.03,
      range: 1 + (ups.towerRangeBoost || 0) * 0.05,
      aoe: 1 + (ups.towerAoeBoost || 0) * 0.05,
      iceSlow: 1 - (ups.towerIcyBoost || 0) * 0.03,
    }
    this.goldWaveBonus = (ups.goldWaveBoost || 0) * 2

    this.currentWave = 0
    this.waveActive = false
    this.towers = []
    this.enemies = []
    this.projectiles = []
    this.gemDrops = []
    this.gemsCollected = 0
    this.enemiesKilled = 0
    this.selectedTowerType = null
    this.gameOver = false
    this.paused = false
    this.gameSpeed = 1
    this.deployables = []
    this.waveCountdown = 0

    // Special weapon charges
    this.weaponCharges = {
      powderKeg: 1 + (ups.powderKegBoost || 0),
      mine: 1 + (ups.mineBoost || 0),
      gas: 1 + (ups.gasCloudBoost || 0),
    }
    this.activeWeapon = null

    // Tracking for bonus missions and stats
    this.towersBuilt = 0
    this.towersSold = 0
    this.towersRepaired = 0
    this.stormTowersBuilt = 0
    this.iceTowersBuilt = 0
    this.weaponsUsed = false
    this.bossKilled = false
    this.scoutKills = 0
    this.scoutKilledOgre = false
    this.kegMultiKills = 0
    this.gasMultiHits = 0
    this.maxCatapultLevel = 0

    // Parse special tiles (runes, gold deposits, treasure chests)
    this.specialTiles = { runes: [], deposits: [], chests: [] }
    const grid = this.levelData.grid
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const val = grid[r][c]
        if (val === 4) this.specialTiles.deposits.push({ r, c, mined: false })
        if (val === 5) this.specialTiles.chests.push({ r, c, opened: false })
        if (val >= 6 && val <= 8) {
          const type = val === 6 ? 'damage' : val === 7 ? 'speed' : 'range'
          this.specialTiles.runes.push({ r, c, type })
        }
      }
    }

    // Build the path waypoints from the grid
    this.waypoints = this.buildPath(this.levelData.grid)
  }

  create() {
    // Clean up on scene shutdown to prevent memory leaks and freezes
    this.events.on('shutdown', () => {
      this.stopMusic()
      this.tweens.killAll()
      this.time.removeAllEvents()
      this.input.removeAllListeners()
    })

    this.drawMap()

    this.enemyGroup = this.add.group()
    this.projectileGroup = this.add.group()
    this.towerGroup = this.add.group()

    this.createHUD()
    this.createBuildPanel()
    this.createWeaponBar()

    // Range indicator (hidden by default) — use loaded hud_range asset
    const rangeKey = this.textures.exists('hud_range') ? 'hud_range' : 'range_indicator'
    this.rangeIndicator = this.add.image(0, 0, rangeKey).setVisible(false).setAlpha(0.3).setDepth(5)

    // Cell hover indicator (shows buildable/unbuildable)
    const glowKey = this.textures.exists('hud_glow_cell') ? 'hud_glow_cell' : null
    const noKey = this.textures.exists('hud_no_cell') ? 'hud_no_cell' : null
    this.cellIndicator = glowKey
      ? this.add.image(0, 0, glowKey).setDisplaySize(TILE, TILE).setDepth(5).setAlpha(0.6).setVisible(false)
      : this.add.graphics().setDepth(5).setVisible(false)
    this.cellNoIndicator = noKey
      ? this.add.image(0, 0, noKey).setDisplaySize(TILE, TILE).setDepth(5).setAlpha(0.6).setVisible(false)
      : this.add.graphics().setDepth(5).setVisible(false)

    // Hover handler for cell indicators
    this.input.on('pointermove', (pointer) => {
      if (!this.selectedTowerType || this.gameOver || this.paused) {
        this.cellIndicator.setVisible(false)
        this.cellNoIndicator.setVisible(false)
        return
      }
      const col = Math.floor(pointer.x / TILE)
      const row = Math.floor(pointer.y / TILE)
      const grid = this.levelData.grid
      if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) {
        this.cellIndicator.setVisible(false)
        this.cellNoIndicator.setVisible(false)
        return
      }
      const cx = col * TILE + TILE / 2
      const cy = row * TILE + TILE / 2
      const canBuild = grid[row][col] === 0 && !this.towers.find(t => t.gridCol === col && t.gridRow === row)
      if (canBuild) {
        this.cellIndicator.setPosition(cx, cy).setVisible(true)
        this.cellNoIndicator.setVisible(false)
      } else {
        this.cellNoIndicator.setPosition(cx, cy).setVisible(true)
        this.cellIndicator.setVisible(false)
      }
    })

    // Click handler
    this.input.on('pointerdown', (pointer) => this.handleClick(pointer))

    // Start wave button
    this.startWaveBtn = this.add.text(
      this.cameras.main.centerX, this.cameras.main.height - 95,
      '>> START WAVE 1 <<',
      { fontSize: '20px', color: '#f1c40f', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20)

    this.startWaveBtn.on('pointerdown', () => this.startNextWave())
    this.startWaveBtn.on('pointerover', () => this.startWaveBtn.setColor('#fff'))
    this.startWaveBtn.on('pointerout', () => this.startWaveBtn.setColor('#f1c40f'))

    // Wave countdown text (hidden)
    this.countdownText = this.add.text(
      this.cameras.main.centerX, this.cameras.main.height - 95,
      '', { fontSize: '16px', color: '#aaa', stroke: '#000', strokeThickness: 2 }
    ).setOrigin(0.5).setDepth(20).setVisible(false)

    // Boss warning text (hidden)
    this.bossWarning = this.add.text(
      this.cameras.main.centerX, this.cameras.main.centerY - 30,
      '', { fontSize: '28px', color: '#e74c3c', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }
    ).setOrigin(0.5).setDepth(40).setVisible(false)

    // Start music
    this.startMusic()

    this.updateGameState()
  }

  startMusic() {
    const musicKey = this.levelData.music
    if (!musicKey) return
    try {
      if (this.sound.get(musicKey)) {
        this.bgMusic = this.sound.get(musicKey)
      } else if (this.cache.audio.exists(musicKey)) {
        this.bgMusic = this.sound.add(musicKey, { loop: true, volume: 0.3 })
      }
      if (this.bgMusic && !this.bgMusic.isPlaying) {
        this.bgMusic.play()
      }
    } catch (e) {
      // Audio may not be available
    }
  }

  buildPath(grid) {
    const path = []
    let startRow = -1, startCol = -1

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === 2) {
          startRow = r
          startCol = c
          break
        }
      }
      if (startRow >= 0) break
    }

    const visited = new Set()
    const queue = [[startRow, startCol]]
    visited.add(`${startRow},${startCol}`)
    const parent = {}

    let endRow = -1, endCol = -1
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]]

    while (queue.length > 0) {
      const [r, c] = queue.shift()
      if (grid[r][c] === 3) {
        endRow = r
        endCol = c
        break
      }
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc
        const key = `${nr},${nc}`
        const cellVal = grid[nr] && grid[nr][nc]
        if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length
            && !visited.has(key) && cellVal >= 1 && cellVal <= 3) {
          visited.add(key)
          parent[key] = [r, c]
          queue.push([nr, nc])
        }
      }
    }

    const cells = []
    let cur = [endRow, endCol]
    while (cur) {
      cells.unshift(cur)
      const key = `${cur[0]},${cur[1]}`
      cur = parent[key] || null
    }

    return cells.map(([r, c]) => ({
      x: c * TILE + TILE / 2,
      y: r * TILE + TILE / 2,
    }))
  }

  drawMap() {
    const grid = this.levelData.grid
    const bgKey = this.levelData.mapBg || 'map_grass'

    if (this.textures.exists(bgKey)) {
      this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, bgKey)
        .setDisplaySize(this.cameras.main.width, this.cameras.main.height)
    } else {
      const bg = this.add.graphics()
      bg.fillStyle(0x2d5a27)
      bg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height)
    }

    // Spawn/exit indicators
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const val = grid[r][c]
        const x = c * TILE + TILE / 2
        const y = r * TILE + TILE / 2

        if (val === 2) {
          // Spawn portal visual — glowing ring
          const portal = this.add.graphics().setDepth(2)
          portal.lineStyle(3, 0x2ecc71, 0.7)
          portal.strokeCircle(x, y, 20)
          portal.fillStyle(0x2ecc71, 0.15)
          portal.fillCircle(x, y, 20)
          this.add.text(x, y, '\u25B6', {
            fontSize: '14px', color: '#2ecc71',
            stroke: '#000', strokeThickness: 2,
          }).setOrigin(0.5).setDepth(3).setAlpha(0.9)
          // Pulse animation
          this.tweens.add({ targets: portal, alpha: { from: 0.8, to: 0.3 }, duration: 1200, yoyo: true, repeat: -1 })
        }
        if (val === 3) {
          // Base castle — use health icon as castle marker
          if (this.textures.exists('hud_health')) {
            this.add.image(x, y, 'hud_health').setDisplaySize(30, 30).setDepth(2).setAlpha(0.85)
          }
          this.add.text(x, y + 20, '\u2691 BASE', {
            fontSize: '9px', color: '#e74c3c',
            stroke: '#000', strokeThickness: 2, fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(3).setAlpha(0.7)
        }
      }
    }

    // Render runes
    this.specialTiles.runes.forEach(rune => {
      const rx = rune.c * TILE + TILE / 2
      const ry = rune.r * TILE + TILE / 2
      const texKey = `hud_rune_${rune.type}`
      if (this.textures.exists(texKey)) {
        this.add.image(rx, ry, texKey).setDisplaySize(28, 28).setDepth(3).setAlpha(0.8)
      } else {
        const colors = { damage: 0xe74c3c, speed: 0x3498db, range: 0x2ecc71 }
        const g = this.add.graphics().setDepth(3)
        g.fillStyle(colors[rune.type], 0.6)
        g.fillCircle(rx, ry, 14)
        g.lineStyle(2, colors[rune.type], 0.8)
        g.strokeCircle(rx, ry, 14)
      }
      const labels = { damage: 'D', speed: 'S', range: 'R' }
      this.add.text(rx, ry, labels[rune.type], {
        fontSize: '14px', color: '#fff', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(4)
    })

    // Render gold deposits — use hud_coin icon or inline graphics (never generated textures)
    this.specialTiles.deposits.forEach(dep => {
      const dx = dep.c * TILE + TILE / 2
      const dy = dep.r * TILE + TILE / 2
      if (this.textures.exists('hud_coin')) {
        dep.sprite = this.add.image(dx, dy, 'hud_coin').setDisplaySize(26, 26).setDepth(3)
      } else {
        dep.sprite = this.add.graphics().setDepth(3)
        dep.sprite.fillStyle(0xf1c40f, 0.8)
        dep.sprite.fillCircle(dx, dy, 12)
        dep.sprite.lineStyle(2, 0xd4ac0d)
        dep.sprite.strokeCircle(dx, dy, 12)
      }
      this.add.text(dx, dy + 18, 'GOLD', {
        fontSize: '8px', color: '#f1c40f', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(4)
    })

    // Render treasure chests — inline graphics only (no generated textures)
    this.specialTiles.chests.forEach(chest => {
      const cx = chest.c * TILE + TILE / 2
      const cy = chest.r * TILE + TILE / 2
      chest.sprite = this.add.graphics().setDepth(3)
      // Brown chest body
      chest.sprite.fillStyle(0x8b4513, 0.85)
      chest.sprite.fillRoundedRect(cx - 12, cy - 8, 24, 16, 3)
      // Gold clasp
      chest.sprite.fillStyle(0xf1c40f, 0.9)
      chest.sprite.fillRect(cx - 3, cy - 4, 6, 6)
      // Lid highlight
      chest.sprite.lineStyle(1, 0xa0522d)
      chest.sprite.strokeRoundedRect(cx - 12, cy - 8, 24, 16, 3)
      this.add.text(cx, cy + 14, '\u2666', {
        fontSize: '8px', color: '#f1c40f',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(4)
    })
  }

  createHUD() {
    const w = this.cameras.main.width
    const hudBg = this.add.graphics().setDepth(15)
    hudBg.fillStyle(0x000000, 0.6)
    hudBg.fillRect(0, 0, w, 36)

    // Gold
    if (this.textures.exists('hud_gold')) {
      this.add.image(18, 18, 'hud_gold').setDisplaySize(20, 20).setDepth(16)
    }
    this.goldText = this.add.text(32, 8, '', {
      fontSize: '16px', color: '#f1c40f', fontStyle: 'bold',
    }).setDepth(16)

    // Lives
    if (this.textures.exists('hud_health')) {
      this.add.image(148, 18, 'hud_health').setDisplaySize(20, 20).setDepth(16)
    }
    this.livesText = this.add.text(162, 8, '', {
      fontSize: '16px', color: '#e94560', fontStyle: 'bold',
    }).setDepth(16)

    // Wave
    this.waveText = this.add.text(280, 8, '', {
      fontSize: '16px', color: '#3498db', fontStyle: 'bold',
    }).setDepth(16)

    // Gems
    if (this.textures.exists('hud_gem')) {
      this.add.image(418, 18, 'hud_gem').setDisplaySize(20, 20).setDepth(16)
    }
    this.gemText = this.add.text(432, 8, '', {
      fontSize: '16px', color: '#9b59b6', fontStyle: 'bold',
    }).setDepth(16)

    // Enemies killed
    this.killText = this.add.text(520, 8, '', {
      fontSize: '14px', color: '#aaa',
    }).setDepth(16)

    // Speed controls using HUD icons
    const speedX = w - 150
    if (this.textures.exists('hud_play')) {
      this.playBtn = this.add.image(speedX, 18, 'hud_play')
        .setDisplaySize(22, 22).setDepth(16)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setSpeed(1))
    }
    if (this.textures.exists('hud_ff')) {
      this.ffBtn = this.add.image(speedX + 28, 18, 'hud_ff')
        .setDisplaySize(22, 22).setDepth(16)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setSpeed(2))
    }
    if (this.textures.exists('hud_pause')) {
      this.pauseBtn = this.add.image(speedX + 56, 18, 'hud_pause')
        .setDisplaySize(22, 22).setDepth(16)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.togglePause())
    }

    // Menu button
    if (this.textures.exists('hud_menu')) {
      this.add.image(w - 25, 18, 'hud_menu')
        .setDisplaySize(22, 22).setDepth(16)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.showPauseMenu())
    } else {
      this.add.text(w - 45, 8, 'Menu', {
        fontSize: '14px', color: '#888',
      }).setDepth(16).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.showPauseMenu())
    }

    this.updateHUD()
  }

  setSpeed(speed) {
    this.gameSpeed = speed
    this.time.timeScale = speed
    this.physics.world.timeScale = 1 / speed
    // Update button visuals
    if (this.ffBtn) {
      const ffKey = speed === 2 ? 'hud_ff_on' : 'hud_ff'
      if (this.textures.exists(ffKey)) this.ffBtn.setTexture(ffKey)
    }
  }

  togglePause() {
    this.paused = !this.paused
    if (this.paused) {
      this.showPauseMenu()
    } else if (this.pauseMenu) {
      this.pauseMenu.destroy()
      this.pauseMenu = null
    }
  }

  showPauseMenu() {
    if (this.pauseMenu) {
      this.pauseMenu.destroy()
      this.pauseMenu = null
      this.paused = false
      return
    }
    this.paused = true

    const cx = this.cameras.main.centerX
    const cy = this.cameras.main.centerY
    const container = this.add.container(cx, cy).setDepth(60)

    // Backdrop
    const backdrop = this.add.graphics()
    backdrop.fillStyle(0x000000, 0.7)
    backdrop.fillRect(-cx, -cy, cx * 2, cy * 2)
    container.add(backdrop)

    // Panel
    const panel = this.add.graphics()
    panel.fillStyle(0x16213e, 0.95)
    panel.fillRoundedRect(-120, -100, 240, 200, 12)
    panel.lineStyle(2, 0xe94560)
    panel.strokeRoundedRect(-120, -100, 240, 200, 12)
    container.add(panel)

    container.add(this.add.text(0, -80, 'PAUSED', {
      fontSize: '24px', color: '#e94560', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5))

    const buttons = [
      { text: 'Resume', color: '#2ecc71', action: () => { container.destroy(); this.pauseMenu = null; this.paused = false } },
      { text: 'Restart', color: '#f1c40f', action: () => { this.stopMusic(); this.scene.start('GameScene', { levelIndex: this.levelIndex, difficulty: this.difficulty }) } },
      { text: 'Quit to Menu', color: '#e74c3c', action: () => { this.stopMusic(); this.scene.start('LevelSelectScene') } },
    ]

    buttons.forEach((btn, i) => {
      const y = -30 + i * 45
      const text = this.add.text(0, y, btn.text, {
        fontSize: '18px', color: btn.color, fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      text.on('pointerdown', btn.action)
      text.on('pointerover', () => text.setAlpha(0.7))
      text.on('pointerout', () => text.setAlpha(1))
      container.add(text)
    })

    this.pauseMenu = container
  }

  stopMusic() {
    if (this.bgMusic && this.bgMusic.isPlaying) {
      this.bgMusic.stop()
    }
  }

  playSfx(key, volume) {
    try {
      if (this.cache.audio.exists(key)) {
        this.sound.play(key, { volume: volume || 0.4 })
      }
    } catch (e) { /* audio not available */ }
  }

  showTutorial(tutId) {
    if (hasTutorialSeen(tutId)) return
    const tut = TUTORIALS[tutId]
    if (!tut) return
    markTutorialSeen(tutId)

    const cx = this.cameras.main.centerX
    const container = this.add.container(cx, 60).setDepth(70)

    const bg = this.add.graphics()
    bg.fillStyle(0x16213e, 0.95)
    bg.fillRoundedRect(-160, -25, 320, 50, 8)
    bg.lineStyle(2, 0x3498db)
    bg.strokeRoundedRect(-160, -25, 320, 50, 8)
    container.add(bg)

    container.add(this.add.text(0, -12, tut.title, {
      fontSize: '14px', color: '#3498db', fontStyle: 'bold',
    }).setOrigin(0.5))
    container.add(this.add.text(0, 8, tut.msg, {
      fontSize: '10px', color: '#ccc', wordWrap: { width: 300 },
    }).setOrigin(0.5))

    this.tweens.add({
      targets: container, alpha: { from: 0, to: 1 }, y: 70, duration: 300,
    })
    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: container, alpha: 0, y: 50, duration: 300,
        onComplete: () => container.destroy(),
      })
    })
  }

  createBuildPanel() {
    const panelY = this.cameras.main.height - 70
    const panelBg = this.add.graphics().setDepth(15)
    panelBg.fillStyle(0x000000, 0.7)
    panelBg.fillRect(0, panelY - 10, this.cameras.main.width, 80)

    const types = Object.entries(TOWER_TYPES)
    const totalWidth = types.length * 85
    const startX = (this.cameras.main.width - totalWidth) / 2 + 42

    types.forEach(([key, tower], i) => {
      const x = startX + i * 85
      const y = panelY + 15

      const iconKey = tower.hudIcon || tower.texture
      const icon = this.add.image(x, y, iconKey)
        .setDisplaySize(40, 40)
        .setInteractive({ useHandCursor: true })
        .setDepth(16)

      const label = this.add.text(x, y + 28, `${tower.name}\n$${tower.cost}`, {
        fontSize: '9px', color: '#ccc', align: 'center',
      }).setOrigin(0.5, 0).setDepth(16)

      const highlight = this.add.graphics().setDepth(15)

      icon.on('pointerdown', () => {
        if (this.selectedTowerType === key) {
          this.selectedTowerType = null
          this.rangeIndicator.setVisible(false)
        } else {
          this.selectedTowerType = key
          this.activeWeapon = null
          this.updateWeaponHighlights()
        }
        this.updateBuildHighlights()
      })

      icon.towerKey = key
      icon.highlight = highlight
      this.buildIcons = this.buildIcons || []
      this.buildIcons.push(icon)
    })
  }

  createWeaponBar() {
    const w = this.cameras.main.width
    const barY = this.cameras.main.height - 105

    const weapons = [
      { key: 'powderKeg', name: 'Keg', color: '#e74c3c', symbol: '\u2620' },
      { key: 'mine', name: 'Mine', color: '#f39c12', symbol: '\u26A0' },
      { key: 'gas', name: 'Gas', color: '#2ecc71', symbol: '\u2601' },
    ]

    this.weaponButtons = {}
    const startX = w - 180

    weapons.forEach((wpn, i) => {
      const x = startX + i * 55
      const charges = this.weaponCharges[wpn.key]

      const btn = this.add.text(x, barY, `${wpn.symbol}${charges}`, {
        fontSize: '14px',
        color: charges > 0 ? wpn.color : '#555',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 2,
        backgroundColor: '#16213e80',
        padding: { x: 6, y: 4 },
      }).setDepth(20).setInteractive({ useHandCursor: charges > 0 })

      if (charges > 0) {
        btn.on('pointerdown', () => {
          if (this.activeWeapon === wpn.key) {
            this.activeWeapon = null
          } else {
            this.activeWeapon = wpn.key
            this.selectedTowerType = null
            this.updateBuildHighlights()
          }
          this.updateWeaponHighlights()
        })
      }

      this.weaponButtons[wpn.key] = btn
    })
  }

  updateWeaponHighlights() {
    Object.entries(this.weaponButtons).forEach(([key, btn]) => {
      if (key === this.activeWeapon) {
        btn.setStyle({ backgroundColor: '#e9456080' })
      } else {
        btn.setStyle({ backgroundColor: '#16213e80' })
      }
    })
  }

  updateBuildHighlights() {
    if (!this.buildIcons) return
    this.buildIcons.forEach((icon) => {
      icon.highlight.clear()
      if (icon.towerKey === this.selectedTowerType) {
        const bounds = icon.getBounds()
        icon.highlight.lineStyle(2, 0xe94560)
        icon.highlight.strokeRoundedRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8, 6)
      }
    })
  }

  deployWeapon(x, y) {
    if (!this.activeWeapon || this.weaponCharges[this.activeWeapon] <= 0) return

    const weaponKey = this.activeWeapon

    this.weaponsUsed = true

    if (weaponKey === 'powderKeg') {
      this.weaponCharges.powderKeg--
      this.playSfx('sfx_explosion')
      this.showTutorial('Tut_QuickUsePowderKeg')
      const radius = 80
      const damage = 150

      const boom = this.add.graphics().setDepth(11)
      boom.fillStyle(0xe74c3c, 0.6)
      boom.fillCircle(x, y, radius)
      this.tweens.add({
        targets: boom, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 500,
        onComplete: () => boom.destroy(),
      })

      let kegHits = 0
      this.enemies.forEach(enemy => {
        if (!enemy.sprite.active) return
        const dx = enemy.sprite.x - x
        const dy = enemy.sprite.y - y
        if (Math.sqrt(dx * dx + dy * dy) <= radius) {
          this.damageEnemy(enemy, damage)
          kegHits++
        }
      })
      if (kegHits >= 3) this.kegMultiKills++

    } else if (weaponKey === 'mine') {
      this.weaponCharges.mine--
      this.playSfx('sfx_dig')
      this.showTutorial('Tut_QuickUseMines')
      const mine = this.add.graphics().setDepth(3)
      mine.fillStyle(0xf39c12, 0.7)
      mine.fillCircle(0, 0, 8)
      mine.lineStyle(1, 0x000000)
      mine.strokeCircle(0, 0, 8)
      mine.setPosition(x, y)

      this.deployables.push({
        type: 'mine', graphics: mine, x, y,
        radius: 50, damage: 200, active: true,
      })

    } else if (weaponKey === 'gas') {
      this.weaponCharges.gas--
      this.playSfx('sfx_fuse')
      this.showTutorial('Tut_QuickUseGas')
      let cloud
      if (this.textures.exists('hud_poison_gas')) {
        cloud = this.add.image(x, y, 'hud_poison_gas').setDisplaySize(120, 120).setDepth(3).setAlpha(0.5)
      } else {
        cloud = this.add.graphics().setDepth(3)
        cloud.fillStyle(0x2ecc71, 0.3)
        cloud.fillCircle(0, 0, 60)
        cloud.setPosition(x, y)
      }

      // Count enemies in gas radius for bonus mission
      let gasHits = 0
      this.enemies.forEach(enemy => {
        if (!enemy.sprite.active) return
        const dx = enemy.sprite.x - x
        const dy = enemy.sprite.y - y
        if (Math.sqrt(dx * dx + dy * dy) <= 60) gasHits++
      })
      if (gasHits >= 5) this.gasMultiHits++

      const gasObj = {
        type: 'gas', graphics: cloud, x, y,
        radius: 60, dps: 30, timer: 5000, active: true,
      }
      this.deployables.push(gasObj)

      this.tweens.add({
        targets: cloud, alpha: 0, duration: 5000,
        onComplete: () => { cloud.destroy(); gasObj.active = false },
      })
    }

    this.activeWeapon = null
    this.updateWeaponHighlights()
    Object.entries(this.weaponButtons).forEach(([key, btn]) => {
      const charges = this.weaponCharges[key]
      const symbols = { powderKeg: '\u2620', mine: '\u26A0', gas: '\u2601' }
      btn.setText(`${symbols[key]}${charges}`)
      if (charges <= 0) {
        btn.setColor('#555')
        btn.disableInteractive()
      }
    })
  }

  handleClick(pointer) {
    if (this.gameOver || this.paused) return
    if (pointer.y < 36 || pointer.y > this.cameras.main.height - 80) return

    // Deploy weapon if active
    if (this.activeWeapon) {
      this.deployWeapon(pointer.x, pointer.y)
      return
    }

    const col = Math.floor(pointer.x / TILE)
    const row = Math.floor(pointer.y / TILE)
    const grid = this.levelData.grid

    if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return

    // Check if clicking on existing tower
    const existingTower = this.towers.find(t => t.gridCol === col && t.gridRow === row)
    if (existingTower) {
      this.showTowerMenu(existingTower)
      return
    }

    // Place new tower
    if (this.selectedTowerType && grid[row][col] === 0) {
      const towerDef = TOWER_TYPES[this.selectedTowerType]
      if (this.gold >= towerDef.cost) {
        if (!this.towers.find(t => t.gridCol === col && t.gridRow === row)) {
          this.placeTower(col, row, this.selectedTowerType)
        }
      }
    }
  }

  placeTower(col, row, type) {
    const def = TOWER_TYPES[type]
    this.gold -= def.cost

    const x = col * TILE + TILE / 2
    const y = row * TILE + TILE / 2

    const sprite = this.add.sprite(x, y, def.texture).setDisplaySize(40, 40).setDepth(4)
    this.towerGroup.add(sprite)

    const healthMult = 1 + (this.saveData.upgrades.towerHealthBoost || 0) * 0.2
    const maxHp = Math.round(100 * healthMult)

    const hpBg = this.add.graphics().setDepth(5).setVisible(false)
    const hpBar = this.add.graphics().setDepth(5).setVisible(false)

    const tower = {
      sprite, type, gridCol: col, gridRow: row, x, y,
      damage: Math.round(def.damage * this.boosts.damage),
      range: Math.round(def.range * this.boosts.range),
      fireRate: Math.round(def.fireRate * this.boosts.fireRate),
      splash: def.splash ? Math.round(def.splash * this.boosts.aoe) : 0,
      slow: def.slow ? Math.min(def.slow * this.boosts.iceSlow, 0.9) : 0,
      slowDuration: def.slowDuration || 0,
      projectileTexture: def.projectile,
      lastFired: 0,
      level: 0,
      hp: maxHp,
      maxHp,
      hpBg,
      hpBar,
      autoHealRate: (this.saveData.upgrades.towerAutoHealBoost || 0) * 0.5,
    }

    this.towers.push(tower)
    this.towersBuilt++
    if (type === 'storm') this.stormTowersBuilt++
    if (type === 'winter') this.iceTowersBuilt++

    // Check rune boosts for nearby towers
    this.specialTiles.runes.forEach(rune => {
      const rdx = Math.abs(rune.c - col)
      const rdy = Math.abs(rune.r - row)
      if (rdx <= 2 && rdy <= 2) {
        if (rune.type === 'damage') tower.damage = Math.round(tower.damage * 1.25)
        if (rune.type === 'speed') tower.fireRate = Math.round(tower.fireRate * 0.8)
        if (rune.type === 'range') tower.range = Math.round(tower.range * 1.2)
        const runeColors = { damage: '#e74c3c', speed: '#3498db', range: '#2ecc71' }
        this.showFloatingText(tower.x, tower.y - 30, `${rune.type.toUpperCase()} RUNE!`, runeColors[rune.type])
        this.showTutorial('Tut_Runes')
      }
    })

    // Check gold deposits (adjacent = mine it for bonus gold)
    this.specialTiles.deposits.forEach(dep => {
      if (dep.mined) return
      if (Math.abs(dep.c - col) <= 1 && Math.abs(dep.r - row) <= 1) {
        dep.mined = true
        const goldBonus = 50
        this.gold += goldBonus
        this.showFloatingText(dep.c * TILE + TILE / 2, dep.r * TILE + TILE / 2, `+${goldBonus} gold!`, '#f1c40f')
        if (dep.sprite) { try { dep.sprite.destroy() } catch (e) {} }
        this.playSfx('sfx_coin_accumulate')
        this.showTutorial('Tut_MineGoldDeposit')
      }
    })

    // Check treasure chests (adjacent = open for gold)
    this.specialTiles.chests.forEach(chest => {
      if (chest.opened) return
      if (Math.abs(chest.c - col) <= 1 && Math.abs(chest.r - row) <= 1) {
        chest.opened = true
        const goldBonus = 75
        this.gold += goldBonus
        this.showFloatingText(chest.c * TILE + TILE / 2, chest.r * TILE + TILE / 2, `+${goldBonus} gold!`, '#f1c40f')
        if (chest.sprite) { try { chest.sprite.destroy() } catch (e) {} }
        this.playSfx('sfx_coin_explosion')
        this.showTutorial('Tut_Chests')
      }
    })

    this.updateHUD()
    this.playSfx('sfx_tower_placed')

    // Trigger relevant tutorials
    if (this.towersBuilt === 1) this.showTutorial('Tut_PlaceBallista')
    if (type === 'winter') this.showTutorial('Tut_PlaceIceTower')
    if (type === 'catapult') this.showTutorial('Tut_PlaceCatapult')
    if (type === 'storm') this.showTutorial('Tut_PlaceStormTower')
    if (type === 'cannon') this.showTutorial('Tut_PlaceCannon')
    if (type === 'scout') this.showTutorial('Tut_ScoutTower')

    // Place animation
    sprite.setScale(0)
    this.tweens.add({ targets: sprite, scale: 1, duration: 200, ease: 'Back.easeOut' })
  }

  showTowerMenu(tower) {
    if (this.towerMenu) this.towerMenu.destroy()
    this.playSfx('sfx_tower_menu')

    const def = TOWER_TYPES[tower.type]
    const upgrade = def.upgrades[tower.level]
    const needsRepair = tower.hp < tower.maxHp
    const repairCost = needsRepair ? Math.floor((tower.maxHp - tower.hp) * 0.3) : 0

    // Show range
    this.rangeIndicator.setPosition(tower.x, tower.y)
    this.rangeIndicator.setDisplaySize(tower.range * 2, tower.range * 2)
    this.rangeIndicator.setVisible(true)

    const menuH = 45 + (upgrade ? 25 : 0) + (needsRepair ? 20 : 0)
    const menu = this.add.container(tower.x, tower.y - 50).setDepth(30)

    const bg = this.add.graphics()
    bg.fillStyle(0x16213e, 0.95)
    bg.fillRoundedRect(-90, -25, 180, menuH, 8)
    bg.lineStyle(1, 0xe94560)
    bg.strokeRoundedRect(-90, -25, 180, menuH, 8)
    menu.add(bg)

    const hpPct = Math.round(tower.hp / tower.maxHp * 100)
    const info = this.add.text(0, -15, `${def.name} Lv${tower.level + 1} | DMG:${tower.damage} | HP:${hpPct}%`, {
      fontSize: '10px', color: '#fff',
    }).setOrigin(0.5)
    menu.add(info)

    let yOffset = 5
    if (upgrade) {
      if (this.textures.exists('hud_upgrade')) {
        menu.add(this.add.image(-55, yOffset + 7, 'hud_upgrade').setDisplaySize(14, 14))
      }
      const upgradeBtn = this.add.text(-40, yOffset, `Upgrade $${upgrade.cost}`, {
        fontSize: '11px', color: '#2ecc71', fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true })
      upgradeBtn.on('pointerdown', () => {
        if (this.gold >= upgrade.cost) {
          this.gold -= upgrade.cost
          tower.level++
          tower.damage = Math.round(upgrade.damage * this.boosts.damage)
          tower.range = Math.round((upgrade.range || tower.range) * this.boosts.range)
          tower.fireRate = Math.round((upgrade.fireRate || tower.fireRate) * this.boosts.fireRate)
          if (upgrade.splash) tower.splash = Math.round(upgrade.splash * this.boosts.aoe)
          if (upgrade.slow) tower.slow = Math.min(upgrade.slow * this.boosts.iceSlow, 0.9)
          if (upgrade.slowDuration) tower.slowDuration = upgrade.slowDuration
          // Swap sprite texture
          if (def.textures && def.textures[tower.level]) {
            const newTex = def.textures[tower.level]
            if (this.textures.exists(newTex)) tower.sprite.setTexture(newTex)
          }
          if (tower.type === 'catapult') this.maxCatapultLevel = Math.max(this.maxCatapultLevel, tower.level + 1)
          this.updateHUD()
          this.playSfx('sfx_tower_upgrade')
          this.showTutorial('Tut_UpgradeTower')
          menu.destroy()
          this.rangeIndicator.setVisible(false)
        }
      })
      menu.add(upgradeBtn)
      yOffset += 18
    }

    if (needsRepair) {
      if (this.textures.exists('hud_repair')) {
        menu.add(this.add.image(-55, yOffset + 7, 'hud_repair').setDisplaySize(14, 14))
      }
      const repairBtn = this.add.text(-40, yOffset, `Repair $${repairCost}`, {
        fontSize: '11px', color: '#3498db', fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true })
      repairBtn.on('pointerdown', () => {
        if (this.gold >= repairCost) {
          this.gold -= repairCost
          tower.hp = tower.maxHp
          this.towersRepaired++
          this.updateHUD()
          this.playSfx('sfx_tower_upgrade')
          this.showTutorial('Tut_Repair')
          menu.destroy()
          this.rangeIndicator.setVisible(false)
        }
      })
      menu.add(repairBtn)
      yOffset += 18
    }

    const sellValue = Math.floor(def.cost * 0.6)
    if (this.textures.exists('hud_sell')) {
      menu.add(this.add.image(25, yOffset - 11, 'hud_sell').setDisplaySize(14, 14))
    }
    const sellBtn = this.add.text(40, yOffset - 18, `Sell $${sellValue}`, {
      fontSize: '11px', color: '#e74c3c', fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true })
    sellBtn.on('pointerdown', () => {
      this.gold += sellValue
      tower.sprite.destroy()
      tower.hpBg.destroy()
      tower.hpBar.destroy()
      this.towers = this.towers.filter(t => t !== tower)
      this.towersSold++
      this.updateHUD()
      this.playSfx('sfx_tower_sell')
      menu.destroy()
      this.rangeIndicator.setVisible(false)
    })
    menu.add(sellBtn)

    this.towerMenu = menu

    this.time.delayedCall(5000, () => {
      if (menu && menu.active) {
        menu.destroy()
        this.rangeIndicator.setVisible(false)
      }
    })
  }

  startNextWave() {
    if (this.waveActive || this.gameOver) return
    if (this.currentWave >= this.levelData.waves.length) return

    this.waveActive = true
    this.startWaveBtn.setVisible(false)
    this.countdownText.setVisible(false)

    const wave = this.levelData.waves[this.currentWave]

    // Boss wave warning
    if (wave.boss) {
      this.showBossWarning(wave)
    }

    let totalToSpawn = 0
    wave.enemies.forEach(group => { totalToSpawn += group.count })

    wave.enemies.forEach(group => {
      const enemyDef = ENEMY_TYPES[group.type]
      if (!enemyDef) return

      this.time.addEvent({
        delay: group.interval,
        repeat: group.count - 1,
        callback: () => {
          if (this.gameOver) return
          this.spawnEnemy(enemyDef, group.type)
        },
      })
    })

    this.updateHUD()
  }

  showBossWarning(wave) {
    // Find the boss name
    let bossName = 'BOSS WAVE'
    wave.enemies.forEach(group => {
      const def = ENEMY_TYPES[group.type]
      if (def && def.boss) bossName = def.name.toUpperCase()
    })

    this.bossWarning.setText(`\u26A0 ${bossName} APPROACHES! \u26A0`)
    this.bossWarning.setVisible(true)
    this.tweens.add({
      targets: this.bossWarning,
      alpha: { from: 1, to: 0 },
      scaleX: { from: 0.5, to: 1.2 },
      scaleY: { from: 0.5, to: 1.2 },
      duration: 2000,
      ease: 'Power2',
      onComplete: () => this.bossWarning.setVisible(false),
    })
  }

  spawnEnemy(def, type) {
    const start = this.waypoints[0]
    const spriteSize = def.boss ? 44 : def.size ? Math.round(28 * def.size) : 28

    // Use animated sprite if walk animation exists for this enemy type
    const baseType = type.replace('boss_', '')
    const animKey = `${baseType}_walk`
    const hasAnim = this.anims.exists(animKey)

    const sprite = hasAnim
      ? this.add.sprite(start.x, start.y, def.texture).setDisplaySize(spriteSize, spriteSize).setDepth(6)
      : this.add.image(start.x, start.y, def.texture).setDisplaySize(spriteSize, spriteSize).setDepth(6)
    this.enemyGroup.add(sprite)

    // Play walk animation if available
    if (hasAnim && sprite.play) {
      try { sprite.play(animKey) } catch (e) {}
    }

    // Boss tint (reddish glow)
    if (def.boss) {
      sprite.setTint(0xff6666)
    }

    // HP bar
    const barWidth = Math.max(28, spriteSize)
    const hpBg = this.add.graphics().setDepth(7)
    const hpBar = this.add.graphics().setDepth(8)

    const scaledHp = Math.round(def.hp * this.diffMult.enemyHp)
    const scaledSpeed = Math.round(def.speed * this.diffMult.enemySpeed)

    const enemy = {
      sprite, hpBg, hpBar, type,
      hp: scaledHp,
      maxHp: scaledHp,
      baseSpeed: scaledSpeed,
      speed: scaledSpeed,
      reward: def.reward,
      damage: def.damage,
      waypointIndex: 0,
      slowTimer: 0,
      barWidth,
      // Special ability flags
      splits: def.splits || 0,
      regens: def.regens || 0,
      towerDamage: def.towerDamage || 0,
      kamikaze: def.kamikaze || false,
      flying: def.flying || false,
      melee: def.melee || false,
      boss: def.boss || false,
      size: def.size || 1,
      // Boss name plate
      namePlate: null,
    }

    // Boss name plate
    if (def.boss) {
      enemy.namePlate = this.add.text(start.x, start.y - spriteSize / 2 - 16, def.name, {
        fontSize: '10px', color: '#e74c3c', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(9)
    }

    this.enemies.push(enemy)
  }

  update(time, delta) {
    if (this.gameOver || this.paused) return

    const speedDelta = delta * this.gameSpeed

    // Move enemies
    this.enemies.forEach(enemy => {
      if (!enemy.sprite.active) return

      // Handle slow effect
      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= speedDelta
        if (enemy.slowTimer <= 0) {
          enemy.speed = enemy.baseSpeed
          enemy.sprite.clearTint()
          if (enemy.boss) enemy.sprite.setTint(0xff6666)
        }
      }

      // Troll regen
      if (enemy.regens > 0 && enemy.hp < enemy.maxHp) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + (enemy.regens * speedDelta) / 1000)
      }

      const target = this.waypoints[enemy.waypointIndex]
      if (!target) return

      const dx = target.x - enemy.sprite.x
      const dy = target.y - enemy.sprite.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 5) {
        enemy.waypointIndex++
        if (enemy.waypointIndex >= this.waypoints.length) {
          // Kamikaze: explode on nearest tower before exiting
          if (enemy.kamikaze) {
            this.kamikazeExplosion(enemy)
          }
          this.lives -= enemy.damage
          this.removeEnemy(enemy)
          this.updateHUD()
          this.playSfx('sfx_base_hit')
          this.showTutorial('Tut_BaseDamaged')
          if (this.lives <= 0) {
            this.handleGameOver(false)
          }
          return
        }
      } else {
        const speed = (enemy.speed * speedDelta) / 1000
        const moveX = (dx / dist) * speed
        const moveY = (dy / dist) * speed
        enemy.sprite.x += moveX
        enemy.sprite.y += moveY

        // Flip sprite based on movement direction
        if (dx < -2) {
          enemy.sprite.setFlipX(true)
        } else if (dx > 2) {
          enemy.sprite.setFlipX(false)
        }
      }

      // Update HP bar position
      const halfBar = enemy.barWidth / 2
      enemy.hpBg.setPosition(enemy.sprite.x, enemy.sprite.y)
      enemy.hpBar.setPosition(enemy.sprite.x, enemy.sprite.y)
      enemy.hpBg.clear()
      enemy.hpBg.fillStyle(0x333333)
      enemy.hpBg.fillRect(-halfBar, -20, enemy.barWidth, 4)
      enemy.hpBar.clear()
      const hpRatio = enemy.hp / enemy.maxHp
      const color = hpRatio > 0.5 ? 0x2ecc71 : hpRatio > 0.25 ? 0xf39c12 : 0xe74c3c
      enemy.hpBar.fillStyle(color)
      enemy.hpBar.fillRect(-halfBar, -20, enemy.barWidth * hpRatio, 4)

      // Update boss name plate
      if (enemy.namePlate) {
        enemy.namePlate.setPosition(enemy.sprite.x, enemy.sprite.y - enemy.barWidth / 2 - 16)
      }
    })

    // Gel Cube tower damage + enemy melee attacks
    this.enemies.forEach(enemy => {
      if (!enemy.sprite.active) return
      this.towers.forEach(tower => {
        if (tower.hp <= 0) return
        const dx = enemy.sprite.x - tower.x
        const dy = enemy.sprite.y - tower.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Gel cube special: damages towers it passes near
        if (enemy.towerDamage > 0 && dist < TILE * 1.5) {
          tower.hp -= (enemy.towerDamage * speedDelta) / 1000
          if (tower.hp <= 0) { tower.hp = 0; this.destroyTower(tower) }
        }

        // Standard melee range (ogre, giant have melee flag for extra damage)
        if (dist < TILE * 1.2) {
          const meleeMult = enemy.melee ? 10 : 5
          const dps = enemy.damage * meleeMult
          tower.hp -= (dps * speedDelta) / 1000
          if (tower.hp <= 0) { tower.hp = 0; this.destroyTower(tower) }
        }
      })
    })

    // Tower auto-heal and HP bar rendering
    this.towers = this.towers.filter(tower => {
      if (tower.hp <= 0) return false

      if (tower.autoHealRate > 0 && tower.hp < tower.maxHp) {
        tower.hp = Math.min(tower.maxHp, tower.hp + (tower.autoHealRate * speedDelta) / 1000)
      }

      if (tower.hp < tower.maxHp) {
        tower.hpBg.setVisible(true).setPosition(tower.x, tower.y)
        tower.hpBar.setVisible(true).setPosition(tower.x, tower.y)
        tower.hpBg.clear()
        tower.hpBg.fillStyle(0x333333)
        tower.hpBg.fillRect(-18, 18, 36, 4)
        tower.hpBar.clear()
        const ratio = tower.hp / tower.maxHp
        const barColor = ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf39c12 : 0xe74c3c
        tower.hpBar.fillStyle(barColor)
        tower.hpBar.fillRect(-18, 18, 36 * ratio, 4)
      } else {
        tower.hpBg.setVisible(false)
        tower.hpBar.setVisible(false)
      }

      return true
    })

    // Tower firing
    this.towers.forEach(tower => {
      if (tower.hp <= 0) return
      if (time - tower.lastFired < tower.fireRate) return

      let closest = null
      let closestDist = Infinity

      this.enemies.forEach(enemy => {
        if (!enemy.sprite.active) return
        const dx = enemy.sprite.x - tower.x
        const dy = enemy.sprite.y - tower.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= tower.range && dist < closestDist) {
          closest = enemy
          closestDist = dist
        }
      })

      if (closest) {
        if (tower.type === 'scout') {
          if (tower.lastTarget === closest) {
            tower.stackCount = (tower.stackCount || 0) + 1
          } else {
            tower.stackCount = 0
            tower.lastTarget = closest
          }
          const stackMult = 1 + tower.stackCount * 0.25
          this.fireProjectile(tower, closest, Math.round(tower.damage * stackMult))
        } else if (tower.type === 'storm') {
          this.fireChainLightning(tower, closest)
        } else {
          this.fireProjectile(tower, closest)
        }
        tower.lastFired = time
      }
    })

    // Move projectiles
    this.projectiles = this.projectiles.filter(proj => {
      if (!proj.sprite.active) return false

      const dx = proj.targetX - proj.sprite.x
      const dy = proj.targetY - proj.sprite.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 10) {
        this.handleProjectileHit(proj)
        proj.sprite.destroy()
        return false
      }

      const speed = (400 * speedDelta) / 1000
      proj.sprite.x += (dx / dist) * speed
      proj.sprite.y += (dy / dist) * speed

      if (proj.target && proj.target.sprite.active) {
        proj.targetX = proj.target.sprite.x
        proj.targetY = proj.target.sprite.y
      }

      return true
    })

    // Process deployables
    this.deployables = this.deployables.filter(dep => {
      if (!dep.active) return false

      if (dep.type === 'mine') {
        for (const enemy of this.enemies) {
          if (!enemy.sprite.active) continue
          // Beholders fly over mines
          if (enemy.flying) continue
          const dx = enemy.sprite.x - dep.x
          const dy = enemy.sprite.y - dep.y
          if (Math.sqrt(dx * dx + dy * dy) < 20) {
            dep.active = false
            dep.graphics.destroy()
            this.playSfx('sfx_mine_explode')
            // Explosion visual
            const boom = this.add.graphics().setDepth(11)
            boom.fillStyle(0xf39c12, 0.5)
            boom.fillCircle(dep.x, dep.y, dep.radius)
            this.tweens.add({
              targets: boom, alpha: 0, duration: 400,
              onComplete: () => boom.destroy(),
            })
            this.enemies.forEach(e => {
              if (!e.sprite.active) return
              const edx = e.sprite.x - dep.x
              const edy = e.sprite.y - dep.y
              if (Math.sqrt(edx * edx + edy * edy) <= dep.radius) {
                this.damageEnemy(e, dep.damage)
              }
            })
            return false
          }
        }
        return true
      }

      if (dep.type === 'gas') {
        dep.timer -= speedDelta
        if (dep.timer <= 0) {
          dep.active = false
          return false
        }
        this.enemies.forEach(enemy => {
          if (!enemy.sprite.active) return
          const dx = enemy.sprite.x - dep.x
          const dy = enemy.sprite.y - dep.y
          if (Math.sqrt(dx * dx + dy * dy) <= dep.radius) {
            this.damageEnemy(enemy, (dep.dps * speedDelta) / 1000)
          }
        })
        return true
      }

      return true
    })

    // Wave countdown between waves (auto-start after 15 seconds)
    if (!this.waveActive && !this.gameOver && this.currentWave > 0 && this.currentWave < this.levelData.waves.length) {
      this.waveCountdown -= speedDelta
      if (this.waveCountdown <= 0) {
        this.startNextWave()
      } else {
        const secs = Math.ceil(this.waveCountdown / 1000)
        this.countdownText.setText(`Next wave in ${secs}s (click to start early for +${5 * secs} gold)`)
      }
    }

    // Check wave complete
    if (this.waveActive && this.enemies.length === 0) {
      this.waveActive = false
      this.currentWave++

      if (this.goldWaveBonus > 0) {
        this.gold += this.goldWaveBonus
      }

      if (this.currentWave >= this.levelData.waves.length) {
        this.handleGameOver(true)
      } else {
        // Set up countdown for next wave
        this.waveCountdown = 15000
        this.startWaveBtn.setText(`>> START WAVE ${this.currentWave + 1} <<`)
        this.startWaveBtn.setVisible(true)
        this.countdownText.setVisible(true)

        // Bonus gold for starting early
        this.startWaveBtn.off('pointerdown')
        this.startWaveBtn.on('pointerdown', () => {
          const bonus = Math.max(0, Math.ceil(this.waveCountdown / 1000) * 5)
          this.gold += bonus
          if (bonus > 0) {
            this.showFloatingText(this.cameras.main.centerX, this.cameras.main.height - 120, `+${bonus} gold!`, '#f1c40f')
          }
          this.startNextWave()
        })
      }
      this.updateHUD()
    }
  }

  showFloatingText(x, y, text, color) {
    const ft = this.add.text(x, y, text, {
      fontSize: '14px', color, fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(25)

    this.tweens.add({
      targets: ft,
      y: y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => ft.destroy(),
    })
  }

  fireProjectile(tower, enemy, overrideDamage) {
    // Use upgraded projectile texture if available
    const def = TOWER_TYPES[tower.type]
    let texKey = tower.projectileTexture
    if (tower.level > 0 && def.projectile) {
      const upgKey = `${def.projectile}_${tower.level + 1}`
      if (this.textures.exists(upgKey)) texKey = upgKey
    }
    const sprite = this.add.image(tower.x, tower.y, texKey)
      .setDisplaySize(10, 10)
      .setDepth(10)
    this.projectileGroup.add(sprite)

    // Tower fire animation
    const fireAnimKeys = {
      ballista: ['ballista_fire', 'ballista_fire', 'ballista_3_fire'],
      cannon: ['cannon_fire', 'cannon_2_fire', 'cannon_3_fire'],
      catapult: ['catapult_fire', 'catapult_2_fire', 'catapult_3_fire'],
      scout: [null, null, null],
      storm: [null, 'storm_2_fire', 'storm_3_fire'],
      winter: ['winter_fire', 'winter_2_fire', 'winter_3_fire'],
    }
    const animArr = fireAnimKeys[tower.type]
    if (animArr && tower.sprite.play) {
      const animKey = animArr[tower.level]
      if (animKey && this.anims.exists(animKey)) {
        try { tower.sprite.play(animKey) } catch (e) {}
      }
    }

    // Tower fire SFX
    const towerSfx = {
      ballista: ['sfx_ballista1', 'sfx_ballista2', 'sfx_ballista3'],
      cannon: ['sfx_cannon1', 'sfx_cannon2'],
      catapult: ['sfx_catapult_shoot'],
      scout: ['sfx_scout1', 'sfx_scout2'],
      winter: ['sfx_ice_shoot'],
      storm: ['sfx_lightning'],
    }
    const sfxList = towerSfx[tower.type]
    if (sfxList) this.playSfx(sfxList[Math.floor(Math.random() * sfxList.length)], 0.25)

    this.projectiles.push({
      sprite,
      target: enemy,
      targetX: enemy.sprite.x,
      targetY: enemy.sprite.y,
      damage: overrideDamage || tower.damage,
      splash: tower.splash,
      slow: tower.slow,
      slowDuration: tower.slowDuration,
      towerType: tower.type,
    })
  }

  fireChainLightning(tower, primary) {
    // Play fire animation for storm tower
    const stormFireAnims = [null, 'storm_2_fire', 'storm_3_fire']
    const stormAnimKey = stormFireAnims[tower.level]
    if (stormAnimKey && this.anims.exists(stormAnimKey) && tower.sprite.play) {
      try { tower.sprite.play(stormAnimKey) } catch (e) {}
    }
    this.playSfx('sfx_lightning', 0.25)

    this.damageEnemy(primary, tower.damage, tower.type)

    const bolt = this.add.graphics().setDepth(11)
    bolt.lineStyle(2, 0x9b59b6, 0.8)
    bolt.lineBetween(tower.x, tower.y, primary.sprite.x, primary.sprite.y)

    const hit = new Set([primary])
    let lastX = primary.sprite.x
    let lastY = primary.sprite.y
    let chainDamage = tower.damage

    for (let chain = 0; chain < 4; chain++) {
      chainDamage = Math.round(chainDamage * 0.8)
      if (chainDamage < 1) break

      let nearest = null
      let nearDist = Infinity
      this.enemies.forEach(enemy => {
        if (!enemy.sprite.active || hit.has(enemy)) return
        const dx = enemy.sprite.x - lastX
        const dy = enemy.sprite.y - lastY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 100 && dist < nearDist) {
          nearest = enemy
          nearDist = dist
        }
      })

      if (!nearest) break

      hit.add(nearest)
      this.damageEnemy(nearest, chainDamage, tower.type)

      bolt.lineStyle(Math.max(1, 2 - chain * 0.4), 0x9b59b6, 0.6 - chain * 0.1)
      bolt.lineBetween(lastX, lastY, nearest.sprite.x, nearest.sprite.y)

      lastX = nearest.sprite.x
      lastY = nearest.sprite.y
    }

    this.tweens.add({
      targets: bolt, alpha: 0, duration: 200,
      onComplete: () => bolt.destroy(),
    })
  }

  handleProjectileHit(proj) {
    // Impact visual
    const impactColor = proj.slow > 0 ? 0x00bcd4 : proj.splash > 0 ? 0xe74c3c : 0xf1c40f
    const impact = this.add.graphics().setDepth(11)
    impact.fillStyle(impactColor, 0.6)
    impact.fillCircle(proj.targetX, proj.targetY, proj.splash > 0 ? proj.splash / 3 : 8)
    this.tweens.add({
      targets: impact, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 200,
      onComplete: () => impact.destroy(),
    })

    if (proj.splash > 0) {
      this.playSfx('sfx_catapult_impact', 0.2)
      this.enemies.forEach(enemy => {
        if (!enemy.sprite.active) return
        const dx = enemy.sprite.x - proj.targetX
        const dy = enemy.sprite.y - proj.targetY
        if (Math.sqrt(dx * dx + dy * dy) <= proj.splash) {
          this.damageEnemy(enemy, proj.damage, proj.towerType)
        }
      })
    } else if (proj.target && proj.target.sprite.active) {
      this.damageEnemy(proj.target, proj.damage, proj.towerType)
    }

    // Slow effect
    if (proj.slow > 0 && proj.target && proj.target.sprite.active) {
      proj.target.speed = proj.target.baseSpeed * proj.slow
      proj.target.slowTimer = proj.slowDuration
      proj.target.sprite.setTint(0x00bcd4)
    }
  }

  damageEnemy(enemy, damage, towerType) {
    enemy.hp -= damage

    // Damage number float (only for significant hits)
    if (damage >= 10) {
      const dmgText = this.add.text(enemy.sprite.x + Phaser.Math.Between(-8, 8), enemy.sprite.y - 15, Math.round(damage), {
        fontSize: '10px', color: '#fff',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(15)
      this.tweens.add({
        targets: dmgText, y: dmgText.y - 20, alpha: 0, duration: 500,
        onComplete: () => dmgText.destroy(),
      })
    }

    if (enemy.hp <= 0) {
      this.gold += enemy.reward
      this.enemiesKilled++
      if (enemy.boss) this.bossKilled = true
      if (towerType === 'scout') {
        this.scoutKills++
        if (enemy.type === 'ogre' || enemy.type === 'boss_ogre') this.scoutKilledOgre = true
      }
      this.dropGem(enemy.sprite.x, enemy.sprite.y, enemy.reward)

      // Death effect
      this.spawnDeathEffect(enemy)
      this.playSfx('sfx_coin_pickup', 0.3)

      // Slime split: spawn baby slimes at current position
      if (enemy.splits > 0) {
        this.splitEnemy(enemy)
        this.showTutorial('Tut_Slimes')
      }

      // Tutorial triggers for special enemy types
      if (enemy.regens > 0) this.showTutorial('Tut_TrollRegen')
      if (enemy.towerDamage > 0) this.showTutorial('Tut_GelCubes')

      this.removeEnemy(enemy)
      this.updateHUD()
    }
  }

  spawnDeathEffect(enemy) {
    const x = enemy.sprite.x
    const y = enemy.sprite.y

    // Small particle burst
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const particle = this.add.graphics().setDepth(12)
      const pColor = enemy.boss ? 0xe74c3c : 0xf1c40f
      particle.fillStyle(pColor, 0.8)
      particle.fillCircle(0, 0, enemy.boss ? 4 : 2)
      particle.setPosition(x, y)

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * (enemy.boss ? 40 : 20),
        y: y + Math.sin(angle) * (enemy.boss ? 40 : 20),
        alpha: 0,
        duration: enemy.boss ? 600 : 300,
        onComplete: () => particle.destroy(),
      })
    }
  }

  splitEnemy(enemy) {
    const babyDef = ENEMY_TYPES.slime_baby
    if (!babyDef) return

    for (let i = 0; i < enemy.splits; i++) {
      const offsetX = Phaser.Math.Between(-15, 15)
      const offsetY = Phaser.Math.Between(-15, 15)

      const spriteSize = Math.round(28 * (babyDef.size || 0.6))
      const sprite = this.add.image(enemy.sprite.x + offsetX, enemy.sprite.y + offsetY, babyDef.texture)
        .setDisplaySize(spriteSize, spriteSize)
        .setDepth(6)
        .setTint(0x88ff88) // green tint for babies
      this.enemyGroup.add(sprite)

      const scaledHp = Math.round(babyDef.hp * this.diffMult.enemyHp)
      const scaledSpeed = Math.round(babyDef.speed * this.diffMult.enemySpeed)

      const hpBg = this.add.graphics().setDepth(7)
      const hpBar = this.add.graphics().setDepth(8)

      const baby = {
        sprite, hpBg, hpBar,
        type: 'slime_baby',
        hp: scaledHp, maxHp: scaledHp,
        baseSpeed: scaledSpeed, speed: scaledSpeed,
        reward: babyDef.reward,
        damage: babyDef.damage,
        waypointIndex: enemy.waypointIndex, // continue from parent's position
        slowTimer: 0,
        barWidth: 20,
        splits: 0, regens: 0, towerDamage: 0,
        kamikaze: false, flying: false, melee: false, boss: false,
        size: babyDef.size || 0.6,
        namePlate: null,
      }

      this.enemies.push(baby)
    }
  }

  kamikazeExplosion(enemy) {
    // Find nearest tower
    let nearest = null
    let nearDist = Infinity
    this.towers.forEach(tower => {
      if (tower.hp <= 0) return
      const dx = enemy.sprite.x - tower.x
      const dy = enemy.sprite.y - tower.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < nearDist) {
        nearest = tower
        nearDist = dist
      }
    })

    if (nearest && nearDist < TILE * 3) {
      // Explosion damage to tower
      nearest.hp -= 50
      if (nearest.hp <= 0) {
        nearest.hp = 0
        this.destroyTower(nearest)
      }

      // Explosion visual
      const boom = this.add.graphics().setDepth(11)
      boom.fillStyle(0xff6600, 0.6)
      boom.fillCircle(nearest.x, nearest.y, 40)
      this.tweens.add({
        targets: boom, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 400,
        onComplete: () => boom.destroy(),
      })
    }
  }

  dropGem(x, y, reward) {
    const chance = reward >= 30 ? 1.0 : reward >= 15 ? 0.5 : 0.2
    if (Math.random() > chance) return

    const baseGem = reward >= 30 ? 3 : reward >= 15 ? 2 : 1
    const gemValue = Math.max(1, Math.round(baseGem * this.diffMult.gemMult))

    // Use gem sprites if available — larger gem for higher value
    let gem
    const isLarge = gemValue >= 3
    const gemKey = isLarge ? 'hud_gem' : 'hud_gem_small'
    if (this.textures.exists(gemKey)) {
      const sz = isLarge ? 20 : 14
      gem = this.add.image(x, y, gemKey).setDisplaySize(sz, sz).setDepth(12)
    } else {
      const colors = [0x9b59b6, 0x3498db, 0x2ecc71, 0xe74c3c, 0xf1c40f]
      const color = colors[Math.floor(Math.random() * colors.length)]
      gem = this.add.graphics().setDepth(12)
      gem.fillStyle(color, 0.9)
      gem.fillPoints([
        { x: 0, y: -6 }, { x: 5, y: 0 },
        { x: 0, y: 6 }, { x: -5, y: 0 },
      ], true)
      gem.setPosition(x, y)
    }

    this.tweens.add({
      targets: gem,
      y: y - 20,
      alpha: { from: 1, to: 0.7 },
      duration: 500,
      ease: 'Power1',
    })

    const gemDrop = { graphics: gem, x, y: y - 20, value: gemValue, timer: 5000 }
    this.gemDrops.push(gemDrop)

    const zone = this.add.zone(x, y - 10, 30, 30).setInteractive().setDepth(13)
    zone.on('pointerdown', () => {
      this.collectGem(gemDrop)
      zone.destroy()
    })
    gemDrop.zone = zone

    this.time.delayedCall(3000, () => {
      if (gemDrop.graphics.active) {
        this.collectGem(gemDrop)
        if (gemDrop.zone) gemDrop.zone.destroy()
      }
    })
  }

  collectGem(gemDrop) {
    if (!gemDrop.graphics.active) return
    this.gemsCollected += gemDrop.value
    this.playSfx(gemDrop.value >= 3 ? 'sfx_chime2' : 'sfx_chime1', 0.3)

    this.tweens.add({
      targets: gemDrop.graphics,
      y: gemDrop.graphics.y - 30,
      alpha: 0,
      scaleX: 1.5, scaleY: 1.5,
      duration: 300,
      onComplete: () => gemDrop.graphics.destroy(),
    })

    this.gemDrops = this.gemDrops.filter(g => g !== gemDrop)
    this.updateHUD()
  }

  destroyTower(tower) {
    this.tweens.add({
      targets: tower.sprite,
      alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 300,
      onComplete: () => {
        tower.sprite.destroy()
        tower.hpBg.destroy()
        tower.hpBar.destroy()
      },
    })
    tower.hp = 0
  }

  removeEnemy(enemy) {
    enemy.sprite.destroy()
    enemy.hpBg.destroy()
    enemy.hpBar.destroy()
    if (enemy.namePlate) enemy.namePlate.destroy()
    this.enemies = this.enemies.filter(e => e !== enemy)
  }

  handleGameOver(won) {
    this.gameOver = true
    this.startWaveBtn.setVisible(false)
    this.countdownText.setVisible(false)
    this.stopMusic()

    const cx = this.cameras.main.centerX
    const cy = this.cameras.main.centerY

    let stars = 0
    if (won) {
      const lifeRatio = this.lives / this.startLives
      stars = lifeRatio >= 1 ? 3 : lifeRatio >= 0.5 ? 2 : 1
      this.playSfx('sfx_level_finished')
      this.playSfx('sfx_cheer', 0.3)
    } else {
      this.playSfx('sfx_you_lost')
    }

    // Save progress
    if (won) {
      unlockLevel(this.levelIndex + 1)
      const starKey = `${this.levelIndex}_${this.difficulty}`
      setLevelStars(starKey, stars)
      setLevelStars(this.levelIndex, stars)
    }

    // Save gems
    if (this.gemsCollected > 0) {
      const save = loadSave()
      save.gems += this.gemsCollected
      saveSave(save)
    }

    // Save kill stats and personal best
    addTotalKills(this.enemiesKilled, this.gemsCollected)
    const score = this.enemiesKilled * 100 + this.gemsCollected * 50 + (won ? stars * 500 : 0)
    setPersonalBest(`${this.levelIndex}_${this.difficulty}`, score, this.enemiesKilled)

    // Check bonus mission
    const missionIdx = this.levelData.bonusMission
    if (missionIdx !== undefined && won) {
      const mission = BONUS_MISSIONS[missionIdx]
      if (mission) {
        let completed = false
        const check = mission.check
        if (check === 'always') completed = true
        if (check === 'gems_3' && this.gemsCollected >= 3) completed = true
        if (check === 'gems_20' && this.gemsCollected >= 20) completed = true
        if (check === 'gems_25' && this.gemsCollected >= 25) completed = true
        if (check === 'gems_35' && this.gemsCollected >= 35) completed = true
        if (check === 'gold_400' && this.gold >= 400) completed = true
        if (check === 'gold_500' && this.gold >= 500) completed = true
        if (check === 'sell_5' && this.towersSold >= 5) completed = true
        if (check === 'build_storm_3' && this.stormTowersBuilt >= 3) completed = true
        if (check === 'build_15' && this.towersBuilt >= 15) completed = true
        if (check === 'no_weapons' && !this.weaponsUsed) completed = true
        if (check === 'no_ice' && this.iceTowersBuilt === 0) completed = true
        if (check === 'kill_boss' && this.bossKilled) completed = true
        if (check === 'keg_multi_3' && this.kegMultiKills >= 1) completed = true
        if (check === 'gas_multi_5' && this.gasMultiHits >= 1) completed = true
        if (check === 'scout_kill_ogre' && this.scoutKilledOgre) completed = true
        if (check === 'upgrade_catapult_3' && this.maxCatapultLevel >= 3) completed = true
        if (check === 'repair_3' && this.towersRepaired >= 3) completed = true
        if (check === 'scout_kills_20' && this.scoutKills >= 20) completed = true
        if (check === 'all_gold_deposits') {
          completed = this.specialTiles.deposits.length > 0 && this.specialTiles.deposits.every(d => d.mined)
        }
        if (completed) {
          completeBonusMission(`${this.levelIndex}_${this.difficulty}`)
        }
      }
    }

    const save = loadSave()
    this.registry.set('gameState', { levelsUnlocked: save.levelsUnlocked })

    // Overlay
    const overlay = this.add.graphics().setDepth(50)
    overlay.fillStyle(0x000000, 0.7)
    overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height)

    const bgKey = won ? 'victory_bg' : 'gameover_bg'
    if (this.textures.exists(bgKey)) {
      this.add.image(cx, cy, bgKey)
        .setDisplaySize(400, 300).setDepth(50).setAlpha(0.4)
    }

    const title = won ? 'VICTORY!' : 'DEFEAT'
    const titleColor = won ? '#2ecc71' : '#e74c3c'

    this.add.text(cx, cy - 80, title, {
      fontSize: '48px', color: titleColor, fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51)

    if (won) {
      this.playSfx('sfx_gold_star', 0.4)
      for (let i = 0; i < 3; i++) {
        const starX = cx - 40 + i * 40
        const filled = i < stars
        this.add.text(starX, cy - 40, filled ? '\u2605' : '\u2606', {
          fontSize: '32px',
          color: filled ? '#f1c40f' : '#555',
          stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(51)
      }
    } else {
      // Show defeat quote
      const quote = DEFEAT_QUOTES[Math.floor(Math.random() * DEFEAT_QUOTES.length)]
      this.add.text(cx, cy - 35, quote, {
        fontSize: '10px', color: '#aaa', fontStyle: 'italic',
        wordWrap: { width: 350 },
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(51)
    }

    // Stats
    const gemSave = loadSave()
    this.add.text(cx, cy + 5, `Gems: +${this.gemsCollected} (${gemSave.gems} total) | Kills: ${this.enemiesKilled}`, {
      fontSize: '13px', color: '#9b59b6', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(51)

    // Difficulty badge
    const diffColors = { casual: '#2ecc71', normal: '#f1c40f', brutal: '#e74c3c', inferno: '#ff4500' }
    this.add.text(cx, cy + 25, `${this.difficulty.toUpperCase()} MODE`, {
      fontSize: '11px', color: diffColors[this.difficulty] || '#aaa',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(51)

    // Score
    this.add.text(cx, cy + 40, `Score: ${score}`, {
      fontSize: '12px', color: '#f1c40f',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(51)

    // Buttons
    const menuBtn = this.add.text(cx - 80, cy + 65, 'Menu', {
      fontSize: '20px', color: '#fff', backgroundColor: '#16213e',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true })
    menuBtn.on('pointerdown', () => this.scene.start('LevelSelectScene'))

    if (won && this.levelIndex + 1 < LEVELS.length) {
      const nextBtn = this.add.text(cx + 80, cy + 65, 'Next', {
        fontSize: '20px', color: '#fff', backgroundColor: '#e94560',
        padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true })
      nextBtn.on('pointerdown', () => {
        this.scene.start('GameScene', { levelIndex: this.levelIndex + 1, difficulty: this.difficulty })
      })
    }

    const retryBtn = this.add.text(cx, cy + 110, 'Retry', {
      fontSize: '16px', color: '#888',
    }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true })
    retryBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { levelIndex: this.levelIndex, difficulty: this.difficulty })
    })
  }

  updateHUD() {
    this.goldText.setText(`${this.gold}`)
    this.livesText.setText(`${this.lives}`)
    this.waveText.setText(`Wave ${this.currentWave + 1}/${this.levelData.waves.length}`)
    this.gemText.setText(`${this.gemsCollected}`)
    this.killText.setText(`\u2620 ${this.enemiesKilled}`)
  }

  updateGameState() {
    // Sync state to registry for cloud saves
    this.registry.set('gameState', {
      levelIndex: this.levelIndex,
      levelsUnlocked: this.saveData.levelsUnlocked,
    })
  }
}
