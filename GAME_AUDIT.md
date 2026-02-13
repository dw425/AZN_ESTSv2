# Towers N' Trolls Web Edition — Full Game Audit & Fix Tracker

**Created**: 2026-02-12 | **Canvas**: 960x640 Phaser.js 3 | **Deploy**: GitHub Pages (dw425/AZN_ESTSv2)

---

## CRITICAL BUGS (from user visual testing)

| # | Issue | Root Cause | Status |
|---|-------|-----------|--------|
| C1 | Generated fallback textures render as HUGE broken squares (gold_deposit, treasure_chest) | `this.make.graphics().generateTexture()` produces corrupt textures in Phaser 3 | FIXED (Pass 1) |
| C2 | Castle visual at exit is crude brown rectangles | GameScene.js drawMap() uses raw fillRect | FIXED (Pass 1) — uses hud_health icon |
| C3 | Level select cards overlap, title clipped at top | LevelSelectScene.js card sizing too large for 5x4 grid | FIXED (Pass 1) — dynamic sizing |
| C4 | Difficulty popup text overlaps with stars and descriptions | LevelSelectScene.js showDifficultyPopup() spacing too tight | FIXED (Pass 1) — 42px spacing |
| C5 | Game freezes/crashes repeatedly | Scene transitions don't clean up; music re-creates on revisit | FIXED (Pass 1) — shutdown handlers |
| C6 | Menu causes game to freeze | MenuScene.js creates new music instance every visit | FIXED (Pass 1) — music dedup |
| C7 | Back commands don't work | Multiple scenes may have stale references or navigation issues | FIXED (Pass 1) — all nav verified |
| C8 | Path rendering is wrong / visually broken | Map bg may not align with grid; no path indicators shown | FIXED (Pass 1) — removed overlays |
| C9 | Gold mine objects render as broken squares | Uses `gold_deposit` generated texture (corrupt) | FIXED (Pass 1) — uses hud_coin |
| C10 | Overall level visuals not right | Combination of C1, C2, C8, C9 | FIXED (Pass 1) |

---

## SCREEN-BY-SCREEN CHECKLIST

### Screen 1: BootScene (Loading)
| # | Element | Expected | Status |
|---|---------|----------|--------|
| 1.1 | Loading bar renders | Red bar fills across center | UNTESTED |
| 1.2 | All 152 assets load without 404s | No console errors | UNTESTED |
| 1.3 | generateFallbacks() creates valid textures | Small colored shapes, not huge broken squares | BROKEN |
| 1.4 | createAnimations() registers all anims | 13 tower + 8 creep anims created | UNTESTED |
| 1.5 | Transitions to MenuScene on complete | Automatic after create() | UNTESTED |

### Screen 2: MenuScene (Main Menu)
| # | Element | Expected | Status |
|---|---------|----------|--------|
| 2.1 | Background image (menu_bg) | Full-screen frontEndFrame_android.jpg | UNTESTED |
| 2.2 | Title logo (title_logo) | TitleLogo_android.png centered, scaled 0.5 | UNTESTED |
| 2.3 | PLAY button uses wood_button | woodPanelButton.png, 180x55 | UNTESTED |
| 2.4 | PLAY text overlaid on button | White "PLAY" centered on wood button | UNTESTED |
| 2.5 | PLAY hover tint | Golden tint on hover | UNTESTED |
| 2.6 | PLAY navigates to LevelSelect | Clean scene transition, no freeze | BROKEN |
| 2.7 | STATS button works | Navigates to StatsScene | UNTESTED |
| 2.8 | Menu music plays (music_menu) | Loops at 0.3 vol, ONE instance only | BROKEN |
| 2.9 | Music stops on scene exit | No overlapping music | BROKEN |
| 2.10 | No freeze on repeated visits | Enter/exit menu 5+ times without crash | BROKEN |
| 2.11 | Credits + version text visible | Bottom of screen | UNTESTED |

