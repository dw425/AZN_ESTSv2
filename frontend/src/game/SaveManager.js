// Persistent save manager using localStorage
export const SAVE_KEY = 'tnt_save_v1'

const DEFAULT_SAVE = {
  gems: 100,
  levelsUnlocked: 1,
  levelStars: {},        // e.g. { "0": 3, "1": 2 }
  bonusMissions: {},     // e.g. { "0": true, "1_brutal": true }
  personalBests: {},     // e.g. { "0_normal": { score: 1500, kills: 45 } }
  tutorialsSeen: {},     // e.g. { "Tut_PlaceBallista": true }
  totalKills: 0,
  totalGemsEarned: 0,
  settings: {
    musicVolume: 0.3,
    sfxVolume: 0.5,
    showDamageNumbers: true,
    showTutorials: true,
  },
  upgrades: {
    goldStartBoost: 0,
    goldWaveBoost: 0,
    baseHealthBoost: 0,
    towerAutoHealBoost: 0,
    towerHealthBoost: 0,
    towerDamageBoost: 0,
    towerFireRateBoost: 0,
    towerRangeBoost: 0,
    towerIcyBoost: 0,
    towerAoeBoost: 0,
    mineBoost: 0,
    powderKegBoost: 0,
    gasCloudBoost: 0,
  },
}

// Upgrade definitions — cost, scaling, max levels, effect descriptions
export const UPGRADE_DEFS = {
  goldStartBoost: {
    name: 'Money Bags!',
    desc: '+20 starting gold per level',
    baseCost: 200,
    costInc: 400,
    maxLevel: 20,
    icon: 'hud_gold',
  },
  goldWaveBoost: {
    name: 'Midas Touch',
    desc: '+2 bonus gold per wave cleared',
    baseCost: 100,
    costInc: 200,
    maxLevel: 20,
    icon: 'hud_gold',
  },
  baseHealthBoost: {
    name: 'A New Castle!',
    desc: '+1 base health (lives)',
    baseCost: 400,
    costInc: 200,
    maxLevel: 5,
    icon: 'hud_health',
  },
  towerDamageBoost: {
    name: 'Strong Shot',
    desc: '+3% tower damage',
    baseCost: 100,
    costInc: 25,
    maxLevel: 20,
    icon: 'hud_ballista',
  },
  towerFireRateBoost: {
    name: 'Fast Shot',
    desc: '+3% tower fire rate',
    baseCost: 100,
    costInc: 25,
    maxLevel: 20,
    icon: 'hud_cannon',
  },
  towerRangeBoost: {
    name: 'Far Shot',
    desc: '+5% tower range',
    baseCost: 100,
    costInc: 25,
    maxLevel: 20,
    icon: 'hud_scout',
  },
  towerAoeBoost: {
    name: 'Blast Radius',
    desc: '+5% splash range',
    baseCost: 100,
    costInc: 25,
    maxLevel: 5,
    icon: 'hud_catapult',
  },
  towerIcyBoost: {
    name: 'Icy Enchantment',
    desc: '+3% slow strength',
    baseCost: 100,
    costInc: 25,
    maxLevel: 5,
    icon: 'hud_ice',
  },
  towerHealthBoost: {
    name: 'Structural Integrity',
    desc: 'Tower HP increase',
    baseCost: 100,
    costInc: 25,
    maxLevel: 5,
    icon: 'hud_upgrade',
  },
  towerAutoHealBoost: {
    name: 'Dwarven Repair Crew',
    desc: 'Towers auto-heal faster',
    baseCost: 100,
    costInc: 25,
    maxLevel: 5,
    icon: 'hud_upgrade',
  },
  mineBoost: {
    name: 'Mines Aplenty',
    desc: '+1 mine charges',
    baseCost: 100,
    costInc: 25,
    maxLevel: 10,
    icon: 'hud_upgrade',
  },
  powderKegBoost: {
    name: 'Pyromaniac',
    desc: '+1 powder keg charge',
    baseCost: 100,
    costInc: 25,
    maxLevel: 10,
    icon: 'hud_upgrade',
  },
  gasCloudBoost: {
    name: 'Toxic Avenger',
    desc: '+1 gas cloud charge',
    baseCost: 100,
    costInc: 25,
    maxLevel: 10,
    icon: 'hud_upgrade',
  },
}

export function getUpgradeCost(upgradeKey, currentLevel) {
  const def = UPGRADE_DEFS[upgradeKey]
  if (!def || currentLevel >= def.maxLevel) return Infinity
  return def.baseCost + def.costInc * currentLevel
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      // Merge with defaults to handle new fields added in updates
      return {
        ...DEFAULT_SAVE,
        ...data,
        upgrades: { ...DEFAULT_SAVE.upgrades, ...(data.upgrades || {}) },
        settings: { ...DEFAULT_SAVE.settings, ...(data.settings || {}) },
      }
    }
  } catch (e) {
    console.warn('Failed to load save:', e)
  }
  return { ...DEFAULT_SAVE, upgrades: { ...DEFAULT_SAVE.upgrades }, settings: { ...DEFAULT_SAVE.settings } }
}

export function saveSave(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to save:', e)
  }
}

export function addGems(amount) {
  const save = loadSave()
  save.gems += amount
  saveSave(save)
  return save
}

export function spendGems(amount) {
  const save = loadSave()
  if (save.gems < amount) return null
  save.gems -= amount
  saveSave(save)
  return save
}

export function purchaseUpgrade(upgradeKey) {
  const save = loadSave()
  const currentLevel = save.upgrades[upgradeKey] || 0
  const cost = getUpgradeCost(upgradeKey, currentLevel)
  if (save.gems < cost) return null
  save.gems -= cost
  save.upgrades[upgradeKey] = currentLevel + 1
  saveSave(save)
  return save
}

export function unlockLevel(levelIndex) {
  const save = loadSave()
  save.levelsUnlocked = Math.max(save.levelsUnlocked, levelIndex + 1)
  saveSave(save)
  return save
}

export function setLevelStars(levelIndex, stars) {
  const save = loadSave()
  const existing = save.levelStars[String(levelIndex)] || 0
  save.levelStars[String(levelIndex)] = Math.max(existing, stars)
  saveSave(save)
  return save
}

export function completeBonusMission(key) {
  const save = loadSave()
  save.bonusMissions[key] = true
  saveSave(save)
  return save
}

export function setPersonalBest(key, score, kills) {
  const save = loadSave()
  const existing = save.personalBests[key]
  if (!existing || score > existing.score) {
    save.personalBests[key] = { score, kills }
    saveSave(save)
  }
  return save
}

export function markTutorialSeen(tutId) {
  const save = loadSave()
  save.tutorialsSeen[tutId] = true
  saveSave(save)
}

export function hasTutorialSeen(tutId) {
  const save = loadSave()
  return save.tutorialsSeen[tutId] || false
}

export function addTotalKills(count, gemsEarned) {
  const save = loadSave()
  save.totalKills = (save.totalKills || 0) + count
  save.totalGemsEarned = (save.totalGemsEarned || 0) + (gemsEarned || 0)
  saveSave(save)
}
