/**
 * StudyOS Kelas 9 — Pure Web Audio API Calming & Focus Sound Synthesizer
 * Copyright (c) 2026 Hanif. All rights reserved.
 */

export type AmbientSoundType =
  | 'off'
  | 'rain'
  | 'heavy_rain'
  | 'ocean'
  | 'river'
  | 'forest_wind'
  | 'brown'
  | 'pink'
  | 'binaural_alpha'
  | 'zen_pad';

export interface AmbientSoundOption {
  id: AmbientSoundType;
  label: string;
  category: 'Kontrol' | 'Suara Alam' | 'Noise Fokus' | 'Relaksasi Otak';
  description: string;
  frequencyInfo: string;
}

export const AMBIENT_SOUNDS_CATALOG: AmbientSoundOption[] = [
  {
    id: 'off',
    label: 'Matikan Suara',
    category: 'Kontrol',
    description: 'Mode belajar hening tanpa suara latar.',
    frequencyInfo: 'Mute',
  },
  {
    id: 'rain',
    label: 'Hujan Rintik Halus',
    category: 'Suara Alam',
    description: 'Rintik hujan lembut di jendela untuk menemani baca materi.',
    frequencyInfo: '1.1 kHz Bandpass',
  },
  {
    id: 'heavy_rain',
    label: 'Hujan Malam Teduh',
    category: 'Suara Alam',
    description: 'Suara hujan deras yang hangat dengan gemuruh rendah penenang.',
    frequencyInfo: '380 Hz Warm Lowpass',
  },
  {
    id: 'ocean',
    label: 'Ombak Pantai Tenang',
    category: 'Suara Alam',
    description: 'Ayunan ombak laut berirama lambat (siklus napas 8 detik).',
    frequencyInfo: '0.12 Hz Wave LFO',
  },
  {
    id: 'river',
    label: 'Aliran Sungai Pegunungan',
    category: 'Suara Alam',
    description: 'Gemericik air sungai jernih yang menyegarkan pikiran.',
    frequencyInfo: 'Dual Resonant Stream',
  },
  {
    id: 'forest_wind',
    label: 'Angin Hutan Pinus',
    category: 'Suara Alam',
    description: 'Hembusan angin sepoi-sepoi melewati dedaunan hutan.',
    frequencyInfo: '0.08 Hz Swept Filter',
  },
  {
    id: 'brown',
    label: 'Brown Noise Dalam',
    category: 'Noise Fokus',
    description: 'Frekuensi rendah hangat untuk meredam suara bising di rumah.',
    frequencyInfo: '1/f² Deep Spectrum',
  },
  {
    id: 'pink',
    label: 'Pink Noise Seimbang',
    category: 'Noise Fokus',
    description: 'Derau seimbang untuk meningkatkan daya ingat & Active Recall.',
    frequencyInfo: '1/f Balanced Spectrum',
  },
  {
    id: 'binaural_alpha',
    label: 'Gelombang Alpha 10 Hz',
    category: 'Relaksasi Otak',
    description:
      'Nada harmonik tenang (200Hz/210Hz) untuk fokus santai bebas cemas.',
    frequencyInfo: '200 Hz + 210 Hz Alpha',
  },
  {
    id: 'zen_pad',
    label: 'Harmoni Piano & Pad Tenang',
    category: 'Relaksasi Otak',
    description:
      'Akord drone hangat pentatonik untuk menenangkan pikiran sebelum ujian.',
    frequencyInfo: '174 Hz · 261 Hz · 392 Hz',
  },
];

/**
 * Pure Web Audio API Synthesizer for Focus Studio Ambient Sound.
 * Generates 9 calming nature, noise, and harmonic brainwave soundscapes
 * with zero external audio files (100% offline).
 */
