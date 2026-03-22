import { Tank } from '../entities/tank';
import { Terrain } from '../entities/terrain';
import { WeaponConfig, getWeaponsForBiome } from '../weapons/weapon-system';
import { PhysicsEngine } from './physics.service';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

interface AIConfig {
  aimAngleError: number;
  aimPowerError: number;
  thinkTimeMin: number;
  thinkTimeMax: number;
  moveChance: number;
  weaponStrategy: 'random' | 'distance' | 'optimal';
  useBeams: boolean;
  useShieldWhenLow: boolean;
  animStepDelay: number;
  // NEW — realistic behavior tuning
  weaponBrowseCount: number;    // how many weapons AI scrolls through before picking
  pauseVariance: number;        // random variance multiplier on pauses
  mistakeChance: number;        // chance AI makes a "mistake" (bad direction, readjust, etc.)
  readjustChance: number;       // chance AI readjusts after setting values
  decisivenessDelay: number;    // ms pause before confirming action (lower = more decisive)
  targetAccuracy: number;       // EXACT chance (0 to 1) the AI aims to directly hit the player
}

const DIFFICULTY_CONFIG: Record<AIDifficulty, AIConfig> = {
  easy: {
    aimAngleError: 15,
    aimPowerError: 20,
    thinkTimeMin: 2500,
    thinkTimeMax: 4500,
    moveChance: 0.15,
    weaponStrategy: 'random',
    useBeams: false,
    useShieldWhenLow: false,
    animStepDelay: 110,
    weaponBrowseCount: 4,     // browses many weapons indecisively
    pauseVariance: 1.5,
    mistakeChance: 0.30,      // 30% chance of a mistake
    readjustChance: 0.40,     // often readjusts
    decisivenessDelay: 800,
    targetAccuracy: 0.45,     // 45% hit rate
  },
  medium: {
    aimAngleError: 8,
    aimPowerError: 12,
    thinkTimeMin: 1500,
    thinkTimeMax: 3000,
    moveChance: 0.30,
    weaponStrategy: 'distance',
    useBeams: true,
    useShieldWhenLow: true,
    animStepDelay: 70,
    weaponBrowseCount: 2,
    pauseVariance: 1.0,
    mistakeChance: 0.12,
    readjustChance: 0.20,
    decisivenessDelay: 400,
    targetAccuracy: 0.65,     // 65% hit rate
  },
  hard: {
    aimAngleError: 3,
    aimPowerError: 5,
    thinkTimeMin: 800,
    thinkTimeMax: 1800,
    moveChance: 0.50,
    weaponStrategy: 'optimal',
    useBeams: true,
    useShieldWhenLow: true,
    animStepDelay: 40,
    weaponBrowseCount: 0,     // picks immediately
    pauseVariance: 0.5,
    mistakeChance: 0.03,      // almost never
    readjustChance: 0.05,
    decisivenessDelay: 150,
    targetAccuracy: 0.87,     // 87% hit rate
  },
};

export class AIPlayer {
  difficulty: AIDifficulty;
  private config: AIConfig;
  private isTakingTurn = false;
  private aborted = false;

  constructor(difficulty: AIDifficulty) {
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIG[difficulty];
  }

  abort(): void {
    this.aborted = true;
  }

