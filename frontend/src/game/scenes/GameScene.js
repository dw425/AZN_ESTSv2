import Phaser from 'phaser'
import { LEVELS, TOWER_TYPES, ENEMY_TYPES } from '../maps/levels.js'
import { loadSave, saveSave, unlockLevel, setLevelStars } from '../SaveManager.js'

const TILE = 64

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  init(data) {
    this.levelIndex = data.levelIndex || 0
    this.levelData = LEVELS[this.levelIndex]

    // Load save and apply upgrades
    this.saveData = loadSave()
    const ups = this.saveData.upgrades

    // Apply gold start boost (+20 gold per level)
    this.gold = this.levelData.startGold + (ups.goldStartBoost || 0) * 20
    // Apply base health boost (+1 life per level)
    this.lives = this.levelData.lives + (ups.baseHealthBoost || 0)
    this.startLives = this.lives

    // Store boost multipliers for towers
    this.boosts = {
      damage: 1 + (ups.towerDamageBoost || 0) * 0.03,
      fireRate: 1 - (ups.towerFireRateBoost || 0) * 0.03, // lower is faster
      range: 1 + (ups.towerRangeBoost || 0) * 0.05,
      aoe: 1 + (ups.towerAoeBoost || 0) * 0.05,
      iceSlow: 1 + (ups.towerIcyBoost || 0) * 0.03,
    }
    // Gold wave bonus
    this.goldWaveBonus = (ups.goldWaveBoost || 0) * 2

    this.currentWave = 0
    this.waveActive = false
    this.towers = []
    this.enemies = []
    this.projectiles = []
    this.gemDrops = []
    this.gemsCollected = 0
    this.selectedTowerType = null
    this.gameOver = false
    this.paused = false

    // Build the path waypoints from the grid
    this.waypoints = this.buildPath(this.levelData.grid)
  }

  create() {
    // Draw the map
    this.drawMap()

    // Create groups
    this.enemyGroup = this.add.group()
    this.projectileGroup = this.add.group()
    this.towerGroup = this.add.group()

    // HUD
    this.createHUD()

    // Tower build panel
    this.createBuildPanel()

    // Range indicator (hidden by default)
    this.rangeIndicator = this.add.image(0, 0, 'range_indicator').setVisible(false).setAlpha(0.3).setDepth(5)

    // Click handler for placing towers
    this.input.on('pointerdown', (pointer) => this.handleClick(pointer))

    // Start wave button (above the build panel)
    this.startWaveBtn = this.add.text(
      this.cameras.main.centerX, this.cameras.main.height - 95,
      '>> START WAVE 1 <<',
      { fontSize: '20px', color: '#f1c40f', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20)

    this.startWaveBtn.on('pointerdown', () => this.startNextWave())
    this.startWaveBtn.on('pointerover', () => this.startWaveBtn.setColor('#fff'))
    this.startWaveBtn.on('pointerout', () => this.startWaveBtn.setColor('#f1c40f'))

    // Save game state to registry for cloud save
    this.updateGameState()
  }

  buildPath(grid) {
    const path = []
    let startRow = -1, startCol = -1

    // Find spawn (2)
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

    // BFS to trace path
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
        if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length
            && !visited.has(key) && grid[nr][nc] >= 1) {
          visited.add(key)
          parent[key] = [r, c]
          queue.push([nr, nc])
        }
      }
    }

    // Reconstruct path
    const cells = []
    let cur = [endRow, endCol]
    while (cur) {
      cells.unshift(cur)
      const key = `${cur[0]},${cur[1]}`
      cur = parent[key] || null
    }

    // Convert to pixel positions (center of each tile)
    return cells.map(([r, c]) => ({
      x: c * TILE + TILE / 2,
      y: r * TILE + TILE / 2,
    }))
  }

  drawMap() {
    const grid = this.levelData.grid
    const bgKey = this.levelData.mapBg || 'map_grass'

    // Draw full background map image — the map art already shows paths/terrain
    if (this.textures.exists(bgKey)) {
      this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, bgKey)
        .setDisplaySize(this.cameras.main.width, this.cameras.main.height)
    } else {
      const bg = this.add.graphics()
      bg.fillStyle(0x2d5a27)
      bg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height)
    }

    // Find spawn and exit for small arrow indicators
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const val = grid[r][c]
        const x = c * TILE + TILE / 2
        const y = r * TILE + TILE / 2

        if (val === 2) {
          const arrow = this.add.text(x, y, '\u25B6', {
            fontSize: '16px', color: '#2ecc71',
            stroke: '#000', strokeThickness: 3,
          }).setOrigin(0.5).setDepth(2).setAlpha(0.8)
        }
        if (val === 3) {
          const flag = this.add.text(x, y, '\u2691', {
            fontSize: '20px', color: '#e74c3c',
            stroke: '#000', strokeThickness: 3,
          }).setOrigin(0.5).setDepth(2).setAlpha(0.8)
        }
      }
    }
  }

  createHUD() {
    const hudBg = this.add.graphics().setDepth(15)
    hudBg.fillStyle(0x000000, 0.6)
    hudBg.fillRect(0, 0, this.cameras.main.width, 36)

    // Gold icon + text
    if (this.textures.exists('hud_gold')) {
      this.add.image(18, 18, 'hud_gold').setDisplaySize(20, 20).setDepth(16)
    }
    this.goldText = this.add.text(32, 8, '', {
      fontSize: '16px', color: '#f1c40f', fontStyle: 'bold',
    }).setDepth(16)

    // Lives icon + text
    if (this.textures.exists('hud_health')) {
      this.add.image(148, 18, 'hud_health').setDisplaySize(20, 20).setDepth(16)
    }
    this.livesText = this.add.text(162, 8, '', {
      fontSize: '16px', color: '#e94560', fontStyle: 'bold',
    }).setDepth(16)

    // Wave text
    this.waveText = this.add.text(280, 8, '', {
      fontSize: '16px', color: '#3498db', fontStyle: 'bold',
    }).setDepth(16)

    // Gem icon + text
    if (this.textures.exists('hud_gem')) {
      this.add.image(418, 18, 'hud_gem').setDisplaySize(20, 20).setDepth(16)
    }
    this.gemText = this.add.text(432, 8, '', {
      fontSize: '16px', color: '#9b59b6', fontStyle: 'bold',
    }).setDepth(16)

    // Speed controls
    this.add.text(this.cameras.main.width - 120, 8, '1x', {
      fontSize: '14px', color: '#aaa',
    }).setDepth(16).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { this.gameSpeed = 1; this.time.timeScale = 1; this.physics.world.timeScale = 1 })

    this.add.text(this.cameras.main.width - 85, 8, '2x', {
      fontSize: '14px', color: '#aaa',
    }).setDepth(16).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { this.gameSpeed = 2; this.time.timeScale = 2; this.physics.world.timeScale = 0.5 })

    // Back to menu
    this.add.text(this.cameras.main.width - 45, 8, 'Menu', {
      fontSize: '14px', color: '#888',
    }).setDepth(16).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('LevelSelectScene'))

    this.updateHUD()
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

      // Selection highlight
      const highlight = this.add.graphics().setDepth(15)

      icon.on('pointerdown', () => {
        if (this.selectedTowerType === key) {
          this.selectedTowerType = null
          this.rangeIndicator.setVisible(false)
        } else {
          this.selectedTowerType = key
        }
        this.updateBuildHighlights()
      })

      icon.towerKey = key
      icon.highlight = highlight
      this.buildIcons = this.buildIcons || []
      this.buildIcons.push(icon)
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

  handleClick(pointer) {
    if (this.gameOver) return
    // Ignore clicks on HUD areas
    if (pointer.y < 36 || pointer.y > this.cameras.main.height - 80) return

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
        // Check no tower already there
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

    const sprite = this.add.image(x, y, def.texture).setDisplaySize(40, 40).setDepth(4)
    this.towerGroup.add(sprite)

    const tower = {
      sprite,
      type,
      gridCol: col,
      gridRow: row,
      x, y,
      damage: Math.round(def.damage * this.boosts.damage),
      range: Math.round(def.range * this.boosts.range),
      fireRate: Math.round(def.fireRate * this.boosts.fireRate),
      splash: def.splash ? Math.round(def.splash * this.boosts.aoe) : 0,
      slow: def.slow ? Math.min(def.slow * this.boosts.iceSlow, 0.9) : 0,
      slowDuration: def.slowDuration || 0,
      projectileTexture: def.projectile,
      lastFired: 0,
      level: 0,
    }

    this.towers.push(tower)
    this.updateHUD()

    // Place animation
    sprite.setScale(0)
    this.tweens.add({ targets: sprite, scale: 1, duration: 200, ease: 'Back.easeOut' })
  }

  showTowerMenu(tower) {
    // Remove existing menu if any
    if (this.towerMenu) this.towerMenu.destroy()

    const def = TOWER_TYPES[tower.type]
    const upgrade = def.upgrades[tower.level]
    const menuItems = []

    // Show range
    this.rangeIndicator.setPosition(tower.x, tower.y)
    this.rangeIndicator.setDisplaySize(tower.range * 2, tower.range * 2)
    this.rangeIndicator.setVisible(true)

    const menu = this.add.container(tower.x, tower.y - 50).setDepth(30)

    const bg = this.add.graphics()
    bg.fillStyle(0x16213e, 0.95)
    bg.fillRoundedRect(-80, -25, 160, upgrade ? 70 : 45, 8)
    bg.lineStyle(1, 0xe94560)
    bg.strokeRoundedRect(-80, -25, 160, upgrade ? 70 : 45, 8)
    menu.add(bg)

    const info = this.add.text(0, -15, `${def.name} Lv${tower.level + 1} | DMG: ${tower.damage}`, {
      fontSize: '11px', color: '#fff',
    }).setOrigin(0.5)
    menu.add(info)

    if (upgrade) {
      const upgradeBtn = this.add.text(-35, 10, `Upgrade $${upgrade.cost}`, {
        fontSize: '12px', color: '#2ecc71', fontStyle: 'bold',
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
          // Swap tower sprite to upgraded version
          const towerDef = TOWER_TYPES[tower.type]
          if (towerDef.textures && towerDef.textures[tower.level]) {
            const newTex = towerDef.textures[tower.level]
            if (this.textures.exists(newTex)) {
              tower.sprite.setTexture(newTex)
            }
          }
          this.updateHUD()
          menu.destroy()
          this.rangeIndicator.setVisible(false)
        }
      })
      menu.add(upgradeBtn)
    }

    const sellValue = Math.floor(def.cost * 0.6)
    const sellBtn = this.add.text(upgrade ? 50 : 0, upgrade ? 10 : 10, `Sell $${sellValue}`, {
      fontSize: '12px', color: '#e74c3c', fontStyle: 'bold',
    }).setOrigin(upgrade ? 0 : 0.5).setInteractive({ useHandCursor: true })
    sellBtn.on('pointerdown', () => {
      this.gold += sellValue
      tower.sprite.destroy()
      this.towers = this.towers.filter(t => t !== tower)
      this.updateHUD()
      menu.destroy()
      this.rangeIndicator.setVisible(false)
    })
    menu.add(sellBtn)

    this.towerMenu = menu

    // Auto-close when clicking elsewhere
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

    const wave = this.levelData.waves[this.currentWave]
    let totalSpawned = 0
    let totalToSpawn = 0

    wave.enemies.forEach(group => {
      totalToSpawn += group.count
    })

    wave.enemies.forEach(group => {
      const enemyDef = ENEMY_TYPES[group.type]
      let spawned = 0

      this.time.addEvent({
        delay: group.interval,
        repeat: group.count - 1,
        callback: () => {
          if (this.gameOver) return
          this.spawnEnemy(enemyDef, group.type)
          spawned++
          totalSpawned++
        },
      })
    })

    this.updateHUD()
  }

  spawnEnemy(def, type) {
    const start = this.waypoints[0]
    const sprite = this.add.image(start.x, start.y, def.texture)
      .setDisplaySize(28, 28)
      .setDepth(6)
    this.enemyGroup.add(sprite)

    // HP bar background
    const hpBg = this.add.graphics().setDepth(7)
    hpBg.fillStyle(0x333333)
    hpBg.fillRect(-14, -20, 28, 4)

    // HP bar fill
    const hpBar = this.add.graphics().setDepth(8)
    hpBar.fillStyle(0x2ecc71)
    hpBar.fillRect(-14, -20, 28, 4)

    const enemy = {
      sprite,
      hpBg,
      hpBar,
      type,
      hp: def.hp,
      maxHp: def.hp,
      baseSpeed: def.speed,
      speed: def.speed,
      reward: def.reward,
      damage: def.damage,
      waypointIndex: 0,
      slowTimer: 0,
    }

    this.enemies.push(enemy)
  }

  update(time, delta) {
    if (this.gameOver || this.paused) return

    // Move enemies
    this.enemies.forEach(enemy => {
      if (!enemy.sprite.active) return

      // Handle slow effect
      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= delta
        if (enemy.slowTimer <= 0) {
          enemy.speed = enemy.baseSpeed
        }
      }

      const target = this.waypoints[enemy.waypointIndex]
      if (!target) return

      const dx = target.x - enemy.sprite.x
      const dy = target.y - enemy.sprite.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 5) {
        enemy.waypointIndex++
        if (enemy.waypointIndex >= this.waypoints.length) {
          // Enemy reached exit
          this.lives -= enemy.damage
          this.removeEnemy(enemy)
          this.updateHUD()
          if (this.lives <= 0) {
            this.handleGameOver(false)
          }
          return
        }
      } else {
        const speed = (enemy.speed * delta) / 1000
        enemy.sprite.x += (dx / dist) * speed
        enemy.sprite.y += (dy / dist) * speed
      }

      // Update HP bar position
      enemy.hpBg.setPosition(enemy.sprite.x, enemy.sprite.y)
      enemy.hpBar.setPosition(enemy.sprite.x, enemy.sprite.y)
      enemy.hpBg.clear()
      enemy.hpBg.fillStyle(0x333333)
      enemy.hpBg.fillRect(-14, -20, 28, 4)
      enemy.hpBar.clear()
      const hpRatio = enemy.hp / enemy.maxHp
      const color = hpRatio > 0.5 ? 0x2ecc71 : hpRatio > 0.25 ? 0xf39c12 : 0xe74c3c
      enemy.hpBar.fillStyle(color)
      enemy.hpBar.fillRect(-14, -20, 28 * hpRatio, 4)
    })

    // Tower firing
    this.towers.forEach(tower => {
      if (time - tower.lastFired < tower.fireRate) return

      // Find closest enemy in range
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
        this.fireProjectile(tower, closest)
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
        // Hit
        this.handleProjectileHit(proj)
        proj.sprite.destroy()
        return false
      }

      const speed = (400 * delta) / 1000
      proj.sprite.x += (dx / dist) * speed
      proj.sprite.y += (dy / dist) * speed

      // Update target position if enemy still alive
      if (proj.target && proj.target.sprite.active) {
        proj.targetX = proj.target.sprite.x
        proj.targetY = proj.target.sprite.y
      }

      return true
    })

    // Check wave complete
    if (this.waveActive && this.enemies.length === 0) {
      this.waveActive = false
      this.currentWave++

      // Gold wave bonus from shop upgrades
      if (this.goldWaveBonus > 0) {
        this.gold += this.goldWaveBonus
      }

      if (this.currentWave >= this.levelData.waves.length) {
        this.handleGameOver(true)
      } else {
        this.startWaveBtn.setText(`>> START WAVE ${this.currentWave + 1} <<`)
        this.startWaveBtn.setVisible(true)
      }
      this.updateHUD()
    }
  }

  fireProjectile(tower, enemy) {
    const sprite = this.add.image(tower.x, tower.y, tower.projectileTexture).setDepth(10)
    this.projectileGroup.add(sprite)

    this.projectiles.push({
      sprite,
      target: enemy,
      targetX: enemy.sprite.x,
      targetY: enemy.sprite.y,
      damage: tower.damage,
      splash: tower.splash,
      slow: tower.slow,
      slowDuration: tower.slowDuration,
    })
  }

  handleProjectileHit(proj) {
    if (proj.splash > 0) {
      // AOE damage
      this.enemies.forEach(enemy => {
        if (!enemy.sprite.active) return
        const dx = enemy.sprite.x - proj.targetX
        const dy = enemy.sprite.y - proj.targetY
        if (Math.sqrt(dx * dx + dy * dy) <= proj.splash) {
          this.damageEnemy(enemy, proj.damage)
        }
      })
    } else if (proj.target && proj.target.sprite.active) {
      this.damageEnemy(proj.target, proj.damage)
    }

    // Slow effect
    if (proj.slow > 0 && proj.target && proj.target.sprite.active) {
      proj.target.speed = proj.target.baseSpeed * proj.slow
      proj.target.slowTimer = proj.slowDuration
      proj.target.sprite.setTint(0x00bcd4)
    }
  }

  damageEnemy(enemy, damage) {
    enemy.hp -= damage
    if (enemy.hp <= 0) {
      this.gold += enemy.reward
      // Drop gems (small chance per kill, guaranteed on bosses)
      this.dropGem(enemy.sprite.x, enemy.sprite.y, enemy.reward)
      this.removeEnemy(enemy)
      this.updateHUD()
    }
  }

  dropGem(x, y, reward) {
    // Gem drop chance scales with enemy value: weak=20%, strong=50%, boss=100%
    const chance = reward >= 30 ? 1.0 : reward >= 15 ? 0.5 : 0.2
    if (Math.random() > chance) return

    const gemValue = reward >= 30 ? 3 : reward >= 15 ? 2 : 1
    const colors = [0x9b59b6, 0x3498db, 0x2ecc71, 0xe74c3c, 0xf1c40f]
    const color = colors[Math.floor(Math.random() * colors.length)]

    const gem = this.add.graphics().setDepth(12)
    gem.fillStyle(color, 0.9)
    // Diamond shape
    gem.fillPoints([
      { x: 0, y: -6 },
      { x: 5, y: 0 },
      { x: 0, y: 6 },
      { x: -5, y: 0 },
    ], true)
    gem.setPosition(x, y)

    // Float up animation
    this.tweens.add({
      targets: gem,
      y: y - 20,
      alpha: { from: 1, to: 0.7 },
      duration: 500,
      ease: 'Power1',
    })

    const gemDrop = { graphics: gem, x, y: y - 20, value: gemValue, timer: 5000 }
    this.gemDrops.push(gemDrop)

    // Make clickable — tapping collects the gem
    const zone = this.add.zone(x, y - 10, 30, 30).setInteractive().setDepth(13)
    zone.on('pointerdown', () => {
      this.collectGem(gemDrop)
      zone.destroy()
    })
    gemDrop.zone = zone

    // Auto-collect after 3 seconds
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

    // Float-up collect animation
    this.tweens.add({
      targets: gemDrop.graphics,
      y: gemDrop.graphics.y - 30,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      onComplete: () => gemDrop.graphics.destroy(),
    })

    this.gemDrops = this.gemDrops.filter(g => g !== gemDrop)
    this.updateHUD()
  }

  removeEnemy(enemy) {
    enemy.sprite.destroy()
    enemy.hpBg.destroy()
    enemy.hpBar.destroy()
    this.enemies = this.enemies.filter(e => e !== enemy)
  }

  handleGameOver(won) {
    this.gameOver = true
    this.startWaveBtn.setVisible(false)

    const cx = this.cameras.main.centerX
    const cy = this.cameras.main.centerY

    // Calculate stars
    let stars = 0
    if (won) {
      const lifeRatio = this.lives / this.startLives
      stars = lifeRatio >= 1 ? 3 : lifeRatio >= 0.5 ? 2 : 1
    }

    // Save progress
    if (won) {
      unlockLevel(this.levelIndex + 1)
      setLevelStars(this.levelIndex, stars)
    }
    // Always save gems earned this level
    if (this.gemsCollected > 0) {
      const save = loadSave()
      save.gems += this.gemsCollected
      saveSave(save)
    }

    // Update registry for level select
    const save = loadSave()
    this.registry.set('gameState', { levelsUnlocked: save.levelsUnlocked })

    // Overlay
    const overlay = this.add.graphics().setDepth(50)
    overlay.fillStyle(0x000000, 0.7)
    overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height)

    // Background image
    const bgKey = won ? 'victory_bg' : 'gameover_bg'
    if (this.textures.exists(bgKey)) {
      this.add.image(cx, cy, bgKey)
        .setDisplaySize(400, 300).setDepth(50).setAlpha(0.4)
    }

    const title = won ? 'VICTORY!' : 'DEFEAT'
    const color = won ? '#2ecc71' : '#e74c3c'

    this.add.text(cx, cy - 70, title, {
      fontSize: '48px', color, fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51)

    // Star display (for victories)
    if (won) {
      const starY = cy - 30
      for (let i = 0; i < 3; i++) {
        const starX = cx - 40 + i * 40
        const filled = i < stars
        this.add.text(starX, starY, filled ? '\u2605' : '\u2606', {
          fontSize: '32px',
          color: filled ? '#f1c40f' : '#555',
          stroke: '#000',
          strokeThickness: 2,
        }).setOrigin(0.5).setDepth(51)
      }
    }

    // Gem count
    const gemSave = loadSave()
    this.add.text(cx, cy + 5, `Gems earned: ${this.gemsCollected} | Total: ${gemSave.gems}`, {
      fontSize: '14px', color: '#9b59b6', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(51)

    // Buttons
    const menuBtn = this.add.text(cx - 80, cy + 45, 'Menu', {
      fontSize: '20px', color: '#fff', backgroundColor: '#16213e',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true })
    menuBtn.on('pointerdown', () => this.scene.start('LevelSelectScene'))

    if (won && this.levelIndex + 1 < LEVELS.length) {
      const nextBtn = this.add.text(cx + 80, cy + 45, 'Next', {
        fontSize: '20px', color: '#fff', backgroundColor: '#e94560',
        padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true })
      nextBtn.on('pointerdown', () => {
        this.scene.start('GameScene', { levelIndex: this.levelIndex + 1 })
      })
    }

    const retryBtn = this.add.text(cx, cy + 90, 'Retry', {
      fontSize: '16px', color: '#888',
    }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true })
    retryBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { levelIndex: this.levelIndex })
    })
  }

  updateHUD() {
    this.goldText.setText(`${this.gold}`)
    this.livesText.setText(`${this.lives}`)
    this.waveText.setText(`Wave ${this.currentWave + 1}/${this.levelData.waves.length}`)
    this.gemText.setText(`${this.gemsCollected}`)
  }
}
