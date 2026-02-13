import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload() {
    const w = this.cameras.main.width
    const h = this.cameras.main.height

    // Loading bar
    const bar = this.add.graphics()
    const box = this.add.graphics()
    box.fillStyle(0x222222, 0.8)
    box.fillRect(w / 4, h / 2 - 15, w / 2, 30)

    this.load.on('progress', (val) => {
      bar.clear()
      bar.fillStyle(0xe94560, 1)
      bar.fillRect(w / 4 + 4, h / 2 - 11, (w / 2 - 8) * val, 22)
    })

    const base = 'assets'

    // UI
    this.load.image('title_logo', `${base}/ui/TitleLogo_android.png`)
    this.load.image('loading_bg', `${base}/ui/LoadingScreen_android.jpg`)
    this.load.image('menu_bg', `${base}/ui/frontEndFrame_android.jpg`)
    this.load.image('victory_bg', `${base}/ui/victory_android.jpg`)
    this.load.image('gameover_bg', `${base}/ui/gameOverFrame_android.jpg`)
    this.load.image('back_button', `${base}/ui/backButton.png`)
    this.load.image('wood_button', `${base}/ui/woodPanelButton.png`)
    this.load.image('map_icon', `${base}/ui/mapIcon.png`)
    this.load.image('map_icon_locked', `${base}/ui/mapIconLocked.png`)

    // World icons
    for (let i = 1; i <= 12; i++) {
      this.load.image(`world_${i}`, `${base}/ui/World Icon ${i}.png`)
    }

    // HUD
    this.load.image('hud_ballista', `${base}/hud/tower_ballista.png`)
    this.load.image('hud_cannon', `${base}/hud/tower_cannon.png`)
    this.load.image('hud_catapult', `${base}/hud/tower_catapult.png`)
    this.load.image('hud_ice', `${base}/hud/tower_ice.png`)
    this.load.image('hud_scout', `${base}/hud/tower_scout.png`)
    this.load.image('hud_wizard', `${base}/hud/tower_wizard.png`)
    this.load.image('hud_gold', `${base}/hud/gold.png`)
    this.load.image('hud_gem', `${base}/hud/gem.png`)
    this.load.image('hud_health', `${base}/hud/health.png`)
    this.load.image('hud_sell', `${base}/hud/sellicon.png`)
    this.load.image('hud_upgrade', `${base}/hud/upgradeicon.png`)
    this.load.image('hud_range', `${base}/hud/rangeindicator.png`)
    this.load.image('hud_ff', `${base}/hud/Fast_Forward.png`)
    this.load.image('hud_ff_on', `${base}/hud/Fast_Forward_On.png`)
    this.load.image('hud_pause', `${base}/hud/Pause.png`)
    this.load.image('hud_play', `${base}/hud/Play.png`)
    this.load.image('hud_menu', `${base}/hud/Menu.png`)

    // Tower sprites (level 1 for each)
    this.load.image('tower_ballista', `${base}/towers/ballista/ballista_l1-0.png`)
    this.load.image('tower_ballista_2', `${base}/towers/ballista/ballista_l2-0.png`)
    this.load.image('tower_ballista_3', `${base}/towers/ballista/ballista_l3-0.png`)
    this.load.image('tower_cannon', `${base}/towers/cannon/cannon_l1-0.png`)
    this.load.image('tower_cannon_2', `${base}/towers/cannon/cannon_l2-0.png`)
    this.load.image('tower_cannon_3', `${base}/towers/cannon/cannon_l3-0.png`)
    this.load.image('tower_catapult', `${base}/towers/catapult/catapult_l1-0.png`)
    this.load.image('tower_catapult_2', `${base}/towers/catapult/catapult_l2-0.png`)
    this.load.image('tower_catapult_3', `${base}/towers/catapult/catapult_l3-0.png`)
    this.load.image('tower_scout', `${base}/towers/scout/scout_l1-0.png`)
    this.load.image('tower_scout_2', `${base}/towers/scout/scout_l2-0.png`)
    this.load.image('tower_scout_3', `${base}/towers/scout/scout_l3-0.png`)
    this.load.image('tower_storm', `${base}/towers/storm/storm_l1-0.png`)
    this.load.image('tower_storm_2', `${base}/towers/storm/storm_l2-0.png`)
    this.load.image('tower_storm_3', `${base}/towers/storm/storm_l3-0.png`)
    this.load.image('tower_winter', `${base}/towers/winter/winter_l1-0.png`)
    this.load.image('tower_winter_2', `${base}/towers/winter/winter_l2-0.png`)
    this.load.image('tower_winter_3', `${base}/towers/winter/winter_l3-0.png`)

    // Creep sprites
    this.load.image('creep_troll', `${base}/creeps/troll/troll-0.png`)
    this.load.image('creep_goblin', `${base}/creeps/goblin/goblin-0.png`)
    this.load.image('creep_ogre', `${base}/creeps/ogre/ogre-0.png`)
    this.load.image('creep_orc', `${base}/creeps/orc/orc-0.png`)
    this.load.image('creep_slime', `${base}/creeps/slime/slime-0.png`)
    this.load.image('creep_gelcube', `${base}/creeps/gelcube/gelcube-0.png`)
    this.load.image('creep_beholder', `${base}/creeps/beholder/beholder-0.png`)
    this.load.image('creep_dragon', `${base}/creeps/dragon/dragon-0.png`)
    this.load.image('creep_giant', `${base}/creeps/giant/giant-0.png`)
    this.load.image('creep_rocketgoblin', `${base}/creeps/rocketgoblin/rocketgoblin-0.png`)

    // Projectiles
    this.load.image('proj_ballista', `${base}/projectiles/ballista1_projectile-0.png`)
    this.load.image('proj_cannon', `${base}/projectiles/cannon1_projectile-0.png`)
    this.load.image('proj_catapult', `${base}/projectiles/catapult1_projectile-0.png`)

    // Map textures
    this.load.image('map_grass', `${base}/maps/grass_grnd.jpg`)
    this.load.image('map_grass_under', `${base}/maps/grass_ugrnd.jpg`)
    this.load.image('map_f1', `${base}/maps/f1_grnd.jpg`)
    this.load.image('map_f1_under', `${base}/maps/f1_ugrnd.jpg`)
    this.load.image('map_f3', `${base}/maps/f3_grnd.jpg`)
    this.load.image('map_ice', `${base}/maps/ice_grnd.jpg`)
    this.load.image('map_desert', `${base}/maps/desert_grnd.jpg`)
    this.load.image('map_platform', `${base}/maps/towerplatform.png`)
    this.load.image('map_path', `${base}/maps/pathBrush.png`)

    // Music
    this.load.audio('music_farm', `${base}/music/How it Begins (Farm).mp3`)
    this.load.audio('music_desert', `${base}/music/Dance Monster (Desert).mp3`)
    this.load.audio('music_glacier', `${base}/music/One Sly Move(Glacier).mp3`)
    this.load.audio('music_gauntlet', `${base}/music/Rocket(Gauntlet).mp3`)

    // Generate fallback textures for anything that might be missing
    this.generateFallbacks()
  }

  generateFallbacks() {
    // Simple colored circle fallback for projectiles that might not load
    const proj = this.make.graphics({ add: false })
    proj.fillStyle(0xf1c40f)
    proj.fillCircle(4, 4, 4)
    proj.generateTexture('projectile_default', 8, 8)

    const ice = this.make.graphics({ add: false })
    ice.fillStyle(0x00bcd4)
    ice.fillCircle(4, 4, 4)
    ice.generateTexture('proj_ice', 8, 8)

    const storm = this.make.graphics({ add: false })
    storm.fillStyle(0x9b59b6)
    storm.fillCircle(4, 4, 4)
    storm.generateTexture('proj_storm', 8, 8)

    // Range indicator
    const range = this.make.graphics({ add: false })
    range.lineStyle(1, 0xffffff, 0.3)
    range.strokeCircle(100, 100, 100)
    range.fillStyle(0xffffff, 0.05)
    range.fillCircle(100, 100, 100)
    range.generateTexture('range_indicator', 200, 200)

    // Button
    const btn = this.make.graphics({ add: false })
    btn.fillStyle(0xe94560)
    btn.fillRoundedRect(0, 0, 200, 50, 10)
    btn.generateTexture('button', 200, 50)

    // Path tile fallback
    const path = this.make.graphics({ add: false })
    path.fillStyle(0x8b7355)
    path.fillRect(0, 0, 64, 64)
    path.generateTexture('tile_path', 64, 64)

    // Grass tile fallback
    const grass = this.make.graphics({ add: false })
    grass.fillStyle(0x2d5a27)
    grass.fillRect(0, 0, 64, 64)
    grass.generateTexture('tile_grass', 64, 64)
  }

  create() {
    this.scene.start('MenuScene')
  }
}
