import { Component, AfterViewInit, ViewChild, ElementRef, HostListener, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { GameEngine, GameConfig } from './engine/game.service';
import { SaveManager } from './engine/save.service';
import { AIDifficulty } from './engine/ai.service';
import { WeaponConfig, getWeaponsForBiome, WEAPON_CATEGORIES } from './weapons/weapon-system';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements AfterViewInit {
  @ViewChild('gameCanvas', { static: true }) gameCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('skyCanvas', { static: true }) skyCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('angleInput', { static: true }) angleInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('powerInput', { static: true }) powerInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('weaponSelect', { static: true }) weaponSelectRef!: ElementRef<HTMLSelectElement>;
  @ViewChild('fuelDisplay', { static: true }) fuelDisplayRef!: ElementRef<HTMLElement>;

  private gameEngine!: GameEngine;
  private sanitizer: DomSanitizer;

  // Game mode state
  gameMode: 'local' | 'ai' = 'local';
  aiDifficulty: AIDifficulty = 'medium';

  // Armory state
  armoryOpen = false;
  weaponCategories: string[] = [];
  private activeWeapons: WeaponConfig[] = [];
  private selectedWeaponIndex = 0;
  private currentBiome = 'Grasslands';

  // Category icon SVG paths
  private categoryIcons: Record<string, string> = {
    'Ballistic': '<circle cx="8" cy="8" r="3"/><line x1="11" y1="5" x2="15" y2="1"/>',
    'Laser': '<line x1="1" y1="8" x2="15" y2="8"/><polygon points="13,5 15,8 13,11" fill="currentColor"/>',
    'Defense': '<path d="M8 1L3 4v4c0 3.5 2 6.8 5 8 3-1.2 5-4.5 5-8V4L8 1z"/>',
    'Chemical': '<circle cx="8" cy="10" r="4"/><line x1="8" y1="1" x2="8" y2="6"/><line x1="5" y1="3" x2="11" y2="3"/>',
    'Cluster': '<circle cx="8" cy="5" r="2"/><circle cx="5" cy="11" r="2"/><circle cx="11" cy="11" r="2"/>',
    'Kinetic': '<path d="M2 14 L8 2 L14 14"/><line x1="8" y1="2" x2="8" y2="14"/>',
    'Terrain': '<path d="M1 14 L5 8 L8 10 L12 4 L15 14"/>',
    'Special': '<polygon points="8,1 10,6 15,6 11,9 13,15 8,11 3,15 5,9 1,6 6,6"/>',
    'Nuclear': '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2"/><line x1="8" y1="2" x2="8" y2="5"/><line x1="8" y1="11" x2="8" y2="14"/><line x1="2" y1="8" x2="5" y2="8"/><line x1="11" y1="8" x2="14" y2="8"/>',
  };

  // Specific Weapon Icon SVG paths
  private weaponIcons: Record<string, string> = {
    'Single Shot': '<circle cx="8" cy="8" r="4" fill="currentColor"/>',
    'Big Shot': '<circle cx="8" cy="8" r="6" fill="currentColor"/>',
    '3 Shot': '<circle cx="8" cy="4" r="2.5" fill="currentColor"/><circle cx="4" cy="11" r="2.5" fill="currentColor"/><circle cx="12" cy="11" r="2.5" fill="currentColor"/>',
    'Raycast Laser': '<line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="2" fill="#fff"/>',
    'Particle Beam': '<line x1="0" y1="8" x2="16" y2="8" stroke="currentColor" stroke-width="4"/><circle cx="4" cy="8" r="1.5" fill="#fff"/><circle cx="12" cy="8" r="1.5" fill="#fff"/>',
    'Energy Shield': '<path d="M2 9 C 2 3, 14 3, 14 9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    'Trap Bubble': '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2 2"/>',
    'Acid Bomb': '<path d="M8 2 C 8 2, 4 8, 4 11 C 4 13.5, 6 15, 8 15 C 10 15, 12 13.5, 12 11 C 12 8, 8 2, 8 2 Z" fill="currentColor"/>',
    'Acid Rain': '<path d="M4 10 C 2 10, 1 8, 3 6 C 4 4, 8 3, 11 5 C 13 6, 14 9, 11 10 Z" fill="currentColor"/><line x1="5" y1="12" x2="4" y2="15" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="12" x2="7" y2="15" stroke="currentColor" stroke-width="1.5"/><line x1="11" y1="12" x2="10" y2="15" stroke="currentColor" stroke-width="1.5"/>',
    'Cluster Bomb': '<circle cx="8" cy="8" r="3.5" fill="currentColor"/><circle cx="3" cy="3" r="1.5" fill="currentColor"/><circle cx="13" cy="3" r="1.5" fill="currentColor"/><circle cx="3" cy="13" r="1.5" fill="currentColor"/><circle cx="13" cy="13" r="1.5" fill="currentColor"/>',
    'MIRV': '<path d="M8 1 L11 5 L9 5 L9 12 L7 12 L7 5 L5 5 Z" fill="currentColor"/><circle cx="4" cy="14" r="1.5" fill="currentColor"/><circle cx="12" cy="14" r="1.5" fill="currentColor"/>',
    'Death From Above': '<line x1="3" y1="2" x2="3" y2="8" stroke="currentColor" stroke-width="2"/><line x1="8" y1="0" x2="8" y2="11" stroke="currentColor" stroke-width="2.5"/><line x1="13" y1="2" x2="13" y2="8" stroke="currentColor" stroke-width="2"/>',
    'Roller': '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="2" fill="currentColor"/><line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.5"/>',
    'Bouncer': '<path d="M1 12 Q 4 2, 8 12 T 15 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    'Heatseeker': '<path d="M2 14 L 14 2 L 12 2 L 2 12 Z" fill="currentColor"/><circle cx="12" cy="4" r="2.5" fill="currentColor"/>',
    'Dirt Mover': '<path d="M1 14 L6 9 L11 14 Z" fill="currentColor"/><path d="M5 14 L10 9 L15 14 Z" fill="currentColor"/>',
    'Mountain Borer': '<polygon points="8,1 12,5 10,5 10,14 6,14 6,5 4,5" fill="currentColor"/>',
    'Magic Wall': '<rect x="1" y="2" width="14" height="12" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="1" y1="6" x2="15" y2="6" stroke="currentColor" stroke-width="1.5"/><line x1="1" y1="10" x2="15" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="2" x2="6" y2="6" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="6" x2="10" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="10" x2="6" y2="14" stroke="currentColor" stroke-width="1.5"/>',
    'Black Wall': '<rect x="1" y="2" width="14" height="12" fill="currentColor" stroke="none"/><line x1="1" y1="6" x2="15" y2="6" stroke="#fff" stroke-width="1.5"/><line x1="6" y1="2" x2="6" y2="6" stroke="#fff" stroke-width="1.5"/><line x1="10" y1="6" x2="10" y2="10" stroke="#fff" stroke-width="1.5"/>',
    'Rainbow Wall': '<rect x="1" y="2" width="14" height="4" fill="#ff0000"/><rect x="1" y="6" width="14" height="4" fill="#00ff00"/><rect x="1" y="10" width="14" height="4" fill="#0000ff"/>',
    'Dirt Cutter': '<path d="M7 1 L9 1 L9 15 L7 15 Z" fill="currentColor"/><polygon points="8,15 11,12 5,12" fill="currentColor"/>',
    'Mountain Cutter': '<path d="M5 1 L11 1 L11 15 L5 15 Z" fill="currentColor"/><polygon points="8,15 13,10 3,10" fill="currentColor"/>',
    'Sling Shots': '<path d="M4 14 Q 8 8, 12 14" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="4" cy="14" r="2" fill="currentColor"/><circle cx="12" cy="14" r="2" fill="currentColor"/><circle cx="8" cy="8" r="2" fill="currentColor"/>',
    'Color Bombs': '<circle cx="8" cy="8" r="4" fill="currentColor"/><circle cx="3" cy="4" r="2" fill="#ff0000"/><circle cx="13" cy="4" r="2" fill="#00ff00"/><circle cx="8" cy="13" r="2" fill="#0000ff"/>',
    'Green Frog': '<path d="M4 12 C 4 7, 12 7, 12 12 Z" fill="currentColor"/><circle cx="6" cy="9" r="1.5" fill="#fff"/><circle cx="10" cy="9" r="1.5" fill="#fff"/>',
    'Mega Frog': '<path d="M2 14 C 2 5, 14 5, 14 14 Z" fill="currentColor"/><circle cx="5" cy="9" r="2" fill="#fff"/><circle cx="11" cy="9" r="2" fill="#fff"/>',
    'Nuke': '<path d="M8 2 C 4 2, 4 6, 6 7 C 6 10, 5 13, 2 14 L 14 14 C 11 13, 10 10, 10 7 C 12 6, 12 2, 8 2 Z" fill="currentColor"/>',
    'Vine Trap': '<path d="M2 14 Q 5 9, 8 14 T 14 14" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="5" cy="11" r="1.5" fill="currentColor"/><circle cx="11" cy="11" r="1.5" fill="currentColor"/>',
    'Pollen Cloud': '<circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2 3"/>',
    'Root Borer': '<path d="M8 2 C 5 6, 11 10, 8 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    'Thorn Burst': '<polygon points="8,1 9.5,5.5 14,5.5 10.5,8.5 12,13 8,10.5 4,13 5.5,8.5 2,5.5 6.5,5.5" fill="currentColor"/>',
    'Sand Storm': '<path d="M1 7 Q 4 3, 8 7 T 15 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M1 11 Q 4 7, 8 11 T 15 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    'Quicksand': '<ellipse cx="8" cy="12" rx="6" ry="3" fill="currentColor"/><line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1.5"/>',
    'Scorpion Sting': '<path d="M8 14 C 3 14, 3 7, 8 7 C 13 7, 13 3, 8 3 L 6 4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    'Heat Mirage': '<path d="M2 8 Q 5 4, 8 8 T 14 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 13 Q 8 9, 12 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    'Avalanche': '<path d="M1 14 L8 5 L15 14 Z" fill="currentColor"/><circle cx="6" cy="14" r="2.5" fill="#fff"/><circle cx="10" cy="14" r="3.5" fill="#fff"/>',
    'Frost Nova': '<circle cx="8" cy="8" r="3" fill="currentColor"/><line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" stroke-width="1.5"/><line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="13" x2="13" y2="3" stroke="currentColor" stroke-width="1.5"/>',
    'Ice Spike': '<polygon points="8,1 11,14 5,14" fill="currentColor"/>',
    'Blizzard Bomb': '<circle cx="8" cy="8" r="4.5" fill="currentColor"/><path d="M8 1 L9 3 M8 15 L7 13 M1 8 L3 9 M15 8 L13 7" stroke="currentColor" stroke-width="1.5"/>',
    'Digger': '<polygon points="5,2 11,2 11,10 8,15 5,10" fill="currentColor"/>',
    'Crusher': '<rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor"/><line x1="2" y1="8" x2="14" y2="8" stroke="#000" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="14" stroke="#000" stroke-width="2"/>',
    'Earth Worm': '<path d="M2 8 Q 5 14, 8 8 T 14 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="14" cy="8" r="2" fill="currentColor"/>',
    'Earth Slinger': '<circle cx="3" cy="13" r="2.5" fill="currentColor"/><circle cx="8" cy="8" r="3" fill="currentColor"/><circle cx="13" cy="3" r="2.5" fill="currentColor"/>',
    'Mega Nuke': '<path d="M8 2 C 2 2, 2 8, 4 9 C 4 14, 2 15, 2 15 L 14 15 C 14 15, 12 14, 12 9 C 14 8, 14 2, 8 2 Z" fill="currentColor"/><circle cx="8" cy="8" r="2" fill="#000"/>',
    'Scatter bomb': '<circle cx="8" cy="8" r="2" fill="currentColor"/><circle cx="3" cy="3" r="1.5" fill="currentColor"/><circle cx="13" cy="3" r="1.5" fill="currentColor"/><circle cx="3" cy="13" r="1.5" fill="currentColor"/><circle cx="13" cy="13" r="1.5" fill="currentColor"/><circle cx="8" cy="2" r="1.5" fill="currentColor"/><circle cx="8" cy="14" r="1.5" fill="currentColor"/><circle cx="2" cy="8" r="1.5" fill="currentColor"/><circle cx="14" cy="8" r="1.5" fill="currentColor"/>',
    'Scatter Dirt Rain': '<path d="M3 3 L 5 7 M 8 2 L 8 8 M 13 3 L 11 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="4" cy="11" r="1.5" fill="currentColor"/><circle cx="8" cy="13" r="2" fill="currentColor"/><circle cx="12" cy="11" r="1.5" fill="currentColor"/>',
    'Tar Bomb': '<path d="M8 3 C 8 3, 3 9, 3 13 C 3 15.5, 5 15.5, 8 15.5 C 11 15.5, 13 15.5, 13 13 C 13 9, 8 3, 8 3 Z" fill="currentColor"/>'
  };

  constructor(sanitizer: DomSanitizer) {
    this.sanitizer = sanitizer;
  }

  ngAfterViewInit(): void {
    this.gameEngine = new GameEngine(
      this.gameCanvasRef.nativeElement,
      this.skyCanvasRef.nativeElement
    );

    this.gameEngine.setUIElements(
      this.angleInputRef.nativeElement,
      this.powerInputRef.nativeElement,
      this.weaponSelectRef.nativeElement,
      this.fuelDisplayRef.nativeElement
    );

    // Set callback so game engine can update weapon name display
    this.gameEngine.setUpdateUICallback(() => {
      this.updateWeaponLabel();
    });

    // Boot the live engine wallpaper
    this.gameEngine.renderTitleScreen();

    // Security layer
    this.gameEngine.initSecurity();

    // Show resume button if saved game exists
    if (this.gameEngine.hasSavedGame()) {
      document.getElementById('btn-resume')?.classList.remove('hidden');
    }
  }

  setGameMode(mode: 'local' | 'ai'): void {
    this.gameMode = mode;
  }

  setAIDifficulty(diff: AIDifficulty): void {
    this.aiDifficulty = diff;
  }

  // ─── Armory ───
  toggleArmory(): void {
    this.armoryOpen = !this.armoryOpen;
    if (this.armoryOpen) {
      this.refreshArmoryData();
    }
  }

  private refreshArmoryData(): void {
    this.activeWeapons = getWeaponsForBiome(this.currentBiome);
    const cats = new Set<string>();
    this.activeWeapons.forEach(w => cats.add(w.category));
    this.weaponCategories = WEAPON_CATEGORIES.filter(c => cats.has(c));
  }

  getWeaponsInCategory(cat: string): WeaponConfig[] {
    return this.activeWeapons.filter(w => w.category === cat);
  }

  isWeaponSelected(w: WeaponConfig): boolean {
    const idx = this.activeWeapons.indexOf(w);
    return idx === this.selectedWeaponIndex;
  }

  selectWeapon(w: WeaponConfig): void {
    const idx = this.activeWeapons.indexOf(w);
    if (idx >= 0) {
      this.selectedWeaponIndex = idx;
      this.weaponSelectRef.nativeElement.value = String(idx);
      this.weaponSelectRef.nativeElement.dispatchEvent(new Event('change'));
      this.updateWeaponLabel();
    }
    this.armoryOpen = false;
  }

  getCategoryIconPath(cat: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.categoryIcons[cat] || '');
  }

  getWeaponIconPath(weaponName: string): SafeHtml {
    const defaultIcon = '<circle cx="8" cy="8" r="4" fill="currentColor"/>';
    return this.sanitizer.bypassSecurityTrustHtml(this.weaponIcons[weaponName] || defaultIcon);
  }

  private updateWeaponLabel(): void {
    const nameEl = document.getElementById('current-weapon-name');
    if (nameEl && this.activeWeapons.length > 0) {
      const selIdx = parseInt(this.weaponSelectRef.nativeElement.value, 10) || 0;
      this.selectedWeaponIndex = selIdx;
      if (this.activeWeapons[selIdx]) {
        nameEl.innerText = this.activeWeapons[selIdx].name;
      }
    }
  }

  // ─── Game Start ───
  onStartBattle(): void {
    const p1Name = (document.getElementById('p1-name') as HTMLInputElement).value || 'Player 1';
    const p1Color = (document.getElementById('p1-color') as HTMLInputElement).value || '#00ff00';
    const biome = (document.getElementById('biome-select') as HTMLSelectElement).value || 'Grasslands';
    const weather = (document.getElementById('weather-select') as HTMLSelectElement).value || 'Clear';

    this.currentBiome = biome;
    this.activeWeapons = getWeaponsForBiome(biome);
    this.selectedWeaponIndex = 0;
    this.armoryOpen = false;

    let p2Name: string;
    let p2Color: string;

    if (this.gameMode === 'ai') {
      const diffLabel = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
      p2Name = `AI (${diffLabel})`;
      p2Color = (document.getElementById('p2-color-ai') as HTMLInputElement)?.value || '#ff0000';
    } else {
      p2Name = (document.getElementById('p2-name') as HTMLInputElement)?.value || 'Player 2';
      p2Color = (document.getElementById('p2-color') as HTMLInputElement)?.value || '#ff0000';
    }

    document.getElementById('main-menu')?.classList.remove('active');
    document.getElementById('main-menu')?.classList.add('hidden');
    document.getElementById('hud')?.classList.remove('hidden');

    SaveManager.clearSave();

    const config: GameConfig = {
      p1Name, p2Name, p1Color, p2Color, biome, weather,
      gameMode: this.gameMode,
      aiDifficulty: this.gameMode === 'ai' ? this.aiDifficulty : undefined
    };
    this.gameEngine.startLocalGame(config, null);

    // Refresh armory categories after game starts
    this.refreshArmoryData();
  }

  onResume(): void {
    const state = SaveManager.loadGame();
    if (state) {
      this.currentBiome = state.settings?.biome || 'Grasslands';
      this.activeWeapons = getWeaponsForBiome(this.currentBiome);
      this.armoryOpen = false;

      document.getElementById('main-menu')?.classList.remove('active');
      document.getElementById('main-menu')?.classList.add('hidden');
      document.getElementById('hud')?.classList.remove('hidden');
      this.gameEngine.startLocalGame(null, state);
      this.refreshArmoryData();
    } else {
      this.showGameDialog('NO SAVE DATA', 'No valid save data was found. Start a new battle instead!');
    }
  }

  private showGameDialog(title: string, message: string): void {
    const dialog = document.getElementById('game-dialog');
    const titleEl = document.getElementById('game-dialog-title');
    const msgEl = document.getElementById('game-dialog-message');
    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerText = message;
    dialog?.classList.remove('hidden');
    const okBtn = document.getElementById('game-dialog-ok');
    if (okBtn) {
      const newOk = okBtn.cloneNode(true) as HTMLElement;
      okBtn.parentNode?.replaceChild(newOk, okBtn);
      newOk.addEventListener('click', () => dialog?.classList.add('hidden'));
    }
  }

  private showGameConfirm(title: string, message: string, onConfirm: () => void): void {
    const dialog = document.getElementById('game-confirm');
    const titleEl = document.getElementById('game-confirm-title');
    const msgEl = document.getElementById('game-confirm-message');
    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerText = message;
    dialog?.classList.remove('hidden');

    const yesBtn = document.getElementById('game-confirm-yes');
    const noBtn = document.getElementById('game-confirm-no');
    if (yesBtn) {
      const newYes = yesBtn.cloneNode(true) as HTMLElement;
      yesBtn.parentNode?.replaceChild(newYes, yesBtn);
      newYes.addEventListener('click', () => { dialog?.classList.add('hidden'); onConfirm(); });
    }
    if (noBtn) {
      const newNo = noBtn.cloneNode(true) as HTMLElement;
      noBtn.parentNode?.replaceChild(newNo, noBtn);
      newNo.addEventListener('click', () => dialog?.classList.add('hidden'));
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    const hud = document.getElementById('hud');
    const inBattle = hud && !hud.classList.contains('hidden');

    if (inBattle) {
      // Close armory on Escape
      if (e.key === 'Escape' && this.armoryOpen) {
        this.armoryOpen = false;
        e.preventDefault();
        return;
      }

      if (e.key === 'F5') {
        e.preventDefault();
        this.showGameConfirm(
          'LEAVING BATTLEFIELD',
          'Your battle progress will be auto-saved. Are you sure you want to leave?',
          () => { window.location.reload(); }
        );
      }
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if ((isMac ? e.metaKey : e.ctrlKey) && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        this.showGameConfirm(
          'LEAVING BATTLEFIELD',
          'Your battle progress will be auto-saved. Are you sure you want to leave?',
          () => { window.location.reload(); }
        );
      }
    }
  }
}
