"use client";

import { IconDownload } from "@/components/ui/icons";

/** Draws a simple, shareable "I scored X on [game]" result card — same
 * download-a-canvas-PNG pattern as the chess share card, generalized for any
 * arcade/racing/puzzle game. */
function renderScoreCard(gameName: string, emoji: string, score: number, isBest: boolean): HTMLCanvasElement {
  const w = 480;
  const h = 300;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#1c2029";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e9a23b";
  ctx.fillRect(0, 0, w, 6);

  ctx.textAlign = "center";
  ctx.font = "64px sans-serif";
  ctx.fillText(emoji, w / 2, 100);

  ctx.fillStyle = "#f6f1e6";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(gameName, w / 2, 140);

  ctx.font = "bold 48px sans-serif";
  ctx.fillStyle = "#e9a23b";
  ctx.fillText(score.toLocaleString(), w / 2, 205);

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#9aa3b5";
  ctx.fillText(isBest ? "New personal best!" : "Score", w / 2, 230);

  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#5a6273";
  ctx.fillText("Rook & Roll", w / 2, 270);

  return canvas;
}

export function ShareScoreButton({
  gameName,
  emoji,
  score,
  isBest = false,
  className,
}: {
  gameName: string;
  emoji: string;
  score: number;
  isBest?: boolean;
  className?: string;
}) {
  const download = () => {
    const canvas = renderScoreCard(gameName, emoji, score, isBest);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rook-and-roll-${gameName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <button className={`btn !text-xs ${className ?? ""}`} onClick={download}>
      <IconDownload width={14} height={14} /> Share score
    </button>
  );
}
