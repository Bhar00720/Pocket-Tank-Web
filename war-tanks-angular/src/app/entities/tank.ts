import { Terrain } from './terrain';

export class Tank {
  x: number;
  y: number;
  playerName: string;
  color: string;
  health: number;
  width: number;
  height: number;
  maxFuel: number;
  fuel: number;
  maxHealth: number;
  angle: number;
  power: number;
  weaponIndex: number;
  shieldLife: number;
  vx: number;
  vy: number;
  isAirborne: boolean;
  typeId: string;
  pitch: number;
  skinPattern: CanvasPattern | string;

  constructor(x: number, y: number, color: string, typeId: string, name: string) {
    this.x = x;
    this.y = y;
    this.playerName = name || 'Player';
    this.color = color || '#00ff00';
    this.typeId = typeId;
    this.skinPattern = this.generateCamoSkin(this.color);

    // Classic Arcade stats
    this.health = 1000;
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
    this.pitch = 0;
  }

  private generateCamoSkin(baseColor: string): CanvasPattern | string {
    let r = 0, g = 255, b = 0;
    if (baseColor.startsWith('#')) {
      const hex = baseColor.replace('#', '');
      if (hex.length === 3) {
        r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
        g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
        b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
    }

    // Create shades for camo blobs
    const darkColor = `rgb(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)})`;
    const midColor = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`;

    const sCanvas = document.createElement('canvas');
    sCanvas.width = 40;
    sCanvas.height = 40;
    const sCtx = sCanvas.getContext('2d');
    if (!sCtx) return baseColor;

    // Base coat
    sCtx.fillStyle = baseColor;
    sCtx.fillRect(0, 0, 40, 40);

    // Dark blobs
    sCtx.fillStyle = darkColor;
    for (let i = 0; i < 6; i++) {
      sCtx.beginPath();
      sCtx.arc(Math.random() * 40, Math.random() * 40, Math.random() * 6 + 4, 0, Math.PI * 2);
      sCtx.fill();
    }

    // Mid blobs
    sCtx.fillStyle = midColor;
    for (let i = 0; i < 6; i++) {
      sCtx.beginPath();
      sCtx.arc(Math.random() * 40, Math.random() * 40, Math.random() * 5 + 3, 0, Math.PI * 2);
      sCtx.fill();
    }

    return sCtx.createPattern(sCanvas, 'repeat') || baseColor;
  }

  update(terrain: Terrain): void {
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
        while (terrain.isSolid(this.x, this.y)) this.y--;
      }
    } else {
      this.isAirborne = false;
      this.vx = 0;
      this.vy = 0;
      while (!terrain.isSolid(this.x, this.y + 1) && this.y < terrain.height) this.y++;
    }
    this.updatePitch(terrain);
  }

  dropToTerrain(terrain: Terrain): void {
    while (this.y < terrain.height && !terrain.isSolid(this.x, this.y)) this.y++;
    while (this.y > 0 && terrain.isSolid(this.x, this.y - 1)) this.y--;
    this.updatePitch(terrain);
  }

  move(direction: string, terrain: Terrain): boolean {
    if (this.fuel <= 0) return false;
    const step = direction === 'left' ? -1 : 1;

    const newX = this.x + step;
    if (newX < 25 || newX > terrain.width - 25) return false;

    let newY = this.y;
    while (newY > 0 && terrain.isSolid(newX, newY - 1)) newY--;
    while (newY < terrain.height && !terrain.isSolid(newX, newY)) newY++;

    // Allow climbing steeper bumps (up to 10px instead of 5px)
    if (Math.abs(newY - this.y) > 10) return false;

    this.x = newX;
    this.y = newY;
    this.fuel -= 0.5;
    this.updatePitch(terrain);
    return true;
  }

  updatePitch(terrain: Terrain): void {
    if (this.isAirborne) {
      // Smoothly level out if airborne
      this.pitch = this.pitch * 0.9;
      return;
    }
    
    // Sample terrain left and right to calculate slope
    const span = 12;
    const leftX = Math.max(0, Math.floor(this.x - span));
    const rightX = Math.min(terrain.width - 1, Math.floor(this.x + span));

    let leftY = this.y;
    while(leftY > 0 && terrain.isSolid(leftX, leftY - 1)) leftY--;
    while(leftY < terrain.height && !terrain.isSolid(leftX, leftY)) leftY++;

    let rightY = this.y;
    while(rightY > 0 && terrain.isSolid(rightX, rightY - 1)) rightY--;
    while(rightY < terrain.height && !terrain.isSolid(rightX, rightY)) rightY++;

    // Calculate slope angle
    let targetPitch = Math.atan2(rightY - leftY, (rightX - leftX));
    
    // Cap tilt so the tank doesn't perfectly stick to 90 degree sheer walls
    const maxPitch = 60 * (Math.PI / 180);
    if (targetPitch > maxPitch) targetPitch = maxPitch;
    if (targetPitch < -maxPitch) targetPitch = -maxPitch;

    // LERP to make the chassis bounce/rotate smoothly over bumps
    this.pitch = this.pitch * 0.6 + targetPitch * 0.4;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.pitch);

    ctx.fillStyle = this.color;

    // Tread belts (dark gray)
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.roundRect(-24, -3, 48, 7, 3);
    ctx.fill();

    // Tires (4 wheels inside the treads)
    ctx.fillStyle = '#111';
    for(let tx = -18; tx <= 18; tx += 12) {
      ctx.beginPath();
      ctx.arc(tx, 1, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Highlight on tires
      ctx.fillStyle = '#444';
      ctx.beginPath();
      ctx.arc(tx, 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
    }

    // Main Chassis
    ctx.fillStyle = this.skinPattern;
    ctx.beginPath();
    ctx.roundRect(-20, -10, 40, 8, 2);
    ctx.fill();

    // Turret Dome
    ctx.beginPath();
    ctx.arc(0, -10, 12, Math.PI, 0);
    ctx.fill();

    // Barrel (Drawn inside the rotated context!)
    const rad = (this.angle * Math.PI / 180) + this.pitch;
    const barrelLength = 26;
    const bx = Math.cos(rad) * barrelLength;
    const by = -10 - Math.sin(rad) * barrelLength;

    ctx.strokeStyle = this.skinPattern;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(bx, by);
    ctx.stroke();

    ctx.restore();

    // Player Name floating above (NOT rotated)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.playerName, this.x, this.y - 30);

    // Shield rendering
    if (this.shieldLife > 0) {
      ctx.save();
      ctx.translate(this.x, this.y - 6);
      ctx.fillStyle = `rgba(0, 170, 255, ${Math.min(0.5, this.shieldLife / 100)})`;
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}
