"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_WEBSITE_PREFERENCES,
  useQol,
  type WebsiteBreakReminder,
  type WebsiteContentWidth,
  type WebsiteLetterSpacing,
  type WebsiteLineHeight,
  type WebsitePreferences,
} from "@/lib/qol/useQol";
import { QOL_WEBSITE_IMPROVEMENT_COUNT } from "@/lib/qol/features";

type NetworkHint = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

type BatteryHint = {
  charging: boolean;
  level: number;
  addEventListener: (type: "chargingchange" | "levelchange", listener: () => void) => void;
  removeEventListener: (type: "chargingchange" | "levelchange", listener: () => void) => void;
};

function routeLabel(pathname: string): string {
  if (pathname === "/") return "Home";
  return pathname
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part).replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()))
    .join(" · ");
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function ToggleRow({
  checked,
  detail,
  label,
  onChange,
}: {
  checked: boolean;
  detail: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-extrabold">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-[var(--text-faint)]">{detail}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0 accent-[var(--accent)]"
      />
    </label>
  );
}

function SelectRow<T extends string | number>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input mt-1 w-full" value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => <option key={String(option.value)} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function WebsiteControls() {
  const { online, resetWebsitePreferences, state, updateWebsite } = useQol();
  const [storageAvailable] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const key = "rr.website.health";
      localStorage.setItem(key, "1");
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);
  const website = state.website;

  const set = <K extends keyof WebsitePreferences>(key: K, value: WebsitePreferences[K]) => {
    updateWebsite({ [key]: value } as Pick<WebsitePreferences, K>);
  };

  const activeCount = useMemo(() => Object.entries(website).filter(([key, value]) => {
    const defaultValue = DEFAULT_WEBSITE_PREFERENCES[key as keyof WebsitePreferences];
    return value !== defaultValue || value === true;
  }).length, [website]);

  const applyPreset = (preset: "reading" | "visibility" | "performance") => {
    if (preset === "reading") {
      updateWebsite({
        breadcrumbs: true,
        contentWidth: "narrow",
        lineHeight: "relaxed",
        letterSpacing: "wide",
        underlineLinks: true,
        calmVisuals: true,
      });
    } else if (preset === "visibility") {
      updateWebsite({
        breadcrumbs: true,
        readingRuler: true,
        underlineLinks: true,
        largeTargets: true,
        solidSurfaces: true,
        lineHeight: "relaxed",
      });
    } else {
      updateWebsite({
        lowDataMode: true,
        autoDataSaver: true,
        batterySaver: true,
        calmVisuals: true,
        readingRuler: false,
        focusSpotlight: false,
      });
    }
  };

  const copyDiagnostic = async () => {
    const summary = [
      `Sam's Arcade website check`,
      `Online: ${online ? "yes" : "no"}`,
      `Storage: ${storageAvailable ? "available" : "blocked"}`,
      `Low data: ${website.lowDataMode ? "on" : "off"}`,
      `Automatic saver: ${website.autoDataSaver ? "on" : "off"}`,
      `Battery saver: ${website.batterySaver ? "on" : "off"}`,
    ].join("\n");
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/8 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]">Website upgrade suite</p>
            <h2 className="mt-1 text-2xl font-black">{QOL_WEBSITE_IMPROVEMENT_COUNT} more improvements</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">25 substantial website systems, each backed by three refinements.</p>
          </div>
          <span className="chip shrink-0 !border-[var(--good)]/30 !bg-[var(--good)]/10 !text-[var(--good)]">{activeCount} active</span>
        </div>
        <Link href="/quality-of-life" prefetch={false} className="mt-3 inline-flex text-xs font-extrabold text-[var(--accent)] hover:underline">Open the complete 200-improvement ledger →</Link>
      </div>

      <div>
        <h2 className="font-extrabold">One-tap presets</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" className="btn !px-1 !py-2 text-xs" onClick={() => applyPreset("reading")}>Reading</button>
          <button type="button" className="btn !px-1 !py-2 text-xs" onClick={() => applyPreset("visibility")}>Visibility</button>
          <button type="button" className="btn !px-1 !py-2 text-xs" onClick={() => applyPreset("performance")}>Performance</button>
        </div>
      </div>

      <div>
        <h2 className="font-extrabold">Navigation and page tools</h2>
        <div className="mt-2 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] px-3">
          <ToggleRow checked={website.navigationProgress} label="Navigation progress" detail="Show immediate feedback when an internal destination opens." onChange={(value) => set("navigationProgress", value)} />
          <ToggleRow checked={website.restoreScroll} label="Restore scroll position" detail="Remember where you were on each page during this browser session." onChange={(value) => set("restoreScroll", value)} />
          <ToggleRow checked={website.backToTop} label="Back-to-top control" detail="Reveal a compact return control on long pages." onChange={(value) => set("backToTop", value)} />
          <ToggleRow checked={website.breadcrumbs} label="Breadcrumb trail" detail="Show route ancestors inside the page toolkit." onChange={(value) => set("breadcrumbs", value)} />
          <ToggleRow checked={website.pageTools} label="Page toolkit" detail="Keep copy-link, fullscreen, print and note actions nearby." onChange={(value) => set("pageTools", value)} />
          <ToggleRow checked={website.pageNotes} label="Private page notes" detail="Autosave one local note for each route." onChange={(value) => set("pageNotes", value)} />
          <ToggleRow checked={website.routeAnnouncements} label="Page announcements" detail="Announce completed route changes to assistive technology." onChange={(value) => set("routeAnnouncements", value)} />
        </div>
      </div>

      <div>
        <h2 className="font-extrabold">Reading and accessibility</h2>
        <div className="mt-2 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] px-3">
          <ToggleRow checked={website.readingRuler} label="Reading ruler" detail="Follow the pointer with a horizontal reading guide." onChange={(value) => set("readingRuler", value)} />
          <ToggleRow checked={website.focusSpotlight} label="Focus spotlight" detail="Quiet the edges of the page around the pointer." onChange={(value) => set("focusSpotlight", value)} />
          <ToggleRow checked={website.underlineLinks} label="Underline content links" detail="Use a strong non-colour cue for destinations." onChange={(value) => set("underlineLinks", value)} />
          <ToggleRow checked={website.largeTargets} label="Large controls" detail="Increase shared controls toward touch-friendly sizing." onChange={(value) => set("largeTargets", value)} />
          <ToggleRow checked={website.solidSurfaces} label="Solid surfaces" detail="Remove translucent blur from navigation and panels." onChange={(value) => set("solidSurfaces", value)} />
          <ToggleRow checked={website.grayscale} label="Grayscale mode" detail="Temporarily remove colour without changing your theme." onChange={(value) => set("grayscale", value)} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SelectRow<WebsiteContentWidth> label="Reading width" value={website.contentWidth} onChange={(value) => set("contentWidth", value)} options={[{ value: "narrow", label: "Narrow" }, { value: "standard", label: "Standard" }, { value: "wide", label: "Wide" }]} />
          <SelectRow<WebsiteLineHeight> label="Line spacing" value={website.lineHeight} onChange={(value) => set("lineHeight", value)} options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }, { value: "relaxed", label: "Relaxed" }]} />
          <SelectRow<WebsiteLetterSpacing> label="Letter spacing" value={website.letterSpacing} onChange={(value) => set("letterSpacing", value)} options={[{ value: "normal", label: "Normal" }, { value: "wide", label: "Wide" }]} />
          <SelectRow<WebsiteBreakReminder> label="Break reminder" value={website.breakReminder} onChange={(value) => set("breakReminder", Number(value) as WebsiteBreakReminder)} options={[{ value: 0, label: "Off" }, { value: 25, label: "Every 25 minutes" }, { value: 45, label: "Every 45 minutes" }, { value: 60, label: "Every 60 minutes" }]} />
        </div>
        <div className="mt-2 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] px-3">
          <ToggleRow checked={website.calmVisuals} label="Calm visual mode" detail="Simplify gradients, shadows and decorative pulses." onChange={(value) => set("calmVisuals", value)} />
          <ToggleRow checked={website.sessionClock} label="Session clock" detail="Count only the time this browser tab is actively visible." onChange={(value) => set("sessionClock", value)} />
        </div>
      </div>

      <div>
        <h2 className="font-extrabold">Performance intelligence</h2>
        <div className="mt-2 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] px-3">
          <ToggleRow checked={website.lowDataMode} label="Low-data mode" detail="Manually reduce nonessential visual workload." onChange={(value) => set("lowDataMode", value)} />
          <ToggleRow checked={website.autoDataSaver} label="Automatic data saver" detail="React to Save-Data and slow-connection browser hints." onChange={(value) => set("autoDataSaver", value)} />
          <ToggleRow checked={website.batterySaver} label="Battery-aware rendering" detail="Reduce effects when supported devices report low charge." onChange={(value) => set("batterySaver", value)} />
        </div>
      </div>

      <div>
        <h2 className="font-extrabold">Page health and recovery</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3"><p className="text-xs font-bold text-[var(--text-faint)]">Network</p><p className={`mt-1 text-sm font-black ${online ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>{online ? "Online" : "Offline"}</p></div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3"><p className="text-xs font-bold text-[var(--text-faint)]">Local storage</p><p className={`mt-1 text-sm font-black ${storageAvailable ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>{storageAvailable ? "Available" : "Blocked"}</p></div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn" onClick={() => window.location.reload()}>Reload page</button>
          <button type="button" className="btn" onClick={copyDiagnostic}>{copied ? "Copied check" : "Copy check"}</button>
        </div>
        <button type="button" className="btn btn-danger mt-2 w-full" onClick={resetWebsitePreferences}>Reset website preferences</button>
      </div>
    </section>
  );
}

export function WebsiteEnhancementLayer() {
  const pathname = usePathname();
  const { clearPageNote, ready, setPageNote, state } = useQol();
  const website = state.website;
  const [scrollPercent, setScrollPercent] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = Number(sessionStorage.getItem("rr.website.sessionSeconds") ?? 0);
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  });
  const [breakDue, setBreakDue] = useState(false);
  const [dataSaverDetected, setDataSaverDetected] = useState(false);
  const [batteryLow, setBatteryLow] = useState(false);
  const nextBreakAt = useRef<number | null>(null);
  const sessionSecondsRef = useRef(sessionSeconds);
  const scrollFrame = useRef<number | null>(null);
  const privateSurface = pathname.startsWith("/admin");
  const lowPower = website.lowDataMode || (website.autoDataSaver && dataSaverDetected) || (website.batterySaver && batteryLow);
  const note = state.pageNotes[pathname] ?? "";

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: NetworkHint }).connection;
    const read = () => setDataSaverDetected(Boolean(connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType ?? "")));
    read();
    connection?.addEventListener?.("change", read);
    return () => connection?.removeEventListener?.("change", read);
  }, []);

  useEffect(() => {
    let active = true;
    let battery: BatteryHint | null = null;
    const read = () => {
      if (active && battery) setBatteryLow(!battery.charging && battery.level <= 0.2);
    };
    const getBattery = (navigator as Navigator & { getBattery?: () => Promise<BatteryHint> }).getBattery;
    void getBattery?.().then((result) => {
      if (!active) return;
      battery = result;
      read();
      battery.addEventListener("chargingchange", read);
      battery.addEventListener("levelchange", read);
    }).catch(() => setBatteryLow(false));
    return () => {
      active = false;
      battery?.removeEventListener("chargingchange", read);
      battery?.removeEventListener("levelchange", read);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.websiteWidth = website.contentWidth;
    root.dataset.websiteLineHeight = website.lineHeight;
    root.dataset.websiteLetterSpacing = website.letterSpacing;
    root.dataset.websiteLinks = website.underlineLinks ? "clear" : "standard";
    root.dataset.websiteTargets = website.largeTargets ? "large" : "standard";
    root.dataset.websiteSurfaces = website.solidSurfaces ? "solid" : "standard";
    root.dataset.websiteGrayscale = website.grayscale ? "true" : "false";
    root.dataset.websiteCalm = website.calmVisuals ? "true" : "false";
    root.dataset.websiteLowPower = lowPower ? "true" : "false";
    root.dataset.websiteReadingRoute = ["/quality-of-life", "/openings", "/training", "/games", "/friends", "/leaderboard", "/account"].some((route) => pathname === route || pathname.startsWith(`${route}/`)) ? "true" : "false";
  }, [lowPower, pathname, website]);

  useEffect(() => {
    const updateScroll = () => {
      if (scrollFrame.current !== null) return;
      scrollFrame.current = window.requestAnimationFrame(() => {
        const available = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        setScrollPercent(Math.min(100, Math.round((window.scrollY / available) * 100)));
        setShowTop(window.scrollY > Math.min(720, window.innerHeight * 0.8));
        if (website.restoreScroll) {
          try {
            sessionStorage.setItem(`rr.scroll:${pathname}`, String(Math.round(window.scrollY)));
          } catch {
            // Session storage is optional; scrolling must remain unaffected.
          }
        }
        scrollFrame.current = null;
      });
    };
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
      if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
    };
  }, [pathname, website.restoreScroll]);

  useEffect(() => {
    let restorationFrame: number | null = null;
    let top = 0;
    if (website.restoreScroll) {
      try {
        top = Number(sessionStorage.getItem(`rr.scroll:${pathname}`) ?? 0);
      } catch {
        top = 0;
      }
    }
    const frame = window.requestAnimationFrame(() => {
      setNavigating(false);
      setToolsOpen(false);
      setNoteOpen(false);
      if (Number.isFinite(top) && top > 0) {
        restorationFrame = window.requestAnimationFrame(() => window.scrollTo({ top, behavior: "auto" }));
      }
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (restorationFrame !== null) window.cancelAnimationFrame(restorationFrame);
    };
  }, [pathname, website.restoreScroll]);

  useEffect(() => {
    if (!website.navigationProgress) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === pathname || anchor.hash) return;
      setNavigating(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, website.navigationProgress]);

  useEffect(() => {
    if (!website.readingRuler && !website.focusSpotlight) return;
    const onPointerMove = (event: PointerEvent) => {
      document.documentElement.style.setProperty("--website-pointer-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--website-pointer-y", `${event.clientY}px`);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [website.focusSpotlight, website.readingRuler]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setSessionSeconds((current) => {
        const next = current + 1;
        sessionSecondsRef.current = next;
        try { sessionStorage.setItem("rr.website.sessionSeconds", String(next)); } catch { /* optional */ }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setBreakDue(false));
    if (!website.breakReminder) {
      nextBreakAt.current = null;
    } else {
      nextBreakAt.current = sessionSecondsRef.current + website.breakReminder * 60;
    }
    return () => window.cancelAnimationFrame(frame);
  }, [website.breakReminder]);

  useEffect(() => {
    if (!website.breakReminder || !nextBreakAt.current || sessionSeconds < nextBreakAt.current) return;
    setBreakDue(true);
    nextBreakAt.current = sessionSeconds + website.breakReminder * 60;
  }, [sessionSeconds, website.breakReminder]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (typing || !event.altKey) return;
      if (event.key === "ArrowUp" && website.backToTop) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (event.key.toLowerCase() === "n" && website.pageNotes) {
        event.preventDefault();
        setToolsOpen(true);
        setNoteOpen(true);
      } else if (event.key.toLowerCase() === "p" && website.pageTools) {
        event.preventDefault();
        setToolsOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [website.backToTop, website.pageNotes, website.pageTools]);

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }, []);

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return [{ href: "/", label: "Home" }, ...segments.map((segment, index) => ({
      href: `/${segments.slice(0, index + 1).join("/")}`,
      label: decodeURIComponent(segment).replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    }))];
  }, [pathname]);

  if (!ready || privateSurface) return null;

  return (
    <>
      {website.navigationProgress && navigating && <div className="website-navigation-progress" role="progressbar" aria-label="Opening page" />}
      {website.navigationProgress && <div className="website-scroll-progress" style={{ width: `${scrollPercent}%` }} aria-hidden="true" />}
      {website.readingRuler && <div className="website-reading-ruler" aria-hidden="true" />}
      {website.focusSpotlight && <div className="website-focus-spotlight" aria-hidden="true" />}
      {website.routeAnnouncements && <p className="sr-only" aria-live="polite">Opened {routeLabel(pathname)}</p>}

      <div className="website-page-dock fixed bottom-4 right-4 z-[92] flex flex-col items-end gap-2 md:right-5">
        <div className="flex flex-wrap justify-end gap-2">
          {lowPower && <span className="chip border-[var(--good)]/30 bg-[var(--panel)] shadow-lg">⚡ Saver active</span>}
          {website.sessionClock && (
            <button type="button" className="chip bg-[var(--panel)] font-mono shadow-lg" title="Reset session clock" onClick={() => { setSessionSeconds(0); sessionSecondsRef.current = 0; sessionStorage.setItem("rr.website.sessionSeconds", "0"); }}>◷ {formatDuration(sessionSeconds)}</button>
          )}
          {website.backToTop && showTop && <button type="button" className="btn bg-[var(--panel)] shadow-lg" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">↑ Top</button>}
          {website.pageTools && <button type="button" className={`btn shadow-lg ${toolsOpen ? "btn-primary" : "bg-[var(--panel)]"}`} onClick={() => setToolsOpen((current) => !current)} aria-expanded={toolsOpen}>Page tools</button>}
        </div>

        {website.pageTools && toolsOpen && (
          <section className="w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-[var(--border-strong)] bg-[var(--panel)] p-4 shadow-2xl" aria-label="Page tools">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">Current page</p><h2 className="truncate text-lg font-black">{routeLabel(pathname)}</h2></div>
              <button type="button" className="btn btn-ghost !p-2" onClick={() => setToolsOpen(false)} aria-label="Close page tools">×</button>
            </div>
            {website.breadcrumbs && (
              <nav aria-label="Breadcrumb" className="mt-3 flex flex-wrap items-center gap-1 text-xs">
                {breadcrumbs.map((crumb, index) => <span key={crumb.href} className="flex items-center gap-1">{index > 0 && <span className="text-[var(--text-faint)]">/</span>}<Link href={crumb.href} className="font-bold text-[var(--accent)] hover:underline">{crumb.label}</Link></span>)}
              </nav>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button type="button" className="btn !px-1 !py-2 text-xs" onClick={copyLink}>{copied ? "Copied" : "Copy link"}</button>
              <button type="button" className="btn !px-1 !py-2 text-xs" onClick={toggleFullscreen}>Fullscreen</button>
              <button type="button" className="btn !px-1 !py-2 text-xs" onClick={() => window.print()}>Print</button>
            </div>
            {website.pageNotes && (
              <div className="mt-3 border-t border-[var(--border)] pt-3">
                <button type="button" className="flex w-full items-center justify-between text-left" aria-expanded={noteOpen} onClick={() => setNoteOpen((current) => !current)}><span className="text-sm font-extrabold">Private page note</span><span className="text-[var(--text-faint)]">{noteOpen ? "−" : "+"}</span></button>
                {noteOpen && <div className="mt-2"><textarea className="input min-h-28 w-full resize-y py-2" maxLength={2000} value={note} onChange={(event) => setPageNote(pathname, event.target.value)} placeholder="Ideas, reminders, training notes…" /><div className="mt-1 flex items-center justify-between text-[0.68rem] text-[var(--text-faint)]"><span>Saved on this device</span><span>{note.length}/2000</span></div>{note && <button type="button" className="mt-2 text-xs font-bold text-[var(--danger)]" onClick={() => clearPageNote(pathname)}>Clear note</button>}</div>}
              </div>
            )}
          </section>
        )}
      </div>

      {breakDue && (
        <aside role="status" className="website-break-reminder fixed bottom-4 left-4 right-4 z-[104] rounded-2xl border border-[var(--accent)]/40 bg-[var(--panel)] p-4 shadow-2xl md:left-[248px] md:right-auto md:max-w-md">
          <p className="font-extrabold">Good moment for a short break</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Look away from the screen, stretch, and return when you are ready. Nothing has been paused or changed.</p>
          <button type="button" className="btn btn-primary mt-3 !py-2 text-xs" onClick={() => setBreakDue(false)}>I&apos;m refreshed</button>
        </aside>
      )}
    </>
  );
}
