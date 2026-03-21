export class Particle {
    constructor(x, y, color, speed, life) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * speed;
        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 4 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; 
        this.life--;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export class FireParticle extends Particle {
    constructor(x, y) {
        super(x, y, '#ff5500', 3, 150);
        this.y = y;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = -(Math.random() * 2 + 1); 
    }
    
    update(terrain) {
        this.x += this.vx;
        this.y += this.vy;
        
        if (Math.random() < 0.1) this.vx = -this.vx + (Math.random()-0.5);
        this.vy -= Math.random() * 0.1; 
        
        this.life--;
        if (this.life < 80) this.color = '#ffaa00';
        if (this.life < 40) { this.color = '#333333'; }
    }
}

export class AcidParticle extends Particle {
    constructor(x, y) {
        super(x, y, '#00ff00', 4, 150);
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = -(Math.random() * 3 + 1);
        this.size = Math.random() * 3 + 2;
    }
    
    update(terrain) {
        this.vy += 0.2; 
        this.x += this.vx;
        this.y += this.vy;
        
        if (terrain.isSolid(this.x, this.y)) {
            this.vx = 0;
            this.vy = 0;
            if (Math.random() < 0.2) {
                terrain.destroy(this.x, this.y, 4);
            }
        }
        
        this.life--;
        if (this.life < 50) this.color = '#005500';
    }
}

export class TextParticle {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 60;
        this.maxLife = 60;
        this.vy = -1.5 - Math.random();
        this.vx = (Math.random() - 0.5) * 2;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05; 
        this.life--;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

export class BeamParticle {
    constructor(x1, y1, x2, y2, color, thickness) {
        this.x1 = x1; this.y1 = y1;
        this.x2 = x2; this.y2 = y2;
        this.color = color;
        this.thickness = thickness || 10;
        this.life = 20;
        this.maxLife = 20;
    }
    update() { this.life--; }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = this.thickness;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.thickness * 0.5;
        ctx.stroke();
        ctx.restore();
    }
}

export function createExplosion(x, y, particlesArray, isSmall, customColorHex) {
    let colors = ['#ff5500', '#ffaa00', '#ffffff', '#333333'];
    if (customColorHex) colors = [customColorHex, '#ffffff', '#333333'];
    const count = isSmall ? 10 : 40;
    for(let i=0; i<count; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        particlesArray.push(new Particle(x, y, color, Math.random()*8 + (isSmall?2:5), Math.floor(Math.random()*40 + 20)));
    }
}