  /**
   * Main entry — called by GameEngine when it's the AI's turn.
   * The sequence mimics a real player:
   *   1. Assess battlefield (think pause)
   *   2. Browse through weapons, hesitate, pick one
   *   3. Optionally move tank to reposition
   *   4. Adjust angle step-by-step (with possible overshoot/correction)
   *   5. Adjust power step-by-step
   *   6. Final check pause
   *   7. Fire
   */
  async takeTurn(
    aiTank: Tank,
    opponent: Tank,
    terrain: Terrain,
    physics: PhysicsEngine,
    biome: string,
    onAngleChange: (angle: number) => void,
    onPowerChange: (power: number) => void,
    onWeaponChange: (weaponIndex: number) => void,
    onMove: (dir: string) => boolean,
    onFire: () => void
  ): Promise<void> {
    if (this.isTakingTurn) return;
    this.isTakingTurn = true;
    this.aborted = false;

    try {
      // ── STEP 1: Think (assess battlefield) ──
      const thinkTime = this.config.thinkTimeMin +
        Math.random() * (this.config.thinkTimeMax - this.config.thinkTimeMin);
      await this.sleep(thinkTime);
      if (this.aborted) return;

      // ── STEP 2: Browse and select weapon ──
      const weapons = getWeaponsForBiome(biome);
      const targetWeaponIdx = this.pickWeapon(aiTank, opponent, terrain, weapons);
      const weapon = weapons[targetWeaponIdx];

      await this.browseWeapons(aiTank, weapons, targetWeaponIdx, onWeaponChange);
      if (this.aborted) return;

      // Pause after weapon selection (like reading the weapon stats)
      await this.sleep(300 * this.config.pauseVariance + Math.random() * 400);
      if (this.aborted) return;

      // ── STEP 3: Optionally reposition ──
      if (Math.random() < this.config.moveChance && aiTank.fuel > 10) {
        await this.doMovement(aiTank, opponent, terrain, onMove);
        if (this.aborted) return;
        await this.sleep(300 * this.config.pauseVariance + Math.random() * 300);
        if (this.aborted) return;
      }

      // ── STEP 4: Calculate target aim ──
      const { angle, power } = this.calculateAim(aiTank, opponent, terrain, physics, weapon);

      // ── STEP 5: Adjust angle (animated) ──
      await this.animateValue(aiTank.angle, angle, (v) => {
        if (!this.aborted) onAngleChange(Math.round(v));
      });
      if (this.aborted) return;

      // Pause between angle and power (thinking about power)
      await this.sleep(200 * this.config.pauseVariance + Math.random() * 300);
      if (this.aborted) return;

      // ── STEP 6: Adjust power (animated) ──
      await this.animateValue(aiTank.power, power, (v) => {
        if (!this.aborted) onPowerChange(Math.round(v));
      });
      if (this.aborted) return;

      // ── STEP 7: Maybe readjust (human-like second-guessing) ──
      if (Math.random() < this.config.readjustChance) {
        await this.sleep(400 * this.config.pauseVariance);
        if (this.aborted) return;

        // Tweak angle by a few degrees
        const tweak = Math.round((Math.random() - 0.5) * 6);
        await this.animateValue(aiTank.angle, aiTank.angle + tweak, (v) => {
          if (!this.aborted) onAngleChange(Math.round(v));
        });
        if (this.aborted) return;
      }

      // ── STEP 8: Final check pause (finger on trigger) ──
      await this.sleep(this.config.decisivenessDelay + Math.random() * 300);
      if (this.aborted) return;

      // ── STEP 9: FIRE! ──
      onFire();
    } finally {
      this.isTakingTurn = false;
    }
  }

  // ─────────────────────────────────────────
  //  WEAPON BROWSING (visible scrolling)
  // ─────────────────────────────────────────
  private async browseWeapons(
    aiTank: Tank,
    weapons: WeaponConfig[],
    targetIndex: number,
    onWeaponChange: (idx: number) => void
  ): Promise<void> {
    const browseCount = this.config.weaponBrowseCount;

    if (browseCount === 0) {
      // Hard mode: pick directly
      onWeaponChange(targetIndex);
      return;
    }

    // Start from current weapon, browse through a few
    let currentIdx = aiTank.weaponIndex || 0;

    // Visit some random weapons before landing on the target
    const visited: number[] = [];
    for (let i = 0; i < browseCount; i++) {
      let next = Math.floor(Math.random() * weapons.length);
      if (next === targetIndex && i < browseCount - 1) {
        next = (next + 1) % weapons.length;
      }
      visited.push(next);
    }
    visited.push(targetIndex); // always end on the target

    for (const idx of visited) {
      if (this.aborted) return;
      onWeaponChange(idx);
      // Pause on each weapon (like reading its name)
      await this.sleep(250 + Math.random() * 350 * this.config.pauseVariance);
    }
  }

