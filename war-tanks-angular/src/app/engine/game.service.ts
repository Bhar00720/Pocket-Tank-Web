import { Tank } from '../entities/tank';
import { Terrain } from '../entities/terrain';
import { Projectile } from '../entities/projectile';
import { AnyParticle, Particle, FireParticle, AcidParticle, TextParticle, BeamParticle, createExplosion } from '../entities/particle';
import { WEAPON_TYPES, WeaponConfig, getWeaponsForBiome } from '../weapons/weapon-system';
import { AudioManager } from './audio.service';
import { WeatherManager } from './weather.service';
import { SaveManager } from './save.service';
import { PhysicsEngine } from './physics.service';
import { InputManager } from './input.service';
import { Security } from './security.service';
import { AIPlayer, AIDifficulty } from './ai.service';

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  draw(terrain: Terrain, players: Tank[], projectiles: Projectile[], particles: AnyParticle[]): void {
    this.clear();
    if (terrain && terrain.canvas) {
      this.ctx.drawImage(terrain.canvas, 0, 0);
    }
    players.forEach(p => p.draw(this.ctx));
    projectiles.forEach(p => p.draw(this.ctx));
    particles.forEach(p => p.draw(this.ctx));
  }
}

export interface GameConfig {
  p1Name: string;
  p2Name: string;
  p1Color: string;
  p2Color: string;
  biome: string;
  weather: string;
  gameMode: 'local' | 'ai';        // NEW
  aiDifficulty?: AIDifficulty;      // NEW
}

export class GameEngine {
  private renderer!: Renderer;
  private terrain!: Terrain;
  private physics!: PhysicsEngine;
  private input!: InputManager;
  private audio!: AudioManager;
  private weatherMgr!: WeatherManager;
  private gameLoopId: number | null = null;
  private players: Tank[] = [];
  private projectiles: Projectile[] = [];
  private particles: AnyParticle[] = [];
  private currentPlayerIndex = 0;
  private gameState = 'AIMING';
  private currentSettings: GameConfig | null = null;
  private turnStartTime = 0;
  private security: Security | null = null;

  // AI
  private aiPlayer: AIPlayer | null = null;
  private isAITurn = false;

  // Biome-filtered weapons for current game
  private activeWeapons: WeaponConfig[] = [];

  // DOM element references (set by the component)
  private angleInput!: HTMLInputElement;
  private powerInput!: HTMLInputElement;
  private weaponSelect!: HTMLSelectElement;
  private fuelDisplay!: HTMLElement;

  // Callback for component to update its own state
  private updateUICallback: (() => void) | null = null;

  constructor(
    private gameCanvas: HTMLCanvasElement,
    private skyCanvas: HTMLCanvasElement
  ) {}

  setUIElements(
    angleInput: HTMLInputElement,
    powerInput: HTMLInputElement,
    weaponSelect: HTMLSelectElement,
    fuelDisplay: HTMLElement
  ): void {
    this.angleInput = angleInput;
    this.powerInput = powerInput;
    this.weaponSelect = weaponSelect;
    this.fuelDisplay = fuelDisplay;
  }

  setUpdateUICallback(cb: () => void): void {
    this.updateUICallback = cb;
  }

  initSecurity(): void {
    this.security = new Security();
  }

  renderTitleScreen(): void {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }

    this.renderer = new Renderer(this.gameCanvas);
    this.weatherMgr = new WeatherManager('Clear', this.skyCanvas);
    this.terrain = new Terrain(this.renderer.width, this.renderer.height, 'Desert');

    const demoP1 = new Tank(this.renderer.width * 0.15, 0, '#00ff00', 'Classic', 'PLAYER 1');
    const demoP2 = new Tank(this.renderer.width * 0.85, 0, '#ff0000', 'Classic', 'PLAYER 2');
    demoP2.angle = 135;

    demoP1.dropToTerrain(this.terrain);
    demoP2.dropToTerrain(this.terrain);

