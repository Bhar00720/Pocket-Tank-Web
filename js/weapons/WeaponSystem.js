export const WEAPON_TYPES = [
    { name: 'Single Shot', damage: 30, explosionRadius: 30, color: '#fff', mass: 4 },
    { name: 'Big Shot', damage: 50, explosionRadius: 45, color: '#ffd', mass: 6 },
    { name: '3 Shot', damage: 20, explosionRadius: 20, count: 3, spread: 8, color: '#ffb', mass: 3 },
    
    // Lasers (True Raycasts)
    { name: 'Raycast Laser', damage: 45, explosionRadius: 10, isBeam: true, thickness: 8, color: '#ff0000', mass: 0 },
    { name: 'Particle Beam', damage: 70, explosionRadius: 20, isBeam: true, thickness: 15, color: '#00ffff', mass: 0 },

    // Advanced Mechanics
    { name: 'Energy Shield', damage: 0, explosionRadius: 0, isShield: true, color: '#00aaff', mass: 8 },
    { name: 'Trap Bubble', damage: 0, explosionRadius: 0, isBubble: true, bubbleRadius: 45, bubbleThick: 15, color: '#aaa', mass: 5 },
    { name: 'Acid Bomb', damage: 15, explosionRadius: 20, isAcid: true, count: 1, color: '#00ff00', mass: 4 },
    { name: 'Acid Rain', damage: 5, explosionRadius: 15, isAcid: true, count: 5, spread: 15, color: '#00ff00', mass: 3 },
    
    // Splitters & Clusters
    { name: 'Cluster Bomb', damage: 25, explosionRadius: 25, isCluster: true, clusterCount: 5, color: '#fc0', mass: 5 },
    { name: 'MIRV', damage: 30, explosionRadius: 30, isSplitter: true, splitCount: 3, color: '#f50', mass: 6 },
    { name: 'Death From Above', damage: 40, explosionRadius: 40, isSplitter: true, splitCount: 5, color: '#f20', mass: 7 },
    
    // Kinetic & Homing
    { name: 'Roller', damage: 35, explosionRadius: 30, isRoller: true, rollLife: 60, color: '#888', mass: 8 },
    { name: 'Bouncer', damage: 25, explosionRadius: 25, isBouncer: true, bounces: 3, color: '#0f0', mass: 3 },
    { name: 'Heatseeker', damage: 35, explosionRadius: 30, isHoming: true, color: '#f0f', mass: 3 },
    
    // Terrain Tools
    { name: 'Dirt Mover', damage: 0, explosionRadius: 40, isDirt: true, color: '#842', mass: 5 },
    { name: 'Mountain Borer', damage: 40, explosionRadius: 50, isBorer: true, boreRadius: 15, color: '#663300', mass: 8 },
    { name: 'Magic Wall', damage: 0, explosionRadius: 40, isWall: true, color: '#aaa', mass: 5 }, 
    
    // Kinetic Anomalies
    { name: 'Green Frog', damage: 0, explosionRadius: 60, isFrog: true, force: 22, color: '#0f0', mass: 5 },
    { name: 'Mega Frog', damage: 0, explosionRadius: 90, isFrog: true, force: 40, color: '#0f8', mass: 8 },

    { name: 'Nuke', damage: 100, explosionRadius: 80, color: '#fff', mass: 8, glow: '#fff' }
];
