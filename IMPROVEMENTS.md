# Towers N' Trolls — Improvement Log

## Enemy System
- **Glide Movement**: Enemies now glide smoothly as static images instead of using choppy frame animations. Eliminates sprite popping and pixelation caused by inconsistent frame dimensions.
- **Resistance Indicators**: Small colored dots appear next to enemy HP bars (gray = physical resist, purple = magic resist) so players know which tower type to use.
- **Ice Slow Particles**: Frozen enemies emit small blue ice particles while slowed, providing clear visual feedback.

## Gameplay Feedback
- **Combo Counter**: Persistent HUD display shows "5x COMBO" when killing enemies in rapid succession (3+ kills within 2 seconds). Camera flash at 5x, screen shake at 10x.
- **Scout Tower Hit Streak**: Shows "x3", "x4" etc. above scout towers during consecutive hits on the same target (+25% damage per hit).
- **Wave Cleared Celebration**: "WAVE CLEARED!" text animates at screen center with scale bounce after each wave.
- **Gold Gain Pulse**: Gold counter briefly pulses 1.3x size when gaining gold from kills.
- **Base Hit Flash**: Screen flashes red when an enemy reaches your base.
- **Tower Placement Bounce**: New towers animate in with a satisfying bounce effect (Back.easeOut).
- **Level Name Display**: Current level name shows at the top of the screen for 2 seconds at game start.

## UX Improvements
- **Bonus Mission Indicator**: Persistent small text at bottom-left shows the current bonus objective during gameplay (not just at start/end).
- **Tower DPS in Build Panel**: Each tower in the build bar now shows damage type icon and DPS (e.g., "Ballista $50 ⚔25/s").
- **Path Visibility**: Underground-themed levels have enhanced path visibility with higher alpha pathBrush overlays and solid fallback path indicators.

## New Levels (32 → 40 total)

| # | Name | Pattern | Difficulty | Boss |
|---|------|---------|------------|------|
| 33 | Gentle Valley | L-Shape | Easy | No |
| 34 | Blizzard Pass | Double Switchback | Medium | No |
| 35 | Scorching Sands | Cross | Medium | No |
| 36 | Desert Gauntlet | Straight Rush | Medium-Hard | No |
| 37 | Magma Zigzag | Full Zigzag (44 tiles) | Hard | Boss Ogre |
| 38 | Infernal Spiral | Spiral Inward | Very Hard | Boss Dragon |
| 39 | Abyss Switchback | Switchback + Runes | Very Hard | Dragon + Beholder Bosses |
| 40 | Final Stand | Zigzag + Runes + Gold | Ultimate | ALL 3 Bosses |

### Path Pattern Variety
- **L-Shape**: Simple right-angle turn, lots of buildable space
- **Double Switchback**: 3 horizontal runs with tight turns
- **Cross**: Entry from top, path branches into cross pattern
- **Straight Rush**: Single line across screen — fast enemies, high gold, few lives
- **Full Zigzag**: 5 horizontal runs — maximum path length for tower stacking
- **Spiral Inward**: Clockwise spiral toward center exit

### Enemy Progression
- Early levels: slime, goblin, spider, troll, orc
- Mid levels: armored goblin, bat, ogre, shaman, healer, shield bearer
- Hard levels: rocketgoblin swarms, beholder, giant, dragon
- Ultimate: All 3 bosses simultaneously + dragon/giant waves, 5 lives only

## Technical
- Tower platform grid alpha: 0.15 (subtle, doesn't obscure backgrounds)
- Antialias rendering enabled for smoother sprite scaling
- All 15 map backgrounds verified present and loading correctly