### Screen 3: LevelSelectScene
| # | Element | Expected | Status |
|---|---------|----------|--------|
| 3.1 | Background + overlay | loading_bg tinted + 50% dark overlay | UNTESTED |
| 3.2 | Title "SELECT LEVEL" | 28px, fully visible, NOT clipped | BROKEN |
| 3.3 | Gem count display (top right) | Gem icon + count | UNTESTED |
| 3.4 | Level cards layout (5x4 grid) | Cards don't overlap, proper spacing within 960x640 | BROKEN |
| 3.5 | Card sizing fits viewport | Cards + gaps fit between title and bottom buttons | BROKEN |
| 3.6 | map_icon on unlocked cards | Stone tablet image | UNTESTED |
| 3.7 | map_icon_locked on locked cards | Greyed tablet | UNTESTED |
| 3.8 | World icons on cards | world_1 through world_12 images | UNTESTED |
| 3.9 | Level names readable | 11px text below icon | UNTESTED |
| 3.10 | Stars on completed levels | Gold stars displayed | UNTESTED |
| 3.11 | Click unlocked level opens popup | Difficulty popup appears centered | UNTESTED |
| 3.12 | Difficulty popup: no text overlap | 4 options with proper spacing | BROKEN |
| 3.13 | Difficulty popup: stars per difficulty | Stars shown next to each option | UNTESTED |
| 3.14 | Difficulty popup: descriptions | Right-aligned, readable | BROKEN |
| 3.15 | Popup close button works | "X" closes popup | UNTESTED |
| 3.16 | Pagination arrows work | Navigate between pages | UNTESTED |
| 3.17 | Page indicator text | "Page 1 / 2" | UNTESTED |
| 3.18 | Back button to MenuScene | back_button image, works reliably | BROKEN |
| 3.19 | Shop button to ShopScene | Purple "Shop" text | UNTESTED |

### Screen 4: ShopScene (Upgrades)
| # | Element | Expected | Status |
|---|---------|----------|--------|
| 4.1 | Background + overlay | loading_bg tinted purple + dark overlay | UNTESTED |
| 4.2 | Title "UPGRADE SHOP" | 28px purple | UNTESTED |
| 4.3 | Gem display | Current gem count | UNTESTED |
| 4.4 | 13 upgrade cards in 3-col grid | Cards fit, no overlap, within 960x640 | UNTESTED |
| 4.5 | Each card has HUD icon | Icon images render | UNTESTED |
| 4.6 | Name + description per card | Correct text | UNTESTED |
| 4.7 | Level indicator | "Lv 0/5" etc. | UNTESTED |
| 4.8 | Buy button with cost | Purple cost, clickable if affordable | UNTESTED |
| 4.9 | Purchase deducts gems | Scene refreshes with updated data | UNTESTED |
| 4.10 | Maxed upgrades show "MAX" | Green MAX label | UNTESTED |
| 4.11 | Back button to LevelSelect | Works reliably | UNTESTED |

### Screen 5: StatsScene
| # | Element | Expected | Status |
|---|---------|----------|--------|
| 5.1 | Background + overlay | loading_bg tinted + dark overlay | UNTESTED |
| 5.2 | Title "PLAYER STATS" | 28px gold | UNTESTED |
| 5.3 | 8 stat rows with separators | Proper layout, readable | UNTESTED |
| 5.4 | Personal bests section | Top 5 scores (not [object Object]) | FIXED |
| 5.5 | Back button to MenuScene | Works reliably | UNTESTED |

