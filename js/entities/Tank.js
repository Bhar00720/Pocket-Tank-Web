export class Tank {
    constructor(x, y, color, typeId, name) {
        this.x = x;
        this.y = y;
        this.playerName = name || 'Player';
        this.color = color || '#00ff00';
        
        // Classic Arcade stats
        this.health = 100;
        this.width = 44;
        this.height = 20;
        this.maxFuel = 100;
        this.fuel = this.maxFuel;
        this.maxHealth = this.health;
        this.angle = 45; 
        this.power = 50; 
        this.weaponIndex = 0;
        this.shieldLife = 0;
        this.vx = 0;
        this.vy = 0;
        this.isAirborne = false;
    }

    update(terrain) {
        if (!terrain.isSolid(this.x, this.y + 1) || Math.abs(this.vy) > 1 || Math.abs(this.vx) > 0.5) {
            this.isAirborne = true;
            this.vy += 0.5;
            this.x += this.vx;
            this.y += this.vy;
            
            if (this.x < 10) { this.x = 10; this.vx *= -0.5; }
            if (this.x > terrain.width - 10) { this.x = terrain.width - 10; this.vx *= -0.5; }
            
            if (terrain.isSolid(this.x, this.y)) {
                this.y -= this.vy;
                this.vy *= -0.4;
                this.vx *= 0.6;
                if (Math.abs(this.vy) < 1.5) this.vy = 0;
                if (Math.abs(this.vx) < 0.2) this.vx = 0;
                while(terrain.isSolid(this.x, this.y)) this.y--;
            }
        } else {
            this.isAirborne = false;
            this.vx = 0;
            this.vy = 0;
            while(!terrain.isSolid(this.x, this.y + 1) && this.y < terrain.height) this.y++;
        }
    }

    dropToTerrain(terrain) {
        while (this.y < terrain.height && !terrain.isSolid(this.x, this.y)) this.y++;
        while (this.y > 0 && terrain.isSolid(this.x, this.y - 1)) this.y--;
    }

    move(direction, terrain) {
        if (this.fuel <= 0) return false;
        const step = direction === 'left' ? -1 : 1;
        
        const newX = this.x + step;
        if (newX < 25 || newX > terrain.width - 25) return false;

        let newY = this.y;
        while (newY > 0 && terrain.isSolid(newX, newY - 1)) newY--;
        while (newY < terrain.height && !terrain.isSolid(newX, newY)) newY++;

        if (Math.abs(newY - this.y) > 5) return false;

        this.x = newX;
        this.y = newY;
        this.fuel -= 0.5;
        return true;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        ctx.fillStyle = this.color;
        
        // Base / Treads (flat rounded rect matching pure Pocket Tanks)
        ctx.beginPath();
        ctx.roundRect(-22, -6, 44, 6, 2);
        ctx.fill();
        
        // Body (Circle arc dome)
        ctx.beginPath();
        ctx.arc(0, -6, 14, Math.PI, 0);
        ctx.fill();

        ctx.restore();

        // Player Name floating above
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.playerName, this.x, this.y - 30);

        // Barrel (Simple thick line tracing angle from center dome)
        const rad = this.angle * Math.PI / 180;
        const barrelLength = 26;
        const bx = this.x + Math.cos(rad) * barrelLength;
        const by = this.y - 6 - Math.sin(rad) * barrelLength;
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 6);
        ctx.lineTo(bx, by);
        ctx.stroke();

        if (this.shieldLife > 0) {
            ctx.save();
            ctx.translate(this.x, this.y - 6);
            ctx.fillStyle = `rgba(0, 170, 255, ${Math.min(0.5, this.shieldLife/100)})`;
            ctx.strokeStyle = '#00aaff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 24, Math.PI, 0); // Forcefield DOM
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }
}
