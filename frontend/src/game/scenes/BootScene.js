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

    // Set base path for Phaser's loader to work with GitHub Pages subdirectory
    const basePath = import.meta.env.BASE_URL || '/'
    this.load.setPath(basePath + 'assets')

    // UI
    this.load.image('title_logo', 'ui/TitleLogo_android.png')
    this.load.image('loading_bg', 'ui/LoadingScreen_android.jpg')
    this.load.image('menu_bg', 'ui/frontEndFrame_android.jpg')
    this.load.image('victory_bg', 'ui/victory_android.jpg')
    this.load.image('gameover_bg', 'ui/gameOverFrame_android.jpg')
    this.load.image('back_button', 'ui/backButton.png')
    this.load.image('wood_button', 'ui/woodPanelButton.png')
    this.load.image('map_icon', 'ui/mapIcon.png')
    this.load.image('map_icon_locked', 'ui/mapIconLocked.png')

    // World icons
    for (let i = 1; i <= 12; i++) {
      this.load.image(`world_${i}`, `ui/World Icon ${i}.png`)
    }

    // HUD
    this.load.image('hud_ballista', 'hud/tower_ballista.png')
    this.load.image('hud_cannon', 'hud/tower_cannon.png')
    this.load.image('hud_catapult', 'hud/tower_catapult.png')
    this.load.image('hud_ice', 'hud/tower_ice.png')
    this.load.image('hud_scout', 'hud/tower_scout.png')
    this.load.image('hud_wizard', 'hud/tower_wizard.png')
    this.load.image('hud_gold', 'hud/gold.png')
    this.load.image('hud_gem', 'hud/gem.png')
    this.load.image('hud_health', 'hud/health.png')
    this.load.image('hud_sell', 'hud/sellicon.png')
    this.load.image('hud_upgrade', 'hud/upgradeicon.png')
    this.load.image('hud_range', 'hud/rangeindicator.png')
    this.load.image('hud_ff', 'hud/Fast_Forward.png')
    this.load.image('hud_ff_on', 'hud/Fast_Forward_On.png')
    this.load.image('hud_pause', 'hud/Pause.png')
    this.load.image('hud_play', 'hud/Play.png')
    this.load.image('hud_menu', 'hud/Menu.png')

    // Tower sprites (3 levels for each type)
    this.load.image('tower_ballista', 'towers/ballista/ballista_l1-0.png')
    this.load.image('tower_ballista_2', 'towers/ballista/ballista_l2-0.png')
    this.load.image('tower_ballista_3', 'towers/ballista/ballista_l3-0.png')
    this.load.image('tower_cannon', 'towers/cannon/cannon_l1-0.png')
    this.load.image('tower_cannon_2', 'towers/cannon/cannon_l2-0.png')
    this.load.image('tower_cannon_3', 'towers/cannon/cannon_l3-0.png')
    this.load.image('tower_catapult', 'towers/catapult/catapult_l1-0.png')
    this.load.image('tower_catapult_2', 'towers/catapult/catapult_l2-0.png')
    this.load.image('tower_catapult_3', 'towers/catapult/catapult_l3-0.png')
    this.load.image('tower_scout', 'towers/scout/scout_l1-0.png')
    this.load.image('tower_scout_2', 'towers/scout/scout_l2-0.png')
    this.load.image('tower_scout_3', 'towers/scout/scout_l3-0.png')
    this.load.image('tower_storm', 'towers/storm/storm_l1-0.png')
    this.load.image('tower_storm_2', 'towers/storm/storm_l2-0.png')
    this.load.image('tower_storm_3', 'towers/storm/storm_l3-0.png')
    this.load.image('tower_winter', 'towers/winter/winter_l1-0.png')
    this.load.image('tower_winter_2', 'towers/winter/winter_l2-0.png')
    this.load.image('tower_winter_3', 'towers/winter/winter_l3-0.png')

    // Creep sprites
    this.load.image('creep_troll', 'creeps/troll/troll-0.png')
    this.load.image('creep_goblin', 'creeps/goblin/goblin-0.png')
    this.load.image('creep_ogre', 'creeps/ogre/ogre-0.png')
    this.load.image('creep_orc', 'creeps/orc/orc-0.png')
    this.load.image('creep_slime', 'creeps/slime/slime-0.png')
    this.load.image('creep_gelcube', 'creeps/gelcube/gelcube-0.png')
    this.load.image('creep_beholder', 'creeps/beholder/beholder-0.png')
    this.load.image('creep_dragon', 'creeps/dragon/dragon-0.png')
    this.load.image('creep_giant', 'creeps/giant/giant-0.png')
    this.load.image('creep_rocketgoblin', 'creeps/rocketgoblin/rocketgoblin-0.png')

    // Projectiles
    this.load.image('proj_ballista', 'projectiles/ballista1_projectile-0.png')
    this.load.image('proj_cannon', 'projectiles/ballista1_projectile-0.png')
    this.load.image('proj_catapult', 'projectiles/ballista1_projectile-0.png')

    // Map textures
    this.load.image('map_grass', 'maps/grass_grnd.jpg')
    this.load.image('map_grass_under', 'maps/grass_ugrnd.jpg')
    this.load.image('map_f1', 'maps/f1_grnd.jpg')
    this.load.image('map_f1_under', 'maps/f1_ugrnd.jpg')
    this.load.image('map_f3', 'maps/f3_grnd.jpg')
    this.load.image('map_ice', 'maps/ice_grnd.jpg')
    this.load.image('map_desert', 'maps/desert_grnd.jpg')
    this.load.image('map_platform', 'maps/towerplatform.png')
    this.load.image('map_path', 'maps/pathBrush.png')

    // Music
    this.load.audio('music_farm', 'music/How it Begins (Farm).mp3')
    this.load.audio('music_desert', 'music/Dance Monster (Desert).mp3')
    this.load.audio('music_glacier', 'music/One Sly Move(Glacier).mp3')
    this.load.audio('music_gauntlet', 'music/Rocket(Gauntlet).mp3')

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
