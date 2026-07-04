/**
 * Shared synthesized sound effects for the Games Hub (board games + arcade).
 * Same approach as src/lib/chess/sound.ts — everything is generated from
 * oscillators/noise via Web Audio, so there are zero asset/licensing concerns.
 * Kept as a separate module so games outside chess don't pull in chess's
 * sound-name union.
 */
export type ArcadeSoundName =
  | "place"
  | "capture"
  | "win"
  | "lose"
  | "draw"
  | "lineClear"
  | "tetrisClear"
  | "merge"
  | "eat"
  | "gameOver"
  | "levelUp"
  | "click"
  | "swoosh"
  | "flip"
  | "correct"
  | "wrong";

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
  start?: number;
  dur?: number;
  gain?: number;
  glideTo?: number;
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

const RECIPES: Record<ArcadeSoundName, () => void> = {
  place: () => {
    click(0.3, 0, 0.04, 1900);
    tone({ freq: 300, type: "triangle", dur: 0.05, gain: 0.2 });
  },
  capture: () => {
    click(0.45, 0, 0.06, 1300);
    tone({ freq: 200, type: "sawtooth", glideTo: 90, dur: 0.12, gain: 0.26 });
  },
  win: () => {
    tone({ freq: 523, type: "triangle", dur: 0.12, gain: 0.28 });
    tone({ freq: 659, type: "triangle", start: 0.1, dur: 0.12, gain: 0.28 });
    tone({ freq: 784, type: "triangle", start: 0.2, dur: 0.2, gain: 0.3 });
  },
  lose: () => {
    tone({ freq: 320, type: "sawtooth", start: 0, dur: 0.14, gain: 0.24 });
    tone({ freq: 220, type: "sawtooth", start: 0.12, dur: 0.22, gain: 0.24 });
  },
  draw: () => {
    tone({ freq: 400, type: "sine", dur: 0.14, gain: 0.22 });
    tone({ freq: 400, type: "sine", start: 0.16, dur: 0.14, gain: 0.22 });
  },
  lineClear: () => {
    tone({ freq: 440, type: "square", dur: 0.06, gain: 0.22 });
    tone({ freq: 660, type: "square", start: 0.05, dur: 0.08, gain: 0.22 });
  },
  tetrisClear: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, type: "square", start: i * 0.06, dur: 0.12, gain: 0.26 }),
    );
  },
  merge: () => {
    tone({ freq: 440, type: "sine", dur: 0.07, gain: 0.24, glideTo: 660 });
  },
  eat: () => {
    click(0.25, 0, 0.03, 2600);
    tone({ freq: 700, type: "sine", dur: 0.05, gain: 0.22 });
  },
  gameOver: () => {
    tone({ freq: 300, type: "sawtooth", start: 0, dur: 0.16, gain: 0.26 });
    tone({ freq: 200, type: "sawtooth", start: 0.15, dur: 0.16, gain: 0.26 });
    tone({ freq: 120, type: "sawtooth", start: 0.3, dur: 0.3, gain: 0.26 });
  },
  levelUp: () => {
    tone({ freq: 392, type: "triangle", dur: 0.08, gain: 0.24 });
    tone({ freq: 523, type: "triangle", start: 0.07, dur: 0.08, gain: 0.24 });
    tone({ freq: 659, type: "triangle", start: 0.14, dur: 0.16, gain: 0.26 });
  },
  click: () => {
    click(0.28, 0, 0.03, 2400);
  },
  swoosh: () => {
    tone({ freq: 900, type: "sine", dur: 0.08, gain: 0.14, glideTo: 240 });
  },
  flip: () => {
    click(0.2, 0, 0.03, 3000);
  },
  correct: () => {
    tone({ freq: 523, type: "sine", dur: 0.08, gain: 0.24 });
    tone({ freq: 784, type: "sine", start: 0.07, dur: 0.14, gain: 0.26 });
  },
  wrong: () => {
    tone({ freq: 220, type: "sawtooth", dur: 0.14, gain: 0.2 });
  },
};

export function playArcadeSound(name: ArcadeSoundName) {
  if (!enabled) return;
  try {
    RECIPES[name]?.();
  } catch {
    /* audio best-effort */
  }
}

export function setArcadeSoundEnabled(v: boolean) {
  enabled = v;
}

export function setArcadeSoundVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = volume;
}
