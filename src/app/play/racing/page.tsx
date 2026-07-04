"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { RaceScene, type RaceCallbacks } from "@/components/racing/RaceScene";
import { useCarInput } from "@/lib/racing/useCarInput";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { TRACK_DEFS, getTrack, type Track } from "@/lib/racing/track";

function fmtTime(ms: number): string {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
}

const MINI_MAP_SIZE = 96;
const MINI_MAP_PAD = 8;

function buildMiniMap(track: Track) {
  const { center } = track.trackOutline();
  const xs = center.map((p) => p.x);
  const zs = center.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const span = Math.max(maxX - minX, maxZ - minZ) || 1;
  const scale = (MINI_MAP_SIZE - MINI_MAP_PAD * 2) / span;
  const toXY = (x: number, z: number) => ({
    x: MINI_MAP_PAD + (x - minX) * scale,
    y: MINI_MAP_PAD + (z - minZ) * scale,
  });
  const path = center.map((p, i) => `${i === 0 ? "M" : "L"}${toXY(p.x, p.z).x.toFixed(1)},${toXY(p.x, p.z).y.toFixed(1)}`).join(" ") + " Z";
  return { path, toXY };
}

function TrackSelect({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Circuit Dash</h1>
      <p className="mb-4 text-sm text-[var(--text-muted)]">Pick a track — original circuits, each with its own best-lap board.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {TRACK_DEFS.map((def) => (
          <TrackCard key={def.id} id={def.id} name={def.name} blurb={def.blurb} laps={def.laps} onPick={() => onPick(def.id)} />
        ))}
      </div>
    </div>
  );
}

function TrackCard({
  id,
  name,
  blurb,
  laps,
  onPick,
}: {
  id: string;
  name: string;
  blurb: string;
  laps: number;
  onPick: () => void;
}) {
  const { best } = useHighScore("racing", { level: id, higherIsBetter: false });
  return (
    <button onClick={onPick} className="panel flex flex-col items-start gap-1 p-4 text-left transition-colors hover:bg-[var(--bg-elev)]">
      <span className="font-bold">{name}</span>
      <span className="text-xs text-[var(--text-muted)]">{blurb}</span>
      <span className="mt-1 text-xs text-[var(--text-faint)]">
        {laps} laps · {best != null ? `Best lap: ${fmtTime(best)}` : "No lap set yet"}
      </span>
    </button>
  );
}

export default function RacingPage() {
  const { inputRef, setTouch } = useCarInput();
  const [trackId, setTrackId] = useState<string | null>(null);
  const track = useMemo(() => (trackId ? getTrack(trackId) : null), [trackId]);
  const { best, submit } = useHighScore("racing", { level: trackId ?? undefined, higherIsBetter: false });
  const [phase, setPhase] = useState<"idle" | "countdown" | "racing" | "done">("idle");
  const [count, setCount] = useState(3);
  const [lap, setLap] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [offTrack, setOffTrack] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [driftFactor, setDriftFactor] = useState(0);
  const [lastLapTime, setLastLapTime] = useState<number | null>(null);
  const [bestLapThisRace, setBestLapThisRace] = useState<number | null>(null);
  const [finishTime, setFinishTime] = useState<number | null>(null);
  const [carPos, setCarPos] = useState({ x: 0, y: 0 });
  const miniMap = useMemo(() => (track ? buildMiniMap(track) : null), [track]);

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
    onProgress: ({ elapsedMs, offTrack: off, x, z, speed: s, driftFactor: df }) => {
      setElapsed(elapsedMs);
      setOffTrack(off);
      setSpeed(s);
      setDriftFactor(df);
      if (miniMap) {
        const { x: mx, y: my } = miniMap.toXY(x, z);
        setCarPos({ x: mx, y: my });
      }
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

  if (!track) return <TrackSelect onPick={setTrackId} />;

  const running = phase === "racing";
  const speedPct = Math.min(1, speed / 46);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Circuit Dash — {track.name}</h1>
        <button className="btn btn-ghost !py-1 text-xs" onClick={() => setTrackId(null)}>
          Change track
        </button>
      </div>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        {track.blurb} · {track.laps} laps.
      </p>

      <div className="relative overflow-hidden rounded-2xl bg-[#0a0e14]" style={{ aspectRatio: "16/10" }}>
        <Canvas shadows camera={{ fov: 62, position: [0, 6, -12] }}>
          <color attach="background" args={["#3a5a8c"]} />
          <fog attach="fog" args={["#3a5a8c", 90, 260]} />
          <RaceScene track={track} inputRef={inputRef} running={running} callbacks={callbacksRef} />
        </Canvas>

        {/* HUD overlay */}
        {(phase === "racing" || phase === "countdown") && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 text-white">
            <div className="rounded-lg bg-black/50 px-3 py-1.5 font-mono text-sm">
              Lap {Math.min(lap, track.laps)}/{track.laps}
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

        {phase === "racing" && (
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1.5">
            <div className="w-32 rounded bg-black/50 px-2 py-1">
              <div className="mb-0.5 flex items-center justify-between text-[10px] font-bold text-white/70">
                <span>SPEED</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${speedPct * 100}%` }} />
              </div>
            </div>
            {driftFactor > 0.15 && (
              <div className="w-32 rounded bg-black/50 px-2 py-1">
                <div className="mb-0.5 text-[10px] font-bold text-white/70">DRIFT</div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-[var(--warn)] transition-[width]"
                    style={{ width: `${driftFactor * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "racing" && miniMap && (
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-black/50 p-1.5">
            <svg width={MINI_MAP_SIZE} height={MINI_MAP_SIZE} viewBox={`0 0 ${MINI_MAP_SIZE} ${MINI_MAP_SIZE}`}>
              <path d={miniMap.path} fill="none" stroke="#8a93a6" strokeWidth={3} strokeLinejoin="round" />
              <circle cx={carPos.x} cy={carPos.y} r={3.5} fill="#e9a23b" stroke="#fff" strokeWidth={1} />
            </svg>
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
              <p className="text-xl font-bold text-white">{track.name}</p>
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
              <TouchBtn label="✧" onDown={() => setTouch("drift", 1)} onUp={() => setTouch("drift", 0)} />
              <TouchBtn label="▼" onDown={() => setTouch("throttle", -1)} onUp={() => setTouch("throttle", 0)} />
              <TouchBtn label="▲" onDown={() => setTouch("throttle", 1)} onUp={() => setTouch("throttle", 0)} />
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-[var(--text-faint)]">
        Arrow keys / WASD to drive, Shift or Space to drift, or the on-screen buttons on mobile.
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
