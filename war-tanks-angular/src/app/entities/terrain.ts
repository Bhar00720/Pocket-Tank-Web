export interface TerrainModification {
  type: 'destroy' | 'add';
  x: number;
  y: number;
  radius: number;
  color?: string | CanvasGradient;
  isSquare?: boolean;
}

export class Terrain {
  width: number;
  height: number;
  biome: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  modifications: TerrainModification[];
  color: string | CanvasPattern;
  points: number[];

  constructor(width: number, height: number, biomeType?: string, savedModifications?: TerrainModification[]) {
    this.width = width;
    this.height = height;
    this.biome = biomeType || 'Grasslands';
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;

    this.modifications = savedModifications || [];

    this.color = this.generateBiomePattern(this.biome);

    this.points = [];
    this.generateBase(width, height);

    if (this.modifications.length > 0) {
      this.modifications.forEach(mod => {
        if (mod.type === 'destroy') this.applyDestroy(mod.x, mod.y, mod.radius);
        if (mod.type === 'add') this.applyAdd(mod.x, mod.y, mod.radius, mod.color, mod.isSquare);
      });
    }

    this.drawInitial();
  }

  generateBiomePattern(biome: string): string | CanvasPattern {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 60;
    pCanvas.height = 60;
    const pCtx = pCanvas.getContext('2d')!;

    switch (biome) {
      case 'Desert':
        pCtx.fillStyle = '#aa7722';
        pCtx.fillRect(0, 0, 60, 60);
        pCtx.fillStyle = '#996611';
        pCtx.beginPath();
        for (let i = 0; i < 4; i++) {
          pCtx.arc(Math.random() * 60, Math.random() * 60, Math.random() * 15 + 5, 0, Math.PI * 2);
        }
        pCtx.fill();
        pCtx.fillStyle = '#885500';
        for (let i = 0; i < 50; i++) {
          pCtx.fillRect(Math.random() * 60, Math.random() * 60, 2, 2);
        }
        break;

      case 'Snow':
        pCtx.fillStyle = '#cccccc';
        pCtx.fillRect(0, 0, 60, 60);
        pCtx.fillStyle = '#e6f2ff';
        pCtx.beginPath();
        for (let i = 0; i < 5; i++) {
          pCtx.arc(Math.random() * 60, Math.random() * 60, Math.random() * 20 + 10, 0, Math.PI * 2);
        }
        pCtx.fill();
        pCtx.fillStyle = '#ffffff';
        for (let i = 0; i < 40; i++) {
          pCtx.fillRect(Math.random() * 60, Math.random() * 60, 2, 2);
        }
        break;

      case 'Grasslands':
      default:
        pCtx.fillStyle = '#005500';
        pCtx.fillRect(0, 0, 60, 60);
        pCtx.strokeStyle = '#007700';
        pCtx.lineWidth = 2;
        pCtx.beginPath();
        for (let i = 0; i < 60; i++) {
          const x = Math.random() * 60;
          const y = Math.random() * 60;
          pCtx.moveTo(x, y);
          pCtx.lineTo(x + (Math.random() * 4 - 2), y - (Math.random() * 8 + 4));
        }
        pCtx.stroke();
        pCtx.strokeStyle = '#00aa00';
        pCtx.lineWidth = 1;
        pCtx.beginPath();
        for (let i = 0; i < 40; i++) {
          const x = Math.random() * 60;
          const y = Math.random() * 60;
          pCtx.moveTo(x, y);
          pCtx.lineTo(x + (Math.random() * 4 - 2), y - (Math.random() * 8 + 4));
        }
        pCtx.stroke();
        break;
    }

    const pattern = this.ctx.createPattern(pCanvas, 'repeat');
    return pattern || (biome === 'Desert' ? '#aa7722' : biome === 'Snow' ? '#cccccc' : '#006600');
  }

  generateBase(width: number, height: number): void {
    const offset = Math.random() * 1000;
    let pY = height / 2 + 50;
    for (let x = 0; x < width; x++) {
      const dy = Math.sin((x + offset) / 150) * 1.5 + Math.cos((x + offset) / 60) * 0.5;
      pY += dy;
      pY = Math.max(height * 0.2, Math.min(pY, height - 160));
      this.points.push(pY);
    }
  }

  applyDestroy(x: number, y: number, radius: number): void {
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalCompositeOperation = 'source-over';
  }

  applyAdd(x: number, y: number, radius: number, color?: string | CanvasGradient, isSquare?: boolean): void {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = color || this.color;
    this.ctx.beginPath();
    if (isSquare) {
      this.ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
    } else {
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    this.ctx.fill();
  }

  drawInitial(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    for (let x = 0; x < this.width; x++) {
      this.ctx.lineTo(x, this.points[x]);
    }
    this.ctx.lineTo(this.width, this.height);
    this.ctx.closePath();
    this.ctx.fill();

    // Characteristic white outline across the top
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  destroy(x: number, y: number, radius: number): void {
    this.modifications.push({ type: 'destroy', x, y, radius });
    this.applyDestroy(x, y, radius);
  }

  add(x: number, y: number, radius: number, color?: string | CanvasGradient, isSquare?: boolean): void {
    this.modifications.push({ type: 'add', x, y, radius, color, isSquare });
    this.applyAdd(x, y, radius, color, isSquare);
  }

  isSolid(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const pixelData = this.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    return pixelData[3] > 0;
  }

  settleStep(): boolean {
    const imgData = this.ctx.getImageData(0, 0, this.width, this.height);
    const data = imgData.data;
    let changed = false;

    for (let x = 0; x < this.width; x++) {
      for (let y = this.height - 2; y >= 0; y--) {
        const i = (y * this.width + x) * 4;
        if (data[i + 3] > 0) {
          const below = ((y + 1) * this.width + x) * 4;
          if (data[below + 3] === 0) {
            data[below] = data[i]; data[below + 1] = data[i + 1]; data[below + 2] = data[i + 2]; data[below + 3] = data[i + 3];
            data[i + 3] = 0;
            changed = true;
          }
        }
      }
    }
    if (changed) this.ctx.putImageData(imgData, 0, 0);
    return changed;
  }
}
