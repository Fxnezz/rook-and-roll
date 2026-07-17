"use client";

import { useEffect, useMemo, useState } from "react";
import { Piece } from "@/lib/pieces";
import {
  FANTASY_PIECE_NAMES,
  VARIANT_PRESETS,
  createVariantState,
  isVariantCheck,
  legalVariantMoves,
  pickVariantBotMove,
  playVariantMove,
  variantSquare,
  type VariantColor,
  type VariantId,
  type VariantMove,
  type VariantPiece,
  type VariantPieceKind,
  type VariantState,
} from "@/lib/chess/fantasyVariants";

const CUSTOM_CROWNS: { kind: VariantPieceKind; label: string; detail: string }[] = [
  { kind: "q", label: "Queen", detail: "Rook + bishop" },
  { kind: "d", label: "Dragon", detail: "Queen + knight" },
  { kind: "a", label: "Archbishop", detail: "Bishop + knight" },
  { kind: "c", label: "Chancellor", detail: "Rook + knight" },
  { kind: "w", label: "Wizard", detail: "Bishop + camel leap" },
];

function initialChess960State() {
  let seed = 960;
  const seededRandom = () => {
    seed = Math.imul(seed, 1664525) + 1013904223;
    return (seed >>> 0) / 4294967296;
  };
  return createVariantState("chess960", {}, seededRandom);
}

function FantasyPiece({ piece }: { piece: VariantPiece }) {
  if (["p", "n", "b", "r", "q", "k"].includes(piece.kind)) {
    return <Piece type={piece.kind as "p" | "n" | "b" | "r" | "q" | "k"} color={piece.color} set="monarch" />;
  }
  const fill = piece.color === "w" ? "#f3eee2" : "#303846";
  const stroke = piece.color === "w" ? "#25221d" : "#090c11";
  const detail = piece.color === "w" ? "#6f5130" : "#bcecff";
  return (
    <svg viewBox="0 0 45 45" className="h-full w-full drop-shadow-[0_2px_2px_rgba(0,0,0,.35)]" aria-hidden>
      <path d="M10 39 H35 L32 34 H13Z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      {piece.kind === "d" ? <><path d="M14 34 Q12 24 18 17 L16 9 L23 13 Q31 9 37 15 L31 17 Q38 22 32 34Z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/><path d="M20 20 Q25 16 31 19 L27 23 L33 26 Q27 28 21 25Z" fill="none" stroke={detail} strokeWidth="1.6"/><circle cx="27" cy="17" r="1.5" fill={detail}/></> : null}
      {piece.kind === "a" ? <><path d="M15 34 Q13 27 20 23 Q15 19 22.5 9 Q30 19 25 23 Q32 27 30 34Z" fill={fill} stroke={stroke} strokeWidth="1.5"/><path d="M11 24 Q17 18 21 25 M34 24 Q28 18 24 25" fill="none" stroke={detail} strokeWidth="1.8"/><path d="M20 19 L26 13" stroke={detail} strokeWidth="1.4"/></> : null}
      {piece.kind === "c" ? <><path d="M15 34 L16 18 H29 L30 34Z" fill={fill} stroke={stroke} strokeWidth="1.5"/><path d="M13 18 V11 H18 V14 H22 V11 H27 V14 H32 V18Z" fill={fill} stroke={stroke} strokeWidth="1.5"/><path d="M20 27 Q24 21 29 25 L25 28 L29 31" fill="none" stroke={detail} strokeWidth="1.7"/></> : null}
      {piece.kind === "w" ? <><path d="M13 29 L22 8 L34 29 Q27 26 20 30Z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 32 Q23 28 34 32 L31 36 H14Z" fill={fill} stroke={stroke} strokeWidth="1.5"/><path d="M24 15 L25.5 18.5 L29 20 L25.5 21.5 L24 25 L22.5 21.5 L19 20 L22.5 18.5Z" fill={detail}/></> : null}
    </svg>
  );
}

