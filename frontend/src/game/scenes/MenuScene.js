import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene')
  }

  create() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height
    const cx = w / 2
    const cy = h / 2

    // Background
    if (this.textures.exists('menu_bg')) {
      const bg = this.add.image(cx, cy, 'menu_bg')
      bg.setDisplaySize(w, h)
    }

    // Title logo
    if (this.textures.exists('title_logo')) {
      this.add.image(cx, cy - 100, 'title_logo').setScale(0.5)
    } else {
      this.add.text(cx, cy - 120, "TOWERS N' TROLLS", {
        fontSize: '48px',
        fontFamily: 'Georgia, serif',
        color: '#e94560',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5)
    }

    // Play button
    const playBtn = this.add.image(cx, cy + 40, 'button').setInteractive({ useHandCursor: true })
    this.add.text(cx, cy + 40, 'PLAY', {
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#fff',
    }).setOrigin(0.5)

    playBtn.on('pointerover', () => playBtn.setTint(0xcc3350))
    playBtn.on('pointerout', () => playBtn.clearTint())
    playBtn.on('pointerdown', () => {
      this.scene.start('LevelSelectScene')
    })

    // Credits
    this.add.text(cx, cy + 140, 'Inspired by Towers N\' Trolls by Ember Entertainment', {
      fontSize: '12px',
      color: '#aaa',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5)

    this.add.text(cx, h - 20, 'v1.0.0 | Web Edition', {
      fontSize: '11px',
      color: '#666',
      stroke: '#000',
      strokeThickness: 1,
    }).setOrigin(0.5)
  }
}
