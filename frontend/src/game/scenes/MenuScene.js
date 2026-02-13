import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene')
  }

  create() {
    const cx = this.cameras.main.centerX
    const cy = this.cameras.main.centerY

    // Title
    this.add.text(cx, cy - 120, "TOWERS N' TROLLS", {
      fontSize: '48px',
      fontFamily: 'Georgia, serif',
      color: '#e94560',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5)

    this.add.text(cx, cy - 65, 'Tower Defense', {
      fontSize: '20px',
      color: '#888',
    }).setOrigin(0.5)

    // Play button
    const playBtn = this.add.image(cx, cy + 20, 'button').setInteractive({ useHandCursor: true })
    this.add.text(cx, cy + 20, 'PLAY', {
      fontSize: '22px',
      fontWeight: 'bold',
      color: '#fff',
    }).setOrigin(0.5)

    playBtn.on('pointerover', () => playBtn.setTint(0xcc3350))
    playBtn.on('pointerout', () => playBtn.clearTint())
    playBtn.on('pointerdown', () => {
      this.scene.start('LevelSelectScene')
    })

    // Credits
    this.add.text(cx, cy + 120, 'Inspired by Towers N\' Trolls by Ember Entertainment', {
      fontSize: '12px',
      color: '#555',
    }).setOrigin(0.5)

    // Version
    this.add.text(cx, this.cameras.main.height - 20, 'v1.0.0 | Web Edition', {
      fontSize: '11px',
      color: '#444',
    }).setOrigin(0.5)
  }
}
