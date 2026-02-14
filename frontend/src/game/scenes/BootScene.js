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

    // === Tower sprites (3 levels each + animation frames) ===
    this.load.image('tower_ballista', 'towers/ballista/ballista_l1-0.png')
    this.load.image('tower_ballista_f1', 'towers/ballista/ballista_l1-1.png')
    this.load.image('tower_ballista_f2', 'towers/ballista/ballista_l1-2.png')
    this.load.image('tower_ballista_2', 'towers/ballista/ballista_l2-0.png')
    this.load.image('tower_ballista_3', 'towers/ballista/ballista_l3-0.png')
    this.load.image('tower_ballista_3_f1', 'towers/ballista/ballista_l3-1.png')
    this.load.image('tower_ballista_3_f2', 'towers/ballista/ballista_l3-2.png')
    this.load.image('tower_ballista_3_f3', 'towers/ballista/ballista_l3-3.png')
    this.load.image('tower_cannon', 'towers/cannon/cannon_l1-0.png')
    this.load.image('tower_cannon_f1', 'towers/cannon/cannon_l1-1.png')
    this.load.image('tower_cannon_2', 'towers/cannon/cannon_l2-0.png')
    this.load.image('tower_cannon_2_f1', 'towers/cannon/cannon_l2-1.png')
    this.load.image('tower_cannon_2_f2', 'towers/cannon/cannon_l2-2.png')
    this.load.image('tower_cannon_3', 'towers/cannon/cannon_l3-0.png')
    this.load.image('tower_cannon_3_f1', 'towers/cannon/cannon_l3-1.png')
    this.load.image('tower_cannon_3_f2', 'towers/cannon/cannon_l3-2.png')
    this.load.image('tower_cannon_3_f3', 'towers/cannon/cannon_l3-3.png')
    this.load.image('tower_catapult', 'towers/catapult/catapult_l1-0.png')
    this.load.image('tower_catapult_f1', 'towers/catapult/catapult_l1-1.png')
    this.load.image('tower_catapult_f2', 'towers/catapult/catapult_l1-2.png')
    this.load.image('tower_catapult_f3', 'towers/catapult/catapult_l1-3.png')
    this.load.image('tower_catapult_f4', 'towers/catapult/catapult_l1-4.png')
    this.load.image('tower_catapult_2', 'towers/catapult/catapult_l2-0.png')
    this.load.image('tower_catapult_2_f1', 'towers/catapult/catapult_l2-1.png')
    this.load.image('tower_catapult_2_f2', 'towers/catapult/catapult_l2-2.png')
    this.load.image('tower_catapult_2_f3', 'towers/catapult/catapult_l2-3.png')
    this.load.image('tower_catapult_3', 'towers/catapult/catapult_l3-0.png')
    this.load.image('tower_catapult_3_f1', 'towers/catapult/catapult_l3-1.png')
    this.load.image('tower_catapult_3_f2', 'towers/catapult/catapult_l3-2.png')
    this.load.image('tower_catapult_3_f3', 'towers/catapult/catapult_l3-3.png')
    this.load.image('tower_scout', 'towers/scout/scout_l1-0.png')
    this.load.image('tower_scout_2', 'towers/scout/scout_l2-0.png')
    this.load.image('tower_scout_3', 'towers/scout/scout_l3-0.png')
    this.load.image('tower_storm', 'towers/storm/storm_l1-0.png')
    this.load.image('tower_storm_2', 'towers/storm/storm_l2-0.png')
    this.load.image('tower_storm_2_f1', 'towers/storm/storm_l2-1.png')
    this.load.image('tower_storm_2_f2', 'towers/storm/storm_l2-2.png')
    this.load.image('tower_storm_3', 'towers/storm/storm_l3-0.png')
    this.load.image('tower_storm_3_f1', 'towers/storm/storm_l3-1.png')
    this.load.image('tower_storm_3_f2', 'towers/storm/storm_l3-2.png')
    this.load.image('tower_winter', 'towers/winter/winter_l1-0.png')
    this.load.image('tower_winter_f1', 'towers/winter/winter_l1-1.png')
    this.load.image('tower_winter_2', 'towers/winter/winter_l2-0.png')
    this.load.image('tower_winter_2_f1', 'towers/winter/winter_l2-1.png')
    this.load.image('tower_winter_3', 'towers/winter/winter_l3-0.png')
    this.load.image('tower_winter_3_f1', 'towers/winter/winter_l3-1.png')

    // Poison gas sprite
    this.load.image('hud_poison_gas', 'hud/poisongas.png')

    // === Creep sprites (static + animation frames) ===
    this.load.image('creep_troll', 'creeps/troll/troll-0.png')
    this.load.image('creep_troll_1', 'creeps/troll/troll-1.png')
    this.load.image('creep_troll_2', 'creeps/troll/troll-2.png')
    this.load.image('creep_goblin', 'creeps/goblin/goblin-0.png')
    this.load.image('creep_goblin_1', 'creeps/goblin/goblin-1.png')
    this.load.image('creep_goblin_2', 'creeps/goblin/goblin-2.png')
    this.load.image('creep_ogre', 'creeps/ogre/ogre-0.png')
    this.load.image('creep_ogre_1', 'creeps/ogre/ogre-1.png')
    this.load.image('creep_ogre_2', 'creeps/ogre/ogre-2.png')
    this.load.image('creep_orc', 'creeps/orc/orc-0.png')
    this.load.image('creep_orc_1', 'creeps/orc/orc-1.png')
    this.load.image('creep_orc_2', 'creeps/orc/orc-2.png')
    this.load.image('creep_orc_3', 'creeps/orc/orc-3.png')
    this.load.image('creep_slime', 'creeps/slime/slime-0.png')
    this.load.image('creep_slime_1', 'creeps/slime/slime-1.png')
    this.load.image('creep_gelcube', 'creeps/gelcube/gelcube-0.png')
    this.load.image('creep_gelcube_1', 'creeps/gelcube/gelcube-1.png')
    this.load.image('creep_beholder', 'creeps/beholder/beholder-0.png')
    this.load.image('creep_beholder_1', 'creeps/beholder/beholder-1.png')
    this.load.image('creep_dragon', 'creeps/dragon/dragon-0.png')
    this.load.image('creep_dragon_1', 'creeps/dragon/dragon-1.png')
    this.load.image('creep_dragon_2', 'creeps/dragon/dragon-2.png')
    this.load.image('creep_giant', 'creeps/giant/giant-0.png')
    this.load.image('creep_rocketgoblin', 'creeps/rocketgoblin/rocketgoblin-0.png')

    // === Underground map textures ===
    this.load.image('map_desert_under', 'maps/desert_ugrnd.jpg')
    this.load.image('map_f1b_under', 'maps/f1b_ugrnd.jpg')
    this.load.image('map_f3_under', 'maps/f3_ugrnd.jpg')
    this.load.image('map_f3night_under', 'maps/f3night_ugrnd.jpg')
    this.load.image('map_ice_under', 'maps/ice_ugrnd.jpg')
    this.load.image('map_lava_under', 'maps/lava_ugrnd.jpg')
    this.load.image('map_mine_under', 'maps/mine_ugrnd.jpg')
    this.load.image('map_sand_under', 'maps/sand_ugrnd.jpg')
    this.load.image('map_underworld_under', 'maps/undrwrld_ugrnd.jpg')

    // === Projectiles ===
    this.load.image('proj_ballista', 'projectiles/ballista1_projectile-0.png')
    this.load.image('proj_ballista_2', 'projectiles/ballista2_projectile-0.png')
    this.load.image('proj_ballista_3', 'projectiles/ballista3_projectile-0.png')
    // Cannon and catapult projectile sprites not available from APK — generated in generateFallbacks()

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
    this.load.image('tower_platform', 'maps/towerplatform.png')
    this.load.image('path_brush', 'maps/pathBrush.png')

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
    this.createAnimations()
    this.scene.start('MenuScene')
  }

  createAnimations() {
    // Tower fire animations
    const towerAnimDefs = [
      { key: 'ballista_fire', frames: ['tower_ballista', 'tower_ballista_f1', 'tower_ballista_f2', 'tower_ballista'], rate: 10 },
      { key: 'ballista_3_fire', frames: ['tower_ballista_3', 'tower_ballista_3_f1', 'tower_ballista_3_f2', 'tower_ballista_3_f3', 'tower_ballista_3'], rate: 10 },
      { key: 'cannon_fire', frames: ['tower_cannon', 'tower_cannon_f1', 'tower_cannon'], rate: 8 },
      { key: 'cannon_2_fire', frames: ['tower_cannon_2', 'tower_cannon_2_f1', 'tower_cannon_2_f2', 'tower_cannon_2'], rate: 8 },
      { key: 'cannon_3_fire', frames: ['tower_cannon_3', 'tower_cannon_3_f1', 'tower_cannon_3_f2', 'tower_cannon_3_f3', 'tower_cannon_3'], rate: 8 },
      { key: 'catapult_fire', frames: ['tower_catapult', 'tower_catapult_f1', 'tower_catapult_f2', 'tower_catapult_f3', 'tower_catapult_f4', 'tower_catapult'], rate: 12 },
      { key: 'catapult_2_fire', frames: ['tower_catapult_2', 'tower_catapult_2_f1', 'tower_catapult_2_f2', 'tower_catapult_2_f3', 'tower_catapult_2'], rate: 12 },
      { key: 'catapult_3_fire', frames: ['tower_catapult_3', 'tower_catapult_3_f1', 'tower_catapult_3_f2', 'tower_catapult_3_f3', 'tower_catapult_3'], rate: 12 },
      { key: 'storm_2_fire', frames: ['tower_storm_2', 'tower_storm_2_f1', 'tower_storm_2_f2', 'tower_storm_2'], rate: 10 },
      { key: 'storm_3_fire', frames: ['tower_storm_3', 'tower_storm_3_f1', 'tower_storm_3_f2', 'tower_storm_3'], rate: 10 },
      { key: 'winter_fire', frames: ['tower_winter', 'tower_winter_f1', 'tower_winter'], rate: 8 },
      { key: 'winter_2_fire', frames: ['tower_winter_2', 'tower_winter_2_f1', 'tower_winter_2'], rate: 8 },
      { key: 'winter_3_fire', frames: ['tower_winter_3', 'tower_winter_3_f1', 'tower_winter_3'], rate: 8 },
    ]
    towerAnimDefs.forEach(def => {
      const validFrames = def.frames.filter(f => this.textures.exists(f))
      if (validFrames.length > 1) {
        this.anims.create({ key: def.key, frames: validFrames.map(f => ({ key: f })), frameRate: def.rate, repeat: 0 })
      }
    })

    // Creep walk animations removed — enemies now glide as static images for cleaner visuals
  }

  generateFallbacks() {
    // Only generate small projectile fallbacks — no gold_deposit/treasure_chest/rune textures
    // (those caused huge broken squares; we use inline graphics instead)
    const proj = this.make.graphics({ add: false })
    proj.fillStyle(0xf1c40f)
    proj.fillCircle(4, 4, 4)
    proj.generateTexture('projectile_default', 8, 8)
    proj.destroy()

    const ice = this.make.graphics({ add: false })
    ice.fillStyle(0x00bcd4)
    ice.fillCircle(4, 4, 4)
    ice.generateTexture('proj_ice', 8, 8)
    ice.destroy()

    const storm = this.make.graphics({ add: false })
    storm.fillStyle(0x9b59b6)
    storm.fillCircle(4, 4, 4)
    storm.generateTexture('proj_storm', 8, 8)
    storm.destroy()

    // Cannon projectile — dark iron cannonball
    const cannon = this.make.graphics({ add: false })
    cannon.fillStyle(0x333333)
    cannon.fillCircle(6, 6, 6)
    cannon.lineStyle(1, 0x555555)
    cannon.strokeCircle(6, 6, 5)
    cannon.generateTexture('proj_cannon', 12, 12)
    cannon.destroy()

    // Catapult projectile — brown boulder
    const catapult = this.make.graphics({ add: false })
    catapult.fillStyle(0x8b6914)
    catapult.fillCircle(8, 8, 7)
    catapult.fillStyle(0xa07828, 0.7)
    catapult.fillCircle(6, 6, 4)
    catapult.lineStyle(1, 0x5a4510)
    catapult.strokeCircle(8, 8, 7)
    catapult.generateTexture('proj_catapult', 16, 16)
    catapult.destroy()

    // Button fallback (only used if wood_button asset fails to load)
    const btn = this.make.graphics({ add: false })
    btn.fillStyle(0xe94560)
    btn.fillRoundedRect(0, 0, 200, 50, 10)
    btn.generateTexture('button', 200, 50)
    btn.destroy()

    // Cell indicator textures — always generate clean ones to avoid corruption from loaded assets
    const cellSize = 64
    const cellOk = this.make.graphics({ add: false })
    cellOk.fillStyle(0x2ecc71, 0.25)
    cellOk.fillRect(2, 2, cellSize - 4, cellSize - 4)
    cellOk.lineStyle(2, 0x2ecc71, 0.5)
    cellOk.strokeRect(2, 2, cellSize - 4, cellSize - 4)
    cellOk.generateTexture('cell_ok', cellSize, cellSize)
    cellOk.destroy()

    const cellNo = this.make.graphics({ add: false })
    cellNo.fillStyle(0xe74c3c, 0.25)
    cellNo.fillRect(2, 2, cellSize - 4, cellSize - 4)
    cellNo.lineStyle(2, 0xe74c3c, 0.5)
    cellNo.strokeRect(2, 2, cellSize - 4, cellSize - 4)
    cellNo.lineBetween(10, 10, cellSize - 10, cellSize - 10)
    cellNo.lineBetween(cellSize - 10, 10, 10, cellSize - 10)
    cellNo.generateTexture('cell_no', cellSize, cellSize)
    cellNo.destroy()

    // Range indicator texture
    const rangeSize = 256
    const rangeGfx = this.make.graphics({ add: false })
    rangeGfx.lineStyle(2, 0x3498db, 0.4)
    rangeGfx.fillStyle(0x3498db, 0.08)
    rangeGfx.fillCircle(rangeSize / 2, rangeSize / 2, rangeSize / 2 - 2)
    rangeGfx.strokeCircle(rangeSize / 2, rangeSize / 2, rangeSize / 2 - 2)
    rangeGfx.generateTexture('range_circle', rangeSize, rangeSize)
    rangeGfx.destroy()
  }
}