### Screen 6: GameScene (Gameplay)
| # | Element | Expected | Status |
|---|---------|----------|--------|
| 6.1 | Map background | Full-screen map texture, crisp | UNTESTED |
| 6.2 | Spawn portal | Green glowing ring with pulse | UNTESTED |
| 6.3 | Base castle at exit | Clean visual, NOT crude rectangles | BROKEN |
| 6.4 | Rune tiles | 28x28 hud_rune_* icons with type letter | UNTESTED |
| 6.5 | Gold deposits | Small clean icon, NOT broken square | BROKEN |
| 6.6 | Treasure chests | Small clean icon, NOT broken square | BROKEN |
| 6.7 | HUD bar (top) | Black bar: gold/lives/wave/gems/kills | UNTESTED |
| 6.8 | HUD icons render | Gold, health, gem sprites | UNTESTED |
| 6.9 | Speed controls | Play/FF/Pause buttons with HUD icons | UNTESTED |
| 6.10 | Menu button | Top-right, opens pause menu | UNTESTED |
| 6.11 | Build panel (bottom) | 6 tower icons with names/costs | UNTESTED |
| 6.12 | Tower icons | hud_ballista through hud_wizard | UNTESTED |
| 6.13 | Weapon bar | Keg/Mine/Gas with charge counts | UNTESTED |
| 6.14 | Start Wave button | Centered, clickable, updates per wave | UNTESTED |
| 6.15 | Tower placement | Click cell -> tower appears with pop animation | UNTESTED |
| 6.16 | Tower sprites per type/level | Correct texture swaps on upgrade | UNTESTED |
| 6.17 | Tower fire animation | Sprite frame anim plays on shot | UNTESTED |
| 6.18 | Tower menu (click tower) | Upgrade/Repair/Sell + icons | UNTESTED |
| 6.19 | Range indicator | Circle around selected tower | UNTESTED |
| 6.20 | Cell hover indicator | Green glow / red X | UNTESTED |
| 6.21 | Enemy spawning | Enemies appear at portal | UNTESTED |
| 6.22 | Enemy sprites | Correct per type | UNTESTED |
| 6.23 | Enemy walk animation | Animated for types with frames | UNTESTED |
| 6.24 | Enemy HP bars | Small bars, update on damage | UNTESTED |
| 6.25 | Enemy path following | Smooth waypoint movement | UNTESTED |
| 6.26 | Projectile rendering | Small 10x10 sprites | UNTESTED |
| 6.27 | Projectile tracking | Follow target enemy | UNTESTED |
| 6.28 | Damage numbers | Float up and fade | UNTESTED |
| 6.29 | Splash damage visual | Circle explosion | UNTESTED |
| 6.30 | Ice slow effect | Blue tint on slowed enemies | UNTESTED |
| 6.31 | Chain lightning (storm) | Purple lines between chained enemies | UNTESTED |
| 6.32 | Gem drops | Small gem sprites from killed enemies | UNTESTED |
| 6.33 | Gem collection | Click or auto-collect | UNTESTED |
| 6.34 | Gold deposit mining | Build adjacent -> +50 gold, sprite removed | UNTESTED |
| 6.35 | Chest opening | Build adjacent -> +75 gold, sprite removed | UNTESTED |
| 6.36 | Boss wave warning | Red text "BOSS APPROACHES!" | UNTESTED |
| 6.37 | Boss name plate | Red text above boss sprite | UNTESTED |
| 6.38 | Death effect particles | Burst on enemy death | UNTESTED |
| 6.39 | Slime splitting | Baby slimes spawn | UNTESTED |
| 6.40 | Wave countdown | Auto-start timer, early-start bonus | UNTESTED |
| 6.41 | Pause menu | Overlay with Resume/Restart/Quit | UNTESTED |
| 6.42 | Victory screen | Green "VICTORY!" + stars + stats + buttons | UNTESTED |
| 6.43 | Defeat screen | Red "DEFEAT" + quote + stats + buttons | UNTESTED |
| 6.44 | Victory/Defeat buttons work | Menu, Next, Retry all navigate correctly | UNTESTED |
| 6.45 | Music plays | Level-appropriate track | UNTESTED |
| 6.46 | SFX play | Tower fire, coin, explosion sounds | UNTESTED |
| 6.47 | Tutorial popups | Slide in/out notifications | UNTESTED |
| 6.48 | No crash after 3+ levels | Memory stable, no freezes | BROKEN |

---

## GENERATED FALLBACK TEXTURES (ROOT CAUSE OF VISUAL BUGS)

Created in `BootScene.generateFallbacks()` using `this.make.graphics()`:

| Key | Size | Used By | Problem |
|-----|------|---------|---------|
| projectile_default | 8x8 | Projectile fallback | May render oversized |
| proj_ice | 8x8 | Winter tower projectile | May render oversized |
| proj_storm | 8x8 | Storm tower projectile | May render oversized |
| range_indicator | 200x200 | Tower range circle | Should use hud_range asset instead |
| button | 200x50 | Fallback only | Only used if wood_button fails to load |
| rune_damage | 32x32 | NEVER USED | Code uses hud_rune_damage — DELETE |
| rune_speed | 32x32 | NEVER USED | Code uses hud_rune_speed — DELETE |
| rune_range | 32x32 | NEVER USED | Code uses hud_rune_range — DELETE |
| gold_deposit | 32x32 | drawMap() deposits | RENDERS AS HUGE BROKEN SQUARE |
| treasure_chest | 32x32 | drawMap() chests | RENDERS AS HUGE BROKEN SQUARE |

