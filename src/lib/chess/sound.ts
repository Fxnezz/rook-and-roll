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
  | "notify"
  | "lowTime";

export type SoundPack = "classic" | "retro" | "soft" | "wood";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.6;
let activePack: SoundPack = "classic";

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

const CLASSIC_RECIPES: Record<SoundName, () => void> = {
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
  lowTime: () => {
    tone({ freq: 1040, type: "sine", dur: 0.055, gain: 0.18 });
  },
};

/** 8-bit-ish square-wave bleeps. */
const RETRO_RECIPES: Record<SoundName, () => void> = {
  move: () => tone({ freq: 440, type: "square", dur: 0.05, gain: 0.16 }),
  capture: () => {
    tone({ freq: 220, type: "square", dur: 0.09, gain: 0.2 });
    tone({ freq: 140, type: "square", start: 0.06, dur: 0.08, gain: 0.18 });
  },
  check: () => {
    tone({ freq: 880, type: "square", dur: 0.06, gain: 0.18 });
    tone({ freq: 1108, type: "square", start: 0.07, dur: 0.08, gain: 0.18 });
  },
  castle: () => {
    tone({ freq: 440, type: "square", dur: 0.05, gain: 0.16 });
    tone({ freq: 440, type: "square", start: 0.08, dur: 0.05, gain: 0.16 });
  },
  promote: () => {
    tone({ freq: 523, type: "square", dur: 0.06, gain: 0.2 });
    tone({ freq: 659, type: "square", start: 0.07, dur: 0.06, gain: 0.2 });
    tone({ freq: 880, type: "square", start: 0.14, dur: 0.1, gain: 0.2 });
  },
  gameStart: () => {
    tone({ freq: 330, type: "square", dur: 0.08, gain: 0.2 });
    tone({ freq: 660, type: "square", start: 0.09, dur: 0.12, gain: 0.2 });
  },
  gameEnd: () => {
    tone({ freq: 660, type: "square", dur: 0.1, gain: 0.2 });
    tone({ freq: 330, type: "square", start: 0.12, dur: 0.22, gain: 0.2 });
  },
  illegal: () => tone({ freq: 110, type: "square", dur: 0.1, gain: 0.16 }),
  notify: () => tone({ freq: 988, type: "square", dur: 0.06, gain: 0.18 }),
  lowTime: () => tone({ freq: 1318, type: "square", dur: 0.04, gain: 0.14 }),
};

/** Muted sine tones, longer/softer decay. */
const SOFT_RECIPES: Record<SoundName, () => void> = {
  move: () => tone({ freq: 300, type: "sine", dur: 0.09, gain: 0.12 }),
  capture: () => tone({ freq: 220, type: "sine", glideTo: 140, dur: 0.16, gain: 0.14 }),
  check: () => tone({ freq: 520, type: "sine", dur: 0.16, gain: 0.14 }),
  castle: () => {
    tone({ freq: 300, type: "sine", dur: 0.08, gain: 0.11 });
    tone({ freq: 300, type: "sine", start: 0.11, dur: 0.08, gain: 0.11 });
  },
  promote: () => {
    tone({ freq: 440, type: "sine", dur: 0.14, gain: 0.14 });
    tone({ freq: 587, type: "sine", start: 0.12, dur: 0.18, gain: 0.14 });
  },
  gameStart: () => tone({ freq: 392, type: "sine", dur: 0.2, gain: 0.14 }),
  gameEnd: () => {
    tone({ freq: 440, type: "sine", dur: 0.3, gain: 0.14 });
    tone({ freq: 330, type: "sine", start: 0.22, dur: 0.35, gain: 0.14 });
  },
  illegal: () => tone({ freq: 180, type: "sine", dur: 0.14, gain: 0.1 }),
  notify: () => tone({ freq: 720, type: "sine", dur: 0.12, gain: 0.12 }),
  lowTime: () => tone({ freq: 880, type: "sine", dur: 0.07, gain: 0.09 }),
};

/** Heavier, noise/click-forward — a wooden-set feel. */
const WOOD_RECIPES: Record<SoundName, () => void> = {
  move: () => click(0.45, 0, 0.06, 1200),
  capture: () => {
    click(0.6, 0, 0.08, 900);
    click(0.3, 0.05, 0.05, 700);
  },
  check: () => {
    click(0.4, 0, 0.05, 1600);
    tone({ freq: 500, type: "triangle", start: 0.04, dur: 0.08, gain: 0.18 });
  },
  castle: () => {
    click(0.4, 0, 0.06, 1200);
    click(0.4, 0.1, 0.06, 1200);
  },
  promote: () => {
    click(0.35, 0, 0.05, 1400);
    tone({ freq: 659, type: "triangle", start: 0.05, dur: 0.14, gain: 0.22 });
  },
  gameStart: () => {
    click(0.4, 0, 0.06, 1000);
    tone({ freq: 392, type: "triangle", start: 0.05, dur: 0.14, gain: 0.2 });
  },
  gameEnd: () => {
    click(0.4, 0, 0.07, 900);
    tone({ freq: 330, type: "triangle", start: 0.08, dur: 0.3, gain: 0.22 });
  },
  illegal: () => click(0.3, 0, 0.04, 400),
  notify: () => click(0.3, 0, 0.04, 2000),
  lowTime: () => click(0.25, 0, 0.03, 2400),
};

const PACKS: Record<SoundPack, Record<SoundName, () => void>> = {
  classic: CLASSIC_RECIPES,
  retro: RETRO_RECIPES,
  soft: SOFT_RECIPES,
  wood: WOOD_RECIPES,
};

export function playSound(name: SoundName) {
  if (!enabled) return;
  try {
    PACKS[activePack][name]?.();
  } catch {
    /* audio best-effort */
  }
}

export function setSoundPack(pack: SoundPack) {
  activePack = pack;
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
