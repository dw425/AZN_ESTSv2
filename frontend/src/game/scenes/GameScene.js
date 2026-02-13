import Phaser from 'phaser'
import { LEVELS, TOWER_TYPES, ENEMY_TYPES, BONUS_MISSIONS, DEFEAT_QUOTES, TUTORIALS } from '../maps/levels.js'
import { loadSave, saveSave, spendGems, unlockLevel, setLevelStars, completeBonusMission, setPersonalBest, markTutorialSeen, hasTutorialSeen, addTotalKills } from '../SaveManager.js'

const TILE = 64

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  init(data) {
    this.levelIndex = data.levelIndex || 0
    this.endlessMode = data.endless || false
    // Deep-copy level data so endless mode waves.push() doesn't mutate the LEVELS array
    const src = LEVELS[this.levelIndex]
    this.levelData = { ...src, waves: src.waves.map(w => ({ ...w, enemies: [...w.enemies] })) }
    this.difficulty = data.difficulty || 'normal'
    this.endlessWaveNum = 0

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
    this.peakGold = this.gold
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
    this.manualTarget = null
    this.targetIndicator = null
    this._goldDeposits = []

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

    // Combo system — rapid kills give bonus gold
    this.comboCount = 0
    this.comboTimer = 0
    this.comboGoldBonus = 0

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
      // Destroy remaining game objects
      this.projectiles.forEach(p => { try { if (p.sprite.active) p.sprite.destroy() } catch (e) {} })
      this.projectiles = []
      this.deployables.forEach(d => { try { d.graphics.destroy() } catch (e) {} })
      this.deployables = []
      this.gemDrops.forEach(g => {
        try { if (g.graphics.active) g.graphics.destroy() } catch (e) {}
        try { if (g.zone) g.zone.destroy() } catch (e) {}
      })
      this.gemDrops = []
      this.towers.forEach(t => {
        try { if (t.sprite && t.sprite.active) t.sprite.destroy() } catch (e) {}
        try { if (t.hpBg && t.hpBg.active) t.hpBg.destroy() } catch (e) {}
        try { if (t.hpBar && t.hpBar.active) t.hpBar.destroy() } catch (e) {}
      })
      this.towers = []
      this.enemies.forEach(e => {
        try { if (e.sprite && e.sprite.active) e.sprite.destroy() } catch (e2) {}
        try { if (e.hpBg && e.hpBg.active) e.hpBg.destroy() } catch (e2) {}
        try { if (e.hpBar && e.hpBar.active) e.hpBar.destroy() } catch (e2) {}
        try { if (e.namePlate) e.namePlate.destroy() } catch (e2) {}
      })
      this.enemies = []
      if (this.towerMenu) { try { this.towerMenu.destroy() } catch (e) {} }
      if (this.targetIndicator) { try { this.targetIndicator.destroy() } catch (e) {} }
      this._goldDeposits = []
    })

    this.drawMap()

    this.enemyGroup = this.add.group()
    this.projectileGroup = this.add.group()
    this.towerGroup = this.add.group()

    this.createHUD()
    this.createBuildPanel()
    this.createWeaponBar()

    // Range indicator — use original game asset if available
    const rangeKey = this.textures.exists('hud_range') ? 'hud_range' : 'range_circle'
    this.rangeIndicator = this.add.image(0, 0, rangeKey).setVisible(false).setAlpha(0.5).setDepth(5)

    // Cell hover indicators — use original game assets for authentic look
    const cellOkKey = this.textures.exists('hud_glow_cell') ? 'hud_glow_cell' : 'cell_ok'
    const cellNoKey = this.textures.exists('hud_no_cell') ? 'hud_no_cell' : 'cell_no'
    this.cellIndicator = this.add.image(0, 0, cellOkKey).setDisplaySize(TILE, TILE).setDepth(5).setAlpha(0.7).setVisible(false)
    this.cellNoIndicator = this.add.image(0, 0, cellNoKey).setDisplaySize(TILE, TILE).setDepth(5).setAlpha(0.7).setVisible(false)

    // Hover handler for cell indicators
    this.input.on('pointermove', (pointer) => {
      if (!this.selectedTowerType || this.gameOver || this.paused) {
        this.cellIndicator.setVisible(false)
        this.cellNoIndicator.setVisible(false)
        return
      }
      // Don't show indicators in HUD or build panel zones
      if (pointer.y < 36 || pointer.y > this.cameras.main.height - 80) {
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
      const cellVal = grid[row][col]
      const canBuild = (cellVal === 0 || cellVal >= 6) && !this.towers.find(t => t.gridCol === col && t.gridRow === row)
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

    // Keyboard shortcuts
    this.input.keyboard.on('keydown-P', () => { if (!this.gameOver) this.showPauseMenu() })
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.waveActive && !this.gameOver && !this.paused) this.startNextWave()
    })
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.gameOver) return
      if (this.paused) { this.showPauseMenu(); return }
      this.selectedTowerType = null
      this.activeWeapon = null
      this.cellIndicator.setVisible(false)
      this.cellNoIndicator.setVisible(false)
      this.updateBuildHighlights()
      this.updateWeaponHighlights()
    })
    const towerKeys = Object.keys(TOWER_TYPES)
    for (let i = 0; i < towerKeys.length && i < 6; i++) {
      this.input.keyboard.on(`keydown-${i + 1}`, () => {
        if (this.gameOver || this.paused) return
        const key = towerKeys[i]
        this.selectedTowerType = this.selectedTowerType === key ? null : key
        this.activeWeapon = null
        this.updateBuildHighlights()
        this.updateWeaponHighlights()
      })
    }

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

    // Wave preview text showing upcoming enemies
    this.wavePreview = this.add.text(
      this.cameras.main.centerX, this.cameras.main.height - 115,
      '', { fontSize: '10px', color: '#888', stroke: '#000', strokeThickness: 1 }
    ).setOrigin(0.5).setDepth(20)
    this.updateWavePreview()

    // Boss warning text (hidden)
    this.bossWarning = this.add.text(
      this.cameras.main.centerX, this.cameras.main.centerY - 30,
      '', { fontSize: '28px', color: '#e74c3c', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }
    ).setOrigin(0.5).setDepth(40).setVisible(false)

    // Show bonus mission objective at level start (fades out after 4 seconds)
    const missionIdx = this.levelData.bonusMission
    if (missionIdx !== undefined && BONUS_MISSIONS[missionIdx]) {
      const mission = BONUS_MISSIONS[missionIdx]
      const objText = this.add.text(
        this.cameras.main.centerX, this.cameras.main.height - 130,
        `\u2606 Bonus: ${mission.desc}`,
        { fontSize: '11px', color: '#f1c40f', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 }
      ).setOrigin(0.5).setDepth(25)
      this.tweens.add({
        targets: objText, alpha: 0, delay: 4000, duration: 1000,
        onComplete: () => objText.destroy(),
      })
    }

    // Start music
    this.startMusic()

    this.updateGameState()
  }

  startMusic() {
    const musicKey = this.levelData.music
    if (!musicKey) return
    try {
      // Stop only background music, not SFX
      this.stopMusic()
      if (this.cache.audio.exists(musicKey)) {
        const musicVol = this.saveData.settings ? this.saveData.settings.musicVolume : 0.3
        this.bgMusic = this.sound.add(musicKey, { loop: true, volume: musicVol })
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

  getUndergroundKey(bgKey) {
    // Underground-themed levels already show the path — no overlay needed
    if (bgKey.endsWith('_under')) return null

    // Direct mapping: append _under
    const underKey = bgKey + '_under'
    if (this.textures.exists(underKey)) return underKey

    // Fallbacks for maps without underground texture variants
    const fallbacks = {
      'map_f2': 'map_f1_under',
      'map_f1night': 'map_f1_under',
    }
    const fb = fallbacks[bgKey]
    if (fb && this.textures.exists(fb)) return fb

    return null
  }

  drawMap() {
    const grid = this.levelData.grid
    const bgKey = this.levelData.mapBg || 'map_grass'
    const w = this.cameras.main.width
    const h = this.cameras.main.height
    const cx = this.cameras.main.centerX
    const cy = this.cameras.main.centerY

    if (this.textures.exists(bgKey)) {
      this.add.image(cx, cy, bgKey).setDisplaySize(w, h)
    } else {
      const bg = this.add.graphics()
      bg.fillStyle(0x2d5a27)
      bg.fillRect(0, 0, w, h)
    }

    // Render underground texture on path tiles using a geometry mask
    // In the original game, paths show through to the underground layer
    const underKey = this.getUndergroundKey(bgKey)
    if (underKey) {
      const underImg = this.add.image(cx, cy, underKey).setDisplaySize(w, h).setDepth(1)
      const maskShape = this.make.graphics()
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const v = grid[r][c]
          if (v >= 1 && v <= 3) {
            maskShape.fillStyle(0xffffff)
            maskShape.fillRect(c * TILE, r * TILE, TILE, TILE)
          }
        }
      }
      underImg.setMask(maskShape.createGeometryMask())
    } else {
      // Fallback: use pathBrush overlay when no underground texture exists
      const hasPathBrush = this.textures.exists('path_brush')
      if (hasPathBrush) {
        for (let r = 0; r < grid.length; r++) {
          for (let c = 0; c < grid[r].length; c++) {
            const v = grid[r][c]
            if (v >= 1 && v <= 3) {
              this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, 'path_brush')
                .setDisplaySize(TILE, TILE).setDepth(1).setAlpha(0.5)
            }
          }
        }
      }
    }

    // Render tower platforms on buildable cells (value 0)
    const hasPlatform = this.textures.exists('tower_platform')
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === 0 || grid[r][c] >= 6) {
          const px = c * TILE + TILE / 2
          const py = r * TILE + TILE / 2
          if (hasPlatform) {
            this.add.image(px, py, 'tower_platform')
              .setDisplaySize(TILE - 2, TILE - 2).setDepth(1).setAlpha(0.65)
          }
        }
      }
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

    // Render treasure chests as destructible targets with HP
    this.specialTiles.chests.forEach(chest => {
      const cx = chest.c * TILE + TILE / 2
      const cy = chest.r * TILE + TILE / 2
      chest.x = cx
      chest.y = cy
      chest.hp = 150
      chest.maxHp = 150
      chest.reward = 75
      chest.isChest = true
      // Use positioned graphics so sprite.x/y work for targeting
      chest.sprite = this.add.graphics().setDepth(3).setPosition(cx, cy)
      // Brown chest body
      chest.sprite.fillStyle(0x8b4513, 0.85)
      chest.sprite.fillRoundedRect(-12, -8, 24, 16, 3)
      // Gold clasp
      chest.sprite.fillStyle(0xf1c40f, 0.9)
      chest.sprite.fillRect(-3, -4, 6, 6)
      // Lid highlight
      chest.sprite.lineStyle(1, 0xa0522d)
      chest.sprite.strokeRoundedRect(-12, -8, 24, 16, 3)
      this.add.text(cx, cy + 14, '\u2666', {
        fontSize: '8px', color: '#f1c40f',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(4)
      // HP bar for chest (hidden until damaged)
      chest.hpBg = this.add.graphics().setDepth(4).setVisible(false)
      chest.hpBar = this.add.graphics().setDepth(4).setVisible(false)
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

    // Speed controls — 1x / 2x / 3x cycle + pause
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
    // 3x speed button
    this.tripleBtn = this.add.text(speedX + 56, 18, '3x', {
      fontSize: '12px', color: '#888', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(16)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.setSpeed(3))
    if (this.textures.exists('hud_pause')) {
      this.pauseBtn = this.add.image(speedX + 82, 18, 'hud_pause')
        .setDisplaySize(22, 22).setDepth(16)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.showPauseMenu())
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

    this.setSpeed(1)
    this.updateHUD()
  }

  setSpeed(speed) {
    this.gameSpeed = speed
    this.time.timeScale = speed
    // Update button visuals — highlight active speed
    if (this.playBtn) this.playBtn.setAlpha(speed === 1 ? 1 : 0.4)
    if (this.ffBtn) {
      this.ffBtn.setAlpha(speed === 2 ? 1 : 0.4)
      const ffKey = speed === 2 ? 'hud_ff_on' : 'hud_ff'
      if (this.textures.exists(ffKey)) this.ffBtn.setTexture(ffKey)
    }
    if (this.tripleBtn) {
      this.tripleBtn.setColor(speed === 3 ? '#ff4500' : '#888')
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
      this.time.paused = false // Resume timer events (wave spawning, etc.)
      this.tweens.resumeAll()
      return
    }
    this.paused = true
    this.time.paused = true // Freeze timer events so enemies don't spawn during pause
    this.tweens.pauseAll() // Freeze visual animations during pause

    const cx = this.cameras.main.centerX
    const cy = this.cameras.main.centerY
    const container = this.add.container(cx, cy).setDepth(60)

    // Backdrop — click outside panel to resume
    const backdrop = this.add.graphics()
    backdrop.fillStyle(0x000000, 0.7)
    backdrop.fillRect(-cx, -cy, cx * 2, cy * 2)
    backdrop.setInteractive(new Phaser.Geom.Rectangle(-cx, -cy, cx * 2, cy * 2), Phaser.Geom.Rectangle.Contains)
    backdrop.on('pointerdown', () => { container.destroy(); this.pauseMenu = null; this.paused = false; this.time.paused = false; this.tweens.resumeAll() })
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

    // Level/wave info
    const levelName = this.levelData.name || `Level ${this.levelIndex + 1}`
    const waveInfo = `${levelName} — Wave ${this.currentWave}/${this.levelData.waves.length}`
    container.add(this.add.text(0, -55, waveInfo, {
      fontSize: '11px', color: '#888',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5))

    const buttons = [
      { text: 'Resume', color: '#2ecc71', action: () => { container.destroy(); this.pauseMenu = null; this.paused = false; this.time.paused = false; this.tweens.resumeAll() } },
      { text: 'Restart', color: '#f1c40f', action: () => { this.stopMusic(); this.scene.start('GameScene', { levelIndex: this.levelIndex, difficulty: this.difficulty, endless: this.endlessMode }) } },
      { text: 'Quit to Menu', color: '#e74c3c', action: () => { this.stopMusic(); this.scene.start('LevelSelectScene') } },
    ]

    buttons.forEach((btn, i) => {
      const y = -25 + i * 40
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
    try {
      if (this.bgMusic && this.bgMusic.isPlaying) this.bgMusic.stop()
    } catch (e) {}
  }

  playSfx(key, volume) {
    try {
      if (this.cache.audio.exists(key)) {
        const sfxVol = this.saveData.settings ? this.saveData.settings.sfxVolume : 0.5
        this.sound.play(key, { volume: (volume || 0.4) * sfxVol })
      }
    } catch (e) { /* audio not available */ }
  }

  showTutorial(tutId) {
    if (this.saveData.settings && !this.saveData.settings.showTutorials) return
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
        .setDisplaySize(44, 44)
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
      }).setDepth(20).setInteractive({ useHandCursor: true })

      btn.on('pointerdown', () => {
        if (this.weaponCharges[wpn.key] > 0) {
          if (this.activeWeapon === wpn.key) {
            this.activeWeapon = null
          } else {
            this.activeWeapon = wpn.key
            this.selectedTowerType = null
            this._weaponJustSelected = true // Prevent immediate deploy
            this.updateBuildHighlights()
          }
          this.updateWeaponHighlights()
        } else {
          // Recharge with gems when depleted
          this.rechargeWeapon(wpn.key)
        }
      })

      this.weaponButtons[wpn.key] = btn
    })

    // Store weapon colors for updateWeaponButtons
    this.weaponColors = {}
    weapons.forEach(wpn => { this.weaponColors[wpn.key] = wpn.color })
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

      // Layered explosion visual — inner core + outer blast + ring
      const core = this.add.graphics().setDepth(12).setPosition(x, y)
      core.fillStyle(0xffff00, 0.9)
      core.fillCircle(0, 0, radius * 0.3)
      this.tweens.add({
        targets: core, alpha: 0, scaleX: 3, scaleY: 3, duration: 300,
        onComplete: () => core.destroy(),
      })
      const boom = this.add.graphics().setDepth(11).setPosition(x, y)
      boom.fillStyle(0xe74c3c, 0.6)
      boom.fillCircle(0, 0, radius)
      this.tweens.add({
        targets: boom, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 500,
        onComplete: () => boom.destroy(),
      })
      const ring = this.add.graphics().setDepth(11).setPosition(x, y)
      ring.lineStyle(3, 0xff6600, 0.8)
      ring.strokeCircle(0, 0, radius * 0.5)
      this.tweens.add({
        targets: ring, scaleX: 2, scaleY: 2, alpha: 0, duration: 400,
        onComplete: () => ring.destroy(),
      })
      // Screen shake for explosions
      this.cameras.main.shake(200, 0.005)

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
      // Metallic mine body
      mine.fillStyle(0x8b4513, 0.9)
      mine.fillCircle(0, 0, 10)
      mine.fillStyle(0xf39c12, 0.8)
      mine.fillCircle(0, 0, 7)
      // Spikes around the mine
      for (let a = 0; a < 6; a++) {
        const angle = (a / 6) * Math.PI * 2
        const sx = Math.cos(angle) * 11
        const sy = Math.sin(angle) * 11
        mine.fillStyle(0xc0392b, 0.9)
        mine.fillCircle(sx, sy, 3)
      }
      mine.lineStyle(1.5, 0x333333)
      mine.strokeCircle(0, 0, 10)
      mine.setPosition(x, y)

      this.deployables.push({
        type: 'mine', graphics: mine, x, y,
        radius: 50, damage: 200, active: true,
      })

    } else if (weaponKey === 'gas') {
      this.weaponCharges.gas--
      this.playSfx('sfx_fuse')
      this.showTutorial('Tut_QuickUseGas')

      // Layered gas cloud visual — outer haze + inner core + wisp particles
      const cloudContainer = this.add.container(x, y).setDepth(3)
      const outerHaze = this.add.graphics()
      outerHaze.fillStyle(0x27ae60, 0.15)
      outerHaze.fillCircle(0, 0, 70)
      cloudContainer.add(outerHaze)
      const innerCloud = this.add.graphics()
      innerCloud.fillStyle(0x2ecc71, 0.35)
      innerCloud.fillCircle(0, 0, 45)
      cloudContainer.add(innerCloud)
      const coreGlow = this.add.graphics()
      coreGlow.fillStyle(0x1abc9c, 0.25)
      coreGlow.fillCircle(0, 0, 25)
      cloudContainer.add(coreGlow)

      // Pulsing animation on inner cloud
      this.tweens.add({
        targets: innerCloud, scaleX: 1.15, scaleY: 1.15,
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      })
      // Slow rotation on outer haze
      this.tweens.add({
        targets: outerHaze, angle: 360,
        duration: 4000, repeat: -1,
      })

      const gasObj = {
        type: 'gas', graphics: cloudContainer, x, y,
        radius: 60, dps: 30, timer: 5000, active: true,
        hitEnemies: new Set(), // Track unique enemies hit for bonus mission
      }
      this.deployables.push(gasObj)
    }

    this.activeWeapon = null
    this.updateWeaponHighlights()
    this.updateWeaponButtons()
  }

  updateWeaponButtons() {
    Object.entries(this.weaponButtons).forEach(([key, btn]) => {
      const charges = this.weaponCharges[key]
      const symbols = { powderKeg: '\u2620', mine: '\u26A0', gas: '\u2601' }
      if (charges > 0) {
        btn.setText(`${symbols[key]}${charges}`)
        btn.setColor(this.weaponColors[key] || '#fff')
        btn.setInteractive({ useHandCursor: true })
      } else {
        // Show gem recharge option — spend gems for another charge
        const gemCost = { powderKeg: 3, mine: 2, gas: 2 }
        btn.setText(`${symbols[key]}+\u25C6${gemCost[key]}`)
        btn.setColor('#9b59b6')
        btn.setInteractive({ useHandCursor: true })
      }
    })
  }

  rechargeWeapon(weaponKey) {
    const gemCosts = { powderKeg: 3, mine: 2, gas: 2 }
    const cost = gemCosts[weaponKey]
    const save = loadSave()
    if (save.gems >= cost) {
      spendGems(cost)
      this.weaponCharges[weaponKey]++
      this.updateWeaponButtons()
      this.updateHUD()
      this.playSfx('sfx_chime2', 0.3)
      this.showFloatingText(this.cameras.main.centerX, this.cameras.main.height - 115, `Recharged! -${cost} gems`, '#9b59b6')
    } else {
      this.showFloatingText(this.cameras.main.centerX, this.cameras.main.height - 115, 'Not enough gems!', '#e74c3c')
      this.playSfx('sfx_beep', 0.3)
    }
  }

  handleClick(pointer) {
    if (this.gameOver || this.paused) return
    if (pointer.y < 36 || pointer.y > this.cameras.main.height - 80) return

    // Deploy weapon if active — but don't deploy on the same frame weapon was selected
    if (this.activeWeapon) {
      if (this._weaponJustSelected) {
        this._weaponJustSelected = false
        return
      }
      this.deployWeapon(pointer.x, pointer.y)
      return
    }

    // Manual targeting — click on enemy or chest to focus tower fire (like original APK)
    if (!this.selectedTowerType) {
      const clickedTarget = this.findEnemyAt(pointer.x, pointer.y)
      if (clickedTarget) {
        this.setManualTarget(clickedTarget)
        return
      }
    } else {
      // Even when placing towers, allow clicking chests to target them
      const clickedChest = this.findChestAt(pointer.x, pointer.y)
      if (clickedChest) {
        this.setManualTarget(clickedChest)
        return
      }
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

    // Clear manual target when clicking empty ground
    if (this.manualTarget) {
      this.clearManualTarget()
    }

    // Place new tower
    if (this.selectedTowerType && (grid[row][col] === 0 || grid[row][col] >= 6)) {
      const towerDef = TOWER_TYPES[this.selectedTowerType]
      if (this.gold >= towerDef.cost) {
        if (!this.towers.find(t => t.gridCol === col && t.gridRow === row)) {
          this.placeTower(col, row, this.selectedTowerType)
        }
      } else {
        // Not enough gold feedback
        this.showFloatingText(
          col * TILE + TILE / 2, row * TILE + TILE / 2,
          'Not enough gold!', '#e74c3c'
        )
        this.playSfx('sfx_beep', 0.3)
      }
    }
  }

  findEnemyAt(x, y) {
    let nearest = null
    let nearDist = 30 // Click tolerance radius
    this.enemies.forEach(enemy => {
      if (!enemy.sprite || !enemy.sprite.active) return
      const dx = enemy.sprite.x - x
      const dy = enemy.sprite.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < nearDist) {
        nearest = enemy
        nearDist = dist
      }
    })
    // Also check treasure chests as clickable targets
    this.specialTiles.chests.forEach(chest => {
      if (chest.opened || !chest.sprite || !chest.sprite.active) return
      const dx = chest.x - x
      const dy = chest.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < nearDist) {
        nearest = chest
        nearDist = dist
      }
    })
    return nearest
  }

  findChestAt(x, y) {
    let nearest = null
    let nearDist = 30
    this.specialTiles.chests.forEach(chest => {
      if (chest.opened || !chest.sprite || !chest.sprite.active) return
      const dx = chest.x - x
      const dy = chest.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < nearDist) {
        nearest = chest
        nearDist = dist
      }
    })
    return nearest
  }

  setManualTarget(target) {
    this.manualTarget = target
    const tx = target.isChest ? target.x : target.sprite.x
    const ty = target.isChest ? target.y : target.sprite.y
    // Show target indicator
    if (this.targetIndicator) this.targetIndicator.destroy()
    if (this.textures.exists('hud_target_arrow')) {
      this.targetIndicator = this.add.image(tx, ty - 25, 'hud_target_arrow')
        .setDisplaySize(16, 16).setDepth(15)
    } else {
      this.targetIndicator = this.add.text(tx, ty - 25, '\u25BC', {
        fontSize: '16px', color: target.isChest ? '#f1c40f' : '#e94560', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(15)
    }
    const label = target.isChest ? 'DESTROY!' : 'TARGET!'
    const color = target.isChest ? '#f1c40f' : '#e94560'
    this.showFloatingText(tx, ty - 30, label, color)
    if (target.isChest) {
      this.showTutorial('Tut_Chests')
    } else {
      this.showTutorial('Tut_ManualTarget')
    }
  }

  clearManualTarget() {
    this.manualTarget = null
    if (this.targetIndicator) {
      this.targetIndicator.destroy()
      this.targetIndicator = null
    }
  }

  placeTower(col, row, type) {
    const def = TOWER_TYPES[type]
    this.gold -= def.cost

    const x = col * TILE + TILE / 2
    const y = row * TILE + TILE / 2

    const sprite = this.add.sprite(x, y, def.texture).setDepth(4)
    // Scale proportionally to fit within tile (maintain aspect ratio to avoid distortion)
    const maxTowerSize = 58
    const tScale = maxTowerSize / Math.max(sprite.width, sprite.height)
    sprite.setScale(tScale)
    // Rescale on animation frame change — fire animation frames are 256x256 while base sprites
    // are 60-110px; without this, the sprite pops to 3-4x size during fire animations
    sprite.on('animationupdate', () => {
      const fw = sprite.frame.realWidth || sprite.frame.width
      const fh = sprite.frame.realHeight || sprite.frame.height
      sprite.setScale(maxTowerSize / Math.max(fw, fh))
    })
    sprite.on('animationcomplete', () => {
      const fw = sprite.frame.realWidth || sprite.frame.width
      const fh = sprite.frame.realHeight || sprite.frame.height
      sprite.setScale(maxTowerSize / Math.max(fw, fh))
    })
    this.towerGroup.add(sprite)

    const healthMult = 1 + (this.saveData.upgrades.towerHealthBoost || 0) * 0.2
    const maxHp = Math.round(100 * healthMult)

    const hpBg = this.add.graphics().setDepth(5).setVisible(false)
    const hpBar = this.add.graphics().setDepth(5).setVisible(false)

    const tower = {
      sprite, type, gridCol: col, gridRow: row, x, y,
      damage: Math.round(def.damage * this.boosts.damage),
      range: Math.round(def.range * this.boosts.range),
      fireRate: Math.max(200, Math.round(def.fireRate * this.boosts.fireRate)),
      splash: def.splash ? Math.round(def.splash * this.boosts.aoe) : 0,
      slow: def.slow ? Math.max(def.slow * this.boosts.iceSlow, 0.1) : 0,
      slowDuration: def.slowDuration || 0,
      projectileTexture: def.projectile,
      lastFired: 0,
      level: 0,
      hp: maxHp,
      maxHp,
      hpBg,
      hpBar,
      autoHealRate: (this.saveData.upgrades.towerAutoHealBoost || 0) * 0.5,
      totalInvestment: def.cost,
      targetMode: 'first', // first | strong | weak | close
    }

    this.towers.push(tower)
    this.towersBuilt++
    if (type === 'storm') this.stormTowersBuilt++
    if (type === 'winter') this.iceTowersBuilt++

    // Placement animation — pop-in bounce
    sprite.setScale(0)
    this.tweens.add({
      targets: sprite, scaleX: tScale, scaleY: tScale,
      duration: 250, ease: 'Back.easeOut',
    })
    // Dust puff at base
    const dustPuff = this.add.graphics().setDepth(3).setPosition(x, y + 20)
    dustPuff.fillStyle(0xccaa77, 0.4)
    dustPuff.fillCircle(0, 0, 15)
    this.tweens.add({
      targets: dustPuff, scaleX: 2, scaleY: 0.5, alpha: 0,
      duration: 300, onComplete: () => dustPuff.destroy(),
    })

    // Check rune boosts for nearby towers
    this.specialTiles.runes.forEach(rune => {
      const rdx = Math.abs(rune.c - col)
      const rdy = Math.abs(rune.r - row)
      if (rdx <= 2 && rdy <= 2) {
        // Original game: runes DOUBLE the stat (confirmed via APK Help_RuneDamage/Speed/Distance)
        if (rune.type === 'damage') tower.damage = Math.round(tower.damage * 2.0)
        if (rune.type === 'speed') tower.fireRate = Math.round(tower.fireRate * 0.5)
        if (rune.type === 'range') tower.range = Math.round(tower.range * 2.0)
        const runeColors = { damage: '#e74c3c', speed: '#3498db', range: '#2ecc71' }
        this.showFloatingText(tower.x, tower.y - 30, `${rune.type.toUpperCase()} RUNE!`, runeColors[rune.type])
        this.showTutorial('Tut_Runes')
      }
    })

    // Check gold deposits — activate mining (periodic income, like original APK)
    this.specialTiles.deposits.forEach(dep => {
      if (dep.mined) return
      if (Math.abs(dep.c - col) <= 1 && Math.abs(dep.r - row) <= 1) {
        dep.mined = true
        // Start periodic gold generation instead of one-time bonus
        if (!this._goldDeposits) this._goldDeposits = []
        this._goldDeposits.push({
          x: dep.c * TILE + TILE / 2,
          y: dep.r * TILE + TILE / 2,
          sprite: dep.sprite,
          goldPerTick: 5,
          interval: 3000, // 5 gold every 3 seconds
          goldRemaining: 200, // Total gold available from this deposit
          timer: 1000, // First payout after 1 second
          active: true,
        })
        this.showFloatingText(dep.c * TILE + TILE / 2, dep.r * TILE + TILE / 2, 'MINING!', '#f1c40f')
        this.playSfx('sfx_dig')
        this.showTutorial('Tut_MineGoldDeposit')
      }
    })

    // Treasure chests are now destructible targets — click to target, towers shoot to open

    this.updateHUD()
    this.playSfx('sfx_tower_placed')

    // Trigger relevant tutorials
    if (this.towersBuilt === 1) this.showTutorial('Tut_PlaceBallista')
    if (type === 'winter') this.showTutorial('Tut_PlaceIceTower')
    if (type === 'catapult') this.showTutorial('Tut_PlaceCatapult')
    if (type === 'storm') this.showTutorial('Tut_PlaceStormTower')
    if (type === 'cannon') this.showTutorial('Tut_PlaceCannon')
    if (type === 'scout') this.showTutorial('Tut_ScoutTower')

  }

  showTowerMenu(tower) {
    if (this.towerMenu) this.towerMenu.destroy()
    this.playSfx('sfx_tower_menu')

    const def = TOWER_TYPES[tower.type]
    const upgrade = def.upgrades[tower.level]
    const needsRepair = tower.hp < tower.maxHp
    const repairCost = needsRepair ? Math.floor((tower.maxHp - tower.hp) * 0.3) : 0

    // Show range indicator circle
    this.rangeIndicator.setPosition(tower.x, tower.y)
    this.rangeIndicator.setDisplaySize(tower.range * 2, tower.range * 2)
    this.rangeIndicator.setVisible(true)

    const menuH = 60 + (upgrade ? 25 : 0) + (needsRepair ? 20 : 0)
    const menu = this.add.container(tower.x, tower.y - 55).setDepth(30)

    const bg = this.add.graphics()
    bg.fillStyle(0x16213e, 0.95)
    bg.fillRoundedRect(-90, -30, 180, menuH, 8)
    bg.lineStyle(1, 0xe94560)
    bg.strokeRoundedRect(-90, -30, 180, menuH, 8)
    menu.add(bg)

    const hpPct = Math.round(tower.hp / tower.maxHp * 100)
    const dmgLabel = def.damageType === 'physical' ? '\u2694' : '\u2728' // sword or sparkles
    const info = this.add.text(0, -20, `${def.name} Lv${tower.level + 1} ${dmgLabel} | DMG:${tower.damage} | HP:${hpPct}%`, {
      fontSize: '10px', color: '#fff',
    }).setOrigin(0.5)
    menu.add(info)

    // Targeting priority cycle button
    const targetModes = ['first', 'strong', 'weak', 'close']
    const targetLabels = { first: 'First', strong: 'Strong', weak: 'Weak', close: 'Close' }
    const targetColors = { first: '#3498db', strong: '#e74c3c', weak: '#2ecc71', close: '#f1c40f' }
    const targetBtn = this.add.text(0, -5, `Target: ${targetLabels[tower.targetMode]}`, {
      fontSize: '10px', color: targetColors[tower.targetMode], fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    targetBtn.on('pointerdown', () => {
      const idx = targetModes.indexOf(tower.targetMode)
      tower.targetMode = targetModes[(idx + 1) % targetModes.length]
      targetBtn.setText(`Target: ${targetLabels[tower.targetMode]}`)
      targetBtn.setColor(targetColors[tower.targetMode])
      this.playSfx('sfx_beep', 0.2)
    })
    menu.add(targetBtn)

    let yOffset = 10
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
          tower.totalInvestment += upgrade.cost
          tower.level++
          tower.damage = Math.round(upgrade.damage * this.boosts.damage)
          tower.range = Math.round((upgrade.range || def.range) * this.boosts.range)
          tower.fireRate = Math.max(200, Math.round((upgrade.fireRate || def.fireRate) * this.boosts.fireRate))
          if (upgrade.splash) tower.splash = Math.round(upgrade.splash * this.boosts.aoe)
          if (upgrade.slow) tower.slow = Math.max(upgrade.slow * this.boosts.iceSlow, 0.1)
          if (upgrade.slowDuration) tower.slowDuration = upgrade.slowDuration
          // Re-apply rune bonuses (runes double the stat for nearby towers)
          this.specialTiles.runes.forEach(rune => {
            const rdx = Math.abs(rune.c - tower.gridCol)
            const rdy = Math.abs(rune.r - tower.gridRow)
            if (rdx <= 2 && rdy <= 2) {
              if (rune.type === 'damage') tower.damage = Math.round(tower.damage * 2.0)
              if (rune.type === 'speed') tower.fireRate = Math.round(tower.fireRate * 0.5)
              if (rune.type === 'range') tower.range = Math.round(tower.range * 2.0)
            }
          })
          // Swap sprite texture and rescale for new proportions
          if (def.textures && def.textures[tower.level]) {
            const newTex = def.textures[tower.level]
            if (this.textures.exists(newTex)) {
              tower.sprite.setTexture(newTex)
              // Use raw frame dimensions (not display dimensions which include old scale)
              const maxSize = 58
              const fw = tower.sprite.frame.realWidth || tower.sprite.frame.width
              const fh = tower.sprite.frame.realHeight || tower.sprite.frame.height
              tower.sprite.setScale(maxSize / Math.max(fw, fh))
            }
          }
          if (tower.type === 'catapult') this.maxCatapultLevel = Math.max(this.maxCatapultLevel, tower.level + 1)
          this.updateHUD()
          this.playSfx('sfx_tower_upgrade')
          this.showTutorial('Tut_UpgradeTower')
          menu.destroy()
          this.towerMenu = null
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
          this.towerMenu = null
          this.rangeIndicator.setVisible(false)
        }
      })
      menu.add(repairBtn)
      yOffset += 18
    }

    const sellValue = Math.floor(tower.totalInvestment * 0.7)
    if (this.textures.exists('hud_sell')) {
      menu.add(this.add.image(25, yOffset - 11, 'hud_sell').setDisplaySize(14, 14))
    }
    const sellBtn = this.add.text(40, yOffset - 18, `Sell $${sellValue}`, {
      fontSize: '11px', color: '#e74c3c', fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true })
    sellBtn.on('pointerdown', () => {
      this.gold += sellValue
      this.showFloatingText(tower.x, tower.y - 20, `+$${sellValue}`, '#f1c40f')
      // Sell animation — shrink + gold sparkles
      const tx = tower.x, ty = tower.y
      this.tweens.add({
        targets: tower.sprite, scaleX: 0, scaleY: 0, alpha: 0,
        duration: 200, ease: 'Back.easeIn',
        onComplete: () => { try { tower.sprite.destroy() } catch (e) {} },
      })
      for (let s = 0; s < 5; s++) {
        const spark = this.add.graphics().setDepth(10).setPosition(tx, ty)
        spark.fillStyle(0xf1c40f, 0.8)
        spark.fillCircle(0, 0, 3)
        this.tweens.add({
          targets: spark,
          x: tx + (Math.random() - 0.5) * 50,
          y: ty - 20 - Math.random() * 30,
          alpha: 0, duration: 400,
          delay: s * 40,
          onComplete: () => spark.destroy(),
        })
      }
      tower.hpBg.destroy()
      tower.hpBar.destroy()
      this.towers = this.towers.filter(t => t !== tower)
      this.towersSold++
      this.updateHUD()
      this.playSfx('sfx_tower_sell')
      menu.destroy()
      this.towerMenu = null
      this.rangeIndicator.setVisible(false)
    })
    menu.add(sellBtn)

    this.towerMenu = menu

    this.time.delayedCall(5000, () => {
      if (menu && menu.active) {
        menu.destroy()
        this.towerMenu = null
        this.rangeIndicator.setVisible(false)
      }
    })
  }

  startNextWave() {
    if (this.waveActive || this.gameOver) return
    if (this.currentWave >= this.levelData.waves.length) return

    // Award bonus gold for starting wave early (applies to both SPACE key and button click)
    if (this.waveCountdown > 0 && this.currentWave > 0) {
      const bonus = Math.max(0, Math.ceil(this.waveCountdown / 1000) * 5)
      this.gold += bonus
      if (bonus > 0) {
        this.showFloatingText(this.cameras.main.centerX, this.cameras.main.height - 120, `+${bonus} gold!`, '#f1c40f')
      }
    }
    this.waveCountdown = 0

    this.waveActive = true
    this.startWaveBtn.setVisible(false)
    if (this.wavePreview) this.wavePreview.setVisible(false)
    this.countdownText.setVisible(false)

    const wave = this.levelData.waves[this.currentWave]

    // Wave start notification
    if (!wave.boss) {
      const waveLabel = this.endlessMode
        ? `\u221E WAVE ${this.currentWave + 1}`
        : `WAVE ${this.currentWave + 1}/${this.levelData.waves.length}`
      const waveText = this.add.text(
        this.cameras.main.centerX, this.cameras.main.centerY - 50,
        waveLabel, { fontSize: '20px', color: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }
      ).setOrigin(0.5).setDepth(30).setAlpha(0)
      this.tweens.add({
        targets: waveText, alpha: 1, duration: 200,
        yoyo: true, hold: 800,
        onComplete: () => waveText.destroy(),
      })
    }

    // Boss wave warning
    if (wave.boss) {
      this.showBossWarning(wave)
    }

    // Track spawn counts to prevent premature wave completion
    this.waveSpawnTotal = 0
    this.waveSpawnCount = 0
    wave.enemies.forEach(group => { if (ENEMY_TYPES[group.type]) this.waveSpawnTotal += group.count })

    wave.enemies.forEach((group, groupIdx) => {
      const enemyDef = ENEMY_TYPES[group.type]
      if (!enemyDef) return

      // Stagger subsequent groups by 2 seconds each
      const groupDelay = groupIdx * 2000

      this.time.delayedCall(groupDelay, () => {
        // Spawn first enemy immediately
        if (!this.gameOver) {
          this.spawnEnemy(enemyDef, group.type)
          this.waveSpawnCount++
        }
        // Spawn remaining enemies at intervals
        if (group.count > 1) {
          this.time.addEvent({
            delay: group.interval,
            repeat: group.count - 2,
            callback: () => {
              if (this.gameOver) return
              this.spawnEnemy(enemyDef, group.type)
              this.waveSpawnCount++
            },
          })
        }
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
    const targetSize = def.boss ? 60 : def.size ? Math.round(44 * def.size) : 44

    // Use animated sprite if walk animation exists for this enemy type
    const baseType = type.replace('boss_', '')
    const animKey = `${baseType}_walk`
    const hasAnim = this.anims.exists(animKey)

    const sprite = hasAnim
      ? this.add.sprite(start.x, start.y, def.texture).setDepth(6)
      : this.add.image(start.x, start.y, def.texture).setDepth(6)
    // Scale proportionally to maintain aspect ratio
    const eScale = targetSize / Math.max(sprite.width, sprite.height)
    sprite.setScale(eScale)
    // Rescale on animation frame change to prevent size popping from inconsistent frame dimensions
    if (hasAnim) {
      sprite.on('animationupdate', () => {
        const fw = sprite.frame.realWidth || sprite.frame.width
        const fh = sprite.frame.realHeight || sprite.frame.height
        sprite.setScale(targetSize / Math.max(fw, fh))
      })
    }
    this.enemyGroup.add(sprite)

    // Play walk animation if available
    if (hasAnim && sprite.play) {
      try { sprite.play(animKey) } catch (e) {}
    }

    // Spawn fade-in
    sprite.setAlpha(0)
    this.tweens.add({
      targets: sprite, alpha: 1, duration: 200,
    })

    // Boss tint (reddish glow)
    if (def.boss) {
      sprite.setTint(0xff6666)
    }

    // Flying enemies float above ground units with a shadow effect
    if (def.flying) {
      sprite.setDepth(8) // above ground enemies
    }

    // HP bar
    const barWidth = Math.max(28, Math.round(sprite.displayWidth))
    const hpBg = this.add.graphics().setDepth(def.flying ? 9 : 7)
    const hpBar = this.add.graphics().setDepth(def.flying ? 10 : 8)

    // In endless mode, scale enemy stats progressively with wave number
    const endlessScale = this.endlessMode ? 1 + this.endlessWaveNum * 0.08 : 1
    const scaledHp = Math.round(def.hp * this.diffMult.enemyHp * endlessScale)
    const scaledSpeed = Math.round(def.speed * this.diffMult.enemySpeed * Math.min(endlessScale, 1.5))

    // Flying enemies follow the normal path but are immune to mines/ground effects
    const isFlying = def.flying || false

    const scaledReward = this.endlessMode ? Math.round(def.reward * (1 + this.endlessWaveNum * 0.03)) : def.reward

    const enemy = {
      sprite, hpBg, hpBar, type,
      hp: scaledHp,
      maxHp: scaledHp,
      baseSpeed: scaledSpeed,
      speed: scaledSpeed,
      reward: scaledReward,
      damage: def.damage,
      waypointIndex: 0,
      slowTimer: 0,
      barWidth,
      // Special ability flags
      splits: def.splits || 0,
      regens: def.regens || 0,
      towerDamage: def.towerDamage || 0,
      kamikaze: def.kamikaze || false,
      flying: isFlying,
      melee: def.melee || false,
      boss: def.boss || false,
      size: def.size || 1,
      // Damage type resistances
      physResist: def.physResist || 0,
      magResist: def.magResist || 0,
      // Boss special ability
      bossAbility: def.bossAbility || null,
      bossAbilityTimer: 5000, // First ability fires after 5 seconds
      // Boss name plate
      namePlate: null,
    }

    // Boss name plate
    if (def.boss) {
      enemy.namePlate = this.add.text(start.x, start.y - sprite.displayHeight / 2 - 16, def.name, {
        fontSize: '10px', color: '#e74c3c', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(9)
    }

    // Show resistance tutorial the first time a resistant enemy spawns
    if (enemy.physResist > 0 || enemy.magResist > 0) {
      this.showTutorial('Tut_DamageResist')
    }
    // Show tutorials on spawn for special enemy types
    if (enemy.regens > 0) this.showTutorial('Tut_TrollRegen')
    if (enemy.towerDamage > 0) this.showTutorial('Tut_GelCubes')

    this.enemies.push(enemy)
  }

  update(time, delta) {
    if (this.gameOver || this.paused) return

    const speedDelta = delta * this.gameSpeed

    // Track peak gold for bonus missions
    if (this.gold > this.peakGold) this.peakGold = this.gold

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= speedDelta
      if (this.comboTimer <= 0) {
        this.comboCount = 0
      }
    }

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

      // Boss special abilities — periodic effects
      if (enemy.bossAbility) {
        enemy.bossAbilityTimer -= speedDelta
        if (enemy.bossAbilityTimer <= 0) {
          this.triggerBossAbility(enemy)
          enemy.bossAbilityTimer = 5000 // Every 5 seconds
        }
      }

      // Flying enemies use their own direct path (spawn → exit)
      const wp = this.waypoints
      const target = wp[enemy.waypointIndex]
      if (!target) return

      const dx = target.x - enemy.sprite.x
      const dy = target.y - enemy.sprite.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 10) {
        enemy.waypointIndex++
        if (enemy.waypointIndex >= wp.length) {
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

        // Kamikaze: rocket goblins explode when passing near towers
        if (enemy.kamikaze && !enemy._kamikazed) {
          for (const tower of this.towers) {
            if (tower.hp <= 0) continue
            const tdx = enemy.sprite.x - tower.x
            const tdy = enemy.sprite.y - tower.y
            if (Math.sqrt(tdx * tdx + tdy * tdy) < TILE * 1.5) {
              enemy._kamikazed = true
              this.kamikazeExplosion(enemy)
              this.damageEnemy(enemy, enemy.hp + 1) // Kill the rocket goblin
              return // Skip remaining movement/HP bar code for destroyed enemy
            }
          }
        }

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

    // Update manual target indicator position
    if (this.manualTarget) {
      const mt = this.manualTarget
      const dead = mt.isChest ? mt.opened : (!mt.sprite || !mt.sprite.active || mt.hp <= 0)
      if (dead) {
        this.clearManualTarget()
      } else if (this.targetIndicator) {
        const tx = mt.isChest ? mt.x : (mt.sprite ? mt.sprite.x : mt.x)
        const ty = mt.isChest ? mt.y : (mt.sprite ? mt.sprite.y : mt.y)
        this.targetIndicator.setPosition(tx, ty - 25)
      }
    }

    // Process gold deposit income (periodic gold generation)
    if (this._goldDeposits) {
      this._goldDeposits.forEach(dep => {
        if (!dep.active) return
        dep.timer -= speedDelta
        if (dep.timer <= 0) {
          dep.timer += dep.interval
          this.gold += dep.goldPerTick
          this.showFloatingText(dep.x, dep.y - 10, `+${dep.goldPerTick}`, '#f1c40f')
          this.updateHUD()
          dep.goldRemaining -= dep.goldPerTick
          if (dep.goldRemaining <= 0) {
            dep.active = false
            if (dep.sprite) { try { dep.sprite.setAlpha(0.3) } catch (e) {} }
          }
        }
      })
    }

    // Gel Cube tower damage + enemy melee attacks
    this.enemies.forEach(enemy => {
      if (!enemy.sprite || !enemy.sprite.active) return
      // Skip enemies that can't damage towers (performance: avoids O(n*m) for harmless enemies)
      if (!enemy.towerDamage && !enemy.melee) return
      this.towers.forEach(tower => {
        if (tower.hp <= 0) return
        const dx = enemy.sprite.x - tower.x
        const dy = enemy.sprite.y - tower.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Gel cube special: damages towers it passes near
        if (enemy.towerDamage > 0 && dist < TILE * 1.5) {
          tower.hp -= (enemy.towerDamage * speedDelta) / 1000
          // Flash tower red periodically when being damaged
          if (!tower._damageTintTimer || tower._damageTintTimer <= 0) {
            tower.sprite.setTint(0xff4444)
            tower._damageTintTimer = 300
          }
          if (tower.hp <= 0) { tower.hp = 0; this.destroyTower(tower) }
        }

        // Melee enemies damage towers they pass near
        if (enemy.melee && dist < TILE * 1.2) {
          const dps = enemy.boss ? 25 : enemy.damage * 10
          tower.hp -= (dps * speedDelta) / 1000
          if (!tower._damageTintTimer || tower._damageTintTimer <= 0) {
            tower.sprite.setTint(0xff4444)
            tower._damageTintTimer = 300
          }
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
      // Clear damage tint after flash duration
      if (tower._damageTintTimer > 0) {
        tower._damageTintTimer -= speedDelta
        if (tower._damageTintTimer <= 0) tower.sprite.clearTint()
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
      if (time - tower.lastFired < tower.fireRate / this.gameSpeed) return

      // Manual target override — if player has clicked an enemy or chest, prioritize it
      let bestTarget = null
      const canTargetFlying = true // All towers can target flying enemies

      if (this.manualTarget) {
        const mt = this.manualTarget
        const mtActive = mt.isChest ? !mt.opened : mt.sprite.active
        if (mtActive) {
          if (mt.isChest || !mt.flying || canTargetFlying) {
            const mtx = mt.isChest ? mt.x : mt.sprite.x
            const mty = mt.isChest ? mt.y : mt.sprite.y
            const dx = mtx - tower.x
            const dy = mty - tower.y
            if (Math.sqrt(dx * dx + dy * dy) <= tower.range) {
              bestTarget = mt
            }
          }
        }
      }

      // Targeting by tower's selected priority mode
      if (!bestTarget) {
        let bestScore = -Infinity
        const mode = tower.targetMode || 'first'
        this.enemies.forEach(enemy => {
          if (!enemy.sprite.active) return
          if (enemy.flying && !canTargetFlying) return
          const dx = enemy.sprite.x - tower.x
          const dy = enemy.sprite.y - tower.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= tower.range) {
            let score
            if (mode === 'first') {
              score = enemy.waypointIndex * 10000 - dist
            } else if (mode === 'strong') {
              score = enemy.maxHp * 10000 + enemy.hp
            } else if (mode === 'weak') {
              score = -enemy.hp
            } else if (mode === 'close') {
              score = -dist
            }
            if (score > bestScore) {
              bestTarget = enemy
              bestScore = score
            }
          }
        })
      }

      if (bestTarget) {
        if (tower.type === 'scout') {
          if (tower.lastTarget === bestTarget) {
            tower.stackCount = (tower.stackCount || 0) + 1
          } else {
            tower.stackCount = 0
            tower.lastTarget = bestTarget
          }
          const stackMult = 1 + tower.stackCount * 0.25
          this.fireProjectile(tower, bestTarget, Math.round(tower.damage * stackMult))
        } else if (tower.type === 'storm') {
          this.fireChainLightning(tower, bestTarget)
        } else {
          this.fireProjectile(tower, bestTarget)
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

      const projSpeeds = { ballista: 500, cannon: 350, catapult: 280, scout: 600, winter: 400, storm: 450 }
      const baseSpeed = projSpeeds[proj.towerType] || 400
      const speed = (baseSpeed * speedDelta) / 1000

      // Speed-aware hit threshold to prevent overshoot oscillation at 3x speed
      if (dist < Math.max(10, speed * 1.5)) {
        this.handleProjectileHit(proj)
        proj.sprite.destroy()
        return false
      }

      if (proj.arc && proj.arcTotalDist > 0) {
        // Arc trajectory for catapult/cannon — parabolic Y offset
        proj.arcProgress = Math.min(1, proj.arcProgress + speed / proj.arcTotalDist)
        const t = proj.arcProgress
        // Linear interpolation for base position
        const baseX = proj.arcStartX + (proj.targetX - proj.arcStartX) * t
        const baseY = proj.arcStartY + (proj.targetY - proj.arcStartY) * t
        // Parabolic arc offset (peaks at t=0.5)
        const arcOffset = -proj.arcHeight * 4 * t * (1 - t)
        proj.sprite.x = baseX
        proj.sprite.y = baseY + arcOffset
        // Scale projectile slightly larger at peak for depth effect
        const scaleMult = 1 + 0.3 * Math.sin(t * Math.PI)
        proj.sprite.setScale(scaleMult)
        // Rotate based on arc tangent
        const tangentY = (proj.targetY - proj.arcStartY) + proj.arcHeight * 4 * (2 * t - 1)
        const tangentX = proj.targetX - proj.arcStartX
        proj.sprite.setRotation(Math.atan2(tangentY, tangentX))
        // Check if arc is complete
        if (t >= 1) {
          this.handleProjectileHit(proj)
          proj.sprite.destroy()
          return false
        }
      } else {
        proj.sprite.x += (dx / dist) * speed
        proj.sprite.y += (dy / dist) * speed
        // Rotate projectile to face target direction
        proj.sprite.setRotation(Math.atan2(dy, dx))
      }

      // Homing: update target position for straight projectiles only
      // Arc projectiles (catapult/cannon) use fixed destination to avoid warped parabolas
      if (proj.target && !proj.arc) {
        if (proj.target.isChest) {
          // Chest targets are static — no position update needed
        } else if (proj.target.sprite && proj.target.sprite.active) {
          proj.targetX = proj.target.sprite.x
          proj.targetY = proj.target.sprite.y
        }
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
            // Layered mine explosion — flash + blast + shrapnel ring
            const mFlash = this.add.graphics().setDepth(12).setPosition(dep.x, dep.y)
            mFlash.fillStyle(0xffffff, 0.8)
            mFlash.fillCircle(0, 0, dep.radius * 0.3)
            this.tweens.add({
              targets: mFlash, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 200,
              onComplete: () => mFlash.destroy(),
            })
            const mBoom = this.add.graphics().setDepth(11).setPosition(dep.x, dep.y)
            mBoom.fillStyle(0xf39c12, 0.6)
            mBoom.fillCircle(0, 0, dep.radius * 0.7)
            this.tweens.add({
              targets: mBoom, alpha: 0, scaleX: 1.4, scaleY: 1.4, duration: 400,
              onComplete: () => mBoom.destroy(),
            })
            const mRing = this.add.graphics().setDepth(11).setPosition(dep.x, dep.y)
            mRing.lineStyle(2, 0xd35400, 0.7)
            mRing.strokeCircle(0, 0, dep.radius * 0.4)
            this.tweens.add({
              targets: mRing, scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 350,
              onComplete: () => mRing.destroy(),
            })
            this.cameras.main.shake(150, 0.003)
            // Collect targets first to avoid modifying array during iteration
            const mineTargets = this.enemies.filter(e => {
              if (!e.sprite || !e.sprite.active) return false
              const edx = e.sprite.x - dep.x
              const edy = e.sprite.y - dep.y
              return Math.sqrt(edx * edx + edy * edy) <= dep.radius
            })
            mineTargets.forEach(e => {
              if (e.hp > 0) this.damageEnemy(e, dep.damage)
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
          try { dep.graphics.destroy() } catch (e) {}
          return false
        }
        // Fade visual alpha proportional to remaining time
        const alphaRatio = Math.max(0, dep.timer / 5000)
        try { dep.graphics.setAlpha(alphaRatio) } catch (e) {}

        // Occasional poison bubble particles
        dep._bubbleTimer = (dep._bubbleTimer || 0) + speedDelta
        if (dep._bubbleTimer > 400) {
          dep._bubbleTimer = 0
          const bx = dep.x + (Math.random() - 0.5) * 80
          const by = dep.y + (Math.random() - 0.5) * 80
          const bubble = this.add.graphics().setDepth(4).setPosition(bx, by)
          bubble.fillStyle(0x2ecc71, 0.5)
          bubble.fillCircle(0, 0, 3 + Math.random() * 4)
          this.tweens.add({
            targets: bubble, y: by - 20 - Math.random() * 15, alpha: 0,
            duration: 600 + Math.random() * 300,
            onComplete: () => bubble.destroy(),
          })
        }

        // Damage + slow enemies inside gas cloud
        this.enemies.forEach(enemy => {
          if (!enemy.sprite || !enemy.sprite.active || enemy.hp <= 0) return
          const dx = enemy.sprite.x - dep.x
          const dy = enemy.sprite.y - dep.y
          if (Math.sqrt(dx * dx + dy * dy) <= dep.radius) {
            this.damageEnemy(enemy, (dep.dps * speedDelta) / 1000)
            // Gas slows enemies by 40%
            enemy.slowTimer = Math.max(enemy.slowTimer || 0, 500)
            enemy.speed = enemy.baseSpeed * 0.6
            if (enemy.sprite && enemy.sprite.active) enemy.sprite.setTint(0x2ecc71)
            // Track unique enemies hit for gas_multi_5 bonus mission
            if (dep.hitEnemies) dep.hitEnemies.add(enemy)
          }
        })
        // Check if this gas cloud hit 5+ unique enemies
        if (dep.hitEnemies && dep.hitEnemies.size >= 5 && !dep._bonusCounted) {
          dep._bonusCounted = true
          this.gasMultiHits++
        }
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

    // Check wave complete (all enemies must have spawned AND been killed/exited)
    if (this.waveActive && this.enemies.length === 0 && this.waveSpawnCount >= this.waveSpawnTotal) {
      this.waveActive = false
      this.currentWave++
      this.comboCount = 0
      this.comboTimer = 0

      if (this.goldWaveBonus > 0) {
        this.gold += this.goldWaveBonus
      }

      if (this.currentWave >= this.levelData.waves.length && !this.endlessMode) {
        this.handleGameOver(true)
      } else {
        // Endless mode: generate next wave dynamically
        if (this.endlessMode && this.currentWave >= this.levelData.waves.length) {
          this.endlessWaveNum++
          this.levelData.waves.push(this.generateEndlessWave(this.endlessWaveNum))
        }
        // Heal all towers 20% between waves (like original APK)
        this.towers.forEach(tower => {
          if (tower.hp > 0 && tower.hp < tower.maxHp) {
            const heal = Math.round(tower.maxHp * 0.2)
            tower.hp = Math.min(tower.maxHp, tower.hp + heal)
          }
        })
        // Set up countdown for next wave
        this.waveCountdown = 15000
        this.startWaveBtn.setText(`>> START WAVE ${this.currentWave + 1} <<`)
        this.startWaveBtn.setVisible(true)
        this.countdownText.setVisible(true)
        this.updateWavePreview()

        // Re-bind button to start next wave (bonus gold is handled inside startNextWave)
        this.startWaveBtn.off('pointerdown')
        this.startWaveBtn.on('pointerdown', () => this.startNextWave())
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
    // Projectile sizes per tower type — ballista arrows are long/narrow, boulders are large
    const projSizes = {
      ballista: [14, 6], cannon: [12, 12], catapult: [16, 16],
      scout: [8, 8], storm: [10, 10], winter: [10, 8],
    }
    const [pw, ph] = projSizes[tower.type] || [10, 10]
    const sprite = this.add.image(tower.x, tower.y, texKey)
      .setDisplaySize(pw, ph)
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

    // Calculate arc parameters for catapult/cannon projectiles
    const startX = tower.x, startY = tower.y
    const targetX = enemy.isChest ? enemy.x : enemy.sprite.x
    const targetY = enemy.isChest ? enemy.y : enemy.sprite.y
    const dx = targetX - startX
    const dy = targetY - startY
    const totalDist = Math.sqrt(dx * dx + dy * dy)
    const useArc = tower.type === 'catapult' || tower.type === 'cannon'

    this.projectiles.push({
      sprite,
      target: enemy,
      targetX: targetX,
      targetY: targetY,
      damage: overrideDamage || tower.damage,
      splash: tower.splash,
      slow: tower.slow,
      slowDuration: tower.slowDuration,
      towerType: tower.type,
      // Arc trajectory data
      arc: useArc,
      arcStartX: startX,
      arcStartY: startY,
      arcTotalDist: totalDist,
      arcHeight: useArc ? Math.max(30, totalDist * 0.3) : 0,
      arcProgress: 0,
    })
  }

  fireChainLightning(tower, primary) {
    if (primary.hp <= 0) return // Target already dead

    // Play fire animation for storm tower
    const stormFireAnims = [null, 'storm_2_fire', 'storm_3_fire']
    const stormAnimKey = stormFireAnims[tower.level]
    if (stormAnimKey && this.anims.exists(stormAnimKey) && tower.sprite.play) {
      try { tower.sprite.play(stormAnimKey) } catch (e) {}
    }
    this.playSfx('sfx_lightning', 0.25)

    // Handle chest target — direct hit only, no chain
    if (primary.isChest) {
      this.damageChest(primary, tower.damage)
      const bolt = this.add.graphics().setDepth(11)
      bolt.lineStyle(2, 0x9b59b6, 0.8)
      bolt.lineBetween(tower.x, tower.y, primary.x, primary.y)
      this.tweens.add({ targets: bolt, alpha: 0, duration: 200, onComplete: () => bolt.destroy() })
      return
    }

    // Save position before damaging (enemy might die)
    const primaryX = primary.sprite.x
    const primaryY = primary.sprite.y
    this.damageEnemy(primary, tower.damage, tower.type)

    const bolt = this.add.graphics().setDepth(11)
    this.drawLightningBolt(bolt, tower.x, tower.y, primaryX, primaryY, 0x9b59b6)

    const hit = new Set([primary])
    let lastX = primaryX
    let lastY = primaryY
    let chainDamage = tower.damage

    for (let chain = 0; chain < 4; chain++) {
      chainDamage = Math.round(chainDamage * 0.8)
      if (chainDamage < 1) break

      let nearest = null
      let nearDist = Infinity
      this.enemies.forEach(enemy => {
        if (!enemy.sprite || !enemy.sprite.active || hit.has(enemy)) return
        const dx = enemy.sprite.x - lastX
        const dy = enemy.sprite.y - lastY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const tdx = enemy.sprite.x - tower.x
        const tdy = enemy.sprite.y - tower.y
        if (dist < 100 && Math.sqrt(tdx * tdx + tdy * tdy) <= tower.range * 1.5 && dist < nearDist) {
          nearest = enemy
          nearDist = dist
        }
      })

      if (!nearest) break

      // Save position before damaging
      const nx = nearest.sprite.x
      const ny = nearest.sprite.y
      hit.add(nearest)
      this.damageEnemy(nearest, chainDamage, tower.type)

      this.drawLightningBolt(bolt, lastX, lastY, nx, ny, 0x7b4fb6, Math.max(1, 2 - chain * 0.4))

      lastX = nx
      lastY = ny
    }

    this.tweens.add({
      targets: bolt, alpha: 0, duration: 200,
      onComplete: () => bolt.destroy(),
    })
  }

  handleProjectileHit(proj) {
    // Impact visual
    const impactColor = proj.slow > 0 ? 0x00bcd4 : proj.splash > 0 ? 0xe74c3c : 0xf1c40f
    const impact = this.add.graphics().setDepth(11).setPosition(proj.targetX, proj.targetY)
    impact.fillStyle(impactColor, 0.6)
    impact.fillCircle(0, 0, proj.splash > 0 ? proj.splash / 3 : 8)
    this.tweens.add({
      targets: impact, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 200,
      onComplete: () => impact.destroy(),
    })

    // Check if hitting a treasure chest
    if (proj.target && proj.target.isChest) {
      if (!proj.target.opened && proj.target.sprite && proj.target.sprite.active) {
        this.damageChest(proj.target, proj.damage)
      }
      return
    }

    if (proj.splash > 0) {
      this.playSfx('sfx_catapult_impact', 0.2)
      // Collect targets first to avoid modifying array during iteration
      const splashTargets = []
      this.enemies.forEach(enemy => {
        if (!enemy.sprite || !enemy.sprite.active) return
        const dx = enemy.sprite.x - proj.targetX
        const dy = enemy.sprite.y - proj.targetY
        if (Math.sqrt(dx * dx + dy * dy) <= proj.splash) {
          splashTargets.push(enemy)
        }
      })
      splashTargets.forEach(enemy => {
        if (enemy.hp <= 0) return
        this.damageEnemy(enemy, proj.damage, proj.towerType)
        // Apply slow to all enemies in splash radius (ice tower AoE slow)
        if (proj.slow > 0 && enemy.sprite && enemy.sprite.active) {
          enemy.speed = enemy.baseSpeed * proj.slow
          enemy.slowTimer = Math.max(enemy.slowTimer, proj.slowDuration)
          enemy.sprite.setTint(0x00bcd4)
        }
      })
    } else if (proj.target && proj.target.sprite && proj.target.sprite.active) {
      this.damageEnemy(proj.target, proj.damage, proj.towerType)
      // Slow effect on single target
      if (proj.slow > 0 && proj.target.sprite && proj.target.sprite.active) {
        proj.target.speed = proj.target.baseSpeed * proj.slow
        proj.target.slowTimer = Math.max(proj.target.slowTimer, proj.slowDuration)
        proj.target.sprite.setTint(0x00bcd4)
      }
    }
  }

  damageEnemy(enemy, damage, towerType) {
    if (enemy.hp <= 0) return // Already dead — prevent double-kill crash from splash

    // Apply damage type resistance (physical/magical)
    if (towerType && TOWER_TYPES[towerType]) {
      const dmgType = TOWER_TYPES[towerType].damageType
      if (dmgType === 'physical' && enemy.physResist) {
        damage = Math.round(damage * (1 - enemy.physResist))
      } else if (dmgType === 'magical' && enemy.magResist) {
        damage = Math.round(damage * (1 - enemy.magResist))
      }
    }
    damage = Math.max(1, damage) // Always deal at least 1 damage
    enemy.hp -= damage

    // Damage number float (only for significant hits) — tint based on resistance
    const showDmgNums = !this.saveData.settings || this.saveData.settings.showDamageNumbers !== false
    const resisted = towerType && TOWER_TYPES[towerType] && (
      (TOWER_TYPES[towerType].damageType === 'physical' && enemy.physResist > 0) ||
      (TOWER_TYPES[towerType].damageType === 'magical' && enemy.magResist > 0)
    )
    if (showDmgNums && (damage >= 10 || resisted)) {
      const dmgColor = resisted ? '#888' : '#fff'
      const dmgText = this.add.text(enemy.sprite.x + Phaser.Math.Between(-8, 8), enemy.sprite.y - 15, Math.round(damage), {
        fontSize: resisted ? '9px' : '10px', color: dmgColor,
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(15)
      this.tweens.add({
        targets: dmgText, y: dmgText.y - 20, alpha: 0, duration: 500,
        onComplete: () => dmgText.destroy(),
      })
    }

    if (enemy.hp <= 0) {
      // Combo system — rapid kills build combo multiplier for bonus gold
      this.comboCount++
      this.comboTimer = 2000 // Reset combo window (2 seconds)
      const comboMult = Math.min(this.comboCount, 10) // Cap at 10x
      const comboBonus = comboMult >= 3 ? Math.round(enemy.reward * (comboMult - 2) * 0.5) : 0
      this.comboGoldBonus += comboBonus

      this.gold += enemy.reward + comboBonus
      this.enemiesKilled++
      if (enemy.boss) this.bossKilled = true
      if (towerType === 'scout') {
        this.scoutKills++
        if (enemy.type === 'ogre' || enemy.type === 'boss_ogre') this.scoutKilledOgre = true
      }
      this.dropGem(enemy.sprite.x, enemy.sprite.y, enemy.reward)

      // Show combo indicator for 3+ kills
      if (comboMult >= 3) {
        this.showFloatingText(enemy.sprite.x, enemy.sprite.y - 25, `${comboMult}x COMBO!`, '#f1c40f')
      }

      // Death effect
      this.spawnDeathEffect(enemy)
      this.playSfx('sfx_coin_pickup', 0.3)

      // Slime split: spawn baby slimes at current position
      if (enemy.splits > 0) {
        this.splitEnemy(enemy)
        this.showTutorial('Tut_Slimes')
      }

      this.removeEnemy(enemy)
      this.updateHUD()
    }
  }

  damageChest(chest, damage) {
    if (chest.opened) return
    chest.hp -= damage

    // Show damage number
    if (damage >= 5) {
      const dmgText = this.add.text(chest.x + Phaser.Math.Between(-8, 8), chest.y - 15, Math.round(damage), {
        fontSize: '10px', color: '#fff',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(15)
      this.tweens.add({
        targets: dmgText, y: dmgText.y - 20, alpha: 0, duration: 500,
        onComplete: () => dmgText.destroy(),
      })
    }

    // Update chest HP bar
    if (chest.hp > 0) {
      chest.hpBg.setVisible(true)
      chest.hpBar.setVisible(true)
      const halfBar = 14
      chest.hpBg.clear()
      chest.hpBg.fillStyle(0x333333)
      chest.hpBg.fillRect(chest.x - halfBar, chest.y - 18, halfBar * 2, 3)
      chest.hpBar.clear()
      const hpRatio = chest.hp / chest.maxHp
      chest.hpBar.fillStyle(0xf1c40f)
      chest.hpBar.fillRect(chest.x - halfBar, chest.y - 18, halfBar * 2 * hpRatio, 3)
    }

    if (chest.hp <= 0) {
      chest.opened = true
      this.gold += chest.reward
      this.showFloatingText(chest.x, chest.y, `+${chest.reward} gold!`, '#f1c40f')
      this.playSfx('sfx_coin_explosion')
      // Destroy chest visuals
      if (chest.sprite) { try { chest.sprite.destroy() } catch (e) {} }
      if (chest.hpBg) { try { chest.hpBg.destroy() } catch (e) {} }
      if (chest.hpBar) { try { chest.hpBar.destroy() } catch (e) {} }
      // Gold burst particles
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        const coin = this.add.graphics().setDepth(12)
        coin.fillStyle(0xf1c40f, 0.9)
        coin.fillCircle(0, 0, 3)
        coin.setPosition(chest.x, chest.y)
        this.tweens.add({
          targets: coin,
          x: chest.x + Math.cos(angle) * 25,
          y: chest.y + Math.sin(angle) * 25,
          alpha: 0, duration: 400,
          onComplete: () => coin.destroy(),
        })
      }
      // Clear manual target if it was this chest
      if (this.manualTarget === chest) this.clearManualTarget()
      this.updateHUD()
    }
  }

  spawnDeathEffect(enemy) {
    const x = enemy.sprite.x
    const y = enemy.sprite.y

    // Create a death ghost — copy of enemy sprite that fades and floats up
    try {
      const ghost = this.add.image(x, y, enemy.sprite.texture.key)
        .setDepth(12).setAlpha(0.7)
      ghost.setScale(enemy.sprite.scaleX, enemy.sprite.scaleY)
      ghost.setFlipX(enemy.sprite.flipX)
      ghost.setTint(enemy.boss ? 0xff0000 : 0xff6666)
      this.tweens.add({
        targets: ghost,
        y: y - (enemy.boss ? 40 : 25),
        alpha: 0,
        scaleX: ghost.scaleX * 0.3,
        scaleY: ghost.scaleY * 0.3,
        duration: enemy.boss ? 800 : 500,
        ease: 'Power2',
        onComplete: () => ghost.destroy(),
      })
    } catch (e) { /* sprite texture unavailable */ }

    // Particle burst
    const count = enemy.boss ? 10 : 6
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
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

      const targetSize = Math.round(44 * (babyDef.size || 0.6))
      const sprite = this.add.image(enemy.sprite.x + offsetX, enemy.sprite.y + offsetY, babyDef.texture)
        .setDepth(6)
        .setTint(0x88ff88) // green tint for babies
      const babyScale = targetSize / Math.max(sprite.width, sprite.height)
      sprite.setScale(babyScale)
      this.enemyGroup.add(sprite)

      const endlessScale = this.endlessMode ? 1 + this.endlessWaveNum * 0.08 : 1
      const scaledHp = Math.round(babyDef.hp * this.diffMult.enemyHp * endlessScale)
      const scaledSpeed = Math.round(babyDef.speed * this.diffMult.enemySpeed * Math.min(endlessScale, 1.5))

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
        physResist: babyDef.physResist || 0,
        magResist: babyDef.magResist || 0,
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
      this.playSfx('sfx_explosion', 0.5)
      this.showFloatingText(nearest.x, nearest.y - 20, '-50 HP', '#ff6600')

      // Explosion visual
      const boom = this.add.graphics().setDepth(11).setPosition(nearest.x, nearest.y)
      boom.fillStyle(0xff6600, 0.6)
      boom.fillCircle(0, 0, 40)
      this.tweens.add({
        targets: boom, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 400,
        onComplete: () => boom.destroy(),
      })
    }
  }

  triggerBossAbility(enemy) {
    if (!enemy.sprite || !enemy.sprite.active || enemy.hp <= 0) return
    const ex = enemy.sprite.x
    const ey = enemy.sprite.y

    if (enemy.bossAbility === 'eye_beam') {
      // Xantem's Eye Beam — damages a random tower in range
      const inRange = this.towers.filter(t => {
        if (t.hp <= 0) return false
        const dx = t.x - ex, dy = t.y - ey
        return Math.sqrt(dx * dx + dy * dy) < 250
      })
      if (inRange.length > 0) {
        const target = inRange[Math.floor(Math.random() * inRange.length)]
        target.hp -= 25
        target._damageTintTimer = 300
        target.sprite.setTint(0xff4444)
        this.playSfx('sfx_lightning', 0.4)
        // Beam visual
        const beam = this.add.graphics().setDepth(11)
        beam.lineStyle(3, 0xe74c3c, 0.8)
        beam.lineBetween(ex, ey, target.x, target.y)
        this.tweens.add({ targets: beam, alpha: 0, duration: 300, onComplete: () => beam.destroy() })
        this.showFloatingText(target.x, target.y - 20, '-25 HP', '#e74c3c')
        if (target.hp <= 0) { target.hp = 0; this.destroyTower(target) }
      }
    } else if (enemy.bossAbility === 'ground_slam') {
      // Gronk's Ground Slam — damages all towers in a radius
      const slamRadius = 120
      const slamDamage = 20
      // Collect targets first to avoid modifying array during iteration
      const slamTargets = this.towers.filter(tower => {
        if (tower.hp <= 0) return false
        const dx = tower.x - ex, dy = tower.y - ey
        return Math.sqrt(dx * dx + dy * dy) <= slamRadius
      })
      slamTargets.forEach(tower => {
        tower.hp -= slamDamage
        tower._damageTintTimer = 300
        tower.sprite.setTint(0xff4444)
        if (tower.hp <= 0) { tower.hp = 0; this.destroyTower(tower) }
      })
      const hitAny = slamTargets.length > 0
      if (hitAny) {
        this.playSfx('sfx_explosion', 0.4)
        // Slam visual — expanding ring
        const ring = this.add.graphics().setDepth(11).setPosition(ex, ey)
        ring.lineStyle(3, 0xf39c12, 0.7)
        ring.strokeCircle(0, 0, 20)
        this.tweens.add({
          targets: ring, scaleX: slamRadius / 20, scaleY: slamRadius / 20,
          alpha: 0, duration: 400, onComplete: () => ring.destroy(),
        })
        this.showFloatingText(ex, ey - 30, 'GROUND SLAM!', '#f39c12')
        this.cameras.main.shake(300, 0.008)
      }
    } else if (enemy.bossAbility === 'fire_breath') {
      // Ainamarth's Fire Breath — damages towers in a cone ahead (movement direction)
      const wp = this.waypoints
      const nextWp = wp[Math.min(enemy.waypointIndex, wp.length - 1)]
      if (!nextWp) return
      const dirX = nextWp.x - ex, dirY = nextWp.y - ey
      const dirLen = Math.sqrt(dirX * dirX + dirY * dirY)
      if (dirLen < 1) return
      const nx = dirX / dirLen, ny = dirY / dirLen
      const breathRange = 150
      const breathDamage = 15
      // Pre-collect targets before damaging (safe iteration pattern)
      const breathTargets = this.towers.filter(tower => {
        if (tower.hp <= 0) return false
        const dx = tower.x - ex, dy = tower.y - ey
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > breathRange) return false
        const dot = (dx / dist) * nx + (dy / dist) * ny
        return dot > 0.3
      })
      breathTargets.forEach(tower => {
        tower.hp -= breathDamage
        tower._damageTintTimer = 300
        tower.sprite.setTint(0xff4444)
        if (tower.hp <= 0) { tower.hp = 0; this.destroyTower(tower) }
      })
      // Fire breath visual — cone shape
      const fb = this.add.graphics().setDepth(11).setPosition(ex, ey)
      fb.fillStyle(0xff4500, 0.4)
      fb.beginPath()
      fb.moveTo(0, 0)
      const angle = Math.atan2(ny, nx)
      fb.lineTo(Math.cos(angle - 0.4) * breathRange, Math.sin(angle - 0.4) * breathRange)
      fb.lineTo(Math.cos(angle + 0.4) * breathRange, Math.sin(angle + 0.4) * breathRange)
      fb.closePath()
      fb.fillPath()
      this.tweens.add({ targets: fb, alpha: 0, duration: 500, onComplete: () => fb.destroy() })
      this.playSfx('sfx_explosion', 0.3)
      this.showFloatingText(ex, ey - 30, 'FIRE BREATH!', '#ff4500')
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
    if (!gemDrop.graphics.active || gemDrop.collected) return
    gemDrop.collected = true
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
    if (tower._destroyed) return
    tower._destroyed = true
    tower.hp = 0
    try { if (tower.hpBg) tower.hpBg.setVisible(false) } catch (e) {}
    try { if (tower.hpBar) tower.hpBar.setVisible(false) } catch (e) {}
    // Close tower menu if it's open for this tower
    if (this.towerMenu) {
      try { this.towerMenu.destroy() } catch (e) {}
      this.towerMenu = null
      this.rangeIndicator.setVisible(false)
    }
    this.tweens.add({
      targets: tower.sprite,
      alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 300,
      onComplete: () => {
        try {
          if (tower.sprite && tower.sprite.active) tower.sprite.destroy()
          if (tower.hpBg && tower.hpBg.active) tower.hpBg.destroy()
          if (tower.hpBar && tower.hpBar.active) tower.hpBar.destroy()
        } catch (e) {}
      },
    })
  }

  removeEnemy(enemy) {
    try { if (enemy.sprite && enemy.sprite.active) enemy.sprite.destroy() } catch (e) {}
    try { if (enemy.hpBg && enemy.hpBg.active) enemy.hpBg.destroy() } catch (e) {}
    try { if (enemy.hpBar && enemy.hpBar.active) enemy.hpBar.destroy() } catch (e) {}
    try { if (enemy.namePlate) enemy.namePlate.destroy() } catch (e) {}
    // Clear scout tower lastTarget references to prevent memory leaks
    this.towers.forEach(t => { if (t.lastTarget === enemy) { t.lastTarget = null; t.stackCount = 0 } })
    // Clear manual target if this enemy was targeted
    if (this.manualTarget === enemy) this.clearManualTarget()
    this.enemies = this.enemies.filter(e => e !== enemy)
  }

  handleGameOver(won) {
    if (this.gameOver) return // Guard against duplicate calls in same frame
    this.gameOver = true
    this.startWaveBtn.setVisible(false)
    this.countdownText.setVisible(false)
    if (this.wavePreview) this.wavePreview.setVisible(false)
    this.stopMusic()

    // Clean up active UI elements
    if (this.towerMenu) { try { this.towerMenu.destroy() } catch (e) {} this.towerMenu = null }
    this.rangeIndicator.setVisible(false)
    this.cellIndicator.setVisible(false)
    this.cellNoIndicator.setVisible(false)
    // Clean up gem drop zones
    this.gemDrops.forEach(g => {
      try { if (g.zone) g.zone.destroy() } catch (e) {}
    })

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
      // Also save the BEST stars across all difficulties (for level select card display)
      // setLevelStars() uses Math.max internally, so it won't overwrite better stars
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
    const diffMults = { casual: 0.5, normal: 1.0, brutal: 1.5, inferno: 2.0 }
    const diffScoreMult = diffMults[this.difficulty] || 1.0
    const livesBonus = won ? this.lives * 50 : 0
    const goldBonus = won ? Math.round(this.gold * 0.5) : 0
    const score = Math.round((this.enemiesKilled * 100 + this.gemsCollected * 50 + livesBonus + goldBonus + this.comboGoldBonus + (won ? stars * 500 : 0)) * diffScoreMult)
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
        if (check === 'gold_400' && this.peakGold >= 400) completed = true
        if (check === 'gold_500' && this.peakGold >= 500) completed = true
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
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.cameras.main.width, this.cameras.main.height), Phaser.Geom.Rectangle.Contains)

    const bgKey = won ? 'victory_bg' : 'gameover_bg'
    if (this.textures.exists(bgKey)) {
      this.add.image(cx, cy, bgKey)
        .setDisplaySize(400, 300).setDepth(50).setAlpha(0.4)
    }

    // Context-sensitive victory message (matching original APK)
    let title, titleColor
    if (this.endlessMode) {
      title = 'ENDLESS OVER'
      titleColor = '#ff4500'
    } else {
      title = won ? (stars === 3 ? 'PERFECT!' : stars === 1 ? 'THAT WAS CLOSE!' : 'VICTORY!') : 'DEFEAT'
      titleColor = won ? (stars === 3 ? '#f1c40f' : '#2ecc71') : '#e74c3c'
    }

    const titleText = this.add.text(cx, cy - 80, title, {
      fontSize: '48px', color: titleColor, fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51).setScale(0)
    this.tweens.add({
      targets: titleText, scaleX: 1, scaleY: 1,
      duration: 400, ease: 'Back.easeOut',
    })

    if (this.endlessMode) {
      this.add.text(cx, cy - 45, `Survived ${this.currentWave} waves!`, {
        fontSize: '16px', color: '#fff', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(51)
    }

    if (won) {
      this.playSfx('sfx_gold_star', 0.4)
      for (let i = 0; i < 3; i++) {
        const starX = cx - 40 + i * 40
        const filled = i < stars
        const star = this.add.text(starX, cy - 40, filled ? '\u2605' : '\u2606', {
          fontSize: '32px',
          color: filled ? '#f1c40f' : '#555',
          stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(51).setScale(0)
        // Staggered star reveal animation
        this.tweens.add({
          targets: star, scaleX: 1, scaleY: 1,
          duration: 300, ease: 'Back.easeOut',
          delay: 400 + i * 200,
        })
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

    // Bonus mission result
    if (missionIdx !== undefined && BONUS_MISSIONS[missionIdx]) {
      const mission = BONUS_MISSIONS[missionIdx]
      const missionKey = `${this.levelIndex}_${this.difficulty}`
      const wasDone = save.bonusMissions[missionKey]
      const missionColor = wasDone ? '#2ecc71' : '#888'
      const missionMark = wasDone ? '\u2713' : '\u2717'
      this.add.text(cx, cy + 40, `${missionMark} Bonus: ${mission.desc}`, {
        fontSize: '10px', color: missionColor,
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(51)
    }

    // Score
    this.add.text(cx, cy + 55, `Score: ${score}`, {
      fontSize: '12px', color: '#f1c40f',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(51)

    // Buttons
    const menuBtn = this.add.text(cx - 80, cy + 80, 'Menu', {
      fontSize: '20px', color: '#fff', backgroundColor: '#16213e',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true })
    menuBtn.on('pointerdown', () => this.scene.start('LevelSelectScene'))

    if (won && this.levelIndex + 1 < LEVELS.length) {
      const nextBtn = this.add.text(cx + 80, cy + 80, 'Next', {
        fontSize: '20px', color: '#fff', backgroundColor: '#e94560',
        padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true })
      nextBtn.on('pointerdown', () => {
        this.scene.start('GameScene', { levelIndex: this.levelIndex + 1, difficulty: this.difficulty })
      })
    }

    const retryBtn = this.add.text(cx, cy + 120, 'Retry', {
      fontSize: '16px', color: '#888',
    }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true })
    retryBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { levelIndex: this.levelIndex, difficulty: this.difficulty, endless: this.endlessMode })
    })
  }

  updateHUD() {
    this.goldText.setText(`${this.gold}`)
    this.livesText.setText(`${this.lives}`)
    if (this.endlessMode) {
      this.waveText.setText(`\u221E Wave ${this.currentWave + 1}`)
    } else {
      this.waveText.setText(`Wave ${Math.min(this.currentWave + 1, this.levelData.waves.length)}/${this.levelData.waves.length}`)
    }
    this.gemText.setText(`${this.gemsCollected}`)
    this.killText.setText(`\u2620 ${this.enemiesKilled}`)

    // Update build panel affordability — gray out towers player can't afford
    if (this.buildIcons) {
      this.buildIcons.forEach(icon => {
        const cost = TOWER_TYPES[icon.towerKey]?.cost || 0
        if (this.gold >= cost) {
          icon.setAlpha(1).clearTint()
        } else {
          icon.setAlpha(0.4).setTint(0x666666)
        }
      })
    }
  }

  drawLightningBolt(graphics, x1, y1, x2, y2, color, width) {
    graphics.lineStyle(width || 2, color || 0x9b59b6, 0.8)
    const segments = 6
    const dx = x2 - x1, dy = y2 - y1
    let px = x1, py = y1
    graphics.beginPath()
    graphics.moveTo(px, py)
    for (let i = 1; i < segments; i++) {
      const t = i / segments
      const bx = x1 + dx * t + Phaser.Math.Between(-12, 12)
      const by = y1 + dy * t + Phaser.Math.Between(-12, 12)
      graphics.lineTo(bx, by)
      px = bx; py = by
    }
    graphics.lineTo(x2, y2)
    graphics.strokePath()
  }

  generateEndlessWave(waveNum) {
    // Generate increasingly difficult waves for endless mode
    const enemyPool = [
      { type: 'slime', minWave: 1 },
      { type: 'goblin', minWave: 1 },
      { type: 'orc', minWave: 3 },
      { type: 'troll', minWave: 4 },
      { type: 'gelcube', minWave: 5 },
      { type: 'ogre', minWave: 7 },
      { type: 'rocketgoblin', minWave: 6 },
      { type: 'beholder', minWave: 10 },
      { type: 'giant', minWave: 12 },
      { type: 'dragon', minWave: 15 },
    ]

    const available = enemyPool.filter(e => waveNum >= e.minWave)
    const groups = []
    const numGroups = Math.min(1 + Math.floor(waveNum / 3), 4)

    for (let i = 0; i < numGroups; i++) {
      const entry = available[Math.floor(Math.random() * available.length)]
      const count = Math.min(3 + Math.floor(waveNum * 0.8) + Math.floor(Math.random() * 3), 25)
      groups.push({ type: entry.type, count, interval: Math.max(300, 1000 - waveNum * 20) })
    }

    // Every 10 waves, add a boss
    const isBoss = waveNum % 10 === 0
    if (isBoss) {
      const bosses = ['boss_beholder', 'boss_ogre', 'boss_dragon']
      const bossType = bosses[Math.min(Math.floor(waveNum / 10) - 1, bosses.length - 1)]
      groups.push({ type: bossType, count: 1, interval: 1000 })
    }

    return { enemies: groups, boss: isBoss }
  }

  updateWavePreview() {
    if (!this.wavePreview) return
    const waveIdx = this.currentWave
    if (waveIdx >= this.levelData.waves.length) {
      this.wavePreview.setVisible(false)
      return
    }
    const wave = this.levelData.waves[waveIdx]
    const parts = wave.enemies.map(g => {
      const def = ENEMY_TYPES[g.type]
      if (!def) return `${g.count}x ${g.type}`
      let info = `${g.count}x ${def.name}`
      // Show resistance indicators
      if (def.physResist > 0) info += ' \u{1F6E1}' // shield = physical resist
      if (def.magResist > 0) info += ' \u2728' // sparkle = magic resist
      if (def.flying) info += ' \u2708' // airplane = flying
      if (def.boss) info += ' \u{1F451}' // crown = boss
      return info
    })
    const preview = `Next: ${parts.join(', ')}${wave.boss ? ' \u26A0 BOSS WAVE' : ''}`
    this.wavePreview.setText(preview).setVisible(true)
  }

  updateGameState() {
    // Sync state to registry for cloud saves
    this.registry.set('gameState', {
      levelIndex: this.levelIndex,
      levelsUnlocked: this.saveData.levelsUnlocked,
    })
  }
}
