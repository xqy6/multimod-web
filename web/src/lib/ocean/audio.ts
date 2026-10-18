/**
 * Synthesised sound: filtered-noise surf that breathes with the swash,
 * splash transients and small plinks when a creature is released.
 */

export type SoundEngine = {
  unlock: () => void;
  setEnabled: (enabled: boolean) => void;
  isEnabled: () => boolean;
  setSurf: (level: number) => void;
  splash: (strength: number) => void;
  plink: () => void;
  setRain: (amount: number) => void;
  dispose: () => void;
};

export function createSound(): SoundEngine {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let surfGain: GainNode | null = null;
  let rainGain: GainNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let enabled = false;
  let started = false;

  const build = () => {
    if (context) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.0001;
    master.connect(context.destination);

    const length = context.sampleRate * 3;
    noiseBuffer = context.createBuffer(1, length, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }

    // Surf bed: looped brown noise through a low-pass, gain follows the swash.
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 720;
    lowpass.Q.value = 0.6;
    surfGain = context.createGain();
    surfGain.gain.value = 0.05;
    source.connect(lowpass).connect(surfGain).connect(master);
    source.start();

    // Rain layer.
    const rainSource = context.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;
    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 2400;
    rainGain = context.createGain();
    rainGain.gain.value = 0;
    rainSource.connect(highpass).connect(rainGain).connect(master);
    rainSource.start();
  };

  const ramp = (param: AudioParam, value: number, time = 0.12) => {
    if (!context) return;
    param.setTargetAtTime(value, context.currentTime, time);
  };

  return {
    unlock() {
      build();
      if (!context || !master) return;
      if (context.state === "suspended") void context.resume();
      if (!started) {
        started = true;
        master.gain.setValueAtTime(0.0001, context.currentTime);
        master.gain.exponentialRampToValueAtTime(0.9, context.currentTime + 0.8);
      }
      enabled = true;
      ramp(master.gain, 0.9, 0.2);
    },
    setEnabled(next) {
      enabled = next;
      if (!master) {
        if (next) build();
        return;
      }
      ramp(master.gain, next ? 0.9 : 0.0001, 0.15);
      if (next && context?.state === "suspended") void context.resume();
    },
    isEnabled: () => enabled,
    setSurf(level) {
      if (!surfGain || !context) return;
      const target = 0.03 + Math.max(0, level) * 0.16;
      surfGain.gain.setTargetAtTime(target, context.currentTime, 0.25);
    },
    splash(strength) {
      if (!context || !master || !noiseBuffer || !enabled) return;
      const t = context.currentTime;
      const source = context.createBufferSource();
      source.buffer = noiseBuffer;
      const bandpass = context.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.setValueAtTime(1600 - strength * 500, t);
      bandpass.frequency.exponentialRampToValueAtTime(320, t + 0.35);
      bandpass.Q.value = 1.2;
      const gain = context.createGain();
      const level = Math.min(0.55, 0.12 + strength * 0.25);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(level, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      source.connect(bandpass).connect(gain).connect(master);
      source.start(t);
      source.stop(t + 0.6);

      const thump = context.createOscillator();
      const thumpGain = context.createGain();
      thump.frequency.setValueAtTime(140, t);
      thump.frequency.exponentialRampToValueAtTime(52, t + 0.3);
      thumpGain.gain.setValueAtTime(0.0001, t);
      thumpGain.gain.exponentialRampToValueAtTime(0.18 * strength, t + 0.03);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      thump.connect(thumpGain).connect(master);
      thump.start(t);
      thump.stop(t + 0.45);
    },
    plink() {
      if (!context || !master || !enabled) return;
      const t = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();
      const freq = 700 + Math.random() * 900;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.9, t + 0.09);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.35);
    },
    setRain(amount) {
      if (!rainGain || !context) return;
      rainGain.gain.setTargetAtTime(amount * 0.12, context.currentTime, 0.4);
    },
    dispose() {
      if (context) void context.close();
      context = null;
      master = null;
      surfGain = null;
      rainGain = null;
    },
  };
}
