"use client";

import { useCallback, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { RaceScene, type RaceCallbacks } from "@/components/racing/RaceScene";
import { useCarInput } from "@/lib/racing/useCarInput";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { TOTAL_LAPS } from "@/lib/racing/track";

function fmtTime(ms: number): string {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
}

export default function RacingPage() {
  const { inputRef, setTouch } = useCarInput();
  const { best, submit } = useHighScore("racing", { higherIsBetter: false });
  const [phase, setPhase] = useState<"idle" | "countdown" | "racing" | "done">("idle");
  const [count, setCount] = useState(3);
  const [lap, setLap] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [offTrack, setOffTrack] = useState(false);
  const [lastLapTime, setLastLapTime] = useState<number | null>(null);
  const [bestLapThisRace, setBestLapThisRace] = useState<number | null>(null);
  const [finishTime, setFinishTime] = useState<number | null>(null);

  const callbacksRef = useRef<RaceCallbacks>({
    onLap: (lapMs, completedLap) => {
      setLastLapTime(lapMs);
      setLap(completedLap + 1);
      setBestLapThisRace((prev) => (prev === null || lapMs < prev ? lapMs : prev));
      submit(lapMs);
    },
    onFinish: (totalMs) => {
      setFinishTime(totalMs);
      setPhase("done");
    },
    onProgress: (ms, off) => {
      setElapsed(ms);
      setOffTrack(off);
    },
  });

  const start = useCallback(() => {
    setPhase("countdown");
    setLap(1);
    setElapsed(0);
    setLastLapTime(null);
    setBestLapThisRace(null);
    setFinishTime(null);
    let c = 3;
    setCount(c);
    const iv = setInterval(() => {
      c -= 1;
      if (c <= 0) {
        clearInterval(iv);
        setPhase("racing");
      } else {
        setCount(c);
      }
    }, 800);
  }, []);

  const running = phase === "racing";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Circuit Dash</h1>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        An original arcade racer — {TOTAL_LAPS} laps, best lap wins bragging rights.
      </p>

      <div className="relative overflow-hidden rounded-2xl bg-[#0a0e14]" style={{ aspectRatio: "16/10" }}>
        <Canvas shadows camera={{ fov: 62, position: [0, 6, -12] }}>
          <color attach="background" args={["#3a5a8c"]} />
          <fog attach="fog" args={["#3a5a8c", 90, 260]} />
          <RaceScene inputRef={inputRef} running={running} callbacks={callbacksRef} />
        </Canvas>

        {/* HUD overlay */}
        {(phase === "racing" || phase === "countdown") && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 text-white">
            <div className="rounded-lg bg-black/50 px-3 py-1.5 font-mono text-sm">
              Lap {Math.min(lap, TOTAL_LAPS)}/{TOTAL_LAPS}
            </div>
            <div className="rounded-lg bg-black/50 px-3 py-1.5 font-mono text-sm">{fmtTime(elapsed)}</div>
          </div>
        )}
        {offTrack && phase === "racing" && (
          <div className="pointer-events-none absolute left-1/2 top-14 -translate-x-1/2 rounded bg-[var(--bad)]/80 px-3 py-1 text-xs font-bold text-white">
            OFF TRACK
          </div>
        )}
        {lastLapTime != null && phase === "racing" && (
          <div className="pointer-events-none absolute right-3 top-14 rounded bg-black/50 px-3 py-1 font-mono text-xs text-white">
            Last lap {fmtTime(lastLapTime)}
          </div>
        )}

        {phase === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-6xl font-black text-white">{count > 0 ? count : "GO!"}</span>
          </div>
        )}

        {(phase === "idle" || phase === "done") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center">
            {phase === "done" ? (
              <>
                <p className="text-xl font-bold text-white">Finished!</p>
                <p className="text-sm text-white/80">Total time: {fmtTime(finishTime ?? 0)}</p>
                <p className="text-sm text-white/80">Best lap this race: {bestLapThisRace ? fmtTime(bestLapThisRace) : "—"}</p>
              </>
            ) : (
              <p className="text-xl font-bold text-white">Circuit Dash</p>
            )}
            {best != null && <p className="text-xs text-white/60">Best lap ever: {fmtTime(best)}</p>}
            <button className="btn btn-primary" onClick={start}>
              {phase === "done" ? "Race again" : "Start race"}
            </button>
          </div>
        )}

        {/* mobile touch controls */}
        {running && (
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 sm:hidden">
            <div className="flex gap-2">
              <TouchBtn label="◀" onDown={() => setTouch("steer", -1)} onUp={() => setTouch("steer", 0)} />
              <TouchBtn label="▶" onDown={() => setTouch("steer", 1)} onUp={() => setTouch("steer", 0)} />
            </div>
            <div className="flex gap-2">
              <TouchBtn label="▼" onDown={() => setTouch("throttle", -1)} onUp={() => setTouch("throttle", 0)} />
              <TouchBtn label="▲" onDown={() => setTouch("throttle", 1)} onUp={() => setTouch("throttle", 0)} />
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-[var(--text-faint)]">
        Arrow keys / WASD to drive, or the on-screen buttons on mobile.
      </p>
    </div>
  );
}

function TouchBtn({ label, onDown, onUp }: { label: string; onDown: () => void; onUp: () => void }) {
  return (
    <button
      className="flex h-14 w-14 select-none items-center justify-center rounded-full bg-white/15 text-xl font-bold text-white active:bg-white/30"
      onTouchStart={(e) => {
        e.preventDefault();
        onDown();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onUp();
      }}
      onMouseDown={onDown}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    >
      {label}
    </button>
  );
}
