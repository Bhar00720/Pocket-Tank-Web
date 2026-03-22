interface WeatherParticle {
  x: number;
  y: number;
  s: number;
  w: number;
}

export class WeatherManager {
  type: string;
  airDensity: number;
  baseWindVolatility: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  particles: WeatherParticle[];

  constructor(weatherType: string, canvas: HTMLCanvasElement) {
    this.type = weatherType;
    this.airDensity = 1.0;
    this.baseWindVolatility = 0;

    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.particles = [];

    this.setupParams();

    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    });
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  setupParams(): void {
    if (this.type === 'Rain') {
      this.airDensity = 1.1;
      this.baseWindVolatility = 1.0;
      for (let i = 0; i < 300; i++) this.particles.push({ x: Math.random() * this.width, y: Math.random() * this.height, s: Math.random() * 15 + 10, w: Math.random() * 1 + 1 });
    }
    else if (this.type === 'Snow') {
      this.airDensity = 1.25;
      this.baseWindVolatility = 0.5;
      for (let i = 0; i < 400; i++) this.particles.push({ x: Math.random() * this.width, y: Math.random() * this.height, s: Math.random() * 3 + 1, w: Math.random() * 3 + 2 });
    }
    else if (this.type === 'Storm') {
      this.airDensity = 1.15;
      this.baseWindVolatility = 2.5;
      for (let i = 0; i < 500; i++) this.particles.push({ x: Math.random() * this.width, y: Math.random() * this.height, s: Math.random() * 25 + 15, w: Math.random() * 2 + 1 });
    } else {
      this.airDensity = 1.0;
      this.baseWindVolatility = 0.2;
    }
  }

  updateAndDraw(windVector: number): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.type === 'Clear') return;

    // Draw lightning flashes in storm
    if (this.type === 'Storm' && Math.random() < 0.02) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    this.ctx.fillStyle = this.type === 'Snow' ? 'rgba(255,255,255,0.8)' : 'rgba(150,150,200,0.5)';

    this.ctx.beginPath();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (this.type === 'Snow') {
        p.y += p.s * 0.5;
        p.x += windVector * 30 + Math.sin(p.y / 50) * 1;
      } else {
        p.y += p.s;
        p.x += windVector * 50;
      }

      if (p.y > this.height) {
        p.y = -20;
        p.x = Math.random() * this.width;
      }
      if (p.x > this.width) p.x = 0;
      if (p.x < 0) p.x = this.width;

      if (this.type === 'Snow') {
        this.ctx.moveTo(p.x, p.y);
        this.ctx.arc(p.x, p.y, p.w, 0, Math.PI * 2);
      } else {
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(p.x - windVector * 10, p.y - p.s);
      }
    }

    if (this.type === 'Snow') {
      this.ctx.fill();
    } else {
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = 'rgba(150,150,200,0.4)';
      this.ctx.stroke();
    }
  }
}
