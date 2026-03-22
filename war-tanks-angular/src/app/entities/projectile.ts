import { WeaponConfig } from '../weapons/weapon-system';
import { PhysicsEngine } from '../engine/physics.service';
import { Tank } from './tank';

interface HistoryPoint {
  x: number;
  y: number;
}

export class Projectile {
  x: number;
  y: number;
  ownerId: number;
  weapon: WeaponConfig;
  vx: number;
  vy: number;
  radius: number;
  explosionRadius: number;
  damage: number;
  color: string;
  glow: string | undefined;
  mass: number;
  dragProf: number;
  active: boolean;
  triggerCluster: boolean;
  triggerSplit: boolean;
  history: HistoryPoint[];
  bounces: number;
  rollLife: number;
  lastVy: number;

  constructor(x: number, y: number, angle: number, power: number, ownerId: number, weaponConfig: WeaponConfig) {
    this.x = x;
    this.y = y;
    this.ownerId = ownerId;
    this.weapon = weaponConfig;

    const rad = angle * Math.PI / 180;
    let speed = power * 0.45;
    if (weaponConfig.isLaser) speed *= 3;

    this.vx = Math.cos(rad) * speed;
    this.vy = -Math.sin(rad) * speed;

    this.radius = weaponConfig.radius || 4;
    this.explosionRadius = weaponConfig.explosionRadius;
    this.damage = weaponConfig.damage;
    this.color = weaponConfig.color;
    this.glow = weaponConfig.glow;

    this.mass = weaponConfig.mass || 3;
    this.dragProf = weaponConfig.dragProf || 0.5;

    this.active = true;
    this.triggerCluster = false;
    this.triggerSplit = false;
    this.history = [];

    this.bounces = weaponConfig.bounces || 0;
    this.rollLife = weaponConfig.rollLife || 0;
    this.lastVy = 0;
  }

  update(physics: PhysicsEngine, players: Tank[]): void {
    if (!this.active) return;

    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 20) this.history.shift();

    this.lastVy = this.vy;

    if (this.weapon.isLaser) {
      // Straight laser - 0 gravity effect
    } else {
      const speedSq = this.vx * this.vx + this.vy * this.vy;
      const dragForce = 0.0005 * physics.airDensity * speedSq * this.dragProf;

      const speedMag = Math.sqrt(speedSq) || 1;
      const dragAccX = (dragForce * (this.vx / speedMag)) / this.mass;
      const dragAccY = (dragForce * (this.vy / speedMag)) / this.mass;

      this.vy += physics.gravity - dragAccY;
      this.vx += (physics.wind / this.mass) - dragAccX;

      // Heatseeker curve logic
      if (this.weapon.isHoming && players) {
        const target = players.find((p, idx) => idx !== this.ownerId && p.health > 0);
        if (target) {
          const dx = target.x - this.x;
          const dy = (target.y - target.height / 2) - this.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0) {
            this.vx += (dx / dist) * 0.25;
            this.vy += (dy / dist) * 0.25;
          }
        }
      }
    }

    // Apex cross triggers MIRV
    if (this.weapon.isSplitter && this.lastVy <= 0 && this.vy > 0 && this.y < 350) {
      this.triggerSplit = true;
    }

    // Standard air-burst trigger
    if (this.weapon.isCluster && this.vy > 0 && this.y > 100 && Math.random() < 0.04) {
      this.triggerCluster = true;
    }

    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    if (this.history.length > 0) {
      const trailStyle = this.weapon.category || 'Ballistic';
      const timeOffset = Date.now() / 150; // Animated phase

      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = Math.max(1, this.radius - 1);
      ctx.strokeStyle = this.weapon.trailColor || this.color;
      
      if (trailStyle === 'Laser') {
        // Flat, sharp segmented lines with high alpha
        ctx.globalAlpha = 0.8;
        ctx.setLineDash([15, 5]);
        ctx.lineDashOffset = -timeOffset * 20;
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) ctx.lineTo(this.history[i].x, this.history[i].y);
        ctx.stroke();

        // Core bright beam over it
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

      } else if (trailStyle === 'Chemical' || this.weapon.isAcid) {
        // Bubbling / wiggly trail
        ctx.setLineDash([]);
        ctx.beginPath();
        for (let i = 0; i < this.history.length - 1; i++) {
          const pt = this.history[i];
          const next = this.history[i+1];
          const wiggle = Math.sin(i * 0.5 + timeOffset) * 3;
          
          const dx = next.x - pt.x;
          const dy = next.y - pt.y;
          const len = Math.hypot(dx, dy);
          const nx = -dy / (len||1);
          const ny = dx / (len||1);
          
          if (i === 0) ctx.moveTo(pt.x + nx * wiggle, pt.y + ny * wiggle);
          else ctx.lineTo(pt.x + nx * wiggle, pt.y + ny * wiggle);
        }
        ctx.stroke();

      } else if (trailStyle === 'Special' || trailStyle === 'Nuclear') {
        // Spiral dual-helix animated trail
        ctx.setLineDash([]);
        
        // Helix 1
        ctx.beginPath();
        ctx.strokeStyle = this.weapon.trailColor || '#ff00ff';
        for (let i = 0; i < this.history.length; i++) {
          const pt = this.history[i];
          const next = this.history[i+1] || pt;
          const prev = this.history[i-1] || pt;
          const dx = next.x - prev.x;
          const dy = next.y - prev.y;
          const len = Math.hypot(dx,dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const offset = Math.sin(i * 0.4 - timeOffset * 2) * 5;
          if (i === 0) ctx.moveTo(pt.x + nx * offset, pt.y + ny * offset);
          else ctx.lineTo(pt.x + nx * offset, pt.y + ny * offset);
        }
        ctx.stroke();
        
        // Helix 2
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        for (let i = 0; i < this.history.length; i++) {
          const pt = this.history[i];
          const next = this.history[i+1] || pt;
          const prev = this.history[i-1] || pt;
          const dx = next.x - prev.x;
          const dy = next.y - prev.y;
          const len = Math.hypot(dx,dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const offset = Math.sin(i * 0.4 - timeOffset * 2 + Math.PI) * 5;
          if (i === 0) ctx.moveTo(pt.x + nx * offset, pt.y + ny * offset);
          else ctx.lineTo(pt.x + nx * offset, pt.y + ny * offset);
        }
        ctx.stroke();

      } else if (trailStyle === 'Defense' || trailStyle === 'Terrain') {
        // Dotted chunky thick dirt/shield rounds
        ctx.setLineDash([2, 6]);
        ctx.lineWidth = this.radius * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) ctx.lineTo(this.history[i].x, this.history[i].y);
        ctx.stroke();

      } else {
        // Standard Ballistic (Solid fading line)
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) {
          ctx.lineTo(this.history[i].x, this.history[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    const glowColor = this.weapon.trailColor || this.glow;
    if (glowColor) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}