  // ─────────────────────────────────────────
  //  AIM CALCULATION
  // ─────────────────────────────────────────
  private calculateAim(
    aiTank: Tank,
    opponent: Tank,
    terrain: Terrain,
    physics: PhysicsEngine,
    weapon: WeaponConfig
  ): { angle: number; power: number } {
    const dx = opponent.x - aiTank.x;
    const dy = -(opponent.y - aiTank.y);
    const dist = Math.hypot(dx, dy);

    // For beam weapons — direct line-of-sight
    if (weapon.isBeam) {
      const directAngle = Math.atan2(dy, dx) * 180 / Math.PI;
      const isBeamHit = Math.random() < this.config.targetAccuracy;
      const errorA = isBeamHit ? ((Math.random() - 0.5) * 3) : ((Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 15));
      return {
        angle: Math.round(Math.max(0, Math.min(360, directAngle + errorA))),
        power: 50
      };
    }

    // For shield — doesn't matter
    if (weapon.isShield) {
      return { angle: aiTank.angle, power: aiTank.power };
    }

    // Projectile physics simulation — Deep search for the absolute BEST shot
    let bestAngle = dx > 0 ? 45 : 135;
    let bestPower = 50;
    let bestDist = Infinity;
    const hitRadius = opponent.width / 2 + 10;
    
    // Maintain a list of "misses" (shots that land significantly short or far)
    const validMisses: {angle: number, power: number, dist: number}[] = [];

    // Coarse pass
    const angles = this.generateSearchAngles(dx);
    const powers = [20, 30, 40, 50, 60, 70, 80, 90, 100];

    for (const tryAngle of angles) {
      for (const tryPower of powers) {
        const landing = this.simulateShot(aiTank.x, aiTank.y - 10, tryAngle, tryPower, terrain, physics, weapon);
        const landDist = Math.hypot(landing.x - opponent.x, landing.y - opponent.y);
        
        if (landDist < bestDist) {
          bestDist = landDist;
          bestAngle = tryAngle;
          bestPower = tryPower;
        }
        
        // Save candidate misses (land 30-100 pixels away)
        if (landDist > hitRadius * 2 && landDist < 120) {
          validMisses.push({ angle: tryAngle, power: tryPower, dist: landDist });
        }
      }
    }

    // Refine second pass (fine-tuned)
    for (let a = bestAngle - 6; a <= bestAngle + 6; a++) {
      for (let p = bestPower - 12; p <= bestPower + 12; p += 2) {
        if (p < 10 || p > 100 || a < 0 || a > 360) continue;
        const landing = this.simulateShot(aiTank.x, aiTank.y - 10, a, p, terrain, physics, weapon);
        const landDist = Math.hypot(landing.x - opponent.x, landing.y - opponent.y);
        
        if (landDist < bestDist) {
          bestDist = landDist;
          bestAngle = a;
          bestPower = p;
        }
        
        if (landDist > hitRadius * 2 && landDist < 120) {
          validMisses.push({ angle: a, power: p, dist: landDist });
        }
      }
    }

    // Calculate Hit vs Miss based on EXACT percentages required by prompt
    const isHit = Math.random() <= this.config.targetAccuracy;
    
    if (isHit || validMisses.length === 0) {
      // 🎯 Perfect Hit (or extremely close)
      // Add a tiny bit of variance so shots don't land exactly pixel-perfect every time but still hit
      const varianceA = (Math.random() - 0.5) * 1.5;
      const varianceP = (Math.random() - 0.5) * 1.5;
      return {
        angle: Math.round(Math.max(0, Math.min(360, bestAngle + varianceA))),
        power: Math.round(Math.max(10, Math.min(100, bestPower + varianceP)))
      };
    } else {
      // ❌ Intentional Miss - scales exactly based on difficulty
      // Hard mode: tight miss (8-25px), Medium (15-50px), Easy (30-100px)
      const isHard = this.difficulty === 'hard';
      const isMedium = this.difficulty === 'medium';
      
      const targetMissDistMin = hitRadius + (isHard ? 8 : (isMedium ? 15 : 30));
      const targetMissDistMax = hitRadius + (isHard ? 25 : (isMedium ? 50 : 100));
      
      const appropriateMisses = validMisses.filter(m => m.dist >= targetMissDistMin && m.dist <= targetMissDistMax);
      
      if (appropriateMisses.length > 0) {
        const miss = appropriateMisses[Math.floor(Math.random() * appropriateMisses.length)];
        return {
          angle: Math.round(miss.angle),
          power: Math.round(miss.power)
        };
      } else {
        // Fallback miss explicitly adjusted to difficulty constraints
        const dirA = Math.random() > 0.5 ? 1 : -1;
        const dirP = Math.random() > 0.5 ? 1 : -1;
        
        let tweakA = dirA * (1 + Math.random() * this.config.aimAngleError);
        let tweakP = dirP * (2 + Math.random() * this.config.aimPowerError);
        
        // Easy makes bigger mistakes
        if (!isHard && Math.random() < this.config.mistakeChance) {
           tweakA *= 2;
           tweakP *= 2;
        }

        return {
          angle: Math.round(Math.max(0, Math.min(360, bestAngle + tweakA))),
          power: Math.round(Math.max(10, Math.min(100, bestPower + tweakP)))
        };
      }
    }
  }

