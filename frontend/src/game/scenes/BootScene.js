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

    const basePath = import.meta.env.BASE_URL || '/'
    this.load.setPath(basePath + 'assets')

    // === UI ===
    this.load.image('title_logo', 'ui/TitleLogo_android.png')
    this.load.image('loading_bg', 'ui/LoadingScreen_android.jpg')
    this.load.image('menu_bg', 'ui/frontEndFrame_android.jpg')
    this.load.image('victory_bg', 'ui/victory_android.jpg')
    this.load.image('gameover_bg', 'ui/gameOverFrame_android.jpg')
    this.load.image('back_button', 'ui/backButton.png')
    this.load.image('wood_button', 'ui/woodPanelButton.png')
    this.load.image('map_icon', 'ui/mapIcon.png')
    this.load.image('map_icon_locked', 'ui/mapIconLocked.png')

    // World icons (1-12)
    for (let i = 1; i <= 12; i++) {
      this.load.image(`world_${i}`, `ui/World Icon ${i}.png`)
    }

    // === HUD ===
    this.load.image('hud_ballista', 'hud/tower_ballista.png')
    this.load.image('hud_cannon', 'hud/tower_cannon.png')
    this.load.image('hud_catapult', 'hud/tower_catapult.png')
    this.load.image('hud_ice', 'hud/tower_ice.png')
    this.load.image('hud_scout', 'hud/tower_scout.png')
    this.load.image('hud_wizard', 'hud/tower_wizard.png')
    this.load.image('hud_gold', 'hud/gold.png')
    this.load.image('hud_gem', 'hud/gem.png')
    this.load.image('hud_gem_small', 'hud/gemSmall.png')
    this.load.image('hud_health', 'hud/health.png')
    this.load.image('hud_sell', 'hud/sellicon.png')
    this.load.image('hud_upgrade', 'hud/upgradeicon.png')
    this.load.image('hud_repair', 'hud/repairicon.png')
    this.load.image('hud_range', 'hud/rangeindicator.png')
    this.load.image('hud_ff', 'hud/Fast_Forward.png')
    this.load.image('hud_ff_on', 'hud/Fast_Forward_On.png')
    this.load.image('hud_pause', 'hud/Pause.png')
    this.load.image('hud_play', 'hud/Play.png')
    this.load.image('hud_menu', 'hud/Menu.png')
    this.load.image('hud_coin', 'hud/goldcoinsingle.png')
    this.load.image('hud_checkmark', 'hud/checkMarkSmall.png')
    this.load.image('hud_rune_damage', 'hud/q_runedamage.png')
    this.load.image('hud_rune_speed', 'hud/q_runefast.png')
    this.load.image('hud_rune_range', 'hud/q_runerange.png')
    this.load.image('hud_glow_cell', 'hud/glowingcellindicator-0.png')
    this.load.image('hud_no_cell', 'hud/nocellindicator-0.png')
    this.load.image('hud_target_arrow', 'hud/targetarrow-0.png')

    // === Tower sprites (3 levels each) ===
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

    // === Creep sprites ===
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

    // === Projectiles ===
    this.load.image('proj_ballista', 'projectiles/ballista1_projectile-0.png')
    this.load.image('proj_ballista_2', 'projectiles/ballista2_projectile-0.png')
    this.load.image('proj_ballista_3', 'projectiles/ballista3_projectile-0.png')
    this.load.image('proj_cannon', 'projectiles/ballista1_projectile-0.png')
    this.load.image('proj_catapult', 'projectiles/ballista1_projectile-0.png')

    // === Map textures ===
    this.load.image('map_grass', 'maps/grass_grnd.jpg')
    this.load.image('map_grass_under', 'maps/grass_ugrnd.jpg')
    this.load.image('map_f1', 'maps/f1_grnd.jpg')
    this.load.image('map_f1_under', 'maps/f1_ugrnd.jpg')
    this.load.image('map_f1b', 'maps/f1b_grnd.jpg')
    this.load.image('map_f2', 'maps/F2_Grnd.jpg')
    this.load.image('map_f3', 'maps/f3_grnd.jpg')
    this.load.image('map_f3night', 'maps/f3night_grnd.jpg')
    this.load.image('map_ice', 'maps/ice_grnd.jpg')
    this.load.image('map_desert', 'maps/desert_grnd.jpg')
    this.load.image('map_sand', 'maps/sand_grnd.jpg')
    this.load.image('map_underworld', 'maps/undrwrld_grnd.jpg')
    this.load.image('map_mine', 'maps/mine_grnd.jpg')
    this.load.image('map_lava', 'maps/lava_grnd.jpg')
    this.load.image('map_f1night', 'maps/f1night.jpg')
    this.load.image('map_platform', 'maps/towerplatform.png')
    this.load.image('map_path', 'maps/pathBrush.png')

    // === Music (7 tracks) ===
    this.load.audio('music_farm', 'music/How it Begins (Farm).mp3')
    this.load.audio('music_desert', 'music/Dance Monster (Desert).mp3')
    this.load.audio('music_glacier', 'music/One Sly Move(Glacier).mp3')
    this.load.audio('music_gauntlet', 'music/Rocket(Gauntlet).mp3')
    this.load.audio('music_underworld', 'music/Variation on Egmont (Underworld).mp3')
    this.load.audio('music_menu', 'music/Chipper Doodle v2.mp3')
    this.load.audio('music_funk', 'music/smallFunk.mp3')

    // === Sound Effects - Towers ===
    this.load.audio('sfx_ballista1', 'audio/towers/ballista1.wav')
    this.load.audio('sfx_ballista2', 'audio/towers/ballista2.wav')
    this.load.audio('sfx_ballista3', 'audio/towers/ballista3.wav')
    this.load.audio('sfx_cannon1', 'audio/towers/cannon1.wav')
    this.load.audio('sfx_cannon2', 'audio/towers/cannon2.wav')
    this.load.audio('sfx_catapult_shoot', 'audio/towers/catapultshoot.wav')
    this.load.audio('sfx_catapult_impact', 'audio/towers/catapultimpact.wav')
    this.load.audio('sfx_ice_shoot', 'audio/towers/iceshoot1.wav')
    this.load.audio('sfx_ice_hit', 'audio/towers/icehit1.wav')
    this.load.audio('sfx_lightning', 'audio/towers/lightning.wav')
    this.load.audio('sfx_scout1', 'audio/towers/scout1.wav')
    this.load.audio('sfx_scout2', 'audio/towers/scout2.wav')
    this.load.audio('sfx_tower_menu', 'audio/towers/tower_menu.wav')
    this.load.audio('sfx_tower_placed', 'audio/towers/tower_placed.wav')
    this.load.audio('sfx_tower_sell', 'audio/towers/tower_sell.wav')
    this.load.audio('sfx_tower_upgrade', 'audio/towers/tower_upgrade.wav')

    // === Sound Effects - Misc ===
    this.load.audio('sfx_beep', 'audio/misc/beep.wav')
    this.load.audio('sfx_chime1', 'audio/misc/chime1.wav')
    this.load.audio('sfx_chime2', 'audio/misc/chime2.wav')
    this.load.audio('sfx_coin_accumulate', 'audio/misc/coinaccumulate1.wav')
    this.load.audio('sfx_coin_explosion', 'audio/misc/coinexplosion1.wav')
    this.load.audio('sfx_coin_pickup', 'audio/misc/coinpickup1.wav')
    this.load.audio('sfx_dig', 'audio/misc/dig.wav')
    this.load.audio('sfx_fuse', 'audio/misc/fuseburning.wav')
    this.load.audio('sfx_gold_explosion', 'audio/misc/goldexplosion1.wav')
    this.load.audio('sfx_gold_star', 'audio/misc/goldstar.wav')
    this.load.audio('sfx_cheer', 'audio/misc/longcheer.wav')
    this.load.audio('sfx_explosion', 'audio/misc/loudexplosion.wav')
    this.load.audio('sfx_mine_explode', 'audio/misc/mineexplode.wav')
    this.load.audio('sfx_rocket_launch', 'audio/misc/rocketlaunch.wav')

    // === Sound Effects - Stingers ===
    this.load.audio('sfx_base_hit', 'audio/stingers/basehit.wav')
    this.load.audio('sfx_level_finished', 'audio/stingers/levelfinishedstinger.wav')
    this.load.audio('sfx_you_lost', 'audio/stingers/youlost.wav')
  }

  create() {
    this.generateFallbacks()
    this.scene.start('MenuScene')
  }

  generateFallbacks() {
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

    // Button fallback
    const btn = this.make.graphics({ add: false })
    btn.fillStyle(0xe94560)
    btn.fillRoundedRect(0, 0, 200, 50, 10)
    btn.generateTexture('button', 200, 50)

    // Rune fallback textures
    const runeDmg = this.make.graphics({ add: false })
    runeDmg.fillStyle(0xe74c3c, 0.8)
    runeDmg.fillCircle(16, 16, 16)
    runeDmg.lineStyle(2, 0xff0000)
    runeDmg.strokeCircle(16, 16, 16)
    runeDmg.generateTexture('rune_damage', 32, 32)

    const runeSpd = this.make.graphics({ add: false })
    runeSpd.fillStyle(0x3498db, 0.8)
    runeSpd.fillCircle(16, 16, 16)
    runeSpd.lineStyle(2, 0x2980b9)
    runeSpd.strokeCircle(16, 16, 16)
    runeSpd.generateTexture('rune_speed', 32, 32)

    const runeRng = this.make.graphics({ add: false })
    runeRng.fillStyle(0x2ecc71, 0.8)
    runeRng.fillCircle(16, 16, 16)
    runeRng.lineStyle(2, 0x27ae60)
    runeRng.strokeCircle(16, 16, 16)
    runeRng.generateTexture('rune_range', 32, 32)

    // Gold deposit fallback
    const goldDep = this.make.graphics({ add: false })
    goldDep.fillStyle(0xf1c40f, 0.9)
    goldDep.fillRoundedRect(4, 4, 24, 24, 4)
    goldDep.lineStyle(2, 0xd4ac0d)
    goldDep.strokeRoundedRect(4, 4, 24, 24, 4)
    goldDep.generateTexture('gold_deposit', 32, 32)

    // Chest fallback
    const chest = this.make.graphics({ add: false })
    chest.fillStyle(0x8b4513, 0.9)
    chest.fillRoundedRect(2, 6, 28, 20, 3)
    chest.fillStyle(0xf1c40f, 0.8)
    chest.fillRect(13, 10, 6, 8)
    chest.generateTexture('treasure_chest', 32, 32)
  }
}
