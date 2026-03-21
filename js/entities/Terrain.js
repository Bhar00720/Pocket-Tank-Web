export class Terrain {
    constructor(width, height, biomeType, savedModifications) {
        this.width = width;
        this.height = height;
        this.biome = biomeType || 'Grasslands';
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        this.modifications = savedModifications || [];
        
        switch(this.biome) {
            case 'Desert': this.color = '#aa7722'; break;
            case 'Snow': this.color = '#cccccc'; break;
            case 'Grasslands': default: this.color = '#006600'; break;
        }

        this.points = [];
        this.generateBase(width, height);

        if (this.modifications.length > 0) {
            this.modifications.forEach(mod => {
                if(mod.type === 'destroy') this.applyDestroy(mod.x, mod.y, mod.radius);
                if(mod.type === 'add') this.applyAdd(mod.x, mod.y, mod.radius);
            });
        }
        
        this.drawInitial();
    }

    generateBase(width, height) {
        const offset = Math.random() * 1000;
        let pY = height/2 + 50; 
        for (let x = 0; x < width; x++) {
            let dy = Math.sin((x+offset)/150)*1.5 + Math.cos((x+offset)/60)*0.5;
            pY += dy;
            pY = Math.max(height*0.2, Math.min(pY, height - 160));
            this.points.push(pY);
        }
    }

    applyDestroy(x, y, radius) {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalCompositeOperation = 'source-over';
    }

    applyAdd(x, y, radius) {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = this.color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawInitial() {
        this.ctx.clearRect(0,0,this.width, this.height);
        this.ctx.fillStyle = this.color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        for(let x=0; x<this.width; x++) {
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

    destroy(x, y, radius) {
        this.modifications.push({ type: 'destroy', x, y, radius });
        this.applyDestroy(x, y, radius);
    }

    add(x, y, radius) {
        this.modifications.push({ type: 'add', x, y, radius });
        this.applyAdd(x, y, radius);
    }

    isSolid(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        const pixelData = this.ctx.getImageData(x, y, 1, 1).data;
        return pixelData[3] > 0;
    }

    settleStep() {
        const imgData = this.ctx.getImageData(0, 0, this.width, this.height);
        const data = imgData.data;
        let changed = false;
        
        for (let x = 0; x < this.width; x++) {
            for (let y = this.height - 2; y >= 0; y--) {
                const i = (y * this.width + x) * 4;
                if (data[i+3] > 0) { 
                    const below = ((y+1) * this.width + x) * 4;
                    if (data[below+3] === 0) {
                        data[below] = data[i]; data[below+1] = data[i+1]; data[below+2] = data[i+2]; data[below+3] = data[i+3];
                        data[i+3] = 0;
                        changed = true;
                    }
                }
            }
        }
        if (changed) this.ctx.putImageData(imgData, 0, 0);
        return changed;
    }
}
