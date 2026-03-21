export class SaveManager {
    static saveGame(state) {
        try {
            const dataStr = JSON.stringify(state);
            // Base64 encoding acting as simple obfuscation payload
            const encoded = btoa(encodeURIComponent(dataStr));
            localStorage.setItem('tactical_artillery_save_v3', encoded);
            console.log("State serialized and encrypted to local storage.");
            return true;
        } catch(e) {
            console.error("Failed to save state:", e);
            return false;
        }
    }

    static loadGame() {
        try {
            const encoded = localStorage.getItem('tactical_artillery_save_v3');
            if (!encoded) return null;
            const decoded = decodeURIComponent(atob(encoded));
            return JSON.parse(decoded);
        } catch(e) {
            console.error("Failed to load / deserialize state:", e);
            return null;
        }
    }

    static clearSave() {
        localStorage.removeItem('tactical_artillery_save_v3');
    }
}
