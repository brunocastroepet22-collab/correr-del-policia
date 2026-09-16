/**
 * Synthesized Web Audio API Sound System for 3D Racing & Police Pursuit
 */
class RacingAudio {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private sirenOsc1: OscillatorNode | null = null;
  private sirenOsc2: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private isSirenActive = false;

  public soundEnabled = true;

  public toggleMute(): boolean {
    this.soundEnabled = !this.soundEnabled;
    if (!this.soundEnabled) {
      this.stopEngine();
      this.setSiren(false);
    }
    return !this.soundEnabled; // returns isMuted
  }

  public init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Continuous engine rumble whose frequency scales with car speed and throttle
   */
  public updateEngine(speedKmH: number, isAccelerating: boolean, isTurbo: boolean) {
    if (!this.soundEnabled) {
      this.stopEngine();
      return;
    }

    try {
      this.init();
      if (!this.ctx) return;

      if (!this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.engineFilter = this.ctx.createBiquadFilter();

        this.engineOsc.type = 'sawtooth';
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.setValueAtTime(350, this.ctx.currentTime);

        this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

        this.engineOsc.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();
      }

      const baseFreq = 45 + (speedKmH / 300) * 110;
      const targetFreq = isTurbo ? baseFreq * 1.5 : (isAccelerating ? baseFreq * 1.25 : baseFreq);
      const targetVol = isTurbo ? 0.09 : (isAccelerating ? 0.07 : 0.04);
      const targetFilter = 250 + (speedKmH / 300) * 600 + (isTurbo ? 400 : 0);

      const now = this.ctx.currentTime;
      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
      this.engineFilter?.frequency.setTargetAtTime(targetFilter, now, 0.08);
      this.engineGain?.gain.setTargetAtTime(targetVol, now, 0.08);
    } catch {
      // Audio autoplay policy or device sleep
    }
  }

  public stopEngine() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Police siren toggle and sound
   */
  public setSiren(active: boolean) {
    if (!this.soundEnabled) active = false;
    if (this.isSirenActive === active) return;
    this.isSirenActive = active;

    try {
      this.init();
      if (!this.ctx) return;

      if (active) {
        if (!this.sirenOsc1) {
          const now = this.ctx.currentTime;
          this.sirenOsc1 = this.ctx.createOscillator();
          this.sirenGain = this.ctx.createGain();
          this.sirenOsc1.type = 'sine';

          // LFO for siren pitch wobble
          const lfo = this.ctx.createOscillator();
          const lfoGain = this.ctx.createGain();
          lfo.type = 'triangle';
          lfo.frequency.setValueAtTime(1.8, now); // ~1.8 Hz wailing
          lfoGain.gain.setValueAtTime(260, now); // swing between 650Hz and 910Hz

          this.sirenOsc1.frequency.setValueAtTime(780, now);
          lfo.connect(lfoGain);
          lfoGain.connect(this.sirenOsc1.frequency);

          this.sirenGain.gain.setValueAtTime(0.06, now);
          this.sirenOsc1.connect(this.sirenGain);
          this.sirenGain.connect(this.ctx.destination);

          this.sirenOsc1.start();
          lfo.start();
        } else if (this.sirenGain) {
          this.sirenGain.gain.setTargetAtTime(0.06, this.ctx.currentTime, 0.1);
        }
      } else {
        if (this.sirenGain && this.ctx) {
          this.sirenGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.1);
        }
      }
    } catch {
      // ignore
    }
  }

  public playPoliceSiren(active: boolean) {
    this.setSiren(active);
  }

  /**
   * Nitro Turbo Ignition / Boost Sound
   */
  public playTurboBoost() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Jet whoosh / roar using filtered noise
      const bufferSize = this.ctx.sampleRate * 0.6;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 0.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);

      // 2. High pitch turbo spool
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.5);

      oscGain.gain.setValueAtTime(0.08, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch {}
  }

  /**
   * Tire screech for drift/hard steering
   */
  public playTireScreech() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.18);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  /**
   * Crash impact with police or traffic
   */
  public playCrash(severity: 'light' | 'heavy' = 'light') {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const mult = severity === 'heavy' ? 1.5 : 1.0;

      // Heavy bass impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      gain.gain.setValueAtTime(0.3 * mult, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);

      // Crunch noise
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch {}
  }

  /**
   * Near miss close-call whoosh
   */
  public playNearMiss() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.2);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  /**
   * Nitro / Coin pickup sound
   */
  public playPickup() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [587.33, 880, 1174.66].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.1, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.12);
      });
    } catch {}
  }
}

export const racingAudio = new RacingAudio();