class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeSources: (AudioScheduledSourceNode | AudioBufferSourceNode)[] =
    [];
  private currentType: AmbientSoundType = 'off';
  private volume = 0.35;

  public start(type: AmbientSoundType, volume = this.volume): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (type === 'off') {
      this.stop();
      return;
    }

    this.stop();

    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const ctx = this.ctx;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.005, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(
      Math.max(0.01, this.volume),
      ctx.currentTime + 0.45
    );
    masterGain.connect(ctx.destination);
    this.masterGain = masterGain;
    this.activeNodes.push(masterGain);

    if (type === 'binaural_alpha') {
      this.buildBinauralAlpha(ctx, masterGain);
    } else if (type === 'zen_pad') {
      this.buildZenHarmonicPad(ctx, masterGain);
    } else {
      this.buildNoiseBasedSoundscape(ctx, masterGain, type);
    }

    this.currentType = type;
  }

  private buildNoiseBasedSoundscape(
    ctx: AudioContext,
    destination: AudioNode,
    type: Exclude<AmbientSoundType, 'off' | 'binaural_alpha' | 'zen_pad'>
  ): void {
    const sampleRate = ctx.sampleRate;
    const durationSeconds = 6;
    const bufferSize = sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'brown' || type === 'heavy_rain' || type === 'ocean') {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        const pat =
          type === 'heavy_rain' && Math.random() > 0.994
            ? (Math.random() - 0.5) * 0.45
            : 0;
        data[i] = data[i] * 2.8 + pat;
      }
    } else {
      // Pink-spectrum base for rain, river, forest_wind, pink
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        const droplet =
          type === 'rain' && Math.random() > 0.992
            ? (Math.random() - 0.5) * 0.55
            : type === 'river' && Math.random() > 0.985
            ? Math.sin(i * 0.08) * 0.25
            : 0;
        data[i] = (b0 + b1 + b2 + b3 + white * 0.12) * 0.11 + droplet;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();

    if (type === 'brown') {
      filter.type = 'lowpass';
      filter.frequency.value = 440;
    } else if (type === 'pink') {
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
    } else if (type === 'rain') {
      filter.type = 'bandpass';
      filter.frequency.value = 1150;
      filter.Q.value = 0.65;
    } else if (type === 'heavy_rain') {
      filter.type = 'lowpass';
      filter.frequency.value = 620;
      filter.Q.value = 0.8;
    } else if (type === 'river') {
      filter.type = 'bandpass';
      filter.frequency.value = 780;
      filter.Q.value = 1.1;
    } else if (type === 'forest_wind') {
      filter.type = 'bandpass';
      filter.frequency.value = 520;
      filter.Q.value = 2.2;

      // Slow wind sweep LFO on filter frequency
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.09; // ~11 sec breeze cycle
      lfoGain.gain.value = 260;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      this.activeSources.push(lfo);
      this.activeNodes.push(lfo, lfoGain);
    } else if (type === 'ocean') {
      filter.type = 'lowpass';
      filter.frequency.value = 540;

      // Ocean wave volume & filter crest LFO
      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.6;

      const waveLfo = ctx.createOscillator();
      const waveDepth = ctx.createGain();
      waveLfo.type = 'sine';
      waveLfo.frequency.value = 0.125; // 8-second calming ocean wave cycle
      waveDepth.gain.value = 0.35;

      waveLfo.connect(waveDepth);
      waveDepth.connect(waveGain.gain);
      waveLfo.start();

      source.connect(filter);
      filter.connect(waveGain);
      waveGain.connect(destination);
      source.start(0);

      this.activeSources.push(source, waveLfo);
      this.activeNodes.push(source, filter, waveGain, waveLfo, waveDepth);
      return;
    }

    source.connect(filter);
    filter.connect(destination);
    source.start(0);

    this.activeSources.push(source);
    this.activeNodes.push(source, filter);
  }

  private buildBinauralAlpha(ctx: AudioContext, destination: AudioNode): void {
    // 200 Hz + 210 Hz (10 Hz Alpha beat) + 100 Hz warm sub-drone
    const freqs = [100, 200, 210, 300];
    const gains = [0.22, 0.28, 0.28, 0.12];

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      oscGain.gain.value = gains[idx];
      osc.connect(oscGain);
      oscGain.connect(destination);
      osc.start();
      this.activeSources.push(osc);
      this.activeNodes.push(osc, oscGain);
    });
  }

  private buildZenHarmonicPad(ctx: AudioContext, destination: AudioNode): void {
    // Warm pentatonic calming chord (C3, G3, C4, E4, G4) with gentle breathing LFO
    const chordFreqs = [130.81, 196.0, 261.63, 329.63, 392.0];
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 800;
    padFilter.connect(destination);
    this.activeNodes.push(padFilter);

    chordFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      g.gain.value = 0.14;

      // Subtle slow breathing LFO per voice
      const lfo = ctx.createOscillator();
      const lfoDepth = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.07 + idx * 0.02;
      lfoDepth.gain.value = 0.05;
      lfo.connect(lfoDepth);
      lfoDepth.connect(g.gain);

      osc.connect(g);
      g.connect(padFilter);
      osc.start();
      lfo.start();

      this.activeSources.push(osc, lfo);
      this.activeNodes.push(osc, g, lfo, lfoDepth);
    });
  }

  public setVolume(newVolume: number): void {
    this.volume = Math.max(0, Math.min(1, newVolume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.volume,
        this.ctx.currentTime,
        0.08
      );
    }
  }

  public stop(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // ignore already stopped
      }
    }
    for (const node of this.activeNodes) {
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeSources = [];
    this.activeNodes = [];
    this.masterGain = null;
    this.currentType = 'off';
  }

  public getStatus(): { type: AmbientSoundType; volume: number } {
    return { type: this.currentType, volume: this.volume };
  }
}

export const ambientAudio = new AmbientAudioEngine();
