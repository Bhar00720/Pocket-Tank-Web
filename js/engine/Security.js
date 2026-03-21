/**
 * Security.js - Anti-scrape, DevTools blocker, and Ad-block detection
 * V8.0 Protection Layer
 * 
 * Ad-block detection only activates when ads are live in production.
 * Add <meta name="ad-enabled" content="true"> to index.html to enable it.
 */

export class Security {
    constructor() {
        this.adBlockDetected = false;
        this.devToolsOpen = false;
        this.init();
    }

    init() {
        this.disableContextMenu();
        this.disableKeyboardShortcuts();
        this.disableTextSelection();
        this.disableDragDrop();
        this.detectDevTools();

        // Only run ad-block detection when ads are actually integrated
        const adMeta = document.querySelector('meta[name="ad-enabled"]');
        if (adMeta && adMeta.content === 'true') {
            this.detectAdBlocker();
        }
    }

    // ─── Anti-Scrape: Disable right-click context menu ───
    disableContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
    }

    // ─── Disable developer keyboard shortcuts ───
    disableKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // F12 - DevTools
            if (e.key === 'F12') {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            // Ctrl+Shift+I / Cmd+Option+I - Inspect Element
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            // Ctrl+Shift+J / Cmd+Option+J - Console
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            // Ctrl+Shift+C / Cmd+Option+C - Element picker
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            // Ctrl+U / Cmd+U - View Source
            if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            // Ctrl+S / Cmd+S - Save Page
            if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }, true);
    }

    // ─── Disable text selection (anti-copy) ───
    disableTextSelection() {
        document.addEventListener('selectstart', (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        });
    }

    // ─── Disable drag and drop of images/content ───
    disableDragDrop() {
        document.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
    }

    // ─── DevTools detection (keyboard blocking + resize detection) ───
    detectDevTools() {
        // Detect docked DevTools via resize: when DevTools docks to side/bottom,
        // the viewport shrinks significantly relative to outer window.
        const threshold = 200; // High threshold to avoid false positives from taskbar/scaling
        
        const check = () => {
            const widthDiff = window.outerWidth - window.innerWidth > threshold;
            const heightDiff = window.outerHeight - window.innerHeight > threshold;
            const isOpen = widthDiff || heightDiff;
            
            if (isOpen && !this.devToolsOpen) {
                this.devToolsOpen = true;
                this.showDevToolsWarning();
            } else if (!isOpen && this.devToolsOpen) {
                this.devToolsOpen = false;
                this.hideDevToolsWarning();
            }
        };

        // Listen for resize events (fires when DevTools docks/undocks)
        window.addEventListener('resize', check);
        // Also do a periodic check for undocked DevTools opened via menu
        setInterval(check, 3000);
    }

    showDevToolsWarning() {
        let overlay = document.getElementById('security-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'security-overlay';
            overlay.innerHTML = `
                <div style="
                    position:fixed; top:0; left:0; width:100vw; height:100vh;
                    background: rgba(0,0,0,0.95); z-index: 99999;
                    display: flex; justify-content: center; align-items: center;
                    flex-direction: column; color: #fff; font-family: sans-serif;
                ">
                    <div style="font-size: 4rem; margin-bottom: 20px;">🛡️</div>
                    <h2 style="color: #ef4444; font-size: 1.8rem; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 3px;">
                        ACCESS DENIED
                    </h2>
                    <p style="color: #94a3b8; font-size: 1rem; max-width: 450px; text-align: center; line-height: 1.6;">
                        Developer Tools are not permitted while playing Pocket Tanks Web. 
                        Please close Developer Tools to continue playing.
                    </p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        // Neutralize the console — make every method a no-op
        if (!this._origConsole) {
            this._origConsole = {
                log: console.log, warn: console.warn, error: console.error,
                info: console.info, debug: console.debug, dir: console.dir,
                table: console.table, clear: console.clear,
                trace: console.trace, group: console.group, groupEnd: console.groupEnd
            };
        }
        const noop = () => {};
        console.log = noop; console.warn = noop; console.error = noop;
        console.info = noop; console.debug = noop; console.dir = noop;
        console.table = noop; console.trace = noop;
        console.group = noop; console.groupEnd = noop;
        
        // Clear console once
        try { this._origConsole.clear(); } catch(e) {}
    }

    hideDevToolsWarning() {
        const overlay = document.getElementById('security-overlay');
        if (overlay) overlay.style.display = 'none';

        // Restore console when DevTools is closed
        if (this._origConsole) {
            console.log = this._origConsole.log;
            console.warn = this._origConsole.warn;
            console.error = this._origConsole.error;
            console.info = this._origConsole.info;
            console.debug = this._origConsole.debug;
            console.dir = this._origConsole.dir;
            console.table = this._origConsole.table;
            console.trace = this._origConsole.trace;
            console.group = this._origConsole.group;
            console.groupEnd = this._origConsole.groupEnd;
        }
    }

    // ─── Ad Blocker Detection (only when ads are integrated) ───
    detectAdBlocker() {
        // Method 1: Bait element with ad-related class names
        const bait = document.createElement('div');
        bait.className = 'ad-banner ads adsbox ad-placeholder';
        bait.id = 'ad-detect-bait';
        bait.style.cssText = 'width:1px; height:1px; position:absolute; left:-9999px; top:-9999px;';
        bait.innerHTML = '&nbsp;';
        document.body.appendChild(bait);

        setTimeout(() => {
            const baitEl = document.getElementById('ad-detect-bait');
            
            // Check if the bait was hidden by an ad blocker
            const baitHidden = !baitEl || 
                baitEl.offsetHeight === 0 || 
                baitEl.offsetWidth === 0 || 
                getComputedStyle(baitEl).display === 'none' ||
                getComputedStyle(baitEl).visibility === 'hidden';

            if (baitHidden) {
                this.adBlockDetected = true;
                this.showAdBlockWarning();
                return;
            }

            // Method 2: Try to fetch a known ad script URL
            fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', { 
                method: 'HEAD', mode: 'no-cors' 
            }).catch(() => {
                this.adBlockDetected = true;
                this.showAdBlockWarning();
            });
        }, 2000);
    }

    showAdBlockWarning() {
        let overlay = document.getElementById('adblock-overlay');
        if (overlay) return;

        overlay = document.createElement('div');
        overlay.id = 'adblock-overlay';
        overlay.innerHTML = `
            <div style="
                position:fixed; top:0; left:0; width:100vw; height:100vh;
                background: rgba(0,0,0,0.95); z-index: 99998;
                display: flex; justify-content: center; align-items: center;
                flex-direction: column; color: #fff; font-family: sans-serif;
            ">
                <div style="font-size: 4rem; margin-bottom: 20px;">🚫</div>
                <h2 style="color: #f59e0b; font-size: 1.8rem; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 3px;">
                    AD BLOCKER DETECTED
                </h2>
                <p style="color: #94a3b8; font-size: 1rem; max-width: 500px; text-align: center; line-height: 1.6; margin-bottom: 25px;">
                    Pocket Tanks Web is a free game supported by advertisements. 
                    Please disable your ad blocker, DNS-level blocker (e.g. Pi-hole, AdGuard DNS), 
                    or any browser extension that blocks ads to continue playing.
                </p>
                <button id="btn-adblock-recheck" style="
                    background: #3b82f6; color: white; border: none; border-radius: 8px;
                    padding: 12px 30px; font-size: 1rem; font-weight: 700;
                    cursor: pointer; letter-spacing: 1px; transition: all 0.2s;
                ">I'VE DISABLED IT — RECHECK</button>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-adblock-recheck').addEventListener('click', () => {
            window.location.reload();
        });
    }
}
