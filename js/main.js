import { startLocalGame, abortGame, renderTitleScreen } from './engine/Game.js';
import { SaveManager } from './engine/SaveManager.js';
import { Security } from './engine/Security.js';

function showGameDialog(title, message) {
    const dialog = document.getElementById('game-dialog');
    document.getElementById('game-dialog-title').innerText = title;
    document.getElementById('game-dialog-message').innerText = message;
    dialog.classList.remove('hidden');
    const okBtn = document.getElementById('game-dialog-ok');
    const newOk = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    newOk.addEventListener('click', () => dialog.classList.add('hidden'));
}

function showGameConfirm(title, message, onConfirm) {
    const dialog = document.getElementById('game-confirm');
    document.getElementById('game-confirm-title').innerText = title;
    document.getElementById('game-confirm-message').innerText = message;
    dialog.classList.remove('hidden');
    
    const yesBtn = document.getElementById('game-confirm-yes');
    const noBtn = document.getElementById('game-confirm-no');
    const newYes = yesBtn.cloneNode(true);
    const newNo = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    noBtn.parentNode.replaceChild(newNo, noBtn);
    newYes.addEventListener('click', () => { dialog.classList.add('hidden'); onConfirm(); });
    newNo.addEventListener('click', () => dialog.classList.add('hidden'));
}

window.addEventListener('DOMContentLoaded', () => {
    console.log("Pocket Tanks Retro Engine Booting...");
    
    // Boot the live engine wallpaper!
    renderTitleScreen();
    
    // V8.0 Security Layer
    const security = new Security();
    
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
                showGameDialog("NO SAVE DATA", "No valid save data was found. Start a new battle instead!");
            }
        });
    }

    // Intercept F5 and Ctrl+R during battle to show custom dialog instead of native browser dialog
    document.addEventListener('keydown', (e) => {
        const hud = document.getElementById('hud');
        const inBattle = hud && !hud.classList.contains('hidden');
        
        if (inBattle) {
            // Intercept F5
            if (e.key === 'F5') {
                e.preventDefault();
                showGameConfirm(
                    "⚠️ LEAVING BATTLEFIELD",
                    "Your battle progress will be auto-saved. Are you sure you want to leave?",
                    () => { window.location.reload(); }
                );
            }
            // Intercept Ctrl+R / Cmd+R
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            if ((isMac ? e.metaKey : e.ctrlKey) && (e.key === 'r' || e.key === 'R')) {
                e.preventDefault();
                showGameConfirm(
                    "⚠️ LEAVING BATTLEFIELD",
                    "Your battle progress will be auto-saved. Are you sure you want to leave?",
                    () => { window.location.reload(); }
                );
            }
        }
    });
});
