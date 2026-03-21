import { Renderer } from './Renderer.js';
import { Terrain } from '../entities/Terrain.js';
import { Tank } from '../entities/Tank.js';
import { InputManager } from './Input.js';
import { PhysicsEngine } from './Physics.js';
import { Projectile } from '../entities/Projectile.js';
import { Particle, createExplosion, FireParticle, AcidParticle, TextParticle, BeamParticle } from '../entities/Particle.js';
import { WEAPON_TYPES } from '../weapons/WeaponSystem.js';
import { AudioManager } from './AudioManager.js';
import { WeatherManager } from './WeatherManager.js';
import { SaveManager } from './SaveManager.js';

let renderer, terrain, physics, input, audio, weatherMgr, gameLoopId;
let players = [], projectiles = [], particles = [];
let currentPlayerIndex = 0;
let gameState = 'AIMING'; 
let currentSettings = {};
let turnStartTime = 0;

let angleInput, powerInput, weaponSelect, fuelDisplay;

export function startLocalGame(config, savedState) {
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    projectiles = [];
    particles = [];
    gameState = 'AIMING';

    audio = new AudioManager();
    renderer = new Renderer('game-canvas');
    input = new InputManager();
    physics = new PhysicsEngine();

    weaponSelect = document.getElementById('weapon-select');
    weaponSelect.innerHTML = '';
    
    WEAPON_TYPES.forEach((w, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.innerText = w.name;
        weaponSelect.appendChild(opt);
    });

    if (savedState) {
        currentSettings = savedState.settings;
        weatherMgr = new WeatherManager(currentSettings.weather, 'sky-canvas');
        terrain = new Terrain(renderer.width, renderer.height, currentSettings.biome, savedState.terrainModifications);
        physics.wind = savedState.wind;
        physics.airDensity = weatherMgr.airDensity;
        
        players = savedState.players.map(p => {
            const t = new Tank(p.x, p.y, p.color, p.typeId, p.playerName);
            t.health = p.health;
            t.fuel = p.fuel;
            t.angle = p.angle;
            t.power = p.power;
            t.weaponIndex = p.weaponIndex;
            t.shieldLife = p.shieldLife || 0;
            return t;
        });
        // Snap tanks to terrain surface so they don't spawn buried inside the ground
        players.forEach(p => p.dropToTerrain(terrain));
        currentPlayerIndex = savedState.currentPlayerIndex;
        gameState = savedState.gameState;
    } else {
        currentSettings = config;
        weatherMgr = new WeatherManager(config.weather, 'sky-canvas');
        terrain = new Terrain(renderer.width, renderer.height, config.biome);
        physics.airDensity = weatherMgr.airDensity;

        players = [
            new Tank(renderer.width * 0.15, 0, config.p1Color, 'Classic', config.p1Name),
            new Tank(renderer.width * 0.85, 0, config.p2Color, 'Classic', config.p2Name)
        ];
        players[1].angle = 135;
        players.forEach(p => p.dropToTerrain(terrain));
        physics.randomizeWind(weatherMgr.baseWindVolatility);
    }

    turnStartTime = Date.now();
    angleInput = document.getElementById('angle-input');
    powerInput = document.getElementById('power-input');
    fuelDisplay = document.getElementById('fuel-display');

    const setAim = (a, p) => {
        const cp = players[currentPlayerIndex];
        cp.angle = Math.max(0, Math.min(360, a));
        cp.power = Math.max(0, Math.min(100, p));
        updateHUD();
    };

    const bindBtn = (id, action) => {
        const btn = document.getElementById(id);
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        let holdInterval;
        const start = () => {
            if (gameState !== 'AIMING') return;
            action();
            holdInterval = setInterval(action, 80);
        };
        const stop = () => clearInterval(holdInterval);
        newBtn.onmousedown = start; newBtn.onmouseup = stop; newBtn.onmouseleave = stop;
        newBtn.ontouchstart = (e) => { e.preventDefault(); start(); };
        newBtn.ontouchend = stop;
    };

    bindBtn('btn-angle-up', () => setAim(players[currentPlayerIndex].angle + 1, players[currentPlayerIndex].power));
    bindBtn('btn-angle-down', () => setAim(players[currentPlayerIndex].angle - 1, players[currentPlayerIndex].power));
    bindBtn('btn-power-up', () => setAim(players[currentPlayerIndex].angle, players[currentPlayerIndex].power + 1));
    bindBtn('btn-power-down', () => setAim(players[currentPlayerIndex].angle, players[currentPlayerIndex].power - 1));

    const btnFire = document.getElementById('btn-fire');
    const newBtnFire = btnFire.cloneNode(true);
    btnFire.parentNode.replaceChild(newBtnFire, btnFire);
    newBtnFire.addEventListener('click', onFire);

    weaponSelect.onchange = () => {
        if (gameState === 'AIMING') {
            players[currentPlayerIndex].weaponIndex = parseInt(weaponSelect.value, 10);
            updateHUD();
            audio.playUI();
        }
    };

    let moveInterval = null;
    const bindMove = (btnId, dir) => {
        const btn = document.getElementById(btnId);
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        const startMove = () => {
            if (gameState !== 'AIMING') return;
            moveInterval = setInterval(() => {
                if (players[currentPlayerIndex].move(dir, terrain)) updateHUD();
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
    const newBtnSettings = btnSettings.cloneNode(true);
    btnSettings.parentNode.replaceChild(newBtnSettings, btnSettings);
    const settingsModal = document.getElementById('settings-modal');
    newBtnSettings.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
    });

    const settingsClose = document.getElementById('modal-settings-close');
    const newSettingsClose = settingsClose.cloneNode(true);
    settingsClose.parentNode.replaceChild(newSettingsClose, settingsClose);
    newSettingsClose.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    // Sound Settings
    const volSlider = document.getElementById('volume-slider');
    const btnMute = document.getElementById('btn-mute');
    // Restore saved volume
    const savedVol = localStorage.getItem('pt_volume');
    const savedMute = localStorage.getItem('pt_muted');
    if (savedVol !== null) volSlider.value = Math.round(parseFloat(savedVol) * 100);
    if (savedMute === 'true') btnMute.innerText = '🔇 OFF';

    volSlider.addEventListener('input', () => {
        const val = parseInt(volSlider.value) / 100;
        audio.setVolume(val);
        if (audio.muted) { audio.muted = false; localStorage.setItem('pt_muted', false); btnMute.innerText = '🔊 ON'; }
    });
    btnMute.addEventListener('click', () => {
        const muted = audio.toggleMute();
        btnMute.innerText = muted ? '🔇 OFF' : '🔊 ON';
    });

    const btnAbort = document.getElementById('btn-abort-match');
    const newBtnAbort = btnAbort.cloneNode(true);
    btnAbort.parentNode.replaceChild(newBtnAbort, btnAbort);
    newBtnAbort.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
        abortGame();
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('end-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        document.getElementById('main-menu').classList.add('active');
        if (SaveManager.loadGame()) {
            document.getElementById('btn-resume').classList.remove('hidden');
        }
    });

    document.getElementById('main-menu-bg').classList.add('hidden');

    updateHUD();
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    requestAnimationFrame(gameLoop);
}

export function abortGame() {
    autoSave();
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameState = 'GAME_OVER';
    document.getElementById('main-menu-bg').classList.remove('hidden');
    renderTitleScreen();
}

export function renderTitleScreen() {
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    
    renderer = new Renderer('game-canvas');
    weatherMgr = new WeatherManager('Clear', 'sky-canvas');
    terrain = new Terrain(renderer.width, renderer.height, 'Desert');
    
    const demoP1 = new Tank(renderer.width * 0.15, 0, '#00ff00', 'Classic', 'PLAYER 1');
    const demoP2 = new Tank(renderer.width * 0.85, 0, '#ff0000', 'Classic', 'PLAYER 2');
    demoP2.angle = 135;
    
    demoP1.dropToTerrain(terrain);
    demoP2.dropToTerrain(terrain);
    
    // Draw sky gradient
    const ctx = renderer.ctx;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, renderer.height);
    skyGrad.addColorStop(0, '#0a0e27');
    skyGrad.addColorStop(0.5, '#1a1a4e');
    skyGrad.addColorStop(1, '#2d1b4e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    
    // Blit terrain offscreen canvas
    ctx.drawImage(terrain.canvas, 0, 0);
    
    // Draw demo tanks
    demoP1.draw(ctx);
    demoP2.draw(ctx);
}

function autoSave() {
    SaveManager.saveGame({
        settings: currentSettings,
        terrainModifications: terrain.modifications,
        wind: physics.wind,
        currentPlayerIndex,
        gameState,
        players: players.map(p => ({
            x: p.x, y: p.y, color: p.color, typeId: p.typeId, playerName: p.playerName,
            health: p.health, fuel: p.fuel, angle: p.angle, power: p.power, weaponIndex: p.weaponIndex,
            shieldLife: p.shieldLife
        }))
    });
}

function applyDamage(tank, dmg) {
    if (tank.shieldLife > 0) {
        tank.shieldLife -= dmg;
        if (tank.shieldLife < 0) tank.shieldLife = 0;
        particles.push(new TextParticle(tank.x, tank.y - 40, "BLOCKED", '#00aaff'));
        audio.playPop(); 
        updateHUD();
        return;
    }
    tank.health -= dmg;
    if (tank.health < 0) tank.health = 0;
    particles.push(new TextParticle(tank.x + (Math.random()-0.5)*20, tank.y - 30 - Math.random()*10, `-${dmg}`, '#ff0000'));
    updateHUD();
}

function onFire() {
    if (gameState !== 'AIMING') return;
    
    const cp = players[currentPlayerIndex];
    cp.angle = parseInt(angleInput.value, 10);
    cp.power = parseInt(powerInput.value, 10);

    const rad = cp.angle * Math.PI / 180;
    const barrelLength = 30; // Arcade scalar
    const px = cp.x + Math.cos(rad) * barrelLength;
    const py = (cp.y - 6) - Math.sin(rad) * barrelLength;

    const weapon = WEAPON_TYPES[cp.weaponIndex || 0];
    
    audio.playShoot();

    if (weapon.isShield) {
        cp.shieldLife = 100;
        particles.push(new TextParticle(cp.x, cp.y - 40, "SHIELD UP", '#00aaff'));
        gameState = 'WAITING_FOR_NEXT_TURN';
        setTimeout(nextTurn, 1000);
        return;
    }

    if (weapon.isBeam) {
        // True zero-frame mathematical raycasting
        let cx = px;
        let cy = py;
        const speed = 5;
        const dx = Math.cos(rad) * speed;
        const dy = -Math.sin(rad) * speed;
        
        while(cx > -100 && cx < renderer.width + 100 && cy > -100 && cy < renderer.height + 100) {
            if (terrain.isSolid(cx, cy)) break;
            
            let hitTank = false;
            players.forEach(tank => {
                if(Math.hypot(cx - tank.x, cy - tank.y) < tank.width/2 + 5) hitTank = true;
            });
            if (hitTank) break;
            
            cx += dx;
            cy += dy;
        }

        particles.push(new BeamParticle(px, py, cx, cy, weapon.color, weapon.thickness));
        
        const dummyProj = { x: cx, y: cy, weapon: weapon };
        triggerExplosion(dummyProj);
        
        gameState = 'FIRING';
        autoSave();
        return;
    }

    const wCount = weapon.count || 1;
    const wSpread = weapon.spread || 0;

    for (let i = 0; i < wCount; i++) {
        let angleOffset = 0;
        if (wCount > 1) angleOffset = (i - (wCount - 1) / 2) * wSpread;
        const proj = new Projectile(px, py, cp.angle + angleOffset, cp.power, currentPlayerIndex, weapon);
        projectiles.push(proj);
    }
    
    gameState = 'FIRING';
    autoSave();
}

function updateHUD() {
    const cp = players[currentPlayerIndex];
    if (angleInput) angleInput.value = cp.angle;
    if (powerInput) powerInput.value = cp.power;
    if (fuelDisplay) fuelDisplay.innerText = Math.floor((cp.fuel/cp.maxFuel)*100);
    if (weaponSelect) weaponSelect.value = cp.weaponIndex || 0;

    document.getElementById('wind-value').innerText = (Math.abs(physics.wind) * 100).toFixed(1).padStart(4, '0');
    document.getElementById('wind-arrow').style.transform = `rotate(${physics.wind >= 0 ? 0 : 180}deg)`;
    
    document.getElementById('lbl-p1-name').innerText = players[0].playerName;
    document.getElementById('lbl-p2-name').innerText = players[1].playerName;

    if (currentPlayerIndex === 0) {
        document.getElementById('lbl-p1-name').style.color = '#ffaa00';
        document.getElementById('lbl-p2-name').style.color = '#fff';
    } else {
        document.getElementById('lbl-p2-name').style.color = '#ffaa00';
        document.getElementById('lbl-p1-name').style.color = '#fff';
    }

    document.getElementById('p1-health').style.width = `${Math.max(0, (players[0].health / players[0].maxHealth) * 100)}%`;
    document.getElementById('p2-health').style.width = `${Math.max(0, (players[1].health / players[1].maxHealth) * 100)}%`;

    const p1Badge = document.getElementById('p1-turn-indicator');
    const p2Badge = document.getElementById('p2-turn-indicator');
    if (p1Badge && p2Badge) {
        if (currentPlayerIndex === 0) {
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
}

function gameLoop() {
    update();
    renderer.draw(terrain, players, projectiles, particles);
    
    if (gameState === 'AIMING') {
        const timeElapsed = Date.now() - (turnStartTime || 0);
        if (timeElapsed < 2500) {
            const cp = players[currentPlayerIndex];
            const ctx = renderer.ctx;
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

    weatherMgr.updateAndDraw(physics.wind); 
    
    if (gameState !== 'GAME_OVER') {
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

function update() {
    if (gameState === 'AIMING') {
        const cp = players[currentPlayerIndex];
        let changed = false;
        if (input.isKeyDown('ArrowUp')) { cp.angle = Math.min(360, cp.angle + 1); changed = true; }
        if (input.isKeyDown('ArrowDown')) { cp.angle = Math.max(0, cp.angle - 1); changed = true; }
        if (input.isKeyDown('ArrowRight')) { cp.power = Math.min(100, cp.power + 1); changed = true; }
        if (input.isKeyDown('ArrowLeft')) { cp.power = Math.max(0, cp.power - 1); changed = true; }
        if (changed) updateHUD();
    }
    
    // V6.0 Settle Terrain & Tank Kinetics
    let settling = terrain.settleStep();
    if (settling) terrain.settleStep(); // 2x cascading speed
    
    players.forEach(p => p.update(terrain));

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.update(physics, players);

        // Borer tunnel hook mid-air 
        if (p.weapon.isBorer && p.y > 0 && p.x > 0 && p.x < renderer.width) {
            terrain.destroy(p.x, p.y, p.weapon.boreRadius);
        }

        if (p.triggerSplit) {
            p.active = false;
            audio.playPop();
            const sCount = p.weapon.splitCount || 3;
            for(let c=0; c<sCount; c++) {
                const subConf = { ...WEAPON_TYPES.find(w=>w.name === 'Single Shot') } || { damage: 20, explosionRadius:25 };
                subConf.explosionRadius = Math.floor(p.weapon.explosionRadius/2);
                subConf.damage = Math.floor(p.weapon.damage/2);
                subConf.color = p.weapon.color;
                subConf.isSplitter = false; 
                const subProj = new Projectile(p.x, p.y, 0, 0, p.ownerId, subConf);
                subProj.vx = p.vx + (Math.random() - 0.5) * 8;
                subProj.vy = Math.min(0, p.vy) - 2 - Math.random()*3;
                projectiles.push(subProj);
            }
            createExplosion(p.x, p.y, particles, true);
        }

        if (p.triggerCluster) {
            p.active = false;
            audio.playPop();
            const cCount = p.weapon.clusterCount || 5;
            for(let c=0; c<cCount; c++) {
                const subConf = { ...WEAPON_TYPES.find(w=>w.name === 'Single Shot') } || { damage: 20, explosionRadius:25, isDirt: false, radius: 2, mass:2 };
                subConf.explosionRadius = 25;
                subConf.damage = p.weapon.damage;
                const subProj = new Projectile(p.x, p.y, 0, 0, p.ownerId, subConf);
                subProj.vx = p.vx + (Math.random() - 0.5) * 6;
                subProj.vy = p.vy + (Math.random()) * 2; 
                projectiles.push(subProj);
            }
            createExplosion(p.x, p.y, particles, true);
        }

        if (p.x < -100 || p.x > renderer.width + 100 || p.y > renderer.height + 100) p.active = false;

        if (p.active) {
            players.forEach((tank) => {
                const distOffset = Math.hypot(p.x - tank.x, p.y - tank.y);
                if (distOffset < tank.width/2 + p.radius + 5) {
                    triggerExplosion(p);
                    p.active = false;
                }
            });
        }

        if (p.active && terrain.isSolid(p.x, p.y)) {
            if (p.weapon.isBouncer && p.bounces > 0) {
                p.bounces--;
                p.y -= 5;
                p.vy = -p.vy * 0.6;
                p.vx = p.vx * 0.8;
                audio.playPop();
            } else if (p.weapon.isRoller && p.rollLife > 0) {
                p.rollLife--;
                p.y -= 1;
                p.vy = 0;
                p.vx = p.vx > 0 ? 3 : -3;
                while(terrain.isSolid(p.x, p.y)) p.y--;
            } else {
                triggerExplosion(p);
                p.active = false;
            }
        }

        if (!p.active) projectiles.splice(i, 1);
    }

    particles.forEach(p => {
        if (p instanceof FireParticle || p instanceof AcidParticle) {
            p.update(terrain);
            players.forEach(tank => {
                const dist = Math.hypot(p.x - tank.x, p.y - tank.y);
                if (dist < tank.width/2 + 5 && Math.random()<0.05) { 
                    applyDamage(tank, 1);
                }
            });
        } else {
            p.update();
        }
    });

    particles = particles.filter(p => p.life > 0);

    // End turn condition includes texting particles falling and sand settling/tanks bouncing
    let isAirborne = players.some(p => p.isAirborne);
    if (gameState === 'FIRING' && projectiles.length === 0 && !isAirborne && !settling && particles.filter(p=>(p instanceof FireParticle) || (p instanceof AcidParticle)).length === 0) {
        // dropToTerrain is no longer strictly necessary since update() handles gravity iteratively, but we leave it as failsafe.
        players.forEach(p => p.dropToTerrain(terrain)); 
        gameState = 'WAITING_FOR_NEXT_TURN';
        setTimeout(nextTurn, 1000);
    }
}

function triggerExplosion(projectile) {
    if (projectile.weapon.isFrog) {
        audio.playPop(); // silent thud
    } else {
        if (projectile.weapon.isDirt) audio.playPop(); 
        else audio.playExplosion();

        if (projectile.weapon.explosionRadius > 50) {
            const container = document.getElementById('game-container');
            container.classList.add('shake');
            setTimeout(() => container.classList.remove('shake'), 400);
        }

        if (projectile.weapon.isWall) {
            audio.playPop();
            for (let i=0; i<12; i++) {
                setTimeout(() => {
                    terrain.add(projectile.x, projectile.y - (i*12), 16);
                    for(let p=0; p<5; p++) particles.push(new Particle(projectile.x, projectile.y - (i*12), '#8b5a2b', 4, 30));
                }, i * 50);
            }
        } else if (projectile.weapon.isBubble) {
            audio.playPop();
            terrain.add(projectile.x, projectile.y, projectile.weapon.bubbleRadius);
            terrain.destroy(projectile.x, projectile.y, projectile.weapon.bubbleRadius - projectile.weapon.bubbleThick);
            particles.push(new TextParticle(projectile.x, projectile.y - 40, "TRAPPED!", '#ffffff'));
        } else if (projectile.weapon.isDirt) {
            terrain.add(projectile.x, projectile.y, projectile.weapon.explosionRadius);
        } else {
            if (projectile.weapon.explosionRadius > 0) {
                terrain.destroy(projectile.x, projectile.y, projectile.weapon.explosionRadius);
                createExplosion(projectile.x, projectile.y, particles, projectile.weapon.explosionRadius < 30, projectile.weapon.explosionColor);
            }
        }

        if (projectile.weapon.isIncendiary) {
            for(let i=0; i<40; i++) particles.push(new FireParticle(projectile.x + (Math.random()-0.5)*projectile.weapon.explosionRadius, projectile.y - 10));
        }
        if (projectile.weapon.isAcid) {
            for(let i=0; i<40; i++) particles.push(new AcidParticle(projectile.x + (Math.random()-0.5)*projectile.weapon.explosionRadius, projectile.y - 10));
        }
    }
    
    players.forEach(tank => {
        const dist = Math.hypot(projectile.x - tank.x, projectile.y - tank.y);
        if (dist < projectile.weapon.explosionRadius + tank.width/2) {
            const damageRange = 1 - (dist / (projectile.weapon.explosionRadius + tank.width/2));
            const dmg = Math.floor(projectile.weapon.damage * damageRange);
            if (dmg > 0 && !projectile.weapon.isFrog) applyDamage(tank, dmg);
            
            // V6.0 Kinetic Knockback Impulses
            const forceMultiplier = projectile.weapon.isFrog ? projectile.weapon.force : 8;
            const dx = tank.x - projectile.x;
            const dy = tank.y - projectile.y;
            const normalizedDx = dist === 0 ? 0 : dx / dist;
            const normalizedDy = dist === 0 ? -1 : dy / dist;
            
            const impulse = forceMultiplier * damageRange;
            if (impulse > 2 || projectile.weapon.isFrog) {
                tank.vx += normalizedDx * impulse;
                tank.vy += normalizedDy * impulse - (impulse*0.5); 
                tank.isAirborne = true;
            }
        }
    });

    checkWinCondition();
}

function nextTurn() {
    if (gameState === 'GAME_OVER') return;
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    physics.randomizeWind(weatherMgr.baseWindVolatility);
    updateHUD();
    gameState = 'AIMING';
    turnStartTime = Date.now();
    autoSave();
}

function checkWinCondition() {
    const deadPlayers = players.filter(p => p.health <= 0);
    if (deadPlayers.length > 0) {
        gameState = 'GAME_OVER';
        SaveManager.clearSave(); 
        
        let winnerText = "MUTUAL DESTRUCTION";
        if (players[0].health > 0) winnerText = `${players[0].playerName} WINS!`;
        if (players[1].health > 0) winnerText = `${players[1].playerName} WINS!`;
        
        const endScreen = document.getElementById('end-screen');
        document.getElementById('winner-text').innerText = winnerText;
        endScreen.classList.remove('hidden');
        endScreen.classList.add('active');

        const btnRematch = document.getElementById('btn-rematch');
        const newBtnRematch = btnRematch.cloneNode(true);
        btnRematch.parentNode.replaceChild(newBtnRematch, btnRematch);
        newBtnRematch.addEventListener('click', () => {
            endScreen.classList.remove('active');
            endScreen.classList.add('hidden');
            startLocalGame(currentSettings, null);
        });

        const btnMenu = document.getElementById('btn-menu');
        const newBtnMenu = btnMenu.cloneNode(true);
        btnMenu.parentNode.replaceChild(newBtnMenu, btnMenu);
        newBtnMenu.addEventListener('click', () => {
            endScreen.classList.remove('active');
            endScreen.classList.add('hidden');
            document.getElementById('hud').classList.add('hidden');
            document.getElementById('main-menu').classList.remove('hidden');
            document.getElementById('main-menu').classList.add('active');
            document.getElementById('main-menu-bg').classList.remove('hidden');
        });
    }
}
