"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type MatchMode = "local" | "bot" | "exhibition";
type Difficulty = 1 | 2 | 3;
type BoardThemeId = "violet" | "maple" | "midnight" | "emerald";
type PlaybackSpeed = 260 | 520 | 900;

const BOARD_THEMES: Record<BoardThemeId, { label: string; light: string; dark: string; active: string; last: string; frame: string }> = {
  violet: { label: "Violet", light: "#c7b9e8", dark: "#665888", active: "#a98bff", last: "#8f7ac9", frame: "#201c2d" },
  maple: { label: "Maple", light: "#e9cfad", dark: "#9a6647", active: "#ffd166", last: "#c98d55", frame: "#38251d" },
  midnight: { label: "Midnight", light: "#8aa0b6", dark: "#34485d", active: "#66d9ff", last: "#557d9b", frame: "#101923" },
  emerald: { label: "Emerald", light: "#b9d5c5", dark: "#477a66", active: "#77e0b2", last: "#639f83", frame: "#17352c" },
};

const MATERIAL_VALUES: Record<VariantPieceKind, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
  a: 7,
  c: 8,
  w: 6,
  d: 12,
};

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
  const [mode, setMode] = useState<MatchMode>("bot");
  const [difficulty, setDifficulty] = useState<Difficulty>(2);
  const [whiteDifficulty, setWhiteDifficulty] = useState<Difficulty>(2);
  const [exhibitionRunning, setExhibitionRunning] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(520);
  const [boardTheme, setBoardTheme] = useState<BoardThemeId>("violet");
  const [focusBoard, setFocusBoard] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<VariantColor>("w");
  const [state, setState] = useState<VariantState>(initialChess960State);
  const [past, setPast] = useState<VariantState[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const copyTimer = useRef<number | null>(null);

  const preset = VARIANT_PRESETS.find((item) => item.id === variant) ?? VARIANT_PRESETS[0];
  const legal = useMemo(() => selected == null ? [] : legalVariantMoves(state, selected), [selected, state]);
  const legalTargets = useMemo(() => new Set(legal.map((move) => move.to)), [legal]);
  const castleMoves = useMemo(() => legalVariantMoves(state).filter((move) => move.castle), [state]);
  const inCheck = !state.winner && isVariantCheck(state);
  const botTurn = !state.winner && ((mode === "bot" && state.turn === "b") || (mode === "exhibition" && exhibitionRunning));
  const thinking = Boolean(botTurn);
  const activeBotDifficulty = state.turn === "w" ? whiteDifficulty : difficulty;
  const theme = BOARD_THEMES[boardTheme];
  const materialBalance = useMemo(() => state.board.reduce((total, piece) => {
    if (!piece) return total;
    return total + MATERIAL_VALUES[piece.kind] * (piece.color === "w" ? 1 : -1);
  }, 0), [state.board]);
  const materialLabel = materialBalance === 0 ? "Material even" : `${materialBalance > 0 ? "White" : "Black"} +${Math.abs(materialBalance)}`;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setState(createVariantState("chess960")));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => () => {
    if (copyTimer.current != null) window.clearTimeout(copyTimer.current);
  }, []);

  const newGame = (nextVariant = variant, nextCrowns = crowns) => {
    setVariant(nextVariant);
    setState(createVariantState(nextVariant, nextVariant === "custom" ? nextCrowns : {}));
    setPast([]);
    setSelected(null);
    setCopied(false);
    setManualCopyText(null);
    if (mode === "exhibition") setExhibitionRunning(true);
  };

  const commitMove = (move: VariantMove) => {
    setPast((history) => [...history, state]);
    setState(playVariantMove(state, move));
    setSelected(null);
  };

  useEffect(() => {
    if (!botTurn) return;
    const timer = window.setTimeout(() => {
      const move = pickVariantBotMove(state, activeBotDifficulty);
      if (move) {
        setPast((history) => [...history, state]);
        setState(playVariantMove(state, move));
      }
      setSelected(null);
    }, mode === "exhibition" ? playbackSpeed : 360);
    return () => window.clearTimeout(timer);
  }, [activeBotDifficulty, botTurn, mode, playbackSpeed, state]);

  const chooseSquare = (index: number) => {
    if (thinking || state.winner || mode === "exhibition" || (mode === "bot" && state.turn === "b")) return;
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
    if (!past.length || (thinking && mode !== "exhibition")) return;
    if (mode === "exhibition") setExhibitionRunning(false);
    const steps = mode === "bot" && past.length >= 2 ? 2 : 1;
    setState(past[past.length - steps]);
    setPast((history) => history.slice(0, -steps));
    setSelected(null);
  };

  const status = state.winner === "draw"
    ? "Draw by stalemate"
    : state.winner
      ? `${state.winner === "w" ? "White" : "Black"} wins by checkmate`
      : mode === "exhibition" && !exhibitionRunning
        ? `Exhibition paused · ${state.turn === "w" ? "White" : "Black"} to move`
        : thinking
        ? mode === "exhibition" ? `${state.turn === "w" ? "White" : "Black"} bot is thinking…` : "Arcade bot is thinking…"
        : `${state.turn === "w" ? "White" : "Black"} to move${inCheck ? " · Check!" : ""}`;

  const selectedPiece = selected == null ? null : state.board[selected];
  const selectionHint = selectedPiece
    ? `${FANTASY_PIECE_NAMES[selectedPiece.kind]} on ${variantSquare(selected!)} · ${legal.length} legal ${legal.length === 1 ? "move" : "moves"}`
    : thinking
      ? mode === "exhibition" ? "Two Arcade minds are playing this position live." : "The bot is choosing a move."
      : "Select one of your pieces. Legal destinations will glow teal.";

  const copyMatchSummary = async () => {
    const result = state.winner === "draw"
      ? "Draw"
      : state.winner
        ? `${state.winner === "w" ? "White" : "Black"} won`
        : `${state.turn === "w" ? "White" : "Black"} to move`;
    const openingCode = state.board.slice(56, 64).map((piece) => piece ? piece.kind.toUpperCase() : "-").join("");
    const summary = [
      `Sam's Arcade · ${preset.name}`,
      `${result} after ${state.moves.length} half-moves · ${materialLabel}`,
      variant === "chess960" ? `Starting rank: ${openingCode}` : null,
      state.moves.length ? `Moves: ${state.moves.join(" ")}` : "No moves played yet.",
    ].filter(Boolean).join("\n");
    let didCopy = false;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(summary);
      didCopy = true;
    } catch {
      const field = document.createElement("textarea");
      field.value = summary;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      didCopy = document.execCommand("copy");
      field.remove();
    }
    if (didCopy) {
      setCopied(true);
      setManualCopyText(null);
      if (copyTimer.current != null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } else {
      setCopied(false);
      setManualCopyText(summary);
    }
  };

  return (
    <div data-variant-workshop className="mx-auto w-full max-w-[1180px] px-3 py-4 sm:px-5 sm:py-5">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#9b7cff]/30 bg-[#9b7cff]/10 text-lg text-[#c8b8ff]" aria-hidden>♞</span>
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Variant Workshop</h1>
            <p className="mt-0.5 hidden text-xs text-[var(--text-faint)] sm:block">Chess960 and fantasy chess, with every rule handled on the board.</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2"><button type="button" className={`btn text-xs ${focusBoard ? "border-[#9b7cff]/60 bg-[#9b7cff]/10" : ""}`} aria-pressed={focusBoard} onClick={() => setFocusBoard((focused) => !focused)}>{focusBoard ? "⊙ Exit focus" : "◎ Focus"}</button><button type="button" className="btn text-xs" onClick={() => setOrientation((color) => color === "w" ? "b" : "w")}>⇅ Flip</button><button type="button" className="btn btn-primary text-xs" onClick={() => newGame()}>{variant === "chess960" ? "Shuffle" : "New game"}</button></div>
      </header>

      <section className="-mx-3 mb-3 flex gap-1.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0" aria-label="Variant selection">
        {VARIANT_PRESETS.map((item) => <button key={item.id} type="button" onClick={() => newGame(item.id)} aria-pressed={variant === item.id} className={`min-w-32 rounded-lg border px-3 py-2 text-left transition duration-150 sm:min-w-0 ${variant === item.id ? "border-[#9b7cff] bg-[#9b7cff]/12 text-white" : "border-[var(--border)] bg-[var(--panel)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-white"}`}><span className="flex items-center gap-2"><span className="text-base" aria-hidden>{item.icon}</span><span className="truncate text-xs font-black sm:text-sm">{item.name}</span></span></button>)}
      </section>

      {variant === "custom" ? <section className="panel mb-3 grid gap-3 p-3 sm:grid-cols-2">{(["w", "b"] as VariantColor[]).map((color) => <label key={color}><span className="label mb-1 block">{color === "w" ? "White" : "Black"} crown piece</span><select className="input w-full" value={crowns[color]} onChange={(event) => { const next = { ...crowns, [color]: event.target.value as VariantPieceKind }; setCrowns(next); newGame("custom", next); }}>{CUSTOM_CROWNS.map((piece) => <option key={piece.kind} value={piece.kind}>{piece.label} · {piece.detail}</option>)}</select></label>)}</section> : null}

      <div className={`grid gap-4 lg:items-start ${focusBoard ? "" : "lg:grid-cols-[minmax(0,650px)_minmax(18rem,1fr)]"}`}>
        <section className={focusBoard ? "mx-auto w-full max-w-[760px]" : ""}>
          <div className="mb-2 flex min-h-12 items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2"><div><p className="text-sm font-black">{status}</p><p className="mt-0.5 text-xs text-[var(--text-faint)]" aria-live="polite">{selectionHint}</p></div>{inCheck ? <span className="chip !border-[var(--bad)]/30 !bg-[var(--bad)]/10 !text-[var(--bad)]">Check</span> : <span className="hidden shrink-0 text-right text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text-faint)] sm:block">{mode === "exhibition" ? "Bot vs Bot" : mode === "bot" ? `Bot ${difficulty}` : "Local"}<br /><span className="normal-case tracking-normal">{materialLabel}</span></span>}</div>
          <div data-variant-board className="relative aspect-square w-full overflow-hidden rounded-xl border-4 shadow-[0_20px_50px_rgba(0,0,0,.26)] transition-[border-color,background-color] duration-300" style={{ borderColor: theme.frame, background: theme.frame }} role="grid" aria-label={`${preset.name} board`}>
            <div className="grid h-full w-full grid-cols-8 grid-rows-[repeat(8,minmax(0,1fr))]">
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
                return <button key={index} type="button" role="gridcell" aria-selected={active} data-legal-target={target ? "true" : undefined} aria-label={`${variantSquare(index)}, ${pieceLabel(piece)}${active ? ", selected" : moveLabel}`} onClick={() => chooseSquare(index)} className="relative grid h-full min-h-0 w-full min-w-0 place-items-center overflow-hidden p-0 leading-none transition-[background-color,transform] duration-300" style={{ background: active ? theme.active : last ? theme.last : light ? theme.light : theme.dark }}>
                  {target ? <span className={`absolute z-0 rounded-full ${piece ? "inset-[7%] border-[4px] border-[#45e0cf]/85" : "h-[25%] w-[25%] bg-[#173f43]/65 ring-2 ring-[#6bf1e3]/45"}`} /> : null}
                  {piece ? <span className={`relative z-10 block h-[88%] w-[88%] transition duration-200 ${active ? "-translate-y-1 scale-105 drop-shadow-[0_8px_8px_rgba(0,0,0,.35)]" : "hover:scale-105"}`}><FantasyPiece piece={piece} /></span> : null}
                  {(displayIndex % 8 === 0) ? <span className="absolute left-1 top-0.5 text-[9px] font-black text-black/45">{orientation === "w" ? 8 - Math.floor(displayIndex / 8) : 1 + Math.floor(displayIndex / 8)}</span> : null}
                  {displayIndex >= 56 ? <span className="absolute bottom-0.5 right-1 text-[9px] font-black text-black/45">{orientation === "w" ? "abcdefgh"[displayIndex % 8] : "hgfedcba"[displayIndex % 8]}</span> : null}
                </button>;
              })}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2"><button type="button" className="btn text-xs" disabled={!past.length || (thinking && mode !== "exhibition")} onClick={undo}>↶ Undo {mode === "bot" ? "round" : "move"}</button><button type="button" className="btn text-xs" onClick={() => newGame()}>↻ Restart</button>{mode === "exhibition" && !state.winner ? <button type="button" className={`btn text-xs ${exhibitionRunning ? "" : "btn-primary"}`} onClick={() => setExhibitionRunning((running) => !running)}>{exhibitionRunning ? "Ⅱ Pause bots" : "▶ Resume bots"}</button> : null}<button type="button" className="btn text-xs" onClick={copyMatchSummary}>{copied ? "✓ Copied" : "⧉ Copy match"}</button>{castleMoves.map((move) => <button key={move.castle} type="button" className="btn border-[#9b7cff]/45 bg-[#9b7cff]/10 text-xs" disabled={thinking} onClick={() => commitMove(move)}>Castle {move.castle === "king" ? "kingside · O-O" : "queenside · O-O-O"}</button>)}<div className="ml-auto hidden gap-3 text-[0.65rem] font-semibold text-[var(--text-faint)] sm:flex"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#45e0cf]" />Move</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: theme.last }} />Last</span></div></div>
          {manualCopyText ? <div className="mt-2 rounded-lg border border-[#9b7cff]/35 bg-[#9b7cff]/8 p-3"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-bold text-[#d5caff]">Clipboard access is blocked here. Select and copy this recap:</p><button type="button" className="text-lg leading-none text-[var(--text-faint)] hover:text-white" aria-label="Close match summary" onClick={() => setManualCopyText(null)}>×</button></div><textarea className="input min-h-28 w-full resize-y font-mono text-xs leading-5" readOnly value={manualCopyText} aria-label="Match summary ready to copy" onFocus={(event) => event.currentTarget.select()} /></div> : null}
        </section>

        {!focusBoard ? <aside className="space-y-3">
          <section className="panel p-3.5"><div className="flex items-center justify-between gap-2"><h2 className="font-black">Match</h2><span className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text-faint)]">{preset.icon} {preset.name}</span></div><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" className={`btn px-2 text-xs ${mode === "bot" ? "btn-primary" : ""}`} onClick={() => { setMode("bot"); newGame(); }}>vs Bot</button><button type="button" className={`btn px-2 text-xs ${mode === "local" ? "btn-primary" : ""}`} onClick={() => { setMode("local"); newGame(); }}>Local</button><button type="button" className={`btn px-2 text-xs ${mode === "exhibition" ? "btn-primary" : ""}`} onClick={() => { setMode("exhibition"); setExhibitionRunning(true); newGame(); }}>Bot vs Bot</button></div>{mode === "bot" ? <label className="mt-3 block"><span className="label mb-1 block">Bot strength</span><select className="input w-full" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value) as Difficulty)}><option value={1}>1 · Apprentice</option><option value={2}>2 · Tactician</option><option value={3}>3 · Oracle</option></select></label> : null}{mode === "exhibition" ? <div className="mt-3 grid grid-cols-2 gap-2"><label><span className="label mb-1 block">White bot</span><select className="input w-full" value={whiteDifficulty} onChange={(event) => setWhiteDifficulty(Number(event.target.value) as Difficulty)}><option value={1}>Apprentice</option><option value={2}>Tactician</option><option value={3}>Oracle</option></select></label><label><span className="label mb-1 block">Black bot</span><select className="input w-full" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value) as Difficulty)}><option value={1}>Apprentice</option><option value={2}>Tactician</option><option value={3}>Oracle</option></select></label><label className="col-span-2"><span className="label mb-1 block">Match speed</span><select className="input w-full" value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value) as PlaybackSpeed)}><option value={900}>Relaxed</option><option value={520}>Live</option><option value={260}>Blitz</option></select></label><button type="button" className={`btn col-span-2 text-xs ${exhibitionRunning ? "" : "btn-primary"}`} onClick={() => setExhibitionRunning((running) => !running)}>{exhibitionRunning ? "Ⅱ Pause exhibition" : "▶ Resume exhibition"}</button></div> : null}<div className="mt-3 grid grid-cols-2 gap-2"><label><span className="label mb-1 block">Board theme</span><select className="input w-full" value={boardTheme} onChange={(event) => setBoardTheme(event.target.value as BoardThemeId)}>{Object.entries(BOARD_THEMES).map(([id, colors]) => <option key={id} value={id}>{colors.label}</option>)}</select></label><div><span className="label mb-1 block">Material</span><div className="input flex min-h-10 items-center font-bold">{materialLabel}</div></div></div><details className="mt-3 border-t border-[var(--border)] pt-3"><summary className="cursor-pointer text-xs font-black text-[#bda8ff]">How {preset.name} works</summary><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{preset.rules}</p></details></section>
          <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--border)] px-3.5 py-3"><h2 className="font-black">Moves</h2><span className="text-[0.65rem] text-[var(--text-faint)]">D · A · C · W</span></div><div className="max-h-56 overflow-y-auto p-3.5"><div className="grid grid-cols-[2rem_1fr_1fr] gap-x-2 gap-y-1 text-sm">{Array.from({ length: Math.ceil(state.moves.length / 2) }, (_, index) => <div key={index} className="contents"><span className="text-[var(--text-faint)]">{index + 1}.</span><span className="font-semibold">{state.moves[index * 2]}</span><span className="font-semibold">{state.moves[index * 2 + 1] ?? ""}</span></div>)}</div>{!state.moves.length ? <p className="text-sm leading-5 text-[var(--text-faint)]">Your moves will appear here.</p> : null}</div></section>
        </aside> : null}
      </div>
    </div>
  );
}