    const ctx = this.renderer.ctx;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.renderer.height);
    skyGrad.addColorStop(0, '#0a0e27');
    skyGrad.addColorStop(0.5, '#1a1a4e');
    skyGrad.addColorStop(1, '#2d1b4e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);

    ctx.drawImage(this.terrain.canvas, 0, 0);

    demoP1.draw(ctx);
    demoP2.draw(ctx);
  }

  startLocalGame(config: GameConfig | null, savedState: any): void {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
    this.projectiles = [];
    this.particles = [];
    this.gameState = 'AIMING';
    this.isAITurn = false;

    // Abort any existing AI
    if (this.aiPlayer) this.aiPlayer.abort();
    this.aiPlayer = null;

    this.audio = new AudioManager();
    this.renderer = new Renderer(this.gameCanvas);
    this.input = new InputManager();
    this.physics = new PhysicsEngine();

    // Determine biome and filter weapons
    const biome = savedState ? savedState.settings.biome : config!.biome;
    this.activeWeapons = getWeaponsForBiome(biome);

    this.weaponSelect.innerHTML = '';
    this.activeWeapons.forEach((w, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.innerText = w.name;
      // Add biome badge to biome-exclusive weapons
      if (w.biome) {
        opt.innerText = `⭐ ${w.name}`;
        opt.style.color = w.color;
      }
      this.weaponSelect.appendChild(opt);
    });

    if (savedState) {
      this.currentSettings = savedState.settings;
      this.weatherMgr = new WeatherManager(savedState.settings.weather, this.skyCanvas);
      this.terrain = new Terrain(this.renderer.width, this.renderer.height, savedState.settings.biome, savedState.terrainModifications);
      this.physics.wind = savedState.wind;
      this.physics.airDensity = this.weatherMgr.airDensity;

      this.players = savedState.players.map((p: any) => {
        const t = new Tank(p.x, p.y, p.color, p.typeId, p.playerName);
        t.health = p.health;
        t.fuel = p.fuel;
        t.angle = p.angle;
        t.power = p.power;
        t.weaponIndex = p.weaponIndex;
        t.shieldLife = p.shieldLife || 0;
        return t;
      });
      this.players.forEach(p => p.dropToTerrain(this.terrain));
      this.currentPlayerIndex = savedState.currentPlayerIndex;
      this.gameState = savedState.gameState;

      // Restore AI if it was an AI game
      if (savedState.settings.gameMode === 'ai' && savedState.settings.aiDifficulty) {
        this.aiPlayer = new AIPlayer(savedState.settings.aiDifficulty);
      }
    } else {
      this.currentSettings = config;
      this.weatherMgr = new WeatherManager(config!.weather, this.skyCanvas);
      this.terrain = new Terrain(this.renderer.width, this.renderer.height, config!.biome);
      this.physics.airDensity = this.weatherMgr.airDensity;

      this.players = [
        new Tank(this.renderer.width * 0.15, 0, config!.p1Color, 'Classic', config!.p1Name),
        new Tank(this.renderer.width * 0.85, 0, config!.p2Color, 'Classic', config!.p2Name)
      ];
      this.players[1].angle = 135;
      this.players.forEach(p => p.dropToTerrain(this.terrain));
      this.physics.randomizeWind(this.weatherMgr.baseWindVolatility);

      // Create AI player if mode is AI
      if (config!.gameMode === 'ai' && config!.aiDifficulty) {
        this.aiPlayer = new AIPlayer(config!.aiDifficulty);
      }
      this.currentPlayerIndex = 0;
      this.gameState = 'AIMING';
    }

    this.turnStartTime = Date.now();

    const setAim = (a: number, p: number) => {
      const cp = this.players[this.currentPlayerIndex];
      cp.angle = Math.max(0, Math.min(360, a));
      cp.power = Math.max(0, Math.min(100, p));
      this.updateHUD();
    };

    const bindBtn = (id: string, action: () => void) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const newBtn = btn.cloneNode(true) as HTMLElement;
      btn.parentNode!.replaceChild(newBtn, btn);
      let holdInterval: any;
      const start = () => {
        if (this.gameState !== 'AIMING' || this.isAITurn) return;
        action();
        holdInterval = setInterval(action, 80);
      };
      const stop = () => clearInterval(holdInterval);
      newBtn.onmousedown = start; newBtn.onmouseup = stop; newBtn.onmouseleave = stop;
      newBtn.ontouchstart = (e) => { e.preventDefault(); start(); };
      newBtn.ontouchend = stop;
    };

    bindBtn('btn-angle-up', () => setAim(this.players[this.currentPlayerIndex].angle + 1, this.players[this.currentPlayerIndex].power));
    bindBtn('btn-angle-down', () => setAim(this.players[this.currentPlayerIndex].angle - 1, this.players[this.currentPlayerIndex].power));
    bindBtn('btn-power-up', () => setAim(this.players[this.currentPlayerIndex].angle, this.players[this.currentPlayerIndex].power + 1));
    bindBtn('btn-power-down', () => setAim(this.players[this.currentPlayerIndex].angle, this.players[this.currentPlayerIndex].power - 1));

    const btnFire = document.getElementById('btn-fire');
    if (btnFire) {
      const newBtnFire = btnFire.cloneNode(true) as HTMLElement;
      btnFire.parentNode!.replaceChild(newBtnFire, btnFire);
      newBtnFire.addEventListener('click', () => {
        if (!this.isAITurn) this.onFire();
      });
    }

    this.weaponSelect.onchange = () => {
      if (this.gameState === 'AIMING' && !this.isAITurn) {
        this.players[this.currentPlayerIndex].weaponIndex = parseInt(this.weaponSelect.value, 10);
        this.updateHUD();
        this.audio.playUI();
      }
    };

    let moveInterval: any = null;
    const bindMove = (btnId: string, dir: string) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const newBtn = btn.cloneNode(true) as HTMLElement;
      btn.parentNode!.replaceChild(newBtn, btn);
      const startMove = () => {
        if (this.gameState !== 'AIMING' || this.isAITurn) return;
        moveInterval = setInterval(() => {
          if (this.players[this.currentPlayerIndex].move(dir, this.terrain)) this.updateHUD();
          else clearInterval(moveInterval);
        }, 40);
      };
      const stopMove = () => clearInterval(moveInterval);
      newBtn.addEventListener('mousedown', startMove);
      newBtn.addEventListener('mouseup', stopMove);
      newBtn.addEventListener('mouseleave', stopMove);
      newBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startMove(); });
      newBtn.addEventListener('touchend', stopMove);
    };
    bindMove('btn-move-left', 'left');
    bindMove('btn-move-right', 'right');

    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
      const newBtnSettings = btnSettings.cloneNode(true) as HTMLElement;
      btnSettings.parentNode!.replaceChild(newBtnSettings, btnSettings);
      const settingsModal = document.getElementById('settings-modal');
      newBtnSettings.addEventListener('click', () => {
        settingsModal?.classList.remove('hidden');
      });
    }

    const settingsClose = document.getElementById('modal-settings-close');
    if (settingsClose) {
      const newSettingsClose = settingsClose.cloneNode(true) as HTMLElement;
      settingsClose.parentNode!.replaceChild(newSettingsClose, settingsClose);
      newSettingsClose.addEventListener('click', () => {
        document.getElementById('settings-modal')?.classList.add('hidden');
      });
    }

    // Sound Settings
    const volSlider = document.getElementById('volume-slider') as HTMLInputElement;
    const btnMute = document.getElementById('btn-mute');
    if (volSlider) {
      const savedVol = localStorage.getItem('pt_volume');
      const savedMute = localStorage.getItem('pt_muted');
      if (savedVol !== null) volSlider.value = String(Math.round(parseFloat(savedVol) * 100));
      if (savedMute === 'true' && btnMute) btnMute.innerText = '🔇 OFF';

      volSlider.addEventListener('input', () => {
        const val = parseInt(volSlider.value) / 100;
        this.audio.setVolume(val);
        if (this.audio.muted) { this.audio.muted = false; localStorage.setItem('pt_muted', 'false'); if (btnMute) btnMute.innerText = '🔊 ON'; }
      });
    }
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        const muted = this.audio.toggleMute();
        btnMute.innerText = muted ? '🔇 OFF' : '🔊 ON';
      });
    }

    const btnAbort = document.getElementById('btn-abort-match');
    if (btnAbort) {
      const newBtnAbort = btnAbort.cloneNode(true) as HTMLElement;
      btnAbort.parentNode!.replaceChild(newBtnAbort, btnAbort);
      newBtnAbort.addEventListener('click', () => {
        document.getElementById('settings-modal')?.classList.add('hidden');
        this.abortGame();
        document.getElementById('hud')?.classList.add('hidden');
        document.getElementById('end-screen')?.classList.add('hidden');
        const mainMenu = document.getElementById('main-menu');
        mainMenu?.classList.remove('hidden');
        mainMenu?.classList.add('active');
        if (SaveManager.loadGame()) {
          document.getElementById('btn-resume')?.classList.remove('hidden');
        }
      });
    }

    document.getElementById('main-menu-bg')?.classList.add('hidden');

    this.updateHUD();
    if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
    requestAnimationFrame(() => this.gameLoop());
  }

  abortGame(): void {
    if (this.aiPlayer) this.aiPlayer.abort();
    this.isAITurn = false;
    this.autoSave();
    if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
    this.gameState = 'GAME_OVER';
    document.getElementById('main-menu-bg')?.classList.remove('hidden');
    this.renderTitleScreen();
  }

  private autoSave(): void {
    SaveManager.saveGame({
      settings: this.currentSettings,
      terrainModifications: this.terrain.modifications,
      wind: this.physics.wind,
      currentPlayerIndex: this.currentPlayerIndex,
      gameState: this.gameState,
      players: this.players.map(p => ({
        x: p.x, y: p.y, color: p.color, typeId: p.typeId, playerName: p.playerName,
        health: p.health, fuel: p.fuel, angle: p.angle, power: p.power, weaponIndex: p.weaponIndex,
        shieldLife: p.shieldLife
      }))
    });
  }

  private applyDamage(tank: Tank, dmg: number): void {
    if (tank.shieldLife > 0) {
      tank.shieldLife -= dmg;
      if (tank.shieldLife < 0) tank.shieldLife = 0;
      this.particles.push(new TextParticle(tank.x, tank.y - 40, 'BLOCKED', '#00aaff'));
      this.audio.playPop();
      this.updateHUD();
      return;
    }
    tank.health -= dmg;
    if (tank.health < 0) tank.health = 0;
    this.particles.push(new TextParticle(tank.x + (Math.random() - 0.5) * 20, tank.y - 30 - Math.random() * 10, `-${dmg}`, '#ff0000'));
    this.updateHUD();
  }

  onFire(): void {
    if (this.gameState !== 'AIMING') return;

    const cp = this.players[this.currentPlayerIndex];
    cp.angle = parseInt(this.angleInput.value, 10);
    cp.power = parseInt(this.powerInput.value, 10);

    // Calculate exact barrel tip position accounting for tank pitch
    const relativeRad = (cp.angle * Math.PI / 180) + cp.pitch;
    const barrelLength = 26;
    const bx = Math.cos(relativeRad) * barrelLength;
    const by = -10 - Math.sin(relativeRad) * barrelLength;
    
    // Convert local barrel tip coordinate (bx, by) into absolute world space via 2D rotation matrix:
    const px = cp.x + (bx * Math.cos(cp.pitch) - by * Math.sin(cp.pitch));
    const py = cp.y + (bx * Math.sin(cp.pitch) + by * Math.cos(cp.pitch));

    const weapon = this.activeWeapons[cp.weaponIndex || 0];
    if (!weapon) return;

    this.audio.playShoot();

    if (weapon.isShield) {
      cp.shieldLife = 100;
      this.particles.push(new TextParticle(cp.x, cp.y - 40, 'SHIELD UP', '#00aaff'));
      this.gameState = 'WAITING_FOR_NEXT_TURN';
      setTimeout(() => this.nextTurn(), 1000);
      return;
    }

    const rad = cp.angle * Math.PI / 180;

    if (weapon.isBeam) {
      let cx = px;
      let cy = py;
      const speed = 5;
      const dx = Math.cos(rad) * speed;
      const dy = -Math.sin(rad) * speed;

      while (cx > -100 && cx < this.renderer.width + 100 && cy > -100 && cy < this.renderer.height + 100) {
        if (this.terrain.isSolid(cx, cy)) break;

        let hitTank = false;
        this.players.forEach(tank => {
          if (Math.hypot(cx - tank.x, cy - tank.y) < tank.width / 2 + 5) hitTank = true;
        });
        if (hitTank) break;

        cx += dx;
        cy += dy;
      }

      this.particles.push(new BeamParticle(px, py, cx, cy, weapon.color, weapon.thickness));

      const dummyProj = { x: cx, y: cy, weapon: weapon } as any;
      this.triggerExplosion(dummyProj);

      this.gameState = 'FIRING';
      this.autoSave();
      return;
    }

    const wCount = weapon.count || 1;
    const wSpread = weapon.spread || 0;

    for (let i = 0; i < wCount; i++) {
      let angleOffset = 0;
      if (wCount > 1) angleOffset = (i - (wCount - 1) / 2) * wSpread;
      const proj = new Projectile(px, py, cp.angle + angleOffset, cp.power, this.currentPlayerIndex, weapon);
      this.projectiles.push(proj);
    }

    this.gameState = 'FIRING';
    this.autoSave();
  }

  updateHUD(): void {
    const cp = this.players[this.currentPlayerIndex];
    if (this.angleInput) this.angleInput.value = String(cp.angle);
    if (this.powerInput) this.powerInput.value = String(cp.power);
    if (this.fuelDisplay) {
      const fuelLevel = Math.max(0, Math.floor((cp.fuel / cp.maxFuel) * 100));
      this.fuelDisplay.innerText = String(fuelLevel);
      
      const fuelRect = document.getElementById('fuel-rect-fill');
      if (fuelRect) {
        // SVG rect height goes from 0 to 15 max. y drops accordingly.
        const height = (fuelLevel / 100) * 15;
        const y = 20 - height;
        fuelRect.setAttribute('height', String(height));
        fuelRect.setAttribute('y', String(y));
        let fuelColor = '#4ade80'; // Healthy Green
        if (fuelLevel < 30) fuelColor = '#ef4444'; // Danger Red
        else if (fuelLevel <= 60) fuelColor = '#eab308'; // Warning Yellow
        fuelRect.setAttribute('fill', fuelColor);
      }
    }
    if (this.weaponSelect) this.weaponSelect.value = String(cp.weaponIndex || 0);

    const windValue = document.getElementById('wind-value');
    const windArrow = document.getElementById('wind-arrow');
    if (windValue) windValue.innerText = (Math.abs(this.physics.wind) * 100).toFixed(1).padStart(4, '0');
    if (windArrow) windArrow.style.transform = `rotate(${this.physics.wind >= 0 ? 0 : 180}deg)`;

    const lblP1 = document.getElementById('lbl-p1-name');
    const lblP2 = document.getElementById('lbl-p2-name');
    if (lblP1) lblP1.innerText = this.players[0].playerName;
    if (lblP2) lblP2.innerText = this.players[1].playerName;

    if (this.currentPlayerIndex === 0) {
      if (lblP1) lblP1.style.color = '#ffaa00';
      if (lblP2) lblP2.style.color = '#fff';
    } else {
      if (lblP2) lblP2.style.color = '#ffaa00';
      if (lblP1) lblP1.style.color = '#fff';
    }

    const p1Health = document.getElementById('p1-health');
    const p2Health = document.getElementById('p2-health');
    if (p1Health) p1Health.style.width = `${Math.max(0, (this.players[0].health / this.players[0].maxHealth) * 100)}%`;
    if (p2Health) p2Health.style.width = `${Math.max(0, (this.players[1].health / this.players[1].maxHealth) * 100)}%`;

    const p1Badge = document.getElementById('p1-turn-indicator');
    const p2Badge = document.getElementById('p2-turn-indicator');
    if (p1Badge && p2Badge) {
      if (this.currentPlayerIndex === 0) {
        p1Badge.classList.remove('hidden');
        p2Badge.classList.add('hidden');
        p1Badge.style.color = cp.color;
        p1Badge.style.borderColor = cp.color;
        p1Badge.style.textShadow = `0 0 5px ${cp.color}`;
      } else {
        p1Badge.classList.add('hidden');
        p2Badge.classList.remove('hidden');
        p2Badge.style.color = cp.color;
        p2Badge.style.borderColor = cp.color;
        p2Badge.style.textShadow = `0 0 5px ${cp.color}`;
      }
    }

    // Show AI thinking indicator
    const aiIndicator = document.getElementById('ai-thinking');
    if (aiIndicator) {
      if (this.isAITurn && this.gameState === 'AIMING') {
        aiIndicator.classList.remove('hidden');
      } else {
        aiIndicator.classList.add('hidden');
      }
    }

    if (this.updateUICallback) this.updateUICallback();
  }

  private gameLoop(): void {
    this.update();
    this.renderer.draw(this.terrain, this.players, this.projectiles, this.particles);

    if (this.gameState === 'AIMING') {
      const timeElapsed = Date.now() - (this.turnStartTime || 0);
      if (timeElapsed < 2500) {
        const cp = this.players[this.currentPlayerIndex];
        const ctx = this.renderer.ctx;
        ctx.save();
        const bounce = Math.sin(Date.now() / 100) * 8;
        ctx.fillStyle = '#ffaa00';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.font = 'bold 30px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▼', cp.x, cp.y - 45 + bounce);
        ctx.strokeText('▼', cp.x, cp.y - 45 + bounce);
        ctx.restore();
      }
    }

    this.weatherMgr.updateAndDraw(this.physics.wind);

    if (this.gameState !== 'GAME_OVER') {
      this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  private update(): void {
    if (this.gameState === 'AIMING' && !this.isAITurn) {
      const cp = this.players[this.currentPlayerIndex];
      let changed = false;
      if (this.input.isKeyDown('ArrowUp')) { cp.angle = Math.min(360, cp.angle + 1); changed = true; }
      if (this.input.isKeyDown('ArrowDown')) { cp.angle = Math.max(0, cp.angle - 1); changed = true; }
      if (this.input.isKeyDown('ArrowRight')) { cp.power = Math.min(100, cp.power + 1); changed = true; }
      if (this.input.isKeyDown('ArrowLeft')) { cp.power = Math.max(0, cp.power - 1); changed = true; }
      if (changed) this.updateHUD();
    }

    let settling = this.terrain.settleStep();
    if (settling) this.terrain.settleStep();

    this.players.forEach(p => p.update(this.terrain));

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(this.physics, this.players);

      if (p.weapon.isBorer && p.y > 0 && p.x > 0 && p.x < this.renderer.width) {
        this.terrain.destroy(p.x, p.y, p.weapon.boreRadius!);
      }

      if (p.triggerSplit) {
        p.active = false;
        this.audio.playPop();
        const sCount = p.weapon.splitCount || 3;
        for (let c = 0; c < sCount; c++) {
          const baseWeapon = this.activeWeapons.find(w => w.name === 'Single Shot') || { damage: 20, explosionRadius: 25, name: 'sub', color: '#fff', mass: 3, category: 'Ballistic' };
          const subConf = { ...baseWeapon };
          subConf.explosionRadius = Math.floor(p.weapon.explosionRadius / 2);
          subConf.damage = Math.floor(p.weapon.damage / 2);
          subConf.color = p.weapon.color;
          (subConf as any).isSplitter = false;
          (subConf as any).isCluster = false;
          if (p.weapon.isDirt) (subConf as any).isDirt = true;
          if (p.weapon.isColorBomb) { (subConf as any).isColorBomb = true; (subConf as any).paintColors = p.weapon.paintColors; }
          if (p.weapon.isIncendiary) (subConf as any).isIncendiary = true;
          if (p.weapon.isAcid) (subConf as any).isAcid = true;
          if (p.weapon.isBouncer) { (subConf as any).isBouncer = true; (subConf as any).bounces = 1; }
          const subProj = new Projectile(p.x, p.y, 0, 0, p.ownerId, subConf);
          subProj.vx = p.vx + (Math.random() - 0.5) * 8;
          subProj.vy = Math.min(0, p.vy) - 2 - Math.random() * 3;
          this.projectiles.push(subProj);
        }
        createExplosion(p.x, p.y, this.particles, true);
      }

      if (p.triggerCluster) {
        p.active = false;
        this.audio.playPop();
        const cCount = p.weapon.clusterCount || 5;
        for (let c = 0; c < cCount; c++) {
          const baseWeapon = this.activeWeapons.find(w => w.name === 'Single Shot') || { damage: 20, explosionRadius: 25, name: 'sub', color: '#fff', mass: 3, category: 'Ballistic' };
          const subConf = { ...baseWeapon };
          subConf.explosionRadius = 25;
          subConf.damage = p.weapon.damage;
          subConf.color = p.weapon.color;
          (subConf as any).isCluster = false;
          (subConf as any).isSplitter = false;
          if (p.weapon.isDirt) (subConf as any).isDirt = true;
          if (p.weapon.isColorBomb) { (subConf as any).isColorBomb = true; (subConf as any).paintColors = p.weapon.paintColors; }
          if (p.weapon.isIncendiary) (subConf as any).isIncendiary = true;
          if (p.weapon.isAcid) (subConf as any).isAcid = true;
          if (p.weapon.isBouncer) { (subConf as any).isBouncer = true; (subConf as any).bounces = 1; }
          const subProj = new Projectile(p.x, p.y, 0, 0, p.ownerId, subConf);
          subProj.vx = p.vx + (Math.random() - 0.5) * 6;
          subProj.vy = p.vy + (Math.random()) * 2;
          this.projectiles.push(subProj);
        }
        createExplosion(p.x, p.y, this.particles, true);
      }

      if (p.x < -100 || p.x > this.renderer.width + 100 || p.y > this.renderer.height + 100) p.active = false;

      if (p.active) {
        this.players.forEach((tank) => {
          const distOffset = Math.hypot(p.x - tank.x, p.y - tank.y);
          if (distOffset < tank.width / 2 + p.radius + 5) {
            this.triggerExplosion(p);
            p.active = false;
          }
        });
      }

      if (p.active && this.terrain.isSolid(p.x, p.y)) {
        if (p.weapon.isBouncer && p.bounces > 0) {
          p.bounces--;
          p.y -= 5;
          p.vy = -p.vy * 0.6;
          p.vx = p.vx * 0.8;
          this.audio.playPop();
        } else if (p.weapon.isRoller && p.rollLife > 0) {
          p.rollLife--;
          p.y -= 1;
          p.vy = 0;
          p.vx = p.vx > 0 ? 3 : -3;
          while (this.terrain.isSolid(p.x, p.y)) p.y--;
        } else {
          this.triggerExplosion(p);
          p.active = false;
        }
      }

      if (!p.active) this.projectiles.splice(i, 1);
    }

    this.particles.forEach(p => {
      if (p instanceof FireParticle || p instanceof AcidParticle) {
        p.update(this.terrain);
        this.players.forEach(tank => {
          const dist = Math.hypot(p.x - tank.x, p.y - tank.y);
          if (dist < tank.width / 2 + 5 && Math.random() < 0.05) {
            this.applyDamage(tank, 1);
          }
        });
      } else {
        p.update();
      }
    });

    this.particles = this.particles.filter(p => p.life > 0);

    const isAirborne = this.players.some(p => p.isAirborne);
    if (this.gameState === 'FIRING' && this.projectiles.length === 0 && !isAirborne && !settling && this.particles.filter(p => (p instanceof FireParticle) || (p instanceof AcidParticle)).length === 0) {
      this.players.forEach(p => p.dropToTerrain(this.terrain));
      this.gameState = 'WAITING_FOR_NEXT_TURN';
      setTimeout(() => this.nextTurn(), 1000);
    }
    
    // Always check for DOT (damage-over-time) deaths during physics loop
    if (this.gameState !== 'GAME_OVER') {
      const deadPlayers = this.players.filter(p => p.health <= 0);
      if (deadPlayers.length > 0) {
        this.checkWinCondition();
      }
    }
  }

  private triggerExplosion(projectile: any): void {
    if (projectile.weapon.isFrog) {
      this.audio.playPop();
    } else {
      if (projectile.weapon.isDirt) this.audio.playPop();
      else this.audio.playExplosion();

      if (projectile.weapon.explosionRadius > 50) {
        const container = document.getElementById('game-container');
        container?.classList.add('shake');
        setTimeout(() => container?.classList.remove('shake'), 400);
      }

      if (projectile.weapon.isWall) {
        this.audio.playPop();
        for (let i = 0; i < 12; i++) {
          setTimeout(() => {
            let color = '#aaa';
            let square = false;
            if (projectile.weapon.wallType === 'black') {
               const colors = ['#111', '#333', '#555', '#222', '#777'];
               color = colors[Math.floor(Math.random() * colors.length)];
               square = true;
            } else if (projectile.weapon.wallType === 'rainbow') {
               const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
               color = colors[i % colors.length];
               square = true;
            }
            this.terrain.add(projectile.x, projectile.y - (i * 12), 16, color, square);
            for (let p = 0; p < 5; p++) this.particles.push(new Particle(projectile.x, projectile.y - (i * 12), color, 4, 30));
          }, i * 50);
        }
      } else if (projectile.weapon.isBubble) {
        this.audio.playPop();
        this.terrain.add(projectile.x, projectile.y, projectile.weapon.bubbleRadius);
        this.terrain.destroy(projectile.x, projectile.y, projectile.weapon.bubbleRadius - projectile.weapon.bubbleThick);
        this.particles.push(new TextParticle(projectile.x, projectile.y - 40, 'TRAPPED!', '#ffffff'));
      } else if (projectile.weapon.isDirt) {
        this.terrain.add(projectile.x, projectile.y, projectile.weapon.explosionRadius);
      } else if (projectile.weapon.isCutter) {
        this.audio.playExplosion();
        // Cutters carve massive vertical slices
        const radius = projectile.weapon.explosionRadius;
        for (let cy = -radius; cy < radius * 2; cy += 15) {
          this.terrain.destroy(projectile.x, projectile.y + cy, radius);
        }
        createExplosion(projectile.x, projectile.y, this.particles, false, projectile.weapon.color);
      } else if (projectile.weapon.isColorBomb) {
        const rainbow = projectile.weapon.paintColors || ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
        this.terrain.destroy(projectile.x, projectile.y, projectile.weapon.explosionRadius);
        // Paint the crater vividly with multiple chaotic splats
        for(let j = 0; j < 25; j++) {
           let splatColor = rainbow[Math.floor(Math.random() * rainbow.length)];
           let cx = projectile.x + (Math.random() - 0.5) * projectile.weapon.explosionRadius * 1.6;
           let cy = projectile.y + (Math.random() - 0.5) * projectile.weapon.explosionRadius * 1.6 + 10;
           this.terrain.add(cx, cy, Math.random() * 12 + 6, splatColor);
        }
        createExplosion(projectile.x, projectile.y, this.particles, projectile.weapon.explosionRadius < 30, rainbow[0]);
      } else {
        if (projectile.weapon.explosionRadius > 0) {
          this.terrain.destroy(projectile.x, projectile.y, projectile.weapon.explosionRadius);
          createExplosion(projectile.x, projectile.y, this.particles, projectile.weapon.explosionRadius < 30, projectile.weapon.explosionColor);
        }
      }

      if (projectile.weapon.isIncendiary) {
        for (let i = 0; i < 40; i++) this.particles.push(new FireParticle(projectile.x + (Math.random() - 0.5) * projectile.weapon.explosionRadius, projectile.y - 10));
      }
      if (projectile.weapon.isAcid) {
        for (let i = 0; i < 40; i++) this.particles.push(new AcidParticle(projectile.x + (Math.random() - 0.5) * projectile.weapon.explosionRadius, projectile.y - 10));
      }
    }

    this.players.forEach(tank => {
      const dist = Math.hypot(projectile.x - tank.x, projectile.y - tank.y);
      if (dist < projectile.weapon.explosionRadius + tank.width / 2) {
        const damageRange = 1 - (dist / (projectile.weapon.explosionRadius + tank.width / 2));
        const dmg = Math.floor(projectile.weapon.damage * damageRange);
        if (dmg > 0 && !projectile.weapon.isFrog) this.applyDamage(tank, dmg);

        const forceMultiplier = projectile.weapon.isFrog ? projectile.weapon.force : 8;
        const dx = tank.x - projectile.x;
        const dy = tank.y - projectile.y;
        const normalizedDx = dist === 0 ? 0 : dx / dist;
        const normalizedDy = dist === 0 ? -1 : dy / dist;

        const impulse = forceMultiplier * damageRange;
        if (impulse > 2 || projectile.weapon.isFrog) {
          tank.vx += normalizedDx * impulse;
          tank.vy += normalizedDy * impulse - (impulse * 0.5);
          tank.isAirborne = true;
        }
      }
    });

    this.checkWinCondition();
  }

  private nextTurn(): void {
    if (this.gameState === 'GAME_OVER') return;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.physics.randomizeWind(this.weatherMgr.baseWindVolatility);

    // Check if it's AI's turn
    const isAI = this.aiPlayer && this.currentPlayerIndex === 1;
    this.isAITurn = !!isAI;

    this.updateHUD();
    this.gameState = 'AIMING';
    this.turnStartTime = Date.now();
    this.autoSave();

    // Trigger AI turn
    if (isAI) {
      this.triggerAITurn();
    }
  }

  private triggerAITurn(): void {
    if (!this.aiPlayer || this.currentPlayerIndex !== 1) return;

    const aiTank = this.players[1];
    const opponent = this.players[0];
    const biome = this.currentSettings?.biome || 'Grasslands';

    this.aiPlayer.takeTurn(
      aiTank,
      opponent,
      this.terrain,
      this.physics,
      biome,
      // onAngleChange — animate HUD
      (angle: number) => {
        aiTank.angle = Math.max(0, Math.min(360, angle));
        this.updateHUD();
      },
      // onPowerChange — animate HUD
      (power: number) => {
        aiTank.power = Math.max(0, Math.min(100, power));
        this.updateHUD();
      },
      // onWeaponChange
      (weaponIndex: number) => {
        aiTank.weaponIndex = weaponIndex;
        this.weaponSelect.value = String(weaponIndex);
        this.updateHUD();
        this.audio.playUI();
      },
      // onMove
      (dir: string): boolean => {
        const moved = aiTank.move(dir, this.terrain);
        if (moved) this.updateHUD();
        return moved;
      },
      // onFire
      () => {
        this.isAITurn = false;
        this.onFire();
      }
    );
  }

  private checkWinCondition(): void {
    const deadPlayers = this.players.filter(p => p.health <= 0);
    if (deadPlayers.length > 0) {
      this.gameState = 'GAME_OVER';
      if (this.aiPlayer) this.aiPlayer.abort();
      this.isAITurn = false;
      SaveManager.clearSave();

      let winnerText = 'MUTUAL DESTRUCTION';
      if (this.players[0].health > 0) winnerText = `${this.players[0].playerName} WINS!`;
      if (this.players[1].health > 0) winnerText = `${this.players[1].playerName} WINS!`;

      const endScreen = document.getElementById('end-screen');
      const winnerTextEl = document.getElementById('winner-text');
      if (winnerTextEl) winnerTextEl.innerText = winnerText;
      endScreen?.classList.remove('hidden');
      endScreen?.classList.add('active');

      const btnRematch = document.getElementById('btn-rematch');
      if (btnRematch) {
        const newBtnRematch = btnRematch.cloneNode(true) as HTMLElement;
        btnRematch.parentNode!.replaceChild(newBtnRematch, btnRematch);
        newBtnRematch.addEventListener('click', () => {
          endScreen?.classList.remove('active');
          endScreen?.classList.add('hidden');
          this.startLocalGame(this.currentSettings, null);
        });
      }

      const btnMenu = document.getElementById('btn-menu');
      if (btnMenu) {
        const newBtnMenu = btnMenu.cloneNode(true) as HTMLElement;
        btnMenu.parentNode!.replaceChild(newBtnMenu, btnMenu);
        newBtnMenu.addEventListener('click', () => {
          endScreen?.classList.remove('active');
          endScreen?.classList.add('hidden');
          document.getElementById('hud')?.classList.add('hidden');
          const mainMenu = document.getElementById('main-menu');
          mainMenu?.classList.remove('hidden');
          mainMenu?.classList.add('active');
          
          if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
          this.gameLoopId = null;
          document.getElementById('main-menu-bg')?.classList.remove('hidden');
          this.renderTitleScreen();
        });
      }
    }
  }

  hasSavedGame(): boolean {
    return !!SaveManager.loadGame();
  }

  loadSavedGame(): any {
    return SaveManager.loadGame();
  }

  clearSave(): void {
    SaveManager.clearSave();
  }
}
