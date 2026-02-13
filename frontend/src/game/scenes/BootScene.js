import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload() {
    // Generate all game textures programmatically (placeholder assets)
    this.generateTextures()

    // Loading bar
    const w = this.cameras.main.width
    const h = this.cameras.main.height
    const bar = this.add.graphics()
    const box = this.add.graphics()
    box.fillStyle(0x222222, 0.8)
    box.fillRect(w / 4, h / 2 - 15, w / 2, 30)

    this.load.on('progress', (val) => {
      bar.clear()
      bar.fillStyle(0xe94560, 1)
      bar.fillRect(w / 4 + 4, h / 2 - 11, (w / 2 - 8) * val, 22)
    })
  }

  generateTextures() {
    // Grass tile
    const grass = this.make.graphics({ add: false })
    grass.fillStyle(0x2d5a27)
    grass.fillRect(0, 0, 64, 64)
    grass.fillStyle(0x3a7a33)
    for (let i = 0; i < 8; i++) {
      grass.fillRect(Math.random() * 56, Math.random() * 56, 4, 8)
    }
    grass.generateTexture('tile_grass', 64, 64)

    // Path tile
    const path = this.make.graphics({ add: false })
    path.fillStyle(0x8b7355)
    path.fillRect(0, 0, 64, 64)
    path.fillStyle(0x9e8866)
    for (let i = 0; i < 6; i++) {
      path.fillCircle(Math.random() * 64, Math.random() * 64, 3)
    }
    path.generateTexture('tile_path', 64, 64)

    // Tower: Archer (green circle)
    const archer = this.make.graphics({ add: false })
    archer.fillStyle(0x27ae60)
    archer.fillCircle(20, 20, 18)
    archer.fillStyle(0x2ecc71)
    archer.fillCircle(20, 20, 12)
    archer.generateTexture('tower_archer', 40, 40)

    // Tower: Mage (blue circle)
    const mage = this.make.graphics({ add: false })
    mage.fillStyle(0x2980b9)
    mage.fillCircle(20, 20, 18)
    mage.fillStyle(0x3498db)
    mage.fillCircle(20, 20, 12)
    mage.generateTexture('tower_mage', 40, 40)

    // Tower: Cannon (red circle)
    const cannon = this.make.graphics({ add: false })
    cannon.fillStyle(0xc0392b)
    cannon.fillCircle(20, 20, 18)
    cannon.fillStyle(0xe74c3c)
    cannon.fillCircle(20, 20, 12)
    cannon.generateTexture('tower_cannon', 40, 40)

    // Tower: Frost (cyan circle)
    const frost = this.make.graphics({ add: false })
    frost.fillStyle(0x0097a7)
    frost.fillCircle(20, 20, 18)
    frost.fillStyle(0x00bcd4)
    frost.fillCircle(20, 20, 12)
    frost.generateTexture('tower_frost', 40, 40)

    // Enemy: basic troll (dark red square)
    const troll = this.make.graphics({ add: false })
    troll.fillStyle(0x8e44ad)
    troll.fillRect(2, 2, 28, 28)
    troll.fillStyle(0xffffff)
    troll.fillRect(8, 8, 4, 4)
    troll.fillRect(20, 8, 4, 4)
    troll.generateTexture('enemy_troll', 32, 32)

    // Enemy: fast goblin (green diamond)
    const goblin = this.make.graphics({ add: false })
    goblin.fillStyle(0x27ae60)
    goblin.fillTriangle(16, 2, 2, 30, 30, 30)
    goblin.generateTexture('enemy_goblin', 32, 32)

    // Enemy: ogre (big brown)
    const ogre = this.make.graphics({ add: false })
    ogre.fillStyle(0x795548)
    ogre.fillRect(0, 0, 36, 36)
    ogre.fillStyle(0xffffff)
    ogre.fillRect(8, 8, 6, 6)
    ogre.fillRect(22, 8, 6, 6)
    ogre.generateTexture('enemy_ogre', 36, 36)

    // Projectile (small yellow dot)
    const proj = this.make.graphics({ add: false })
    proj.fillStyle(0xf1c40f)
    proj.fillCircle(4, 4, 4)
    proj.generateTexture('projectile', 8, 8)

    // Projectile: ice
    const ice = this.make.graphics({ add: false })
    ice.fillStyle(0x00bcd4)
    ice.fillCircle(4, 4, 4)
    ice.generateTexture('projectile_ice', 8, 8)

    // Projectile: cannonball
    const ball = this.make.graphics({ add: false })
    ball.fillStyle(0x333333)
    ball.fillCircle(5, 5, 5)
    ball.generateTexture('projectile_cannon', 10, 10)

    // Tower build spot indicator
    const spot = this.make.graphics({ add: false })
    spot.lineStyle(2, 0xffffff, 0.5)
    spot.strokeCircle(20, 20, 16)
    spot.generateTexture('build_spot', 40, 40)

    // Heart icon for lives
    const heart = this.make.graphics({ add: false })
    heart.fillStyle(0xe94560)
    heart.fillCircle(8, 8, 6)
    heart.fillCircle(18, 8, 6)
    heart.fillTriangle(2, 10, 24, 10, 13, 22)
    heart.generateTexture('heart', 26, 24)

    // Coin icon
    const coin = this.make.graphics({ add: false })
    coin.fillStyle(0xf1c40f)
    coin.fillCircle(8, 8, 8)
    coin.fillStyle(0xf39c12)
    coin.fillCircle(8, 8, 5)
    coin.generateTexture('coin', 16, 16)

    // Button background
    const btn = this.make.graphics({ add: false })
    btn.fillStyle(0xe94560)
    btn.fillRoundedRect(0, 0, 200, 50, 10)
    btn.generateTexture('button', 200, 50)

    // Tower range indicator
    const range = this.make.graphics({ add: false })
    range.lineStyle(1, 0xffffff, 0.3)
    range.strokeCircle(100, 100, 100)
    range.fillStyle(0xffffff, 0.05)
    range.fillCircle(100, 100, 100)
    range.generateTexture('range_indicator', 200, 200)
  }

  create() {
    this.scene.start('MenuScene')
  }
}
