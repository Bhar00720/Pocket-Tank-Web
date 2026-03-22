export class InputManager {
  keys: { [key: string]: boolean };
  mouse: { x: number; y: number; active: boolean };

  constructor() {
    this.keys = {};
    this.mouse = { x: 0, y: 0, active: false };

    window.addEventListener('keydown', (e) => this.keys[e.key] = true);
    window.addEventListener('keyup', (e) => this.keys[e.key] = false);

    // Mouse
    window.addEventListener('mousedown', (e) => {
      this.mouse.active = true;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mousemove', (e) => {
      if (this.mouse.active) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      }
    });
    window.addEventListener('mouseup', () => this.mouse.active = false);

    // Touch events
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.mouse.active = true;
        this.mouse.x = e.touches[0].clientX;
        this.mouse.y = e.touches[0].clientY;
      }
    });
    window.addEventListener('touchmove', (e) => {
      if (this.mouse.active && e.touches.length > 0) {
        this.mouse.x = e.touches[0].clientX;
        this.mouse.y = e.touches[0].clientY;
      }
    });
    window.addEventListener('touchend', () => this.mouse.active = false);
  }

  isKeyDown(key: string): boolean {
    return !!this.keys[key];
  }
}
