"use client";

import { IconFirst, IconPrev, IconNext, IconLast, IconFlip, IconUndo, IconVolume } from "@/components/ui/icons";

export function GameControls({
  onFirst,
  onPrev,
  onNext,
  onLast,
  onFlip,
  onUndo,
  onAnnouncePosition,
  canBack,
  canForward,
  canUndo,
}: {
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onFlip: () => void;
  onUndo?: () => void;
  /** Reads the current position aloud (screen-reader accessibility); optional so callers without it can omit the button. */
  onAnnouncePosition?: () => void;
  canBack: boolean;
  canForward: boolean;
  canUndo?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-1">
      <div className="flex items-center gap-1">
        <button className="btn btn-ghost" onClick={onFlip} title="Flip board" aria-label="Flip board">
          <IconFlip />
        </button>
        {onAnnouncePosition && (
          <button
            className="btn btn-ghost"
            onClick={onAnnouncePosition}
            title="Announce position (screen reader)"
            aria-label="Announce position"
          >
            <IconVolume />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button className="btn btn-ghost" onClick={onFirst} disabled={!canBack} title="First move">
          <IconFirst />
        </button>
        <button className="btn btn-ghost" onClick={onPrev} disabled={!canBack} title="Previous move">
          <IconPrev />
        </button>
        <button className="btn btn-ghost" onClick={onNext} disabled={!canForward} title="Next move">
          <IconNext />
        </button>
        <button className="btn btn-ghost" onClick={onLast} disabled={!canForward} title="Latest move">
          <IconLast />
        </button>
      </div>
      {onUndo ? (
        <button className="btn btn-ghost" onClick={onUndo} disabled={!canUndo} title="Take back move">
          <IconUndo />
        </button>
      ) : (
        <span className="w-9" />
      )}
    </div>
  );
}
