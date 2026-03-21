export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    draw(terrain, players, projectiles, particles) {
        this.clear();

        // 1. Draw Terrain
        if (terrain && terrain.canvas) {
            this.ctx.drawImage(terrain.canvas, 0, 0);
        }

        // 2. Draw Players
        players.forEach(p => p.draw(this.ctx));

        // 3. Draw Projectiles
        projectiles.forEach(p => p.draw(this.ctx));

        // 4. Draw Particles
        particles.forEach(p => p.draw(this.ctx));
    }
}
