export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-32">
      <div className="dot-blink flex gap-1.5 text-3xl leading-none text-[var(--accent)]" aria-label="Loading">
        <span>•</span>
        <span>•</span>
        <span>•</span>
      </div>
    </div>
  );
}
