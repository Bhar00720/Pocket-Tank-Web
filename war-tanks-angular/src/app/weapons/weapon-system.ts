export interface WeaponConfig {
  name: string;
  damage: number;
  explosionRadius: number;
  color: string;
  mass: number;
  category: string;           // Weapon category for armory grouping
  biome?: string;             // undefined = universal, 'Grasslands' | 'Desert' | 'Snow'
  count?: number;
  spread?: number;
  radius?: number;
  glow?: string;
  trailColor?: string;
  explosionColor?: string;
  isBeam?: boolean;
  thickness?: number;
  isShield?: boolean;
  isBubble?: boolean;
  bubbleRadius?: number;
  bubbleThick?: number;
  isAcid?: boolean;
  isCluster?: boolean;
  clusterCount?: number;
  isSplitter?: boolean;
  splitCount?: number;
  isRoller?: boolean;
  rollLife?: number;
  isBouncer?: boolean;
  bounces?: number;
  isHoming?: boolean;
  isDirt?: boolean;
  isBorer?: boolean;
  boreRadius?: number;
  isWall?: boolean;
  isFrog?: boolean;
  force?: number;
  isLaser?: boolean;
  isIncendiary?: boolean;
  dragProf?: number;
  wallType?: 'default' | 'black' | 'rainbow';
  isCutter?: boolean;
  isColorBomb?: boolean;
  paintColors?: string[];
}

// Category definitions for the armory panel
export const WEAPON_CATEGORIES = [
  'Ballistic',
  'Laser',
  'Defense',
  'Chemical',
  'Cluster',
  'Kinetic',
  'Terrain',
  'Special',
  'Nuclear'
];

