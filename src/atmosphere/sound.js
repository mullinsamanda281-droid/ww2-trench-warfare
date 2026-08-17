// src/atmosphere/sound.js
// Synthesized audio - no external files. Distant artillery, rain hiss,
// gunfire, bolt action, M1 ping, footsteps. WebAudio only.
export class SoundSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startRain();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // Low rumbling noise bed (wind + rain)
  startRain() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.06;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
  }

  // Distant artillery thump
  artillery() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 1.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 2.3);
    // rumble
    const noise = this.noiseBurst(t, 1.6, 0.18);
    noise.connect(this.master);
  }

  // Gunshot (crack + low thump)
  gunshot() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const noise = this.noiseBurst(t, 0.12, 0.5);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1400;
    noise.connect(hp).connect(this.master);
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  boltAction() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(350, t + 0.07);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.1);
    // second click
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 600;
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.06, t + 0.14);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc2.connect(g2).connect(this.master);
    osc2.start(t + 0.14);
    osc2.stop(t + 0.21);
  }

  garandPing() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.exponentialRampToValueAtTime(1500, t + 0.25);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  hit() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.06);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Footstep by surface: wood (duckboards), mud (open ground), water (craters)
  step(surface) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.connect(this.master);
    if (surface === 'water') {
      const noise = this.noiseBurst(t, 0.18, 0.28);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      noise.connect(lp).connect(g);
      g.gain.setValueAtTime(0.8, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      return;
    }
    if (surface === 'wood') {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.05);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.08);
      return;
    }
    // mud: low soft thud
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Bullet slapping dirt/sandbags
  impact() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const noise = this.noiseBurst(t, 0.07, 0.25);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1100;
    noise.connect(lp).connect(this.master);
  }

  // Mortar shell whistle (descending while falling)
  whistle() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(500, t + 1.9);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 2.05);
  }

  // Close impact explosion
  explosion() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const noise = this.noiseBurst(t, 0.5, 0.9);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    noise.connect(lp).connect(this.master);
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.65);
  }

  noiseBurst(t, dur, vol) {
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * vol;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(g);
    src.start(t);
    return g;
  }
}