**FIX**: Remove gold_deposit, treasure_chest, rune_* generated textures entirely. Use inline graphics only. Use hud_range (rangeindicator.png) for range circle.

---

## 20-ITERATION FIX PLAN

### Iteration 1: Remove broken generated textures
- Delete gold_deposit, treasure_chest, rune_* from generateFallbacks()
- Change drawMap() to always use inline graphics for deposits/chests (remove textures.exists checks)
- Use hud_range asset for range indicator instead of generated range_indicator
- Verify projectile fallback textures are small (8x8)
- Build + deploy

### Iteration 2: Fix castle visual at exit
- Replace crude fillRect castle with clean minimal design
- Use hud_health or unicode shield with proper styling
- Keep it small and unobtrusive
- Build + deploy

### Iteration 3: Fix LevelSelectScene layout — card sizing
- Reduce card dimensions and gap to fit 5x4 within viewport
- Ensure margins: top ~65px (title), bottom ~70px (buttons), sides ~55px (arrows)
- Calculate proper cardW/cardH/gap from available space
- Build + deploy

### Iteration 4: Fix LevelSelectScene — title and text
- Ensure "SELECT LEVEL" title is fully visible (not clipped)
- Fix font sizes for readability
- Build + deploy

### Iteration 5: Fix difficulty popup layout
- Increase popup panel size
- Fix spacing between difficulty options (currently 30px, too tight)
- Ensure stars don't overlap labels
- Ensure descriptions don't overlap labels
- Build + deploy

### Iteration 6: Fix music management (prevent freezes)
- MenuScene: check if music already exists before creating new instance
- GameScene: stop all sounds in scene shutdown handler
- All scenes: add proper this.events.on('shutdown') cleanup
- Prevent duplicate audio objects accumulating
- Build + deploy

### Iteration 7: Fix scene transitions and back buttons
- Verify all back buttons navigate correctly
- Add scene shutdown event handlers to clean up containers, tweens, timers
- Test full navigation cycle: Menu -> LevelSelect -> Game -> Pause -> Quit -> LevelSelect -> Menu
- Build + deploy

### Iteration 8: Fix path rendering and map alignment
- Verify BFS pathfinding produces valid waypoints for all 32 levels
- Ensure spawn (2) and exit (3) tiles are correctly found
- Verify map backgrounds display correctly with grid alignment
- Build + deploy

### Iteration 9: Validate all 32 level grids
- Confirm each level has exactly 1 spawn and 1 exit
- Confirm paths are connected (BFS reaches exit from spawn)
- Confirm special tiles (4-8) are on non-path, non-buildable cells
- Fix any broken level grids
- Build + deploy

### Iteration 10: Validate tower mechanics
- All 6 tower types place correctly with sprites
- Upgrade menu shows correct costs, swaps textures on upgrade
- Sell returns 60% gold
- Repair costs and heals correctly
- Fire animations play for all towers with animation frames
- Build + deploy

### Iteration 11: Validate enemy mechanics
- All 13 enemy types spawn with correct sprites and sizes
- Walk animations play for types with frames
- HP bars render and update correctly
- Special abilities: split (slime), regen (troll), tower-damage (gelcube), fly (beholder), kamikaze (rocketgoblin), melee (ogre/giant)
- Build + deploy

### Iteration 12: Validate weapons, HUD, and speed controls
- Powder keg, mine, gas cloud deploy correctly
- Charges decrement, visual effects render
- HUD gold/lives/wave/gems/kills update in real-time
- Speed controls (1x/2x/pause) work
- Menu button opens pause overlay
- Build + deploy

### Iteration 13: Validate victory/defeat screens
- Victory: stars + stats + gem count + difficulty badge
- Defeat: quote + stats
- Buttons: Menu, Next (if won + more levels), Retry all navigate correctly
- Gems saved on victory
- Stars saved per difficulty
- Build + deploy

### Iteration 14: Validate ShopScene
- All 13 upgrades display with correct icons
- Purchase deducts gems and scene refreshes
- Maxed upgrades show MAX
- Back button returns to LevelSelect
- Build + deploy

