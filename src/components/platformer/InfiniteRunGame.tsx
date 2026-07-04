"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPlayer, stepPlayer, circleRectOverlap, type PlayerState } from "@/lib/platformer/physics";
import type { Rect } from "@/lib/platformer/physics";
import type { Collectible } from "@/lib/platformer/levels";
import { mulberry32, nextPlatformStep, randomSeed, LEVEL_SKINS, type LevelSkin } from "@/lib/platformer/generate";
import { usePlatformerInput } from "@/lib/platformer/usePlatformerInput";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";

const VIEW_W = 760;
const VIEW_H = 420;
const COLLECT_R = 12;
const GEN_AHEAD = VIEW_W * 2.2;
const PRUNE_BEHIND = VIEW_W * 1.8;
const SPAWN_X = 60;
const SPAWN_Y = 380;

const SKIN_PALETTES: Record<LevelSkin, { sky: [string, string]; hill: string; ground: string }> = {
  meadow: { sky: ["#5a8cd8", "#bcd9f0"], hill: "#4a6b8c", ground: "#6f8f5a" },
  dusk: { sky: ["#7a4a8c", "#e0a878"], hill: "#5a3f6e", ground: "#8a6f4a" },
  frost: { sky: ["#4a7ca8", "#d8ecf5"], hill: "#3f5f78", ground: "#7a97a0" },
};

function fmtDist(px: number): string {
  return `${Math.max(0, Math.floor(px / 10))}m`;
}

