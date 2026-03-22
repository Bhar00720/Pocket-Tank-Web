export class SaveManager {
  static saveGame(state: any): boolean {
    try {
      const dataStr = JSON.stringify(state);
      const encoded = btoa(encodeURIComponent(dataStr));
      localStorage.setItem('tactical_artillery_save_v3', encoded);
      return true;
    } catch (e) {
      console.error('Failed to save state:', e);
      return false;
    }
  }

  static loadGame(): any {
    try {
      const encoded = localStorage.getItem('tactical_artillery_save_v3');
      if (!encoded) return null;
      const decoded = decodeURIComponent(atob(encoded));
      return JSON.parse(decoded);
    } catch (e) {
      console.error('Failed to load / deserialize state:', e);
      return null;
    }
  }

  static clearSave(): void {
    localStorage.removeItem('tactical_artillery_save_v3');
  }
}
