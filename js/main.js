import { startLocalGame, abortGame, renderTitleScreen } from './engine/Game.js';
import { SaveManager } from './engine/SaveManager.js';

window.addEventListener('DOMContentLoaded', () => {
    console.log("Pocket Tanks Retro Engine Booting...");
    
    // Boot the live engine wallpaper!
    renderTitleScreen();
    
    const btnPlayLocal = document.getElementById('btn-start');
    const btnResume = document.getElementById('btn-resume');

    if (SaveManager.loadGame()) {
        btnResume.classList.remove('hidden');
    }

    if (btnPlayLocal) {
        btnPlayLocal.addEventListener('click', () => {
            const p1Name = document.getElementById('p1-name').value || "Player 1";
            const p2Name = document.getElementById('p2-name').value || "Player 2";
            const p1Color = document.getElementById('p1-color').value || "#00ff00";
            const p2Color = document.getElementById('p2-color').value || "#ff0000";
            const biome = document.getElementById('biome-select').value || "Grasslands";
            const weather = document.getElementById('weather-select').value || "Clear";

            document.getElementById('main-menu').classList.remove('active');
            document.getElementById('main-menu').classList.add('hidden');
            document.getElementById('hud').classList.remove('hidden');
            
            SaveManager.clearSave();

            startLocalGame({ p1Name, p2Name, p1Color, p2Color, biome, weather }, null);
        });
    }

    if (btnResume) {
        btnResume.addEventListener('click', () => {
            const state = SaveManager.loadGame();
            if (state) {
                document.getElementById('main-menu').classList.remove('active');
                document.getElementById('main-menu').classList.add('hidden');
                document.getElementById('hud').classList.remove('hidden');
                startLocalGame(null, state);
            } else {
                alert("No valid save data found.");
            }
        });
    }

    window.addEventListener('beforeunload', (e) => {
        const hud = document.getElementById('hud');
        if (hud && !hud.classList.contains('hidden')) {
            e.preventDefault();
            e.returnValue = ''; 
        }
    });

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    document.addEventListener('keydown', (e) => {
        if ((isMac ? e.metaKey : e.ctrlKey) && (e.key === 'r' || e.key === 'R')) {
            const hud = document.getElementById('hud');
            if (hud && !hud.classList.contains('hidden')) {
                e.preventDefault();
                alert("Use the MENU button to safely quit in-battle!");
            }
        }
    });
});
