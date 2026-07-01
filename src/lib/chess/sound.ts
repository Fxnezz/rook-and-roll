/**
 * Original chess sound effects, synthesized with the Web Audio API.
 * No audio files shipped — every sound is generated from oscillators/noise,
 * so there are zero licensing concerns.
 *
 * The AudioContext is created lazily on the first play() so it starts after a
 * user gesture (browsers block audio before interaction).
 */
export type SoundName =
  | "move"
  | "capture"
  | "check"
  | "castle"
  | "promote"
  | "gameStart"
  | "gameEnd"
  | "illegal"
  | "notify";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.6;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  start?: number; // seconds from now
  dur?: number;
  gain?: number;
  glideTo?: number; // frequency to glide toward
}

function tone(o: ToneOpts) {
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + (o.start ?? 0);
  const dur = o.dur ?? 0.12;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t0 + dur);
  const peak = o.gain ?? 0.5;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Short filtered-noise burst — gives moves a woody "click". */
function click(gain = 0.35, start = 0, dur = 0.05, freq = 2200) {
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + start;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 2.5);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = 0.8;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(bp).connect(g).connect(master);
  src.start(t0);
}

const RECIPES: Record<SoundName, () => void> = {
  move: () => {
    click(0.32, 0, 0.045, 1800);
    tone({ freq: 320, type: "triangle", dur: 0.06, gain: 0.22 });
  },
  capture: () => {
    click(0.5, 0, 0.06, 1400);
    tone({ freq: 180, type: "sawtooth", glideTo: 90, dur: 0.12, gain: 0.28 });
  },
  check: () => {
    tone({ freq: 660, type: "square", dur: 0.09, gain: 0.22 });
    tone({ freq: 990, type: "square", start: 0.09, dur: 0.11, gain: 0.22 });
  },
  castle: () => {
    click(0.3, 0, 0.045, 1600);
    click(0.3, 0.09, 0.045, 1600);
  },
  promote: () => {
    tone({ freq: 523, type: "triangle", dur: 0.1, gain: 0.28 });
    tone({ freq: 659, type: "triangle", start: 0.09, dur: 0.1, gain: 0.28 });
    tone({ freq: 784, type: "triangle", start: 0.18, dur: 0.14, gain: 0.28 });
  },
  gameStart: () => {
    tone({ freq: 392, type: "sine", dur: 0.12, gain: 0.26 });
    tone({ freq: 587, type: "sine", start: 0.1, dur: 0.16, gain: 0.26 });
  },
  gameEnd: () => {
    tone({ freq: 523, type: "sine", dur: 0.16, gain: 0.28 });
    tone({ freq: 415, type: "sine", start: 0.14, dur: 0.16, gain: 0.28 });
    tone({ freq: 349, type: "sine", start: 0.28, dur: 0.28, gain: 0.28 });
  },
  illegal: () => {
    tone({ freq: 160, type: "sawtooth", dur: 0.12, gain: 0.2 });
  },
  notify: () => {
    tone({ freq: 880, type: "sine", dur: 0.09, gain: 0.24 });
  },
};

export function playSound(name: SoundName) {
  if (!enabled) return;
  try {
    RECIPES[name]?.();
  } catch {
    /* audio best-effort */
  }
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

export function setSoundVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = volume;
}

/** Call from a click handler once to unlock audio on iOS/Safari. */
export function primeAudio() {
  ac();
}