### Iteration 15: Validate StatsScene
- 8 stat rows show correct values
- Personal bests render correctly
- Back button works
- Build + deploy

### Iteration 16: Validate save/load persistence
- Level unlock persists across page reloads
- Stars persist per difficulty
- Gems persist
- Upgrades persist
- Total kills and gems earned track correctly
- Build + deploy

### Iteration 17: Validate bonus missions
- All 20 mission check conditions fire correctly
- Completed missions saved to localStorage
- Build + deploy

### Iteration 18: Validate tutorials
- 18 tutorial triggers fire at correct game moments
- Popups slide in/out without errors or crashes
- Already-seen tutorials don't repeat
- Build + deploy

### Iteration 19: Performance and stability
- Play 3+ levels in sequence without crash
- No memory leaks from destroyed scenes
- Tweens and timers cleaned up on scene exit
- No console errors during normal gameplay
- Build + deploy

### Iteration 20: Final visual polish and full deploy
- All screens look polished and professional
- No broken textures, no overlapping text
- All navigation paths work
- Clean build with no warnings
- Push to GitHub Pages
- Verify live site works end-to-end

---

## ITERATION LOG

| Pass | Commit | Changes Summary | Build | Status |
|------|--------|----------------|-------|--------|
| Pass 1 | 8ce7f3d | Remove broken generated textures, fix castle/deposits/chests visuals, rewrite LevelSelectScene layout, add shutdown handlers to all 6 scenes, fix music management, add wave spawn tracking, remove unused physics, fix destroyTower safety, add 5 missing tutorial triggers, fix StatsScene scores | CLEAN | DEPLOYED |
| Pass 2 | 39a1950 | Fix StatsScene upgradeMax (use UPGRADE_DEFS), difficulty popup backdrop interactive, fallback cell indicators draw shapes, range indicator fallback draws circle, stopAll before game music | CLEAN | DEPLOYED |
| Pass 3 | 6957aa5 | Fix gem double-collect race, only melee enemies damage towers, sell value reflects upgrades, explosion graphics scale origin, ice splash applies slow to area, tower menu auto-close nulls ref, stopMusic stops all sounds, pause backdrop interactive, popup cleanup on page nav, tower fire rate scales with game speed, fire rate min cap 200ms, wave text clamp | CLEAN | DEPLOYED |

### Pass 3 Deep-Dive Bug Summary

| Priority | Bug | Fix Applied |
|----------|-----|-------------|
| CRITICAL | Gem double-collect race (auto-collect + click) | Added `collected` flag |
| HIGH | ALL enemies dealt melee damage to towers | Only `enemy.melee` types now |
| HIGH | Tower sell ignored upgrade investment | Track `totalInvestment`, sell at 60% |
| HIGH | Explosion graphics scaled from wrong origin | Draw at (0,0) + setPosition |
| HIGH | Ice splash didn't slow area targets | Apply slow in splash forEach loop |
| MEDIUM | Tower menu auto-close didn't null ref | Added `this.towerMenu = null` |
| MEDIUM | stopMusic() only stopped bgMusic | Changed to `sound.stopAll()` |
| MEDIUM | Pause backdrop not interactive | Added setInteractive + click-to-close |
| MEDIUM | Difficulty popup persisted across pages | Cleanup in `drawPage()` |
| MEDIUM | Tower fire rate unaffected by game speed | Divide fireRate by gameSpeed |
| MEDIUM | No fire rate minimum cap | Added `Math.max(200, ...)` |
| LOW | Wave text showed "6/5" after last wave | Clamped with Math.min |
| LOW | Dual pause entry points | Unified to showPauseMenu |

---

## ASSET SUMMARY (152 files on disk)

- **UI**: 19 files (logos, backgrounds, buttons, icons)
- **HUD**: 26 files (tower/currency/control icons, rune/cell indicators)
- **Towers**: 46 sprite frames (6 types x 3 levels + animation frames)
- **Creeps**: 20 sprite frames (10 types + walk animation frames)
- **Projectiles**: 3 used + 1 unused (temp1.png)
- **Maps**: 24 textures (ground + underground) + 2 unused (platform, pathBrush)
- **Music**: 7 tracks
- **SFX**: 34 sound effects (towers, misc, stingers)

All loaded in BootScene.js preload(). No 404s expected.