  private generateSearchAngles(dx: number): number[] {
    const angles: number[] = [];
    if (dx > 0) {
      for (let a = 15; a <= 85; a += 5) angles.push(a);
    } else {
      for (let a = 95; a <= 165; a += 5) angles.push(a);
    }
    return angles;
  }

  private simulateShot(
    startX: number, startY: number,
    angle: number, power: number,
    terrain: Terrain,
    physics: PhysicsEngine,
    weapon: WeaponConfig
  ): { x: number; y: number } {
    const rad = angle * Math.PI / 180;
    const speed = power * 0.45;
    let vx = Math.cos(rad) * speed;
    let vy = -Math.sin(rad) * speed;
    let x = startX + Math.cos(rad) * 30;
    let y = startY - Math.sin(rad) * 30;
    const mass = weapon.mass || 3;
    const drag = weapon.dragProf || 0.5;

    for (let i = 0; i < 800; i++) {
      const speedSq = vx * vx + vy * vy;
      const dragForce = 0.0005 * physics.airDensity * speedSq * drag;
      const speedMag = Math.sqrt(speedSq) || 1;
      vy += physics.gravity - (dragForce * (vy / speedMag)) / mass;
      vx += (physics.wind / mass) - (dragForce * (vx / speedMag)) / mass;
      
      x += vx;
      y += vy;
      
      // Stop condition 1: Hit Mountain or Ground
      if (y >= 0 && x >= 0 && x < terrain.width && y < terrain.height) {
        if (terrain.isSolid(Math.round(x), Math.round(y))) {
          return { x, y };
        }
      }
      
      // Stop condition 2: Fell off the world
      if (y > terrain.height) return { x, y };
      
      // Stop condition 3: Out of bounds (horizontally) and already falling
      if ((x < -100 || x > terrain.width + 100) && vy > 0 && y > terrain.height / 2) return { x, y };
    }
    return { x, y };
  }

  // ─────────────────────────────────────────
  //  WEAPON SELECTION (per-difficulty strategy)
  // ─────────────────────────────────────────
  private isTrapped(tank: Tank, terrain: Terrain): boolean {
    let leftY = tank.y;
    for(let x = tank.x; x >= Math.max(0, tank.x - 40); x--) {
      while(leftY > 0 && terrain.isSolid(x, leftY - 1)) leftY--;
      while(leftY < terrain.height && !terrain.isSolid(x, leftY)) leftY++;
    }
    let rightY = tank.y;
    for(let x = tank.x; x <= Math.min(terrain.width, tank.x + 40); x++) {
      while(rightY > 0 && terrain.isSolid(x, rightY - 1)) rightY--;
      while(rightY < terrain.height && !terrain.isSolid(x, rightY)) rightY++;
    }
    return (tank.y - leftY > 35) && (tank.y - rightY > 35);
  }

  private isMountainBlocked(tank: Tank, opponent: Tank, terrain: Terrain): boolean {
    let peakY = terrain.height;
    const startX = Math.min(tank.x, opponent.x);
    const endX = Math.max(tank.x, opponent.x);
    for(let x = startX; x <= endX; x += 5) {
      let y = 0;
      while(!terrain.isSolid(x, y) && y < terrain.height) y++;
      if (y < peakY) peakY = y;
    }
    const tankTop = Math.min(tank.y, opponent.y);
    return (tankTop - peakY > 50);
  }

