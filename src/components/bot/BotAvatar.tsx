import type { BotTierId } from "@/lib/engine/bots";
import { getTier } from "@/lib/engine/bots";

/**
 * Original hand-drawn SVG portraits for every bot — no borrowed art.
 * Each avatar is a head-and-shoulders character on the bot's accent-color
 * backdrop, composed from shared primitives plus per-bot hair/accessories.
 */

interface Palette {
  skin: string;
  skinShade: string;
  hair: string;
  shirt: string;
}

function darken(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/* ---------------------------------------------------------------- shared */

function Backdrop({ accent, id }: { accent: string; id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor={darken(accent, 0.55)} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#bg-${id})`} />
      {/* soft vignette circle behind the head */}
      <circle cx="32" cy="34" r="24" fill="rgba(255,255,255,0.08)" />
    </>
  );
}

function Shoulders({ shirt }: { shirt: string }) {
  return (
    <path d="M10 64 Q12 46 32 46 Q52 46 54 64 Z" fill={shirt} stroke={darken(shirt, 0.7)} strokeWidth="1" />
  );
}

function Head({ p, jaw = "round" }: { p: Palette; jaw?: "round" | "square" }) {
  return jaw === "square" ? (
    <path d="M20 24 Q20 15 32 15 Q44 15 44 24 L44 36 Q44 45 32 45 Q20 45 20 36 Z" fill={p.skin} />
  ) : (
    <ellipse cx="32" cy="30" rx="12.5" ry="14.5" fill={p.skin} />
  );
}

function Eyes({ y = 30, dx = 5, color = "#232323", wide = false }: { y?: number; dx?: number; color?: string; wide?: boolean }) {
  return (
    <>
      <circle cx={32 - dx} cy={y} r={wide ? 1.9 : 1.5} fill={color} />
      <circle cx={32 + dx} cy={y} r={wide ? 1.9 : 1.5} fill={color} />
    </>
  );
}

function Smile({ y = 37, w = 7, open = false }: { y?: number; w?: number; open?: boolean }) {
  return open ? (
    <path d={`M${32 - w / 2} ${y} Q32 ${y + 4.5} ${32 + w / 2} ${y}Z`} fill="#7c3b2e" />
  ) : (
    <path d={`M${32 - w / 2} ${y} Q32 ${y + 3.5} ${32 + w / 2} ${y}`} stroke="#7c3b2e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  );
}

function Blush({ p }: { p: Palette }) {
  return (
    <>
      <circle cx="24" cy="34.5" r="2.2" fill={p.skinShade} opacity="0.55" />
      <circle cx="40" cy="34.5" r="2.2" fill={p.skinShade} opacity="0.55" />
    </>
  );
}

function Glasses({ y = 30, round = true }: { y?: number; round?: boolean }) {
  return (
    <g stroke="#2c333f" strokeWidth="1.4" fill="rgba(255,255,255,0.14)">
      {round ? (
        <>
          <circle cx="26.5" cy={y} r="4.2" />
          <circle cx="37.5" cy={y} r="4.2" />
        </>
      ) : (
        <>
          <rect x="22.5" y={y - 3.4} width="8" height="6.8" rx="1.4" />
          <rect x="33.5" y={y - 3.4} width="8" height="6.8" rx="1.4" />
        </>
      )}
      <path d={`M30.7 ${y} L33.3 ${y}`} />
    </g>
  );
}

/* ------------------------------------------------------------- portraits */

function Pip() {
  const p: Palette = { skin: "#f4cba4", skinShade: "#e8a87d", hair: "#d9722c", shirt: "#3f7fb5" };
  return (
    <>
      <Shoulders shirt={p.shirt} />
      <Head p={p} />
      {/* messy fringe poking out under a backwards cap */}
      <path d="M20 26 Q22 20 27 21 L26 24 Q24 25 20 26Z" fill={p.hair} />
      <path d="M44 26 Q42 20 37 21 L38 24 Q40 25 44 26Z" fill={p.hair} />
      {/* backwards baseball cap */}
      <path d="M19.5 23 Q20 12.5 32 12.5 Q44 12.5 44.5 23 Q38 20 32 20 Q26 20 19.5 23Z" fill="#4d9e63" />
      <path d="M44 20 L52 22.5 Q51 25 44.5 24Z" fill="#3d7e4f" />
      <circle cx="32" cy="16.2" r="1.4" fill="#3d7e4f" />
      {/* freckles */}
      <circle cx="25.5" cy="33" r="0.7" fill="#c98a5a" />
      <circle cx="27.5" cy="34.4" r="0.7" fill="#c98a5a" />
      <circle cx="38.5" cy="33" r="0.7" fill="#c98a5a" />
      <circle cx="36.5" cy="34.4" r="0.7" fill="#c98a5a" />
      <Eyes wide />
      <Smile open w={8} />
    </>
  );
}

function Milo() {
  const p: Palette = { skin: "#d99b66", skinShade: "#c07f4b", hair: "#2d2320", shirt: "#e8c33c" };
  return (
    <>
      <Shoulders shirt={p.shirt} />
      <Head p={p} />
      {/* big curly mop */}
      <g fill={p.hair}>
        <circle cx="23" cy="19" r="5" />
        <circle cx="29" cy="15.5" r="5.4" />
        <circle cx="36" cy="15.5" r="5.4" />
        <circle cx="42" cy="19" r="5" />
        <circle cx="20.5" cy="24" r="3.6" />
        <circle cx="43.5" cy="24" r="3.6" />
      </g>
      <Eyes wide />
      <Blush p={p} />
      {/* lopsided cheeky grin */}
      <path d="M27 36.5 Q33 41 38.5 35.5" stroke="#6e3323" strokeWidth="1.7" fill="none" strokeLinecap="round" />
    </>
  );
}

function Nell() {
  const p: Palette = { skin: "#8a5a3b", skinShade: "#734a2f", hair: "#1d1712", shirt: "#b565c9" };
  return (
    <>
      <Shoulders shirt={p.shirt} />
      <Head p={p} />
      {/* afro puff buns */}
      <circle cx="21" cy="16" r="6.5" fill={p.hair} />
      <circle cx="43" cy="16" r="6.5" fill={p.hair} />
      <path d="M20 27 Q20 16.5 32 16.5 Q44 16.5 44 27 Q38 24 32 24 Q26 24 20 27Z" fill={p.hair} />
      {/* hair ties */}
      <circle cx="25.5" cy="19.5" r="1.2" fill="#f2d24b" />
      <circle cx="38.5" cy="19.5" r="1.2" fill="#f2d24b" />
      <Eyes />
      <Smile w={5.5} />
    </>
  );
}

function Beau() {
  const p: Palette = { skin: "#f1c096", skinShade: "#dd9d6d", hair: "#c9a04a", shirt: "#cc4b3d" };
  return (
    <>
      <Shoulders shirt={p.shirt} />
      <Head p={p} jaw="square" />
      {/* swept-back blond hair */}
      <path d="M19.5 25 Q19 13.5 32 13.5 Q45 13.5 44.5 25 Q43 18.5 32 18 Q21 18.5 19.5 25Z" fill={p.hair} />
      <path d="M23 19 Q26 15.5 30 15.8 L28 19.5Z" fill={darken(p.hair, 0.8)} />
      {/* determined uneven brows */}
      <path d="M23.5 26.2 L29 25.2" stroke="#8a6a2a" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M35 24.6 L40.5 26.2" stroke="#8a6a2a" strokeWidth="1.5" strokeLinecap="round" />
      <Eyes />
      {/* plaster on cheek — the scrapper */}
      <g transform="rotate(-18 40 34)">
        <rect x="36.5" y="32.6" width="7" height="2.8" rx="1.2" fill="#e8ceb0" stroke="#c9a884" strokeWidth="0.5" />
        <circle cx="40" cy="34" r="0.5" fill="#c9a884" />
      </g>
      <path d="M28 38.5 Q32 40.5 36 38.5" stroke="#7c3b2e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  );
}

function Cass() {
  const p: Palette = { skin: "#dfa877", skinShade: "#c68a58", hair: "#4a3423", shirt: "#3a7f68" };
  return (
    <>
      <Shoulders shirt={p.shirt} />
      <Head p={p} />
      {/* short side-part */}
      <path d="M19.5 27 Q19.5 14 32 14 Q44.5 14 44.5 27 Q43.5 19 34 18.4 L36 16.5 Q26 15.5 24 19 Q20.5 21.5 19.5 27Z" fill={p.hair} />
      {/* stubble */}
      <path d="M22 36 Q23 42.5 32 43.5 Q41 42.5 42 36 Q40 41 32 41.6 Q24 41 22 36Z" fill={p.hair} opacity="0.35" />
      <Eyes />
      <Smile w={7} />
    </>
  );
}

function Rosa() {
  const p: Palette = { skin: "#e3aa7c", skinShade: "#cd8c5c", hair: "#33241d", shirt: "#c23b55" };
  return (
    <>
      {/* long wavy hair behind shoulders */}
      <path d="M17 22 Q17 60 22 64 L42 64 Q47 60 47 22 Q44 12 32 12 Q20 12 17 22Z" fill={p.hair} />
      <Shoulders shirt={p.shirt} />
      <path d="M17 22 Q16 48 21 58 L25 50 Q22 38 23 24Z" fill={p.hair} />
      <path d="M47 22 Q48 48 43 58 L39 50 Q42 38 41 24Z" fill={p.hair} />
      <Head p={p} />
      {/* side-swept waves */}
      <path d="M19.5 28 Q19 13.5 32 13.5 Q45 13.5 44.5 28 Q44 20 38 18.5 Q40 21 39 24 Q34 17.5 25 19.5 Q20.5 21.5 19.5 28Z" fill={p.hair} />
      {/* hoop earrings */}
      <circle cx="19.5" cy="35" r="2.4" stroke="#f2d24b" strokeWidth="1.3" fill="none" />
      <circle cx="44.5" cy="35" r="2.4" stroke="#f2d24b" strokeWidth="1.3" fill="none" />
      <Eyes />
      {/* confident smirk */}
      <path d="M28.5 37.5 Q33.5 40 37.5 36.8" stroke="#8a3b2e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  );
}

function Wren() {
  const p: Palette = { skin: "#f2cfae", skinShade: "#dcae83", hair: "#1b1b22", shirt: "#5a6ac9" };
  const hair = "#1b1b22";
  return (
    <>
      <Shoulders shirt={p.shirt} />
      {/* bob behind the face */}
      <path d="M18.5 24 Q18.5 12.5 32 12.5 Q45.5 12.5 45.5 24 L45.5 36 Q45.5 41 41.5 42 L41.5 30 L22.5 30 L22.5 42 Q18.5 41 18.5 36Z" fill={hair} />
      <Head p={p} />
      {/* straight fringe */}
      <path d="M20 27 Q20 15 32 15 Q44 15 44 27 L41 27 Q41.5 21 38 19.5 L38.5 25 L34 20 L32.5 25 L28 19.8 L27 25.5 L23.5 21 Q22 24 23 27Z" fill={hair} />
      <Glasses round />
      <Eyes />
      <Smile w={5} />
    </>
  );
}

function Dex() {
  const p: Palette = { skin: "#9c6b45", skinShade: "#845834", hair: "#171310", shirt: "#2f6db0" };
  return (
    <>
      <Shoulders shirt={p.shirt} />
      <Head p={p} jaw="square" />
      {/* flat-top */}
      <path d="M20 24 Q20 15 32 14.5 Q44 15 44 24 L44 21 Q44 12.5 32 12.5 Q20 12.5 20 21Z" fill={p.hair} />
      <rect x="20.5" y="13.5" width="23" height="7.5" rx="2.5" fill={p.hair} />
      {/* full beard */}
      <path d="M20.5 30 Q20.5 44 32 44.5 Q43.5 44 43.5 30 L43.5 34 Q43.5 41.5 32 42 Q20.5 41.5 20.5 34Z" fill={p.hair} />
      <path d="M26 38.2 Q32 42.5 38 38.2 L38 40 Q32 43.5 26 40Z" fill={p.hair} />
      <Eyes />
      <path d="M28.5 38 Q32 39.8 35.5 38" stroke="#3a241a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </>
  );
}

function Ilsa() {
  const p: Palette = { skin: "#f6d7b8", skinShade: "#e2b48c", hair: "#e9dfb8", shirt: "#3f8fa8" };
  return (
    <>
      {/* high ponytail sweeping out */}
      <path d="M42 15 Q54 13 52 30 Q50 44 44 50 Q47 38 44.5 28 Q43.5 20 40 17Z" fill={p.hair} />
      <Shoulders shirt={p.shirt} />
      <Head p={p} />
      {/* slick pulled-back hair */}
      <path d="M19.5 27 Q19 13 32 13 Q45 13 44.5 27 Q42 17.5 32 17.2 Q22 17.5 19.5 27Z" fill={p.hair} />
      <circle cx="42.5" cy="16.5" r="2.6" fill={p.hair} />
      <circle cx="42.5" cy="16.5" r="1" fill="#b8a86a" />
      {/* sharp brows + narrow eyes */}
      <path d="M23.5 26.5 L29.5 25.5" stroke="#b8a86a" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M34.5 25.5 L40.5 26.5" stroke="#b8a86a" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M25.2 30 L28.8 30" stroke="#233" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M35.2 30 L38.8 30" stroke="#233" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M29 38 Q32 39.2 35 38" stroke="#8a4b3e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </>
  );
}

function Vera() {
  const p: Palette = { skin: "#eec39c", skinShade: "#d6a071", hair: "#8a4a2f", shirt: "#6b4fa3" };
  return (
    <>
      <Shoulders shirt={p.shirt} />
      <Head p={p} />
      {/* tidy bun + center-part */}
      <circle cx="32" cy="12.5" r="5" fill={p.hair} />
      <path d="M19.5 28 Q19 14 32 14 Q45 14 44.5 28 Q43.5 19.5 33.5 18.5 L32 16.5 L30.5 18.5 Q20.5 19.5 19.5 28Z" fill={p.hair} />
      <Glasses round={false} y={29.5} />
      <Eyes y={29.5} />
      {/* composed straight mouth, tiny curl */}
      <path d="M28.5 37.8 L35 37.8 Q36 37.8 36.5 37.1" stroke="#8a4b3e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </>
  );
}

function Zephyr() {
  const p: Palette = { skin: "#e8d3c4", skinShade: "#cbb0a0", hair: "#cfd8e8", shirt: "#37474f" };
  return (
    <>
      <Shoulders shirt={p.shirt} />
      {/* high collar */}
      <path d="M22 64 L22 50 Q27 46.5 32 46.5 Q37 46.5 42 50 L42 64Z" fill={darken(p.shirt, 0.8)} />
      <Head p={p} />
      {/* wind-swept silver spikes */}
      <path d="M19.5 27 Q18 13 31 12.5 L28 17 L34 13 L33.5 17.5 L39.5 14 L37.5 18.5 L44 17 L41.5 21.5 L45.5 23 Q44.5 25.5 44.5 27 Q42 18.5 32 18 Q21.5 18.5 19.5 27Z" fill={p.hair} />
      {/* cold narrow eyes */}
      <path d="M24.8 29.6 L29 29.6" stroke="#4a7f9e" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M35 29.6 L39.2 29.6" stroke="#4a7f9e" strokeWidth="2.1" strokeLinecap="round" />
      {/* thin scar over right brow */}
      <path d="M37 25 L40.5 23.4" stroke={p.skinShade} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M29.5 38.2 L34.5 38.2" stroke="#8a5b4e" strokeWidth="1.4" strokeLinecap="round" />
    </>
  );
}

function Titan() {
  const metal = "#aebcc9";
  const dark = "#5d6b78";
  return (
    <>
      {/* chassis shoulders */}
      <path d="M10 64 Q12 47 32 47 Q52 47 54 64 Z" fill={dark} stroke="#46525d" strokeWidth="1" />
      <rect x="28" y="42" width="8" height="6" fill="#8494a3" />
      {/* head unit */}
      <rect x="19" y="14" width="26" height="30" rx="6" fill={metal} stroke="#7c8b99" strokeWidth="1" />
      <rect x="21.5" y="16.5" width="21" height="9" rx="3.5" fill="#d7e0e8" opacity="0.5" />
      {/* antenna */}
      <path d="M32 14 L32 8.5" stroke={dark} strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="7" r="2.2" fill="#e5604d" />
      {/* glowing visor eyes */}
      <rect x="22.5" y="26" width="19" height="7" rx="3.5" fill="#232c33" />
      <circle cx="27.5" cy="29.5" r="2" fill="#ffd75e" />
      <circle cx="36.5" cy="29.5" r="2" fill="#ffd75e" />
      {/* speaker mouth */}
      <path d="M26 38.5 L38 38.5" stroke={dark} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M28 41 L36 41" stroke={dark} strokeWidth="1.3" strokeLinecap="round" />
      {/* side bolts */}
      <circle cx="19" cy="29" r="2.4" fill={dark} />
      <circle cx="45" cy="29" r="2.4" fill={dark} />
    </>
  );
}

function Omen() {
  return (
    <>
      {/* cloaked shoulders */}
      <path d="M8 64 Q11 44 32 44 Q53 44 56 64 Z" fill="#1a1626" />
      {/* deep hood */}
      <path d="M15 46 Q13 12 32 10 Q51 12 49 46 Q46 40 42 39 Q47 30 44 21 Q40 14 32 14 Q24 14 20 21 Q17 30 22 39 Q18 40 15 46Z" fill="#251d38" />
      <path d="M20 21 Q17 30 22 39 Q18 40 15 46 Q13 24 20 21Z" fill="#1c1530" />
      {/* shadowed void of a face */}
      <ellipse cx="32" cy="30" rx="10.5" ry="12" fill="#0c0913" />
      {/* glowing eyes */}
      <path d="M25.5 28.5 L30 30.2 L25.8 31.4 Z" fill="#e9a23b" />
      <path d="M38.5 28.5 L34 30.2 L38.2 31.4 Z" fill="#e9a23b" />
      <circle cx="27.4" cy="30" r="0.9" fill="#ffe9bd" />
      <circle cx="36.6" cy="30" r="0.9" fill="#ffe9bd" />
      {/* clasp */}
      <circle cx="32" cy="48.5" r="1.8" fill="#e9a23b" />
    </>
  );
}

const PORTRAITS: Record<BotTierId, () => React.ReactNode> = {
  pip: Pip,
  milo: Milo,
  nell: Nell,
  beau: Beau,
  cass: Cass,
  rosa: Rosa,
  wren: Wren,
  dex: Dex,
  ilsa: Ilsa,
  vera: Vera,
  zephyr: Zephyr,
  titan: Titan,
  omen: Omen,
};

export function BotAvatar({
  tierId,
  size = 48,
  rounded = "lg",
  className,
}: {
  tierId: BotTierId;
  size?: number;
  /** Corner style: chess.com-style rounded square by default, or a full circle. */
  rounded?: "lg" | "full";
  className?: string;
}) {
  const tier = getTier(tierId);
  const Portrait = PORTRAITS[tier.id] ?? PORTRAITS.cass;
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: rounded === "full" ? "9999px" : Math.max(6, size * 0.16),
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
      }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={`${tier.fullName} avatar`}>
        <Backdrop accent={tier.accent} id={tier.id} />
        <Portrait />
      </svg>
    </span>
  );
}
