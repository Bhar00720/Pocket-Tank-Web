export class AudioManager {
    constructor() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.connect(this.audioCtx.destination);
        this.muted = false;
        // Restore saved settings
        const savedVol = localStorage.getItem('pt_volume');
        const savedMute = localStorage.getItem('pt_muted');
        if (savedVol !== null) this.masterGain.gain.value = parseFloat(savedVol);
        if (savedMute === 'true') { this.muted = true; this.masterGain.gain.value = 0; }
    }

    setVolume(val) {
        this.masterGain.gain.value = val;
        localStorage.setItem('pt_volume', val);
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.masterGain.gain.value = 0;
        } else {
            const saved = localStorage.getItem('pt_volume');
            this.masterGain.gain.value = saved !== null ? parseFloat(saved) : 1;
        }
        localStorage.setItem('pt_muted', this.muted);
        return this.muted;
    }

    playWeaponSynth(category) {
        if(this.audioCtx.state === 'suspended') this.audioCtx.resume();
        switch(category) {
            case 'Kinetic': 
                this.playTone(400, 'square', 0.1, -200, 0.2); 
                break;
            case 'High-Explosive':
                this.playTone(100, 'sawtooth', 0.3, -50, 0.4);
                break;
            case 'Nuclear':
            case 'Gravity':
                this.playTone(50, 'square', 0.5, -30, 0.6);
                setTimeout(()=>this.playTone(150, 'sawtooth', 0.5, -100, 0.5), 10);
                break;
            case 'Energy':
            case 'Plasma':
                this.playTone(600, 'sine', 0.2, 400, 0.3); 
                break;
            case 'Sonic':
                this.playTone(800, 'triangle', 0.3, -400, 0.2);
                break;
            case 'Cryogenic':
                this.playTone(600, 'sine', 0.4, -200, 0.2);
                break;
            default:
                this.playTone(150, 'square', 0.2, -80, 0.3);
        }
    }

    playShoot() {
        this.playTone(150, 'square', 0.2, -80, 0.4);
        setTimeout(() => this.playTone(80, 'sawtooth', 0.3, -40, 0.3), 20);
    }

    playExplosion() {
        this.playTone(80, 'sawtooth', 0.6, -60, 0.8);
        setTimeout(() => this.playTone(40, 'square', 0.8, -30, 0.6), 50);
        setTimeout(() => this.playTone(150, 'sawtooth', 0.4, -100, 0.3), 10);
    }
    
    playPop() {
        this.playTone(300, 'square', 0.1, -150, 0.2);
    }

    playUI() {
        this.playTone(800, 'sine', 0.05, 0, 0.1);
    }

    playTone(freq, type, duration, slide, volume) {
        if(this.audioCtx.state === 'suspended') this.audioCtx.resume();
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