  private pickWeapon(aiTank: Tank, opponent: Tank, terrain: Terrain, weapons: WeaponConfig[]): number {
    const dist = Math.hypot(aiTank.x - opponent.x, aiTank.y - opponent.y);
    const isTrapped = this.isTrapped(aiTank, terrain);
    const isBlocked = this.isMountainBlocked(aiTank, opponent, terrain);
    const opponentShielded = opponent.shieldLife > 0;
    const opponentLow = opponent.health <= 40;
    const aiLow = aiTank.health <= 50;

    const scoredWeapons = weapons.map((w, index) => {
      let score = w.damage || 0;

      // 1. Survival / Shields
      if (w.isShield) {
        if (aiLow && this.config.useShieldWhenLow) score += 500;
        else score += 5; // Minimal desire otherwise
      }

      // 2. Escape Utilities
      if (isTrapped) {
        if (w.isFrog || w.isDirt || w.isWall || w.isBorer) score += 800;
      } else {
        // If not trapped, generic utilities drop in value
        if (w.isDirt || w.isWall || w.isFrog) score -= 50;
      }

      // 3. Mountain Obstructions
      if (isBlocked) {
        if (w.isBorer || w.name === 'Nuke') score += 400; // Obliterate it
        if (w.isHoming || w.isCluster) score += 200; // Arc over it
        if (w.isBeam || w.name.includes('Laser')) score -= 600; // Laser fails on mountains
      } else {
        // Direct LOS
        if (w.isBeam || w.name.includes('Laser')) {
          if (this.config.useBeams) score += 300; 
        }
      }

      // 4. Enemy Condition
      if (opponentShielded) {
        // Don't waste high damage on shields, use cheap/spread weapons to pop it
        if (w.damage >= 50) score -= 1000;
        if (w.damage > 0 && w.damage <= 30 && (w.count && w.count > 1 || w.isCluster || w.isAcid)) score += 600;
      } else if (opponentLow) {
        // Don't overkill, guarantee the hit
        if (w.isCluster || w.isHoming || (w.count && w.count > 1)) score += 500;
        if (w.damage >= 80) score -= 200; // Save big weapons
      }

      // 5. Distance Matching
      if (dist < 200) {
        if (w.isRoller || w.isBouncer || w.isAcid || w.damage >= 35) score += 150;
        if (w.isHoming) score -= 200; // Homing is bad up close
      } else if (dist > 500) {
        if (w.isHoming || w.isSplitter || w.isCluster || w.damage >= 50) score += 200;
        if (w.isBouncer || w.isRoller) score -= 100;
      }

      return { index, score, weapon: w };
    });

    // Strategy difficulty filtering
    scoredWeapons.sort((a, b) => b.score - a.score);

    if (this.difficulty === 'hard') {
      // Hard: Always Mathematical Best
      return scoredWeapons[0].index;
    } else if (this.difficulty === 'medium') {
      // Medium: Top 4 choices
      const pool = scoredWeapons.slice(0, 4);
      return pool[Math.floor(Math.random() * pool.length)].index;
    } else {
      // Easy: Top 60%, heavily randomized
      const pool = scoredWeapons.slice(0, Math.ceil(scoredWeapons.length * 0.6));
      return pool[Math.floor(Math.random() * pool.length)].index;
    }
  }

  // ─────────────────────────────────────────
  //  MOVEMENT
  // ─────────────────────────────────────────
  private async doMovement(
    aiTank: Tank, opponent: Tank, _terrain: Terrain,
    onMove: (dir: string) => boolean
  ): Promise<void> {
    const dx = opponent.x - aiTank.x;
    let dir = dx > 0 ? 'right' : 'left';

    // Easy mode: sometimes moves the wrong direction
    if (Math.random() < this.config.mistakeChance) {
      dir = dir === 'left' ? 'right' : 'left';
    } else if (Math.random() < 0.2) {
      // Tactical retreat
      dir = dir === 'left' ? 'right' : 'left';
    }

    const steps = Math.floor(5 + Math.random() * 15);
    for (let i = 0; i < steps; i++) {
      if (this.aborted) return;
      const moved = onMove(dir);
      if (!moved) break;
      await this.sleep(40 + Math.random() * 20);
    }
  }

  // ─────────────────────────────────────────
  //  ANIMATION
  // ─────────────────────────────────────────
  private async animateValue(from: number, to: number, onStep: (value: number) => void): Promise<void> {
    const diff = to - from;
    if (Math.abs(diff) < 1) { onStep(to); return; }

    const steps = Math.max(1, Math.abs(Math.round(diff)));
    const stepSize = diff / steps;

    // Overshoot on non-hard difficulties
    const overshoot = this.difficulty !== 'hard' && Math.random() < 0.25;
    const overshootAmount = overshoot ? Math.round((Math.random() * 3 + 2) * Math.sign(diff)) : 0;

    let current = from;
    for (let i = 0; i < steps + Math.abs(overshootAmount); i++) {
      if (this.aborted) return;
      current += stepSize;
      onStep(current);

      // Occasionally pause mid-adjustment (thinking)
      if (Math.random() < 0.05 * this.config.pauseVariance) {
        await this.sleep(200 + Math.random() * 300);
      } else {
        await this.sleep(this.config.animStepDelay + Math.random() * 20);
      }
    }

    // Correct overshoot
    if (overshoot && !this.aborted) {
      await this.sleep(200 * this.config.pauseVariance);
      const correction = -Math.sign(overshootAmount);
      for (let i = 0; i < Math.abs(overshootAmount); i++) {
        if (this.aborted) return;
        current += correction;
        onStep(current);
        await this.sleep(this.config.animStepDelay + 30);
      }
    }

    if (!this.aborted) onStep(to);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