// ═══════════════════════════════════════════
// Universal weapons (available on all biomes)
// ═══════════════════════════════════════════
export const WEAPON_TYPES: WeaponConfig[] = [
  // ── Ballistic ──
  { name: 'Single Shot', damage: 30, explosionRadius: 30, color: '#fff', mass: 4, category: 'Ballistic' },
  { name: 'Big Shot', damage: 50, explosionRadius: 45, color: '#ffd', mass: 6, category: 'Ballistic' },
  { name: '3 Shot', damage: 20, explosionRadius: 20, count: 3, spread: 8, color: '#ffb', mass: 3, category: 'Ballistic' },

  // ── Laser ──
  { name: 'Raycast Laser', damage: 45, explosionRadius: 10, isBeam: true, thickness: 8, color: '#ff0000', mass: 0, category: 'Laser' },
  { name: 'Particle Beam', damage: 70, explosionRadius: 20, isBeam: true, thickness: 15, color: '#00ffff', mass: 0, category: 'Laser' },

  // ── Defense ──
  { name: 'Energy Shield', damage: 0, explosionRadius: 0, isShield: true, color: '#00aaff', mass: 8, category: 'Defense' },
  { name: 'Trap Bubble', damage: 0, explosionRadius: 0, isBubble: true, bubbleRadius: 45, bubbleThick: 15, color: '#aaa', mass: 5, category: 'Defense' },

  // ── Chemical ──
  { name: 'Acid Bomb', damage: 15, explosionRadius: 20, isAcid: true, count: 1, color: '#00ff00', mass: 4, category: 'Chemical' },
  { name: 'Acid Rain', damage: 5, explosionRadius: 15, isAcid: true, count: 5, spread: 15, color: '#00ff00', mass: 3, category: 'Chemical' },

  // ── Cluster ──
  { name: 'Cluster Bomb', damage: 25, explosionRadius: 25, isCluster: true, clusterCount: 5, color: '#fc0', mass: 5, category: 'Cluster' },
  { name: 'MIRV', damage: 30, explosionRadius: 30, isSplitter: true, splitCount: 3, color: '#f50', mass: 6, category: 'Cluster' },
  { name: 'Death From Above', damage: 40, explosionRadius: 40, isSplitter: true, splitCount: 5, color: '#f20', mass: 7, category: 'Cluster' },

  // ── Kinetic ──
  { name: 'Roller', damage: 35, explosionRadius: 30, isRoller: true, rollLife: 60, color: '#888', mass: 8, category: 'Kinetic' },
  { name: 'Bouncer', damage: 25, explosionRadius: 25, isBouncer: true, bounces: 3, color: '#0f0', mass: 3, category: 'Kinetic' },
  { name: 'Heatseeker', damage: 35, explosionRadius: 30, isHoming: true, color: '#f0f', mass: 3, category: 'Kinetic' },

  // ── Terrain ──
  { name: 'Dirt Mover', damage: 0, explosionRadius: 40, isDirt: true, color: '#842', mass: 5, category: 'Terrain' },
  { name: 'Mountain Borer', damage: 40, explosionRadius: 50, isBorer: true, boreRadius: 15, color: '#663300', mass: 8, category: 'Terrain' },
  { name: 'Magic Wall', damage: 0, explosionRadius: 40, isWall: true, wallType: 'default', color: '#aaa', mass: 5, category: 'Terrain' },
  { name: 'Black Wall', damage: 0, explosionRadius: 40, isWall: true, wallType: 'black', color: '#222', mass: 5, category: 'Terrain' },
  { name: 'Rainbow Wall', damage: 0, explosionRadius: 40, isWall: true, wallType: 'rainbow', color: '#ff00ff', mass: 5, category: 'Terrain' },
  { name: 'Dirt Cutter', damage: 10, explosionRadius: 45, isCutter: true, color: '#a64', mass: 4, category: 'Terrain' },
  { name: 'Mountain Cutter', damage: 25, explosionRadius: 90, isCutter: true, color: '#c53', mass: 8, category: 'Terrain' },
  { name: 'Digger', damage: 20, explosionRadius: 35, isCutter: true, color: '#aa6622', mass: 6, category: 'Terrain' },
  { name: 'Crusher', damage: 60, explosionRadius: 75, isCutter: true, color: '#888', mass: 12, category: 'Terrain' },
  { name: 'Earth Worm', damage: 25, explosionRadius: 30, isBorer: true, boreRadius: 20, isBouncer: true, bounces: 4, color: '#ff88cc', mass: 4, category: 'Terrain' },
  { name: 'Earth Slinger', damage: 5, explosionRadius: 20, isDirt: true, isCluster: true, clusterCount: 6, color: '#66aa00', mass: 5, category: 'Terrain' },
  { name: 'Scatter Dirt Rain', damage: 5, explosionRadius: 25, isDirt: true, count: 12, spread: 4, color: '#884422', mass: 4, category: 'Terrain' },

  // ── Special ──
  { name: 'Green Frog', damage: 0, explosionRadius: 60, isFrog: true, force: 22, color: '#0f0', mass: 5, category: 'Special' },
  { name: 'Mega Frog', damage: 0, explosionRadius: 90, isFrog: true, force: 40, color: '#0f8', mass: 8, category: 'Special' },
  { name: 'Color Bombs', damage: 12, explosionRadius: 30, isCluster: true, isColorBomb: true, clusterCount: 8, color: '#fff', mass: 5, category: 'Special' },
  { name: 'Sling Shots', damage: 15, explosionRadius: 25, count: 5, spread: 20, isBouncer: true, bounces: 2, color: '#ccc', mass: 3, category: 'Special' },
  { name: 'Tar Bomb', damage: 15, explosionRadius: 40, isCluster: true, clusterCount: 4, isColorBomb: true, paintColors: ['#111111', '#222222', '#000000'], color: '#111', mass: 6, category: 'Special' },

  // ── Nuclear ──
  { name: 'Nuke', damage: 100, explosionRadius: 80, color: '#fff', mass: 8, glow: '#fff', category: 'Nuclear' },
  { name: 'Mega Nuke', damage: 250, explosionRadius: 150, color: '#ffaaaa', mass: 12, glow: '#ff0000', category: 'Nuclear' },
  { name: 'Scatter bomb', damage: 20, explosionRadius: 35, isCluster: true, clusterCount: 15, color: '#ff5500', mass: 7, category: 'Nuclear' },

  // ═══════════════════════════════════════════
  //  GRASSLANDS — Nature-themed
  // ═══════════════════════════════════════════
  { name: 'Vine Trap', damage: 0, explosionRadius: 35, isDirt: true, color: '#228B22', mass: 5, biome: 'Grasslands', glow: '#00cc44', category: 'Terrain' },
  { name: 'Pollen Cloud', damage: 10, explosionRadius: 35, isIncendiary: true, count: 1, color: '#ccff00', mass: 3, biome: 'Grasslands', explosionColor: '#aaff00', category: 'Chemical' },
  { name: 'Root Borer', damage: 35, explosionRadius: 25, isBorer: true, boreRadius: 12, color: '#8B4513', mass: 7, biome: 'Grasslands', trailColor: '#654321', category: 'Kinetic' },
  { name: 'Thorn Burst', damage: 20, explosionRadius: 20, isCluster: true, clusterCount: 7, color: '#2e8b57', mass: 4, biome: 'Grasslands', explosionColor: '#228B22', category: 'Cluster' },

  // ═══════════════════════════════════════════
  //  DESERT — Heat / Sand themed
  // ═══════════════════════════════════════════
  { name: 'Sand Storm', damage: 15, explosionRadius: 70, color: '#daa520', mass: 6, biome: 'Desert', isFrog: true, force: 18, glow: '#ffd700', category: 'Special' },
  { name: 'Quicksand', damage: 5, explosionRadius: 55, color: '#c2a645', mass: 5, biome: 'Desert', explosionColor: '#b8860b', category: 'Terrain' },
  { name: 'Scorpion Sting', damage: 40, explosionRadius: 25, isHoming: true, color: '#ff4500', mass: 2, biome: 'Desert', trailColor: '#ff6600', glow: '#ff4500', category: 'Kinetic' },
  { name: 'Heat Mirage', damage: 55, explosionRadius: 18, isBeam: true, thickness: 18, color: '#ff8c00', mass: 0, biome: 'Desert', glow: '#ffaa00', category: 'Laser' },

  // ═══════════════════════════════════════════
  //  SNOW — Ice / Frost themed
  // ═══════════════════════════════════════════
  { name: 'Avalanche', damage: 30, explosionRadius: 30, isCluster: true, clusterCount: 8, isRoller: true, rollLife: 40, color: '#b0d4f1', mass: 6, biome: 'Snow', explosionColor: '#e0f0ff', category: 'Cluster' },
  { name: 'Frost Nova', damage: 25, explosionRadius: 45, isDirt: true, color: '#aaddff', mass: 5, biome: 'Snow', glow: '#88ccff', explosionColor: '#cceeff', category: 'Defense' },
  { name: 'Ice Spike', damage: 50, explosionRadius: 15, color: '#00ccff', mass: 3, biome: 'Snow', trailColor: '#88eeff', glow: '#00eeff', category: 'Ballistic' },
  { name: 'Blizzard Bomb', damage: 35, explosionRadius: 35, isSplitter: true, splitCount: 4, color: '#99ccff', mass: 6, biome: 'Snow', explosionColor: '#b0e0ff', category: 'Cluster' },
];

/**
 * Returns weapons available for the given biome.
 * Universal weapons (no biome) + weapons matching the biome.
 */
export function getWeaponsForBiome(biome: string): WeaponConfig[] {
  return WEAPON_TYPES.filter(w => !w.biome || w.biome === biome);
}

/**
 * Groups the given weapons by category for the armory panel.
 */
export function groupWeaponsByCategory(weapons: WeaponConfig[]): Map<string, WeaponConfig[]> {
  const grouped = new Map<string, WeaponConfig[]>();
  for (const cat of WEAPON_CATEGORIES) {
    const catWeapons = weapons.filter(w => w.category === cat);
    if (catWeapons.length > 0) {
      grouped.set(cat, catWeapons);
    }
  }
  return grouped;
}
