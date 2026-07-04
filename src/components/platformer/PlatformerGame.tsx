"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPlayer, stepPlayer, circleRectOverlap, type PlayerState } from "@/lib/platformer/physics";
import { getLevel } from "@/lib/platformer/levels";
import { usePlatformerInput } from "@/lib/platformer/usePlatformerInput";
import { useHighScore } from "@/lib/arcade/useHighScore";

const VIEW_W = 760;
const VIEW_H = 420;
const COLLECT_R = 12;

function fmtTime(ms: number): string {
  return (ms / 1000).toFixed(2) + "s";
}

export function PlatformerGame({ levelId, onExit }: { levelId: string; onExit: () => void }) {
  const level = getLevel(levelId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { raw, setTouch } = usePlatformerInput();
  const { best, submit } = useHighScore("platformer", { level: levelId, higherIsBetter: false });

  const [phase, setPhase] = useState<"playing" | "won">("playing");
  const [deaths, setDeaths] = useState(0);
  const [collected, setCollected] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finishMs, setFinishMs] = useState<number | null>(null);

  const player = useRef<PlayerState>(createPlayer(level.spawn.x, level.spawn.y));
  const collectedSet = useRef<Set<number>>(new Set());
  const prevJumpDown = useRef(false);
  const camX = useRef(0);
  const startMs = useRef(performance.now());
  const finished = useRef(false);
  const rafRef = useRef<number>(0);

  const respawn = useCallback(() => {
    player.current = createPlayer(level.spawn.x, level.spawn.y);
    setDeaths((d) => d + 1);
  }, [level]);

  useEffect(() => {
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;

      if (!finished.current) {
        const jumpPressed = raw.current.jumpDown && !prevJumpDown.current;
        prevJumpDown.current = raw.current.jumpDown;
        player.current = stepPlayer(
          player.current,
          { left: raw.current.left, right: raw.current.right, jumpPressed },
          dt,
          level.platforms,
        );

        // fell off the bottom
        if (player.current.y > level.height + 100) respawn();

        // hazards
        for (const hz of level.hazards) {
          if (circleRectOverlap(player.current.x, player.current.y - player.current.h / 2, player.current.w / 2, hz)) {
            respawn();
            break;
          }
        }

        // collectibles
        level.collectibles.forEach((c, i) => {
          if (collectedSet.current.has(i)) return;
          if (Math.hypot(c.x - player.current.x, c.y - player.current.y) < COLLECT_R + player.current.w / 2) {
            collectedSet.current.add(i);
            setCollected(collectedSet.current.size);
          }
        });

        // goal
        const g = level.goal;
        if (
          player.current.x + player.current.w / 2 > g.x &&
          player.current.x - player.current.w / 2 < g.x + g.w &&
          player.current.y > g.y &&
          player.current.y - player.current.h < g.y + g.h
        ) {
          finished.current = true;
          const total = now - startMs.current;
          setFinishMs(total);
          setPhase("won");
          submit(total);
        }

        setElapsed(now - startMs.current);
      }

      // camera follows player, clamped to level bounds
      const targetCam = Math.max(0, Math.min(level.width - VIEW_W, player.current.x - VIEW_W / 2));
      camX.current += (targetCam - camX.current) * 0.15;

      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    function draw() {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const cam = camX.current;
      // sky
      const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      grad.addColorStop(0, "#5a8cd8");
      grad.addColorStop(1, "#bcd9f0");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      // platforms
      ctx.fillStyle = "#6f8f5a";
      for (const p of level.platforms) {
        ctx.fillRect(p.x - cam, p.y, p.w, p.h);
        ctx.fillStyle = "#557048";
        ctx.fillRect(p.x - cam, p.y, p.w, 6);
        ctx.fillStyle = "#6f8f5a";
      }

      // hazards (spikes)
      ctx.fillStyle = "#e5604d";
      for (const h of level.hazards) {
        const spikeCount = Math.max(1, Math.floor(h.w / 20));
        const sw = h.w / spikeCount;
        for (let i = 0; i < spikeCount; i++) {
          const sx = h.x - cam + i * sw;
          ctx.beginPath();
          ctx.moveTo(sx, h.y + h.h);
          ctx.lineTo(sx + sw / 2, h.y);
          ctx.lineTo(sx + sw, h.y + h.h);
          ctx.closePath();
          ctx.fill();
        }
      }

      // collectibles
      level.collectibles.forEach((c, i) => {
        if (collectedSet.current.has(i)) return;
        ctx.fillStyle = "#e9c73f";
        ctx.beginPath();
        ctx.arc(c.x - cam, c.y, COLLECT_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#a8891a";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // goal flag
      ctx.fillStyle = "#8a5a2a";
      ctx.fillRect(level.goal.x - cam + level.goal.w / 2 - 3, level.goal.y - level.goal.h, 6, level.goal.h + level.goal.h);
      ctx.fillStyle = "#5bbf7a";
      ctx.beginPath();
      ctx.moveTo(level.goal.x - cam + level.goal.w / 2 + 3, level.goal.y - level.goal.h);
      ctx.lineTo(level.goal.x - cam + level.goal.w / 2 + 40, level.goal.y - level.goal.h + 14);
      ctx.lineTo(level.goal.x - cam + level.goal.w / 2 + 3, level.goal.y - level.goal.h + 28);
      ctx.closePath();
      ctx.fill();

      // player — original round "Spark" character
      const p = player.current;
      const px = p.x - cam;
      const py = p.y - p.h / 2;
      ctx.fillStyle = "#e9a23b";
      ctx.beginPath();
      ctx.ellipse(px, py, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // eyes (face direction)
      ctx.fillStyle = "#241a08";
      const eyeOffset = p.facing * 5;
      ctx.beginPath();
      ctx.arc(px + eyeOffset - 3, py - 4, 3, 0, Math.PI * 2);
      ctx.arc(px + eyeOffset + 5, py - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, respawn, submit]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-[760px] items-center justify-between text-sm">
        <button className="btn btn-ghost !py-1" onClick={onExit}>
          ← Levels
        </button>
        <div className="flex gap-2">
          <span className="chip">⏱ {fmtTime(elapsed)}</span>
          <span className="chip">💎 {collected}/{level.collectibles.length}</span>
          <span className="chip">💀 {deaths}</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl" style={{ width: VIEW_W, maxWidth: "94vw" }}>
        <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} style={{ width: "100%", height: "auto", display: "block" }} />

        {phase === "won" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-center text-white">
            <p className="text-xl font-bold">Level complete!</p>
            <p className="text-sm text-white/80">Time: {fmtTime(finishMs ?? 0)}</p>
            <p className="text-sm text-white/80">
              Gems: {collected}/{level.collectibles.length} · Deaths: {deaths}
            </p>
            {best != null && <p className="text-xs text-white/60">Best: {fmtTime(best)}</p>}
            <button className="btn btn-primary mt-2" onClick={onExit}>
              Back to levels
            </button>
          </div>
        )}

        {/* mobile touch controls */}
        {phase === "playing" && (
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 sm:hidden">
            <div className="flex gap-2">
              <TouchBtn label="◀" onDown={() => setTouch("left", true)} onUp={() => setTouch("left", false)} />
              <TouchBtn label="▶" onDown={() => setTouch("right", true)} onUp={() => setTouch("right", false)} />
            </div>
            <TouchBtn label="⤒" onDown={() => setTouch("jumpDown", true)} onUp={() => setTouch("jumpDown", false)} />
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--text-faint)]">←→/A D to move, ↑/W/Space to jump (double-jump available).</p>
    </div>
  );
}

function TouchBtn({ label, onDown, onUp }: { label: string; onDown: () => void; onUp: () => void }) {
  return (
    <button
      className="flex h-14 w-14 select-none items-center justify-center rounded-full bg-black/30 text-xl font-bold text-white active:bg-black/50"
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
