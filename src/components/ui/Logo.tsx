export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="grid place-items-center rounded-lg"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(150deg, var(--accent-strong), var(--accent-dim))",
          boxShadow: "0 2px 10px rgba(233,162,59,0.35)",
        }}
      >
        <svg viewBox="0 0 45 45" width={size * 0.7} height={size * 0.7} aria-hidden>
          <g
            fill="var(--accent-contrast)"
            stroke="var(--accent-contrast)"
            strokeWidth={1}
            strokeLinejoin="round"
          >
            <rect x="10.5" y="35" width="24" height="5.2" rx="2.4" />
            <path d="M13 35 L14.4 31 L30.6 31 L32 35 Z" />
            <path d="M15.6 31 L16.6 19.5 L28.4 19.5 L29.4 31 Z" />
            <path d="M13 19.5 L13 12.8 L17.2 12.8 L17.2 15.6 L20.4 15.6 L20.4 12.8 L24.6 12.8 L24.6 15.6 L27.8 15.6 L27.8 12.8 L32 12.8 L32 19.5 Z" />
          </g>
        </svg>
      </span>
    </span>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo size={size} />
      <span className="hidden whitespace-nowrap text-[1.05rem] font-extrabold tracking-tight sm:inline">
        Rook<span className="text-[var(--accent)]"> &amp; </span>Roll
      </span>
    </span>
  );
}