export function InfiniteRunGame({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { raw, setTouch } = usePlatformerInput();
  const { best, submit } = useHighScore("platformer", { level: "infinite", higherIsBetter: true });

  const [phase, setPhase] = useState<"playing" | "over">("playing");
  const [collected, setCollected] = useState(0);
  const [distance, setDistance] = useState(0);
  const [finalDistance, setFinalDistance] = useState(0);
  const [skin] = useState<LevelSkin>(() => LEVEL_SKINS[Math.floor(Math.random() * LEVEL_SKINS.length)]);

  const seedRef = useRef(randomSeed());
  const rngRef = useRef(mulberry32(seedRef.current));
  const player = useRef<PlayerState>(createPlayer(SPAWN_X, SPAWN_Y));
  const platforms = useRef<Rect[]>([{ x: 0, y: 400, w: 300, h: 60 }]);
  const hazards = useRef<Rect[]>([]);
  const collectibles = useRef<(Collectible & { id: number })[]>([]);
  const collectedIds = useRef<Set<number>>(new Set());
  const collectibleSeq = useRef(0);
  const genCursor = useRef({ x: 300, y: 400 });
  const prevJumpDown = useRef(false);
  const camX = useRef(0);
  const finished = useRef(false);
  const rafRef = useRef<number>(0);
  const wasOnGround = useRef(false);
  const squash = useRef(1);
  const legPhase = useRef(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);

  const spawnGemBurst = (cx: number, cy: number) => {
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * 90,
        vy: Math.sin(a) * 90 - 40,
        life: 1,
        color: i % 3 === 0 ? "#fff3c4" : "#e9c73f",
      });
    }
  };

  const endRun = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const dist = player.current.x - SPAWN_X;
    setFinalDistance(dist);
    setPhase("over");
    playArcadeSound("gameOver");
    submit(Math.max(0, Math.floor(dist / 10)));
  }, [submit]);

  const restart = useCallback(() => {
    seedRef.current = randomSeed();
    rngRef.current = mulberry32(seedRef.current);
    player.current = createPlayer(SPAWN_X, SPAWN_Y);
    platforms.current = [{ x: 0, y: 400, w: 300, h: 60 }];
    hazards.current = [];
    collectibles.current = [];
    collectedIds.current = new Set();
    genCursor.current = { x: 300, y: 400 };
    particlesRef.current = [];
    camX.current = 0;
    finished.current = false;
    setCollected(0);
    setDistance(0);
    setPhase("playing");
  }, []);

  useEffect(() => {
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;

      if (!finished.current) {
        // generate ahead of the camera, difficulty ramping gently with distance
        const dist = Math.max(0, player.current.x - SPAWN_X);
        const hazardChance = Math.min(0.6, 0.3 + dist / 2500);
        const widthBias = Math.min(1, dist / 1500);
        while (genCursor.current.x < camX.current + VIEW_W + GEN_AHEAD) {
          const step = nextPlatformStep(rngRef.current, genCursor.current.x, genCursor.current.y, { hazardChance, widthBias });
          platforms.current.push(step.platform);
          if (step.hazard) hazards.current.push(step.hazard);
          if (step.collectible) collectibles.current.push({ ...step.collectible, id: collectibleSeq.current++ });
          genCursor.current = { x: step.prevEnd, y: step.prevY };
        }
        // prune well behind the camera
        const pruneX = camX.current - PRUNE_BEHIND;
        if (platforms.current.length > 4) platforms.current = platforms.current.filter((p) => p.x + p.w > pruneX);
        hazards.current = hazards.current.filter((h) => h.x + h.w > pruneX);
        collectibles.current = collectibles.current.filter((c) => c.x > pruneX);

        const jumpPressed = raw.current.jumpDown && !prevJumpDown.current;
        prevJumpDown.current = raw.current.jumpDown;
        player.current = stepPlayer(
          player.current,
          { left: raw.current.left, right: raw.current.right, jumpPressed },
          dt,
          platforms.current,
        );

        if (player.current.onGround && !wasOnGround.current) squash.current = 0.7;
        wasOnGround.current = player.current.onGround;
        squash.current += (1 - squash.current) * Math.min(1, dt * 14);
        if (player.current.onGround && Math.abs(player.current.vx) > 20) legPhase.current += dt * 12;

        if (player.current.y > 480 + 100) endRun();

        for (const hz of hazards.current) {
          if (circleRectOverlap(player.current.x, player.current.y - player.current.h / 2, player.current.w / 2, hz)) {
            endRun();
            break;
          }
        }

        collectibles.current.forEach((c) => {
          if (collectedIds.current.has(c.id)) return;
          if (Math.hypot(c.x - player.current.x, c.y - player.current.y) < COLLECT_R + player.current.w / 2) {
            collectedIds.current.add(c.id);
            setCollected(collectedIds.current.size);
            spawnGemBurst(c.x, c.y);
            playArcadeSound("correct");
          }
        });

        setDistance(dist);

        const targetCam = Math.max(0, player.current.x - VIEW_W / 2.6);
        camX.current += (targetCam - camX.current) * 0.15;
      }

      particlesRef.current = particlesRef.current
        .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + 260 * dt, life: p.life - dt * 1.6 }))
        .filter((p) => p.life > 0);

      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    function draw() {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const cam = camX.current;
      const now = performance.now();
      const pal = SKIN_PALETTES[skin];

      const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      grad.addColorStop(0, pal.sky[0]);
      grad.addColorStop(1, pal.sky[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      const hillsX = -cam * 0.25;
      ctx.fillStyle = pal.hill;
      for (let i = -1; i < 8; i++) {
        const bx = ((hillsX + i * 240) % (240 * 9)) - 240;
        ctx.beginPath();
        ctx.ellipse(bx, VIEW_H - 40, 160, 90, 0, Math.PI, 0);
        ctx.fill();
      }
      const cloudX = -cam * 0.45;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (let i = -1; i < 8; i++) {
        const cx = ((cloudX + i * 300) % (300 * 9)) - 300;
        ctx.beginPath();
        ctx.ellipse(cx, 70 + (i % 3) * 20, 38, 16, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 30, 62 + (i % 3) * 20, 26, 13, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of platforms.current) {
        const px = p.x - cam;
        if (px + p.w < 0 || px > VIEW_W) continue;
        const bodyGrad = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
        bodyGrad.addColorStop(0, pal.ground);
        bodyGrad.addColorStop(0.25, "#5c7a49");
        bodyGrad.addColorStop(1, "#3f5432");
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = "#7fae63";
        ctx.fillRect(px, p.y, p.w, 6);
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        for (let dx = 8; dx < p.w; dx += 22) ctx.fillRect(px + dx, p.y + 12, 3, 3);
      }

      ctx.fillStyle = "#e5604d";
      for (const h of hazards.current) {
        const hx = h.x - cam;
        if (hx + h.w < 0 || hx > VIEW_W) continue;
        const spikeCount = Math.max(1, Math.floor(h.w / 20));
        const sw = h.w / spikeCount;
        for (let i = 0; i < spikeCount; i++) {
          const sx = hx + i * sw;
          ctx.beginPath();
          ctx.moveTo(sx, h.y + h.h);
          ctx.lineTo(sx + sw / 2, h.y);
          ctx.lineTo(sx + sw, h.y + h.h);
          ctx.closePath();
          ctx.fill();
        }
      }

      collectibles.current.forEach((c, idx) => {
        if (collectedIds.current.has(c.id)) return;
        const cx = c.x - cam;
        if (cx < -30 || cx > VIEW_W + 30) return;
        const bob = Math.sin(now / 1000 * 2.4 + idx) * 4;
        const cy = c.y + bob;
        const g = ctx.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, COLLECT_R);
        g.addColorStop(0, "#fff3c4");
        g.addColorStop(1, "#e9c73f");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, COLLECT_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#a8891a";
        ctx.lineWidth = 2;
        ctx.stroke();
        const shineAngle = now / 400 + idx;
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(shineAngle) * 3, cy + Math.sin(shineAngle) * 3);
        ctx.lineTo(cx + Math.cos(shineAngle) * (COLLECT_R - 2), cy + Math.sin(shineAngle) * (COLLECT_R - 2));
        ctx.stroke();
      });

      particlesRef.current.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - cam, p.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      const p = player.current;
      const px = p.x - cam;
      const py = p.y - p.h / 2;
      const sq = squash.current;
      const legSwing = Math.sin(legPhase.current) * 6;

      if (p.onGround) {
        [-1, 1].forEach((s) => {
          ctx.fillStyle = "rgba(60,60,20,0.35)";
          ctx.beginPath();
          ctx.ellipse(px + s * 6 - legSwing * s * 0.3, p.y + 3, 5, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#e9a23b";
          ctx.beginPath();
          ctx.ellipse(px + s * 6 + legSwing * s, p.y - 2, 4, 7, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1 / sq, sq);
      ctx.fillStyle = "#e9a23b";
      ctx.beginPath();
      ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
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
  }, [endRun, skin]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-[760px] items-center justify-between text-sm">
        <button className="btn btn-ghost !py-1" onClick={onExit}>
          ← Levels
        </button>
        <div className="flex gap-2">
          <span className="chip">🏃 {fmtDist(distance)}</span>
          <span className="chip">💎 {collected}</span>
          {best != null && <span className="chip">🏆 {best}m</span>}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl" style={{ width: VIEW_W, maxWidth: "94vw" }}>
        <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} style={{ width: "100%", height: "auto", display: "block" }} />

        {phase === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-center text-white">
            <p className="text-xl font-bold">Run over!</p>
            <p className="text-sm text-white/80">Distance: {fmtDist(finalDistance)}</p>
            <p className="text-sm text-white/80">Gems: {collected}</p>
            {best != null && <p className="text-xs text-white/60">Best distance: {best}m</p>}
            <div className="mt-2 flex gap-2">
              <button className="btn btn-primary" onClick={restart}>
                Run again
              </button>
              <button className="btn" onClick={onExit}>
                Back to levels
              </button>
            </div>
          </div>
        )}

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
      <p className="text-xs text-[var(--text-faint)]">
        ←→/A D to move, ↑/W/Space to jump (double-jump). Endless — the ground keeps generating. Watch the pace pick up.
      </p>
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
