# Towers N' Trolls — Complete Game Audit & Feature Inventory

> **Purpose**: Comprehensive catalog of every game element, mechanic, and feature from the original Towers N' Trolls (Ember Entertainment, v1.6.6 APK). Used as the definitive reference for the Phaser.js web rebuild.

---

## Table of Contents

1. [Current Implementation Status](#1-current-implementation-status)
2. [Worlds & Levels](#2-worlds--levels)
3. [Tower System](#3-tower-system)
4. [Enemy System](#4-enemy-system)
5. [Combat Mechanics](#5-combat-mechanics)
6. [Economy & Currency](#6-economy--currency)
7. [Shop / Upgrade Store](#7-shop--upgrade-store)
8. [Special Weapons (Deployables)](#8-special-weapons-deployables)
9. [Rune System](#9-rune-system)
10. [Game Modes](#10-game-modes)
11. [Difficulty System](#11-difficulty-system)
12. [Scoring & Star Rating](#12-scoring--star-rating)
13. [Map Elements & Overlays](#13-map-elements--overlays)
14. [UI / HUD System](#14-ui--hud-system)
15. [Animation System](#15-animation-system)
16. [Audio System](#16-audio-system)
17. [Progression & Save System](#17-progression--save-system)
18. [Assets Inventory](#18-assets-inventory)
19. [Iteration Plan](#19-iteration-plan)

---

## 1. Current Implementation Status

### What Works
- [x] 6 tower types (Ballista, Cannon, Catapult, Scout, Storm, Winter)
- [x] 3 upgrade levels per tower with sprite swaps
- [x] 10 enemy types with correct sprites
- [x] 5 playable levels with hand-painted map backgrounds
- [x] Path-following AI (BFS waypoint system)
- [x] Tower targeting (closest enemy in range)
- [x] Splash/AOE damage (Cannon, Catapult)
- [x] Slow effect (Winter tower)
- [x] Tower sell mechanic (60% refund)
- [x] Wave-based spawning with multiple enemy groups per wave
- [x] Gold economy (earn from kills, spend on towers/upgrades)
- [x] Lives system (enemies reaching exit cost lives)
- [x] Victory/Defeat screens with Next/Retry/Menu
- [x] Level select with unlock progression
- [x] Game speed controls (1x/2x)
- [x] Menu → Level Select → Game scene flow
- [x] Background music (4 tracks)
- [x] HUD with gold, lives, wave counter
- [x] Build panel with 6 tower icons

### What's Missing (Priority Order)

| # | Feature | Severity | Iteration |
|---|---------|----------|-----------|
| 1 | Gem currency system | Critical | 1 |
| 2 | Pre-level shop / upgrade store | Critical | 1 |
| 3 | Tower health & enemy attacks on towers | Critical | 2 |
| 4 | Special weapons (Powder Keg, Minefield, Poison Gas) | High | 2 |
| 5 | Star/trophy rating on level completion | High | 3 |
| 6 | Multiple difficulty levels (Casual/Normal/Brutal) | High | 3 |
| 7 | Storm tower chain lightning mechanic | High | 4 |
| 8 | Scout tower stacking damage mechanic | High | 4 |
| 9 | More levels (currently 5, need 70) | High | 5-6 |
| 10 | World map organization (14 worlds x 5 levels) | High | 5 |
| 11 | Rune system (damage/range/speed runes) | Medium | 7 |
| 12 | Treasure chests & gold mines (in-level) | Medium | 7 |
| 13 | Challenge mode / Open Field mode | Medium | 8 |
| 14 | Endless Journey mode | Medium | 8 |
| 15 | Enemy portraits on wave preview | Low | 9 |
| 16 | Sound effects | Low | 9 |
| 17 | Achievements system | Low | 10 |
| 18 | Tower auto-heal mechanic | Low | 10 |
| 19 | Pause menu with proper UI | Low | 10 |
| 20 | Localization support | Low | Future |

---

## 2. Worlds & Levels

### World List (from store-6.json)

The APK store data confirms **14 worlds**, each with **5 levels** (World#-Level# format), totaling **70 levels**.

| World # | Name | Map Background | Theme | Status |
|---------|------|---------------|-------|--------|
| 1 | Lonely Forest | `grass_grnd.jpg` | Woodland/green | Implemented (1 level) |
| 2 | Fertile Pastures | `f1_grnd.jpg` / `f1b_grnd.jpg` | Farmland | Implemented (1 level) |
| 3 | Snowy Forest | `f3_grnd.jpg` | Winter/snow | Implemented (1 level) |
| 4 | Underworld | `undrwrld_grnd.jpg` | Dark caves | NOT implemented |
| 5 | Badlands | `desert_grnd.jpg` | Desert/waste | Implemented (1 level) |
| 6 | The North | `ice_grnd.jpg` | Frozen/glacier | Implemented (1 level) |
| 7 | Sandy Paradise | `sand_grnd.jpg` | Tropical | NOT implemented |
| 8 | Dark Night | `f1night.jpg` / `f3night_grnd.jpg` | Night variant | NOT implemented |
| 9 | Mines of Doom | `mine_grnd.jpg` | Underground mine | NOT implemented |
| 10 | Lava World | `lava_grnd.jpg` | Volcanic | NOT implemented |
| 11 | Open Field 1 | Various | Open terrain | NOT implemented |
| 12 | Endless Journey | Various | Mixed | NOT implemented |
| 13 | Challenge A | Various | Challenge | NOT implemented |
| 14 | Challenge B | Various | Challenge | NOT implemented |

### Level Format

Each level consists of:
- **Grid**: 15x10 tiles (960/64=15 cols, 640/64=10 rows)
- **Tile types**: 0=buildable, 1=path, 2=spawn, 3=exit
- **Wave definitions**: Array of enemy groups with type, count, interval
- **Starting gold**: Varies per level/difficulty
- **Lives**: Varies per level/difficulty
- **Map background**: JPG image key (ground layer)
- **Map underground**: JPG image key (underground/alternative layer)
- **Overlay elements**: Water, trees, rocks, decorative objects

### Map Background Assets Available in APK

Ground layers: `grass_grnd.jpg`, `f1_grnd.jpg`, `f1b_grnd.jpg`, `f3_grnd.jpg`, `desert_grnd.jpg`, `ice_grnd.jpg`, `F2_Grnd.jpg`, `undrwrld_grnd.jpg`, `sand_grnd.jpg`, `mine_grnd.jpg`, `lava_grnd.jpg`, `f1night.jpg`, `f3night_grnd.jpg`

Underground layers: `grass_ugrnd.jpg`, `f1_ugrnd.jpg`, `f1b_ugrnd.jpg`, `f3_ugrnd.jpg`, `desert_ugrnd.jpg`, `ice_ugrnd.jpg`, `F2_UGrnd.jpg`, `undrwrld_ugrnd.jpg`, `sand_ugrnd.jpg`, `mine_ugrnd.jpg`, `lava_ugrnd.jpg`, `f1night_under.jpg`, `f3night_ugrnd.jpg`

---

## 3. Tower System

### Tower Types

| Tower | Role | Cost | Base DMG | Range | Fire Rate | Special |
|-------|------|------|----------|-------|-----------|---------|
| **Ballista** | All-around | 50 | 20 | 160 | 800ms | Single target |
| **Cannon** | Short-range AOE | 100 | 60 | 110 | 2000ms | Splash 50px |
| **Catapult** | Long-range AOE | 120 | 80 | 180 | 2500ms | Splash 70px |
| **Scout** | Sniper | 40 | 12 | 140 | 500ms | **Stacking damage** (MISSING) |
| **Storm** | Chain lightning | 80 | 35 | 130 | 1200ms | **Chain hit** (MISSING) |
| **Winter/Ice** | Crowd control | 70 | 10 | 130 | 1000ms | Slow 50%, 1.5s |

### Upgrade Tiers (Current Implementation)

Each tower has 2 upgrade levels (3 total tiers). Stats increase for damage, range, fire rate, and special effects.

### Tower Health System (MISSING)

In the original game:
- **Towers have HP** (not yet implemented)
- **Enemies attack towers** as they pass by, dealing damage
- **Towers can be destroyed** if HP reaches 0
- **Tower auto-heal** is a shop upgrade (heals X HP/sec)
- **Tower health boost** increases max HP

From `tweaks.ini`:
```
Towers.Boost.HealthHpPct = (0.2)        # +20% HP per boost level
Towers.Boost.HealthHpPct2 = (0.1)       # secondary scaling
Towers.Boost.AutoHealHpPerSec = (0.5)   # heal 0.5 HP/sec per boost
Towers.Boost.AutoHealHpPerSec2 = (0.3)  # secondary scaling
```

### Scout Tower Stacking Mechanic (MISSING)

- Each consecutive shot at the **same target** deals increasing damage
- Resets when switching targets
- Makes Scout ideal for boss enemies

### Storm Tower Chain Mechanic (MISSING)

- Lightning hits a **chain of enemies in a line** extending beyond targeting range
- Should hit 3-5 enemies in sequence with damage falloff
- Current implementation: single-target only

### Tower Animation States (from .anim files)

| Tower | States | Frames per state |
|-------|--------|-----------------|
| Ballista L1 | `fire` | 5 sub-states, 160 frames |
| Cannon L1 | `fire` | 5 sub-states, 160 frames |
| Catapult L1 | `fire` | 11 sub-states, 352 frames |
| Scout L1 | `fire` | 1 frame (static) |
| Storm L1 | `idle` | 30 frames |
| Winter L1 | `idle` | 30 frames |

---

## 4. Enemy System

### Enemy Types

| Enemy | HP | Speed | Reward | DMG to Base | Special |
|-------|-----|-------|--------|-------------|---------|
| **Slime** | 30 | 70 | 5 | 1 | **Splits into 3 baby slimes on death** |
| **Goblin** | 50 | 130 | 8 | 1 | Travels in large packs |
| **Troll** | 100 | 80 | 12 | 1 | **Health regeneration** |
| **Orc** | 150 | 75 | 15 | 1 | "Dumb, Strong, Mean" |
| **Ogre** | 300 | 50 | 25 | 2 | Single-eye Cyclops tank |
| **Gel Cube** | 200 | 60 | 18 | 1 | **Damages towers as it slides past** |
| **Rocket Goblin** | 60 | 160 | 10 | 1 | **Kamikaze — damages towers on contact** |
| **Beholder** | 400 | 45 | 30 | 2 | **Floats over mines** (immune) |
| **Giant** | 600 | 35 | 40 | 3 | Boss — has **melee attack animation** |
| **Dragon** | 800 | 55 | 50 | 3 | Final boss |

### Named Bosses (from DerivedMap strings)
- **Xantem the Eye** — Beholder boss
- **Gronk the Brutilator** — Ogre/Giant boss
- **Gronk Senior** — Boss variant
- **Ainamarth the Dragon** — Dragon boss

### Enemy Animation States (from .anim files)

All enemies have directional movement and death animations:

| Enemy | Movement | Deaths | Total Frames |
|-------|----------|--------|-------------|
| Slime | run_down/up/left/right (32f ea) | death1 (44f), death2 (44f) x4 dirs | 608 |
| Goblin | run x4 dirs | death1, death2 x4 dirs | ~500 |
| Troll | run x4 dirs (24f) | death1 (28f), death2 (19f) x4 dirs | 284 |
| Orc | run x4 dirs (19f) | death1 (68f), death2 (48f) x4 dirs | 540 |
| Ogre | run x4 dirs (24f) | death1 (39f), death2 (31f) x4 dirs | 376 |
| Gel Cube | run x4 dirs (27f) | death1 x4 dirs (32f) | 236 |
| Dragon | run x4 dirs | death x4 dirs | ~300 |
| Giant | run x4 dirs | death x4 dirs | ~300 |
| Beholder | run x4 dirs | death x4 dirs | ~300 |
| Rocket Goblin | run x4 dirs | death x4 dirs | ~300 |

### Enemy Attacks on Towers (MISSING)

- Enemies deal damage to towers within melee range as they pass
- This adds strategic urgency — can't just build towers directly on path edges
- Some enemy types deal more tower damage than others

---

## 5. Combat Mechanics

### Targeting
- **Current**: Closest enemy in range (correct)
- **Missing**: No priority targeting options

### Damage Types
- **Single target**: Ballista, Scout
- **Splash/AOE**: Cannon (50-80px), Catapult (70-100px)
- **Chain**: Storm (MISSING — should hit line of enemies)
- **Slow**: Winter (speed * 0.5 for 1.5-2.5s)

### Projectile System
- Projectiles track their target position
- Homing — follow target if still alive
- On hit: deal damage, check splash, apply slow
- **Missing**: Visual projectile variety (all use same sprite currently)

### Projectile Assets Available in APK (24 total)

| Tower | Projectile Assets | Impact Assets |
|-------|------------------|---------------|
| Ballista L1-L3 | `ballista1/2/3_projectile` | None |
| Cannon L1-L3 | `cannon1/2/3_projectile` | `cannon1/2/3_impact` |
| Catapult L1-L3 | `catapult1/2/3_projectile` | `catapult1/2/3_impact` |
| Scout L2-L3 | `scout2/3_projectile` | None (L1 may be hitscan) |
| Storm | `storm1_projectile` | None (lightning visual) |
| Winter L1-L3 | `winter1/2/3_projectile` | `winter1/2_impact` |

### Tower Boost System (from tweaks.ini)

| Boost | Effect per Level | Max Levels |
|-------|-----------------|------------|
| Damage | +3% HP damage | 20 |
| Fire Rate | +3% speed | 20 |
| Range | +5% distance | 20 |
| AOE | +5% splash radius | 5 |
| Ice Slow | +3% slow strength | 5 |
| Health | +20% tower HP | 5 |
| Auto-Heal | +0.5 HP/sec | 5 |

---

## 6. Economy & Currency

### Gold (In-Level Currency)
- **Earned**: Enemy kills (5-50 gold based on type)
- **Spent**: Tower placement, tower upgrades
- **Starting gold**: Varies by level (200-350 in current levels)
- **Tower sell refund**: 60% of original cost

### Gems (Premium/Persistent Currency) — MISSING

In the original game:
- **Gems drop from slain enemies** — must be tapped/swiped to collect
- **Gems persist across levels** (saved to profile)
- **Used to**: Unlock worlds, buy upgrades in shop, buy special weapon charges
- **Gem multiplier (x2)**: Permanent upgrade doubles gem earnings

### Gem Packs (from store-6.json)

| Pack | Gems | Original Price |
|------|------|---------------|
| Booster | 500 | $0.99 |
| Value | 1,000 | $1.99 |
| Ultra | 2,750 | $4.99 |
| Mega | 6,000 | $9.99 |
| Insanity | 15,000 | $19.99 |
| Dragon's Horde | 35,000 | $29.99 |

> **Web version**: Gems will be earned through gameplay only (no real purchases). Starting gem balance = 500.

---

## 7. Shop / Upgrade Store — MISSING

### Store Categories (from store-6.json)

#### 1. Gem Store (`gemsStore`)
Web version: Skip (no real money purchases)

#### 2. World Store (`worldsStore`)
- Unlock worlds with 500 gems each
- World 1 & 2 are free (initPurchases: 1)
- "All Worlds Pack" unlocks everything
- "Endless Journey" mode costs 500 gems
- **Web version**: First 6 worlds free, remaining unlock with earned gems

#### 3. Upgrade Store (`upgradesStore`) — THE PRE-LEVEL SHOP

| Upgrade | Gem Cost | +Cost/Level | Max Levels | Effect |
|---------|----------|-------------|------------|--------|
| Gold Start Boost | 200 | +400 | 20 | More starting gold |
| Gold Wave Boost | 100 | +200 | 20 | More gold per wave clear |
| Base Health Boost | 400 | +200 | 5 | More lives |
| Tower Auto-Heal | 100 | +25 | 5 | Towers heal HP over time |
| Tower Health | 100 | +25 | 5 | Increased tower max HP |
| Tower Damage | 100 | +25 | 20 | +3% damage |
| Tower Fire Rate | 100 | +25 | 20 | +3% fire rate |
| Tower Range | 100 | +25 | 20 | +5% range |
| Tower Ice Slow | 100 | +25 | 5 | +3% slow effect |
| Tower AOE | 100 | +25 | 5 | +5% splash radius |
| Mine Boost | 100 | +25 | 10 | +mine charges |
| Powder Keg Boost | 100 | +25 | 10 | +keg charges |
| Gas Cloud Boost | 100 | +25 | 10 | +gas charges |

#### 4. Skip Passes Store (`skipPassesStore`)
- Bronze/Gold/Platinum skip tickets to bypass levels
- **Web version**: Not needed (all levels playable)

---

## 8. Special Weapons (Deployables) — MISSING

### Weapon Types

| Weapon | Source File | Effect | Mechanic |
|--------|-----------|--------|----------|
| **Minefield** | `loot/minefield-0.pvr` + `.anim` | Damage area on path | Placed on path, explodes when enemies walk over |
| **Powder Keg** | `loot/powderkeg-0.pvr` + `.anim` | Massive AOE damage | Dragged and dropped onto enemies |
| **Poison Gas** | `loot/poisongas-0.png` + `.anim` | DOT damage area | Placed on path, damages over time |

### Mechanic
- Limited charges per level (default: 1-2 each)
- More charges purchasable via gem shop (up to 10 levels of boost)
- Activated via HUD buttons, then drag-to-place on map
- Cooldown between uses

### Loot/Collectible Items (from `img/loot/`)
- `chest1.tga`, `chest2.tga` — Treasure chests (in-level bonus gold)
- `gem_1.tga` through `gem_5.tga` — 5 gem types (currency drops)
- `gold.tga` — Gold coin drop
- `heart.tga` — Life/health pickup
- `spinnyCoin1` — Animated spinning coin (PVR with .anim)

---

## 9. Rune System — MISSING

### Rune Types (from map assets)

| Rune | Map Asset | Effect |
|------|-----------|--------|
| **Double Damage** | `maps/runedoubledamage/` | 2x tower damage in radius |
| **Extend Range** | `maps/runeextendrange/` | Increased tower range in radius |
| **Fire Faster** | `maps/runefirefaster/` | Increased fire rate in radius |

### Mechanic
- Runes are **placed on the map** by the player
- Act as area buffs for nearby towers
- Limited number per level (typically 1-3)
- Persist for the entire level once placed

---

## 10. Game Modes — MOSTLY MISSING

### Implemented
- [x] Story Campaign (basic — one difficulty)

### Missing
- [ ] **Challenge Mode**: Special challenge worlds (Sandy Paradise, Mines of Doom, Lava, Dark Night)
- [ ] **Open Field Mode**: Open terrain maps with free tower placement
- [ ] **Endless Journey**: Survive as many waves as possible
- [ ] **Infinite Mode**: "Last as long as you can"
- [ ] **Survival Mode**: "One health — how far can you get?"

---

## 11. Difficulty System — MISSING

### Difficulty Levels
- **Casual**: More starting gold, more lives, weaker enemies
- **Normal**: Standard settings
- **Brutal**: Less gold, fewer lives, stronger enemies, enemies attack towers harder

Each level can be played on each difficulty. Harder difficulties give better star ratings and more gem rewards.

---

## 12. Scoring & Star Rating — MISSING

### Star System
- 1 star: Completed the level
- 2 stars: Completed with >50% lives remaining
- 3 stars: Completed with 100% lives (perfect)
- Stars are tracked per-level, per-difficulty
- Trophy for completing all levels in a world with 3 stars

---

## 13. Map Elements & Overlays

### Tile-Based Elements

| Element | Grid Value | Current Status |
|---------|-----------|----------------|
| Buildable grass | 0 | Working |
| Path | 1 | Working (BFS traced) |
| Spawn point | 2 | Working |
| Exit point | 3 | Working |
| Water overlay | N/A | MISSING |
| Gold mine | N/A | MISSING |
| Treasure chest | N/A | MISSING |

### Decorative Overlays (from APK `maps/` directory)

| Category | Assets | Status |
|----------|--------|--------|
| Trees | `TDF_TREE_A.png`, `TDF_TREE_B.png`, `f3_treea-c.png`, `palm_a-c.png`, `aspen1/2` | NOT loaded |
| Rocks | `rocka.png`, `rockb.png`, `rockpile.png`, `desrock.png` | NOT loaded |
| Water overlays | `grasswater_over.png`, `f2water_over.png`, etc. | NOT loaded |
| Ice | `icea.png`, `iceb.png` | NOT loaded |
| Grass | `grassclump/`, `grasspatch/` | NOT loaded |
| Effects | `lightray/`, `f1sparkles/`, `f1mist/` | NOT loaded |
| Base/Castle | `base_level_1/`, `base_level_4/`, `base_snow_level_1/4` | NOT loaded |
| Columns | `column_left.png`, `column_middle.png`, `column_right.png` | NOT loaded |
| Tower platform | `towerplatform.png` | Loaded but unused |
| Path brush | `pathBrush.png` | Loaded but unused |
| Monster generators | `monstergen/`, `monstergensnow/` | NOT loaded |
| Torch stands | `torchstand/` | NOT loaded |
| Pond | `pondb/` | NOT loaded |
| Fire small | `firesmall/` | NOT loaded |
| Gold deposit | `golddeposit/` | NOT loaded |
| Mine cloud | `minecloud/` | NOT loaded |

### Base/Castle (at exit point)

The original game shows a castle/base at the exit that enemies are attacking. Assets exist:
- `base_level_1/` through `base_level_4/` (regular base, animated)
- `base_snow_level_1/` through `base_snow_level_4/` (snow variant)

---

## 14. UI / HUD System

### Top HUD Bar
- **Current**: Gold, Lives, Wave counter, Speed controls (1x/2x), Menu button
- **Missing**: Gem counter, Pause button with proper icon, Fast-forward icon

### Available HUD Assets (loaded)
- `hud_gold`, `hud_gem`, `hud_health` — Currency/stat icons
- `hud_sell`, `hud_upgrade`, `hud_range` — Tower action icons
- `hud_ff`, `hud_ff_on` — Fast forward toggle
- `hud_pause`, `hud_play` — Pause/resume icons
- `hud_menu` — Menu button icon

### Tower Context Menu
- **Current**: Text-based popup with Upgrade/Sell
- **Missing**: Icon-based radial menu (like original), tower HP bar

### Build Panel
- **Current**: 6 tower icons with name/cost labels at bottom
- **Missing**: Proper wood-panel styled background, tower availability based on world unlock

### Screens
- **Menu**: Working (wood button, title logo)
- **Level Select**: Working (world icons, stone tablets)
- **Victory**: Basic text overlay — **MISSING** proper victory screen with star rating, gem count
- **Defeat**: Basic text overlay — **MISSING** proper game over screen with retry/skip options
- **Pause Menu**: **MISSING** — should slide in/out (`Gui.PauseMenu.SlideInT = 0.3`)
- **Pre-Level Shop**: **MISSING** — select upgrades before starting

### Available UI Assets
- `victory_android.jpg` — Victory background
- `gameover_android.jpg` — Game over background
- `frontEndFrame_android.jpg` — Menu background
- `LoadingScreen_android.jpg` — Loading/level select background
- `TitleLogo_android.png` — Title logo
- `woodPanelButton.png` — Wood-styled button
- `mapIcon.png` / `mapIconLocked.png` — Level select cards
- `World Icon 1-12.png` — World character art
- `backButton.png` — Back navigation

### Enemy Portraits (for wave preview) — NOT LOADED

| Portrait | File | Enemy |
|----------|------|-------|
| `beholder.tga` | TGA format | Beholder |
| `cube.tga` | TGA format | Gel Cube |
| `dragon.tga` | TGA format | Dragon |
| `giant.tga` | TGA format | Giant |
| `goblin.tga` | TGA format | Goblin |
| `ogre.tga` | TGA format | Ogre |
| `orc.tga` | TGA format | Orc |
| `rocket.tga` | TGA format | Rocket Goblin |
| `slime.tga` | TGA format | Slime |
| `troll.tga` | TGA format | Troll |

> Note: TGA files need conversion to PNG for web use

---

## 15. Animation System

### Current State
- **Towers**: Static single-frame sprites (no animation)
- **Enemies**: Static single-frame sprites (no directional movement, no death animation)
- **Projectiles**: Static circles/dots

### Original Animation System
All sprites use `.anim` files that define:
- Multiple animation states (idle, fire, run_down, run_up, run_left, run_right, death1, death2)
- Frame coordinates within sprite sheets (page, x, y, w, h)
- Frame counts and playback timing
- Sprite sheets stored as PVR (ETC1) or PNG atlas files

### Priority Animations to Implement

1. **Enemy directional movement** (run_down/up/left/right based on path direction)
2. **Enemy death animations** (death1, death2 variants)
3. **Tower firing animations** (fire state with multiple frames)
4. **Tower idle animations** (idle state — subtle movement)
5. **Projectile impact effects** (explosion for cannon/catapult)
6. **Gem/gold drop animations** (spinning coin, floating gems)

### Animation Implementation Approach

For web: Extract sprite sheet frames into individual PNGs or use Phaser's sprite sheet system with atlas JSON files. The `.anim` files provide all needed frame coordinate data.

---

## 16. Audio System

### Music (Loaded)

| Track | File | World |
|-------|------|-------|
| Farm theme | `How it Begins (Farm).mp3` | Lonely Forest, Fertile Pastures |
| Desert theme | `Dance Monster (Desert).mp3` | Badlands, Sandy Paradise |
| Glacier theme | `One Sly Move(Glacier).mp3` | Snowy Forest, The North |
| Gauntlet theme | `Rocket(Gauntlet).mp3` | Challenge modes |

### Sound Effects (NOT loaded — from APK `audio/`)

| Category | Files | Status |
|----------|-------|--------|
| Tower shots | `towers/` directory | NOT extracted |
| Enemy hits | `misc/` directory | NOT extracted |
| UI clicks | `misc/` directory | NOT extracted |
| Victory/defeat stingers | `stingers/` directory | NOT extracted |
| Gem/gold pickup | `misc/` directory | NOT extracted |
| Wave start | `stingers/` directory | NOT extracted |

---

## 17. Progression & Save System

### Current
- `Phaser.Registry` stores `gameState` with:
  - `levelsUnlocked`: Number (increments on victory)
  - `currentLevel`: Number
  - `gold`, `lives`, `wave`: In-game state
- No persistence across page reloads

### Original Game
- Level completion tracked per world
- Star ratings stored per level per difficulty
- Gem balance persisted
- Shop upgrade levels persisted
- World unlock status persisted
- Required internet connection for gem saves

### Web Version Target
- **LocalStorage** for guest saves (immediate)
- **PostgreSQL** via backend API for logged-in users (future)
- Save data structure:
  ```json
  {
    "gems": 0,
    "worldsUnlocked": [1, 2],
    "levelStars": { "1-1": 3, "1-2": 2 },
    "upgrades": { "towerDamageBoost": 3, "goldStartBoost": 1 },
    "specialWeapons": { "mine": 2, "powderKeg": 1, "gasCloud": 1 }
  }
  ```

---

## 18. Assets Inventory

### Currently Loaded in BootScene.js

| Category | Count | Notes |
|----------|-------|-------|
| UI images | 8 | Title, backgrounds, buttons, map icons |
| World icons | 12 | World 1-12 character art |
| HUD icons | 12 | Tower icons, currency, controls |
| Tower sprites | 18 | 6 types x 3 levels |
| Creep sprites | 10 | One per type |
| Projectiles | 3 | All using same ballista sprite |
| Map backgrounds | 7 | grass, f1, f3, ice, desert, platform, path |
| Music | 4 | Farm, desert, glacier, gauntlet |
| **Total** | **74** | |

### Available but NOT Loaded

| Category | Count | Notes |
|----------|-------|-------|
| Additional map bgs | 8+ | undrwrld, sand, mine, lava, night variants |
| Map overlays | 30+ | Trees, rocks, water, grass, effects |
| Base/castle sprites | 4+ | Animated base at different levels |
| Effect sprites | 3 | lightblue, lightorange, temp1 |
| Loot sprites | 9+ | Chests, gems, gold, heart, minefield, etc. |
| Portrait TGAs | 10 | Enemy portraits for wave preview |
| Rune sprites | 3 | damage, range, fire rate runes |
| Shop UI | 10+ | Store bar, item buy buttons, gem icons |
| Sound effects | 20+ | Tower shots, impacts, UI, stingers |
| **Total available** | **~100+** | |

---

## 19. Iteration Plan

### Iteration 1: Gem Economy & Shop System
**Agent Focus**: Economy specialist
- Add gem currency to game state
- Implement gem drops from enemies (tap to collect)
- Create pre-level shop scene with upgrade categories
- Add gem counter to HUD
- Implement persistent upgrades (localStorage save)
- Wire shop upgrades to affect tower/game stats

### Iteration 2: Tower Health & Special Weapons
**Agent Focus**: Combat mechanics specialist
- Add HP property to towers
- Implement enemy melee attacks on towers within range
- Add tower HP bars (visible when damaged)
- Implement tower destruction
- Add Powder Keg deployable (drag and drop)
- Add Minefield deployable (place on path)
- Add Poison Gas deployable (place on path)
- Add HUD buttons for special weapons

### Iteration 3: Difficulty & Star Rating
**Agent Focus**: Progression specialist
- Add difficulty selection to level select (Casual/Normal/Brutal)
- Scale enemy HP/speed and starting gold per difficulty
- Implement star rating calculation on level complete
- Show stars on victory screen
- Track stars per level in save data
- Show star count on level select cards

### Iteration 4: Tower Unique Mechanics
**Agent Focus**: Tower specialist
- Implement Scout stacking damage (increasing DMG on same target)
- Implement Storm chain lightning (hit line of enemies)
- Add visual effects for chain lightning
- Improve projectile visuals (unique per tower type)
- Add tower firing animations (extract from .anim sheets)
- Tune tower balance

### Iteration 5: World Map & More Levels
**Agent Focus**: Level design specialist
- Reorganize levels into World#-Level# format
- Add worlds 4 (Underworld), 7 (Sandy Paradise), 8 (Dark Night)
- Create level grids for 15+ new levels
- Design wave compositions with progressive difficulty
- Load additional map backgrounds (underworld, sand, night)
- Update level select to show world groupings

### Iteration 6: Even More Levels
**Agent Focus**: Level design specialist (continued)
- Add worlds 9 (Mines), 10 (Lava)
- Create 20+ more level grids
- Design boss wave compositions
- Ensure difficulty curve across all worlds
- Total target: 35+ playable levels

### Iteration 7: Runes & Collectibles
**Agent Focus**: In-level features specialist
- Implement rune placement mechanic
- Add rune effects (damage, range, fire rate buffs in radius)
- Add treasure chests (build tower adjacent to open)
- Add gold mines (periodic gold income)
- Load rune/chest/gold-mine sprites
- Add visual indicators for buff zones

### Iteration 8: Additional Game Modes
**Agent Focus**: Game modes specialist
- Implement Challenge mode (special worlds with unique rules)
- Implement Open Field mode (free tower placement on open maps)
- Implement Endless Journey mode (infinite waves, increasing difficulty)
- Add mode selection to main menu
- Design special wave generators for endless mode

### Iteration 9: Polish — Audio & Visual
**Agent Focus**: A/V polish specialist
- Extract and load sound effects from APK
- Add tower shot sounds, enemy hit sounds, UI sounds
- Add enemy directional movement (face direction of travel)
- Add death animations (fade out or sprite swap)
- Add enemy portraits to wave preview
- Victory/defeat screens with proper backgrounds and star display

### Iteration 10: Final Polish & Validation
**Agent Focus**: QA & validation specialist
- Full playthrough of all levels on all difficulties
- Verify tower balance (no tower type is useless or overpowered)
- Verify economy balance (gems earned vs upgrades cost)
- Ensure all HUD icons are used properly
- Test on mobile browsers (touch controls)
- Performance optimization (object pooling for enemies/projectiles)
- Pause menu with proper slide-in UI
- Achievement system (22 achievements from original)
- Bug fixes from all previous iterations

---

## Validation Checklist (Per Iteration)

For each iteration, the validation agent must verify:

- [ ] `npm run build` succeeds with no errors
- [ ] No console errors on load
- [ ] All new features are visually correct
- [ ] No regressions in existing features
- [ ] Save/load state works correctly
- [ ] Tower placement still works on all levels
- [ ] Enemy pathing still works on all levels
- [ ] Game speed controls (1x/2x) still work
- [ ] Victory/defeat triggers correctly
- [ ] Level progression still works

---

## Agent Architecture

| Agent | Role | Scope |
|-------|------|-------|
| **Economy Agent** | Gem system, shop, pricing | Iteration 1 |
| **Combat Agent** | Tower HP, enemy attacks, special weapons | Iteration 2 |
| **Progression Agent** | Difficulty, stars, unlocks | Iteration 3 |
| **Tower Agent** | Unique mechanics, animations, balance | Iteration 4 |
| **Level Design Agent** | Map grids, wave compositions | Iterations 5-6 |
| **Features Agent** | Runes, collectibles, game modes | Iterations 7-8 |
| **Polish Agent** | Audio, visual effects, animations | Iteration 9 |
| **QA Agent** | Full validation, bug fixes, performance | Iteration 10 |
| **Code Review Agent** | Runs after each iteration — reviews all changes | All |
| **Gameplay Agent** | Tests playability after each iteration | All |

---

*Generated from APK v1.6.6 analysis + web research. Last updated: 2026-02-13.*
