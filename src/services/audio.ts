import { SoundType } from '../types';

class AudioService {
  private ctx: AudioContext | null = null;
  private oscillators: Map<number, { osc: OscillatorNode; gain: GainNode; filter?: BiquadFilterNode }> = new Map();

  async init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    
    // Play a tiny silent sound to "warm up" the context
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.01);
  }

  async playNote(frequency: number, midiNote: number, duration?: number, soundType: SoundType = 'drone') {
    if (!this.ctx) await this.init();
    const ctx = this.ctx!;

    // Stop existing note if any
    this.stopNote(midiNote);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    switch (soundType) {
      case 'piano':
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 1.5));
        break;
      case 'voice':
        osc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime); // Formant-like filter
        filter.Q.setValueAtTime(5, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
        if (duration) {
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        }
        break;
      case 'drone':
      default:
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
        if (duration) {
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        }
        break;
    }

    if (soundType === 'voice') {
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }
    
    gain.connect(ctx.destination);
    osc.start();

    if (duration) {
      osc.stop(ctx.currentTime + duration + 0.1);
    } else {
      this.oscillators.set(midiNote, { osc, gain, filter });
    }
  }

  stopNote(midiNote: number) {
    const entry = this.oscillators.get(midiNote);
    if (entry && this.ctx) {
      const { osc, gain } = entry;
      gain.gain.cancelScheduledValues(this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.stop(this.ctx.currentTime + 0.1);
      this.oscillators.delete(midiNote);
    }
  }

  playChord(frequencies: number[], duration: number, soundType: SoundType = 'piano') {
    frequencies.forEach((freq, i) => {
      // Use a unique ID for chord notes to avoid conflicts with manual play
      this.playNote(freq, -100 - i, duration, soundType);
    });
  }

  async playDrone(frequency: number, soundType: SoundType = 'drone') {
    if (!this.ctx) await this.init();
    const ctx = this.ctx!;

    // Clear existing drone
    this.stopAll();

    await this.playNote(frequency, -1, undefined, soundType);
  }

  stopAll() {
    this.oscillators.forEach((_, key) => this.stopNote(key));
  }
}

export const audioService = new AudioService();