function pieceLabel(piece: VariantPiece | null) {
  if (!piece) return "empty";
  return `${piece.color === "w" ? "White" : "Black"} ${FANTASY_PIECE_NAMES[piece.kind]}`;
}

export function VariantWorkshop() {
  const [variant, setVariant] = useState<VariantId>("chess960");
  const [crowns, setCrowns] = useState<Record<VariantColor, VariantPieceKind>>({ w: "d", b: "a" });
  const [mode, setMode] = useState<"local" | "bot">("bot");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [orientation, setOrientation] = useState<VariantColor>("w");
  const [state, setState] = useState<VariantState>(initialChess960State);
  const [past, setPast] = useState<VariantState[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const preset = VARIANT_PRESETS.find((item) => item.id === variant) ?? VARIANT_PRESETS[0];
  const legal = useMemo(() => selected == null ? [] : legalVariantMoves(state, selected), [selected, state]);
  const legalTargets = useMemo(() => new Set(legal.map((move) => move.to)), [legal]);
  const castleMoves = useMemo(() => legalVariantMoves(state).filter((move) => move.castle), [state]);
  const inCheck = !state.winner && isVariantCheck(state);
  const thinking = mode === "bot" && state.turn === "b" && !state.winner;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setState(createVariantState("chess960")));
    return () => cancelAnimationFrame(frame);
  }, []);

  const newGame = (nextVariant = variant, nextCrowns = crowns) => {
    setVariant(nextVariant);
    setState(createVariantState(nextVariant, nextVariant === "custom" ? nextCrowns : {}));
    setPast([]);
    setSelected(null);
  };

  const commitMove = (move: VariantMove) => {
    setPast((history) => [...history, state]);
    setState(playVariantMove(state, move));
    setSelected(null);
  };

  useEffect(() => {
    if (mode !== "bot" || state.turn !== "b" || state.winner) return;
    const timer = window.setTimeout(() => {
      const move = pickVariantBotMove(state, difficulty);
      if (move) {
        setPast((history) => [...history, state]);
        setState(playVariantMove(state, move));
      }
      setSelected(null);
    }, 360);
    return () => window.clearTimeout(timer);
  }, [difficulty, mode, state]);

  const chooseSquare = (index: number) => {
    if (thinking || state.winner || (mode === "bot" && state.turn === "b")) return;
    const piece = state.board[index];
    if (selected != null) {
      if (selected === index) {
        setSelected(null);
        return;
      }
      const move = legal.find((candidate) => candidate.to === index && !candidate.castle)
        ?? legal.find((candidate) => candidate.to === index);
      if (move) {
        commitMove(move);
        return;
      }
    }
    setSelected(piece?.color === state.turn ? index : null);
  };

  const undo = () => {
    if (!past.length || thinking) return;
    const steps = mode === "bot" && past.length >= 2 ? 2 : 1;
    setState(past[past.length - steps]);
    setPast((history) => history.slice(0, -steps));
    setSelected(null);
  };

  const status = state.winner === "draw"
    ? "Draw by stalemate"
    : state.winner
      ? `${state.winner === "w" ? "White" : "Black"} wins by checkmate`
      : thinking
        ? "Arcade bot is thinking…"
        : `${state.turn === "w" ? "White" : "Black"} to move${inCheck ? " · Check!" : ""}`;

  const selectedPiece = selected == null ? null : state.board[selected];
  const selectionHint = selectedPiece
    ? `${FANTASY_PIECE_NAMES[selectedPiece.kind]} on ${variantSquare(selected!)} · ${legal.length} legal ${legal.length === 1 ? "move" : "moves"}`
    : thinking
      ? "The bot is choosing a move."
      : "Select one of your pieces. Legal destinations will glow teal.";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-5 border-b border-[var(--border)] pb-5">
        <span className="chip !border-[#9b7cff]/35 !bg-[#9b7cff]/10 !text-[#c8b8ff]">♞ Variant Workshop</span>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Play chess beyond the standard board.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">Chess960 castling, fantasy armies, legal-move guidance, promotion, undo, and a built-in opponent—all in one focused board.</p></div>
          <div className="flex gap-2"><button type="button" className="btn text-xs" onClick={() => setOrientation((color) => color === "w" ? "b" : "w")}>⇅ Flip</button><button type="button" className="btn btn-primary text-xs" onClick={() => newGame()}>{variant === "chess960" ? "Shuffle position" : "New position"}</button></div>
        </div>
      </header>

      <section className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0" aria-label="Variant selection">
        {VARIANT_PRESETS.map((item) => <button key={item.id} type="button" onClick={() => newGame(item.id)} aria-pressed={variant === item.id} className={`min-w-36 rounded-xl border px-3 py-2.5 text-left transition duration-200 hover:-translate-y-0.5 sm:min-w-0 ${variant === item.id ? "border-[#9b7cff] bg-[#9b7cff]/12 shadow-[0_0_24px_rgba(155,124,255,.12)]" : "border-[var(--border)] bg-[var(--panel)] hover:border-[var(--border-strong)]"}`}><span className="flex items-center gap-2"><span className="text-lg" aria-hidden>{item.icon}</span><span className="text-sm font-black">{item.name}</span></span><span className="mt-1 hidden text-[0.68rem] leading-4 text-[var(--text-faint)] sm:block">{item.blurb}</span></button>)}
      </section>

      {variant === "custom" ? <section className="panel mb-5 grid gap-4 p-4 sm:grid-cols-2 sm:p-5">{(["w", "b"] as VariantColor[]).map((color) => <label key={color}><span className="label mb-1 block">{color === "w" ? "White" : "Black"} crown piece</span><select className="input w-full" value={crowns[color]} onChange={(event) => { const next = { ...crowns, [color]: event.target.value as VariantPieceKind }; setCrowns(next); newGame("custom", next); }}>{CUSTOM_CROWNS.map((piece) => <option key={piece.kind} value={piece.kind}>{piece.label} · {piece.detail}</option>)}</select></label>)}</section> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,700px)_minmax(19rem,1fr)] lg:items-start">
        <section>
          <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5"><div><p className="text-sm font-black">{status}</p><p className="mt-0.5 text-xs text-[var(--text-faint)]" aria-live="polite">{selectionHint}</p></div>{inCheck ? <span className="chip !border-[var(--bad)]/30 !bg-[var(--bad)]/10 !text-[var(--bad)]">Check</span> : null}</div>
          <div data-variant-board className="relative aspect-square w-full overflow-hidden rounded-2xl border-[6px] border-[#201c2d] bg-[#201c2d] shadow-[0_24px_60px_rgba(0,0,0,.28)]" role="grid" aria-label={`${preset.name} board`}>
            <div className="grid h-full w-full grid-cols-8">
              {Array.from({ length: 64 }, (_, displayIndex) => {
                const index = orientation === "w" ? displayIndex : 63 - displayIndex;
                const piece = state.board[index];
                const light = (Math.floor(displayIndex / 8) + displayIndex % 8) % 2 === 0;
                const active = selected === index;
                const target = legalTargets.has(index);
                const targetMove = legal.find((candidate) => candidate.to === index);
                const last = state.lastMove?.from === index || state.lastMove?.to === index;
                const moveLabel = targetMove?.castle
                  ? `, castle ${targetMove.castle === "king" ? "kingside" : "queenside"}`
                  : target
                    ? `, legal ${piece ? "capture" : "move"}`
                    : "";
                return <button key={index} type="button" role="gridcell" aria-selected={active} data-legal-target={target ? "true" : undefined} aria-label={`${variantSquare(index)}, ${pieceLabel(piece)}${active ? ", selected" : moveLabel}`} onClick={() => chooseSquare(index)} className="relative grid min-h-0 min-w-0 place-items-center overflow-hidden transition duration-150" style={{ background: active ? "#a98bff" : last ? "#8f7ac9" : light ? "#c7b9e8" : "#665888" }}>
                  {target ? <span className={`absolute z-0 rounded-full ${piece ? "inset-[7%] border-[4px] border-[#45e0cf]/85" : "h-[25%] w-[25%] bg-[#173f43]/65 ring-2 ring-[#6bf1e3]/45"}`} /> : null}
                  {piece ? <span className={`relative z-10 block h-[88%] w-[88%] transition duration-200 ${active ? "-translate-y-1 scale-105 drop-shadow-[0_8px_8px_rgba(0,0,0,.35)]" : "hover:scale-105"}`}><FantasyPiece piece={piece} /></span> : null}
                  {(displayIndex % 8 === 0) ? <span className="absolute left-1 top-0.5 text-[9px] font-black text-black/45">{orientation === "w" ? 8 - Math.floor(displayIndex / 8) : 1 + Math.floor(displayIndex / 8)}</span> : null}
                  {displayIndex >= 56 ? <span className="absolute bottom-0.5 right-1 text-[9px] font-black text-black/45">{orientation === "w" ? "abcdefgh"[displayIndex % 8] : "hgfedcba"[displayIndex % 8]}</span> : null}
                </button>;
              })}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" className="btn text-xs" disabled={!past.length || thinking} onClick={undo}>↶ Undo {mode === "bot" ? "round" : "move"}</button><button type="button" className="btn text-xs" onClick={() => newGame()}>↻ Restart</button>{castleMoves.map((move) => <button key={move.castle} type="button" className="btn border-[#9b7cff]/45 bg-[#9b7cff]/10 text-xs" disabled={thinking} onClick={() => commitMove(move)}>Castle {move.castle === "king" ? "kingside · O-O" : "queenside · O-O-O"}</button>)}</div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem] font-semibold text-[var(--text-faint)]"><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#45e0cf]" />Legal move</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full border-2 border-[#45e0cf]" />Capture</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[#8f7ac9]" />Last move</span></div>
        </section>

        <aside className="space-y-4">
          <section className="panel p-4"><h2 className="font-black">Match setup</h2><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className={`btn text-xs ${mode === "bot" ? "btn-primary" : ""}`} onClick={() => { setMode("bot"); newGame(); }}>vs Arcade Bot</button><button type="button" className={`btn text-xs ${mode === "local" ? "btn-primary" : ""}`} onClick={() => { setMode("local"); newGame(); }}>Pass & Play</button></div>{mode === "bot" ? <label className="mt-4 block"><span className="label mb-1 block">Bot strength</span><select className="input w-full" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value) as 1 | 2 | 3)}><option value={1}>1 · Apprentice</option><option value={2}>2 · Tactician</option><option value={3}>3 · Oracle</option></select></label> : null}<div className="mt-4 border-t border-[var(--border)] pt-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#bda8ff]">{preset.icon} {preset.name} rules</p><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{preset.rules}</p></div></section>
          <section className="panel overflow-hidden"><div className="border-b border-[var(--border)] p-4"><h2 className="font-black">Move log</h2><p className="text-xs text-[var(--text-faint)]">Fantasy notation uses D, A, C, and W.</p></div><div className="max-h-72 overflow-y-auto p-4"><div className="grid grid-cols-[2rem_1fr_1fr] gap-x-2 gap-y-1 text-sm">{Array.from({ length: Math.ceil(state.moves.length / 2) }, (_, index) => <div key={index} className="contents"><span className="text-[var(--text-faint)]">{index + 1}.</span><span className="font-semibold">{state.moves[index * 2]}</span><span className="font-semibold">{state.moves[index * 2 + 1] ?? ""}</span></div>)}</div>{!state.moves.length ? <p className="text-sm leading-5 text-[var(--text-faint)]">{selectionHint}</p> : null}</div></section>
        </aside>
      </div>
    </div>
  );
}
