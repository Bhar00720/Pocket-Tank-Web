export class AudioManager {
  audioCtx: AudioContext;
  masterGain: GainNode;
  muted: boolean;

  constructor() {
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.connect(this.audioCtx.destination);
    this.muted = false;
    // Restore saved settings
    const savedVol = localStorage.getItem('pt_volume');
    const savedMute = localStorage.getItem('pt_muted');
    if (savedVol !== null) this.masterGain.gain.value = parseFloat(savedVol);
    if (savedMute === 'true') { this.muted = true; this.masterGain.gain.value = 0; }
  }

  setVolume(val: number): void {
    this.masterGain.gain.value = val;
    localStorage.setItem('pt_volume', String(val));
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.masterGain.gain.value = 0;
    } else {
      const saved = localStorage.getItem('pt_volume');
      this.masterGain.gain.value = saved !== null ? parseFloat(saved) : 1;
    }
    localStorage.setItem('pt_muted', String(this.muted));
    return this.muted;
  }

  playShoot(): void {
    this.playTone(150, 'square', 0.2, -80, 0.4);
    setTimeout(() => this.playTone(80, 'sawtooth', 0.3, -40, 0.3), 20);
  }

  playExplosion(): void {
    this.playTone(80, 'sawtooth', 0.6, -60, 0.8);
    setTimeout(() => this.playTone(40, 'square', 0.8, -30, 0.6), 50);
    setTimeout(() => this.playTone(150, 'sawtooth', 0.4, -100, 0.3), 10);
  }

  playPop(): void {
    this.playTone(300, 'square', 0.1, -150, 0.2);
  }

  playUI(): void {
    this.playTone(800, 'sine', 0.05, 0, 0.1);
  }

  playTone(freq: number, type: OscillatorType, duration: number, slide: number, volume: number): void {
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

    if (slide !== 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq + slide), this.audioCtx.currentTime + duration);
    }

    gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(volume || 0.1, this.audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }
}
