/** Generic pulsing placeholder block for loading states — pass className to size/shape it. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[var(--bg-elev-2)] ${className}`} aria-hidden="true" />;
}

/** A row of skeleton blocks shaped like a typical list item (avatar + two lines), for lists still loading. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
