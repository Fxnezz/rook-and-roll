"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPlayer, stepPlayer, circleRectOverlap, type PlayerState } from "@/lib/platformer/physics";
import { getLevel, moverRectAt, type Level } from "@/lib/platformer/levels";
import type { LevelSkin } from "@/lib/platformer/generate";
import { usePlatformerInput } from "@/lib/platformer/usePlatformerInput";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";

const VIEW_W = 760;
const VIEW_H = 420;
const COLLECT_R = 12;

const SKIN_PALETTES: Record<LevelSkin, { sky: [string, string]; hill: string; ground: string }> = {
  meadow: { sky: ["#5a8cd8", "#bcd9f0"], hill: "#4a6b8c", ground: "#6f8f5a" },
  dusk: { sky: ["#7a4a8c", "#e0a878"], hill: "#5a3f6e", ground: "#8a6f4a" },
  frost: { sky: ["#4a7ca8", "#d8ecf5"], hill: "#3f5f78", ground: "#7a97a0" },
};

function fmtTime(ms: number): string {
  return (ms / 1000).toFixed(2) + "s";
}

export function PlatformerGame({
  levelId,
  level: levelProp,
  scoreKey,
  onExit,
}: {
  levelId?: string;
  level?: Level & { skin?: LevelSkin };
  scoreKey?: string;
  onExit: () => void;
}) {
  const level = levelProp ?? getLevel(levelId!);
  const skin = SKIN_PALETTES[(level as { skin?: LevelSkin }).skin ?? "meadow"];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { raw, setTouch } = usePlatformerInput();
  const { best, submit } = useHighScore("platformer", { level: scoreKey ?? levelId ?? level.id, higherIsBetter: false });

  const [phase, setPhase] = useState<"playing" | "won">("playing");
  const [deaths, setDeaths] = useState(0);
  const [collected, setCollected] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finishMs, setFinishMs] = useState<number | null>(null);

  const player = useRef<PlayerState>(createPlayer(level.spawn.x, level.spawn.y));
  const collectedSet = useRef<Set<number>>(new Set());
  const checkpointsHit = useRef<Set<number>>(new Set());
  const lastCheckpoint = useRef({ x: level.spawn.x, y: level.spawn.y });
  const prevJumpDown = useRef(false);
  const camX = useRef(0);
  const startMs = useRef(performance.now());
  const finished = useRef(false);
  const rafRef = useRef<number>(0);
  const wasOnGround = useRef(false);
  const squash = useRef(1);
  const legPhase = useRef(0);

  const respawn = useCallback(() => {
    player.current = createPlayer(lastCheckpoint.current.x, lastCheckpoint.current.y);
    setDeaths((d) => d + 1);
    playArcadeSound("wrong");
  }, []);

  useEffect(() => {
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;

      const t = now / 1000;
      const moverRects = (level.movers ?? []).map((m) => moverRectAt(m, t));

      if (!finished.current) {
        const jumpPressed = raw.current.jumpDown && !prevJumpDown.current;
        prevJumpDown.current = raw.current.jumpDown;
        player.current = stepPlayer(
          player.current,
          { left: raw.current.left, right: raw.current.right, jumpPressed },
          dt,
          [...level.platforms, ...moverRects],
        );

        if (player.current.onGround && !wasOnGround.current) {
          squash.current = 0.7;
        }
        wasOnGround.current = player.current.onGround;
        squash.current += (1 - squash.current) * Math.min(1, dt * 14);
        if (player.current.onGround && Math.abs(player.current.vx) > 20) {
          legPhase.current += dt * 12;
        }

        // fell off the bottom
        if (player.current.y > level.height + 100) respawn();

        // hazards
        for (const hz of level.hazards) {
          if (circleRectOverlap(player.current.x, player.current.y - player.current.h / 2, player.current.w / 2, hz)) {
            respawn();
            break;
          }
        }

        // checkpoints
        (level.checkpoints ?? []).forEach((cp, i) => {
          if (checkpointsHit.current.has(i)) return;
          if (Math.hypot(cp.x - player.current.x, cp.y - player.current.y) < 30) {
            checkpointsHit.current.add(i);
            lastCheckpoint.current = { x: cp.x, y: cp.y };
            playArcadeSound("levelUp");
          }
        });

        // collectibles
        level.collectibles.forEach((c, i) => {
          if (collectedSet.current.has(i)) return;
          if (Math.hypot(c.x - player.current.x, c.y - player.current.y) < COLLECT_R + player.current.w / 2) {
            collectedSet.current.add(i);
            setCollected(collectedSet.current.size);
            playArcadeSound("correct");
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
          playArcadeSound("win");
          submit(total);
        }

        setElapsed(now - startMs.current);
      }

      // camera follows player, clamped to level bounds
      const targetCam = Math.max(0, Math.min(level.width - VIEW_W, player.current.x - VIEW_W / 2));
      camX.current += (targetCam - camX.current) * 0.15;

      draw(moverRects);
      rafRef.current = requestAnimationFrame(loop);
    };

    function draw(moverRects: { x: number; y: number; w: number; h: number }[]) {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const cam = camX.current;
      // sky
      const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      grad.addColorStop(0, skin.sky[0]);
      grad.addColorStop(1, skin.sky[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      // parallax background: far hills, then nearer clouds — both scroll
      // slower than the camera so the level feels like it has depth.
      const hillsX = -cam * 0.25;
      ctx.fillStyle = skin.hill;
      for (let i = -1; i < 6; i++) {
        const bx = hillsX + i * 240;
        ctx.beginPath();
        ctx.ellipse(bx, VIEW_H - 40, 160, 90, 0, Math.PI, 0);
        ctx.fill();
      }
      const cloudX = -cam * 0.45;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (let i = -1; i < 6; i++) {
        const cx = ((cloudX + i * 300) % (300 * 7)) - 150;
        ctx.beginPath();
        ctx.ellipse(cx, 70 + (i % 3) * 20, 38, 16, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 30, 62 + (i % 3) * 20, 26, 13, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // platforms — grassy top with a dirt gradient body
      for (const p of level.platforms) {
        const px = p.x - cam;
        const bodyGrad = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
        bodyGrad.addColorStop(0, skin.ground);
        bodyGrad.addColorStop(0.25, "#5c7a49");
        bodyGrad.addColorStop(1, "#3f5432");
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = "#7fae63";
        ctx.fillRect(px, p.y, p.w, 6);
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        for (let dx = 8; dx < p.w; dx += 22) {
          ctx.fillRect(px + dx, p.y + 12, 3, 3);
        }
      }

      // moving platforms — distinct blue-toned so they read as special
      for (const m of moverRects) {
        const mx = m.x - cam;
        ctx.fillStyle = "#3f6ea8";
        ctx.fillRect(mx, m.y, m.w, m.h);
        ctx.fillStyle = "#7fb3e0";
        ctx.fillRect(mx, m.y, m.w, 4);
      }

      // checkpoints — small flag, dimmed once already reached
      (level.checkpoints ?? []).forEach((cp, i) => {
        const hit = checkpointsHit.current.has(i);
        const fx = cp.x - cam;
        ctx.strokeStyle = hit ? "#6b7a8c" : "#3a3f4a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fx, cp.y);
        ctx.lineTo(fx, cp.y - 34);
        ctx.stroke();
        ctx.fillStyle = hit ? "#8a97a8" : "#5aa8e0";
        ctx.beginPath();
        ctx.moveTo(fx, cp.y - 34);
        ctx.lineTo(fx + 18, cp.y - 27);
        ctx.lineTo(fx, cp.y - 20);
        ctx.closePath();
        ctx.fill();
      });

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

      // player — original round "Spark" character, with a landing squash and
      // simple alternating-leg animation while running along the ground.
      const p = player.current;
      const px = p.x - cam;
      const py = p.y - p.h / 2;
      const sq = squash.current;
      const legSwing = Math.sin(legPhase.current) * 6;

      if (p.onGround) {
        ctx.fillStyle = "rgba(60,60,20,0.35)";
        [-1, 1].forEach((s) => {
          ctx.beginPath();
          ctx.ellipse(px + s * 6 - legSwing * s * 0.3, p.y + 3, 5, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#e9a23b";
          ctx.beginPath();
          ctx.ellipse(px + s * 6 + legSwing * s, p.y - 2, 4, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(60,60,20,0.35)";
        });
      }

      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1 / sq, sq);
      ctx.fillStyle = "#e9a23b";
      ctx.beginPath();
      ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // eyes (face direction)
      ctx.fillStyle = "#241a08";
      const eyeOffset = p.facing * 5;
      ctx.beginPath();
      ctx.arc(eyeOffset - 3, -4, 3, 0, Math.PI * 2);
      ctx.arc(eyeOffset + 5, -4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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
