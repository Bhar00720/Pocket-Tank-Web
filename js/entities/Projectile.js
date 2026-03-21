export class Projectile {
    constructor(x, y, angle, power, ownerId, weaponConfig) {
        this.x = x;
        this.y = y;
        this.ownerId = ownerId;
        this.weapon = weaponConfig;
        
        const rad = angle * Math.PI / 180;
        let speed = power * 0.45; 
        if (weaponConfig.isLaser) speed *= 3; // Super fast direct speed
        
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
    }

    update(physics, players) {
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
                    const dy = (target.y - target.height/2) - this.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 0) {
                        this.vx += (dx/dist) * 0.25;
                        this.vy += (dy/dist) * 0.25;
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

    draw(ctx) {
        if (!this.active) return;

        if (this.history.length > 0) {
            ctx.beginPath();
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for (let i = 1; i < this.history.length; i++) {
                ctx.lineTo(this.history[i].x, this.history[i].y);
            }
            ctx.strokeStyle = this.weapon.trailColor || this.color;
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = Math.max(1, this.radius - 1);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
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
