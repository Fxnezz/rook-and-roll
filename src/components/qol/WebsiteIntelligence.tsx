"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { formatRelativeTime, useQol } from "@/lib/qol/useQol";

type GuideView = "outline" | "actions" | "health";

interface PageSection {
  id: string;
  label: string;
  level: 2 | 3;
}

interface PageMetrics {
  title: string;
  words: number;
  minutes: number;
  headings: number;
  links: number;
  controls: number;
  forms: number;
  images: number;
  imagesMissingAlt: number;
}

const EMPTY_METRICS: PageMetrics = {
  title: "Current page",
  words: 0,
  minutes: 1,
  headings: 0,
  links: 0,
  controls: 0,
  forms: 0,
  images: 0,
  imagesMissingAlt: 0,
};

const PRIVATE_DRAFT_ROUTES = ["/admin", "/mod", "/login", "/signup", "/account"];

function slugifyHeading(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "section";
}

function eligibleDraftField(element: Element): element is HTMLInputElement | HTMLTextAreaElement {
  if (element instanceof HTMLTextAreaElement) return !element.disabled && !element.readOnly;
  if (!(element instanceof HTMLInputElement)) return false;
  return !element.disabled && !element.readOnly && (element.type === "text" || element.type === "url");
}

function draftKey(pathname: string, element: HTMLInputElement | HTMLTextAreaElement): string | null {
  const form = element.closest("form");
  if (!form || form.matches("[data-no-draft], [action*='auth']") || element.matches("[data-no-draft]")) return null;
  const fields = [...form.querySelectorAll("input, textarea")];
  const formIndex = [...document.forms].indexOf(form);
  const fieldIndex = fields.indexOf(element);
  const identity = element.id || element.name || `field-${fieldIndex}`;
  return `rr.draft:${pathname}:${formIndex}:${identity}`;
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function MetricTile({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "good" | "warn" }) {
  const color = tone === "good" ? "text-[var(--good)]" : tone === "warn" ? "text-[var(--danger)]" : "text-[var(--accent)]";
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
      <p className={`font-mono text-xl font-black ${color}`}>{value}</p>
      <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text-faint)]">{label}</p>
    </div>
  );
}

export function WebsiteIntelligenceLayer() {
  const pathname = usePathname();
  const router = useRouter();
  const { online, ready, state } = useQol();
  const website = state.website;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<GuideView>("outline");
  const [outline, setOutline] = useState<PageSection[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [metrics, setMetrics] = useState<PageMetrics>(EMPTY_METRICS);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("rr.website.focusMode") === "true";
  });
  const [lastChecked, setLastChecked] = useState(() => Date.now());
  const copyTimer = useRef<number | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const privateSurface = pathname.startsWith("/admin") || pathname.startsWith("/mod");

  const showCopied = useCallback((key: string) => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    setCopied(key);
    copyTimer.current = window.setTimeout(() => setCopied(null), 1700);
  }, []);

  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setOpen(false);
      setQuery("");
      setActiveSection(null);
      setLastChecked(Date.now());
      if (website.restoreMainFocus) {
        document.getElementById("main-content")?.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, website.restoreMainFocus]);

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    let scanFrame: number | null = null;
    const generated: HTMLElement[] = [];

    const scan = () => {
      scanFrame = null;
      const used = new Set<string>();
      const nextOutline = [...main.querySelectorAll<HTMLElement>("h2, h3")]
        .filter((heading) => heading.offsetParent !== null && Boolean(heading.textContent?.trim()))
        .map((heading) => {
          let id = heading.id;
          if (!id) {
            const base = slugifyHeading(heading.textContent?.trim() ?? "section");
            id = base;
            let suffix = 2;
            while (used.has(id) || document.getElementById(id)) id = `${base}-${suffix++}`;
            heading.id = id;
            heading.dataset.pageGuideId = "true";
            generated.push(heading);
          }
          used.add(id);
          return { id, label: heading.textContent?.trim() ?? "Section", level: Number(heading.tagName.slice(1)) as 2 | 3 };
        });
      const text = main.innerText.replace(/\s+/g, " ").trim();
      const words = text ? text.split(" ").length : 0;
      const images = [...main.querySelectorAll("img")];
      const h1 = main.querySelector("h1")?.textContent?.trim();
      setOutline(nextOutline);
      setMetrics({
        title: h1 || document.title.split(" · ")[0] || "Current page",
        words,
        minutes: Math.max(1, Math.ceil(words / 220)),
        headings: main.querySelectorAll("h1, h2, h3, h4, h5, h6").length,
        links: main.querySelectorAll("a[href]").length,
        controls: main.querySelectorAll("button, input, select, textarea, [role='button']").length,
        forms: main.querySelectorAll("form").length,
        images: images.length,
        imagesMissingAlt: images.filter((image) => !image.hasAttribute("alt")).length,
      });
    };

    const queueScan = () => {
      if (scanFrame === null) scanFrame = window.requestAnimationFrame(scan);
    };
    queueScan();
    const observer = new MutationObserver(queueScan);
    observer.observe(main, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (scanFrame !== null) window.cancelAnimationFrame(scanFrame);
      generated.forEach((heading) => {
        if (heading.dataset.pageGuideId === "true") {
          heading.removeAttribute("id");
          delete heading.dataset.pageGuideId;
        }
      });
    };
  }, [pathname]);

  useEffect(() => {
    const update = () => {
      if (scrollFrame.current !== null) return;
      scrollFrame.current = window.requestAnimationFrame(() => {
        const available = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        setScrollPercent(Math.min(100, Math.round((window.scrollY / available) * 100)));
        const candidates = outline
          .map((section) => ({ id: section.id, top: document.getElementById(section.id)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY }))
          .filter((section) => Number.isFinite(section.top));
        const current = candidates.filter((section) => section.top <= Math.min(180, window.innerHeight * 0.25)).at(-1) ?? candidates[0];
        setActiveSection(current?.id ?? null);
        scrollFrame.current = null;
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
    };
  }, [outline]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.websiteTextScale = String(website.textScale);
    root.dataset.websiteContrast = website.contrastBoost ? "boost" : "standard";
    root.dataset.websiteReadableFont = website.readableFont ? "true" : "false";
    root.dataset.websiteLargeCursor = website.largeCursor ? "true" : "false";
    root.dataset.websiteDimImages = website.dimDecorativeImages ? "true" : "false";
    root.dataset.websiteExternalLinks = website.externalLinkClarity ? "clear" : "standard";
    root.dataset.websiteTouchFeedback = website.touchFeedback ? "true" : "false";
    root.dataset.websiteSafeArea = website.safeAreaLayout ? "true" : "false";
    root.dataset.websiteCleanPrint = website.cleanPrint ? "true" : "false";
    root.dataset.websiteFocusMode = focusMode ? "true" : "false";
    try { sessionStorage.setItem("rr.website.focusMode", String(focusMode)); } catch { /* optional */ }
  }, [focusMode, website.cleanPrint, website.contrastBoost, website.dimDecorativeImages, website.externalLinkClarity, website.largeCursor, website.readableFont, website.safeAreaLayout, website.textScale, website.touchFeedback]);

  useEffect(() => {
    if (!website.idlePowerPause) return;
    const root = document.documentElement;
    const update = () => { root.dataset.websiteIdle = document.hidden ? "true" : "false"; };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      delete root.dataset.websiteIdle;
    };
  }, [website.idlePowerPause]);

  useEffect(() => {
    if (!website.externalLinkClarity && !website.externalLinksNewTab) return;
    const touched = new Set<HTMLAnchorElement>();
    const apply = () => {
      document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
        const destination = new URL(anchor.href, window.location.href);
        if (destination.origin === window.location.origin || !destination.protocol.startsWith("http")) return;
        touched.add(anchor);
        anchor.dataset.externalLink = "true";
        if (!anchor.title) {
          anchor.title = `Opens ${destination.hostname}`;
          anchor.dataset.externalTitle = "true";
        }
        if (website.externalLinksNewTab) {
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
          anchor.dataset.externalNewTab = "true";
        }
      });
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      touched.forEach((anchor) => {
        delete anchor.dataset.externalLink;
        if (anchor.dataset.externalTitle === "true") {
          anchor.removeAttribute("title");
          delete anchor.dataset.externalTitle;
        }
        if (anchor.dataset.externalNewTab === "true") {
          anchor.removeAttribute("target");
          anchor.removeAttribute("rel");
          delete anchor.dataset.externalNewTab;
        }
      });
    };
  }, [pathname, website.externalLinkClarity, website.externalLinksNewTab]);

  useEffect(() => {
    if (!website.haptics || !("vibrate" in navigator)) return;
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest("button, a[href], input[type='checkbox'], input[type='radio']")) navigator.vibrate(8);
    };
    document.addEventListener("click", onClick, { passive: true });
    return () => document.removeEventListener("click", onClick);
  }, [website.haptics]);

  useEffect(() => {
    if (!website.formDraftRecovery || PRIVATE_DRAFT_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return;
    const restored = new Set<string>();
    const restore = () => {
      document.querySelectorAll("input, textarea").forEach((element) => {
        if (!eligibleDraftField(element) || element.value) return;
        const key = draftKey(pathname, element);
        if (!key || restored.has(key)) return;
        restored.add(key);
        try {
          const saved = sessionStorage.getItem(key);
          if (saved) {
            element.value = saved;
            element.dataset.draftRecovery = "restored";
            element.dispatchEvent(new Event("input", { bubbles: true }));
          }
        } catch { /* optional */ }
      });
    };
    const frame = window.requestAnimationFrame(restore);
    const onInput = (event: Event) => {
      const element = event.target as Element | null;
      if (!element || !eligibleDraftField(element)) return;
      const key = draftKey(pathname, element);
      if (!key) return;
      try {
        if (element.value.trim()) {
          sessionStorage.setItem(key, element.value);
          element.dataset.draftRecovery = "saved";
        } else {
          sessionStorage.removeItem(key);
          delete element.dataset.draftRecovery;
        }
      } catch { /* optional */ }
    };
    const onSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      form.querySelectorAll("input, textarea").forEach((element) => {
        if (!eligibleDraftField(element)) return;
        const key = draftKey(pathname, element);
        if (key) try {
          sessionStorage.removeItem(key);
          delete element.dataset.draftRecovery;
        } catch { /* optional */ }
      });
    };
    document.addEventListener("input", onInput);
    document.addEventListener("submit", onSubmit);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("input", onInput);
      document.removeEventListener("submit", onSubmit);
    };
  }, [pathname, website.formDraftRecovery]);

  useEffect(() => {
    if (!website.unsavedWorkGuard || !website.formDraftRecovery || PRIVATE_DRAFT_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const dirty = [...document.querySelectorAll("input, textarea")].some((element) => {
        if (!eligibleDraftField(element) || !element.value.trim()) return false;
        const key = draftKey(pathname, element);
        if (!key) return false;
        try { return sessionStorage.getItem(key) === element.value; } catch { return false; }
      });
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pathname, website.formDraftRecovery, website.unsavedWorkGuard]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable='true']");
      if (event.altKey && event.key.toLowerCase() === "i" && website.pageGuide && !typing) {
        event.preventDefault();
        setOpen((current) => !current);
      } else if (event.key === "Escape" && focusMode) {
        event.preventDefault();
        setFocusMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusMode, website.pageGuide]);

  const filteredOutline = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? outline.filter((section) => section.label.toLowerCase().includes(normalized)) : outline;
  }, [outline, query]);

  const recent = useMemo(() => state.recent.filter((item) => item.href !== pathname).slice(0, 4), [pathname, state.recent]);

  const goToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    setActiveSection(id);
  };

  const copySection = async (section: PageSection) => {
    const url = new URL(window.location.href);
    url.hash = section.id;
    showCopied(section.id);
    await copyText(url.toString());
  };

  const copyMarkdown = async () => {
    showCopied("markdown");
    await copyText(`[${metrics.title}](${window.location.href})`);
  };

  const sharePage = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: metrics.title, url: window.location.href }); } catch { return; }
    } else {
      await copyText(window.location.href);
    }
    showCopied("share");
  };

  const copyHealth = async () => {
    const report = [
      "Sam's Arcade page check",
      `Page: ${metrics.title}`,
      `URL: ${window.location.href}`,
      `Online: ${online ? "yes" : "no"}`,
      `Viewport: ${window.innerWidth}×${window.innerHeight}`,
      `Structure: ${metrics.headings} headings, ${metrics.links} links, ${metrics.controls} controls, ${metrics.forms} forms`,
      `Images missing alt: ${metrics.imagesMissingAlt}/${metrics.images}`,
      `Checked: ${new Date(lastChecked).toISOString()}`,
    ].join("\n");
    showCopied("health");
    await copyText(report);
  };

  if (!ready || privateSurface || !website.pageGuide) return focusMode ? (
    <button type="button" className="website-focus-exit btn btn-primary fixed right-4 top-4 z-[120] shadow-2xl" onClick={() => setFocusMode(false)}>Exit focus view <kbd className="ml-2 text-[0.62rem] opacity-70">ESC</kbd></button>
  ) : null;

  return (
    <>
      <button
        type="button"
        className={`website-guide-trigger btn fixed bottom-4 left-4 z-[92] gap-2 bg-[var(--panel)] shadow-xl md:left-[248px] ${open ? "btn-primary" : ""}`}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label="Open Page Guide"
      >
        <span aria-hidden="true">☰</span>
        <span>Page Guide</span>
        {website.readingInsights && <span className="font-mono text-[0.64rem] opacity-70">{scrollPercent}%</span>}
      </button>

      {focusMode && <button type="button" className="website-focus-exit btn btn-primary fixed right-4 top-4 z-[120] shadow-2xl" onClick={() => setFocusMode(false)}>Exit focus view <kbd className="ml-2 text-[0.62rem] opacity-70">ESC</kbd></button>}

      <SlideOver open={open} onClose={() => setOpen(false)} title="Page Guide">
        <div className="border-b border-[var(--border)] p-4">
          <p className="truncate text-lg font-black">{metrics.title}</p>
          {website.readingInsights && (
            <div className="mt-2 flex flex-wrap gap-2 text-[0.66rem] font-bold text-[var(--text-faint)]">
              <span className="chip !py-1">{metrics.minutes} min read</span>
              <span className="chip !py-1">{metrics.words.toLocaleString()} words</span>
              <span className="chip !py-1">{scrollPercent}% complete</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 border-b border-[var(--border)] p-2" role="tablist" aria-label="Page Guide views">
          {(["outline", "actions", "health"] as const).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={view === item} onClick={() => setView(item)} className={`rounded-lg px-2 py-2.5 text-xs font-black capitalize ${view === item ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-elev)]"}`}>{item}</button>
          ))}
        </div>

        <div className="space-y-5 p-4">
          {view === "outline" && (
            <section>
              <div className="flex items-end justify-between gap-3">
                <div><h3 className="font-black">On this page</h3><p className="text-xs text-[var(--text-faint)]">{outline.length} discovered sections</p></div>
                {website.keyboardGuide && <kbd className="chip !py-1 font-mono text-[0.62rem]">Alt I</kbd>}
              </div>
              {website.pageOutline && outline.length > 5 && <input type="search" className="input mt-3 w-full" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a section…" aria-label="Find a page section" />}
              <div className="mt-3 space-y-1">
                {website.pageOutline && filteredOutline.map((section) => (
                  <div key={section.id} className={`group flex items-center gap-1 rounded-xl border p-1 ${activeSection === section.id ? "border-[var(--accent)]/45 bg-[var(--accent)]/10" : "border-transparent hover:bg-[var(--bg-elev)]"}`} style={{ marginLeft: section.level === 3 ? "0.75rem" : 0 }}>
                    <button type="button" className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm font-bold" onClick={() => goToSection(section.id)} aria-current={activeSection === section.id ? "location" : undefined}>{section.label}</button>
                    {website.sectionDeepLinks && <button type="button" className="rounded-lg px-2 py-2 text-xs font-black text-[var(--text-faint)] opacity-70 hover:bg-[var(--bg)] hover:text-[var(--accent)] group-hover:opacity-100" onClick={() => copySection(section)} aria-label={`Copy link to ${section.label}`}>{copied === section.id ? "✓" : "#"}</button>}
                  </div>
                ))}
                {website.pageOutline && !filteredOutline.length && <p className="rounded-xl border border-dashed border-[var(--border)] p-7 text-center text-sm text-[var(--text-faint)]">{outline.length ? "No section matches that search." : "This page is short enough to explore without an outline."}</p>}
                {!website.pageOutline && <p className="rounded-xl border border-dashed border-[var(--border)] p-7 text-center text-sm text-[var(--text-faint)]">Page outlines are turned off in Website Settings.</p>}
              </div>
            </section>
          )}

          {view === "actions" && (
            <>
              <section>
                <h3 className="font-black">Page actions</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {website.smartBack && <button type="button" className="btn !justify-start text-xs" onClick={() => window.history.length > 1 ? router.back() : router.push("/")}>← Go back</button>}
                  {website.routeRefresh && <button type="button" className="btn !justify-start text-xs" onClick={() => { router.refresh(); setLastChecked(Date.now()); }}>↻ Refresh</button>}
                  {website.shareToolkit && <button type="button" className="btn !justify-start text-xs" onClick={sharePage}>{copied === "share" ? "✓ Shared" : "↗ Share page"}</button>}
                  {website.shareToolkit && <button type="button" className="btn !justify-start text-xs" onClick={copyMarkdown}>{copied === "markdown" ? "✓ Copied" : "[] Copy Markdown"}</button>}
                  <button type="button" className="btn !justify-start text-xs" onClick={() => window.print()}>▤ Print cleanly</button>
                  <button type="button" className="btn !justify-start text-xs" onClick={() => { setFocusMode(true); setOpen(false); }}>◉ Focus view</button>
                </div>
              </section>
              <section>
                <h3 className="font-black">Recently visited</h3>
                <div className="mt-3 space-y-2">
                  {recent.map((item) => <Link key={`${item.href}-${item.visitedAt}`} href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--bg-elev)]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--bg-elev-2)]">{item.emoji ?? "↻"}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{item.label}</span><span className="text-xs text-[var(--text-faint)]">{formatRelativeTime(item.visitedAt)}</span></span><span aria-hidden="true" className="text-[var(--text-faint)]">→</span></Link>)}
                  {!recent.length && <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-faint)]">Recent pages will appear as you explore.</p>}
                </div>
              </section>
            </>
          )}

          {view === "health" && website.pageHealthAudit && (
            <>
              <section>
                <div className="flex items-end justify-between gap-3"><div><h3 className="font-black">Live page health</h3><p className="text-xs text-[var(--text-faint)]">Checked {formatRelativeTime(lastChecked)}</p></div><span className={`chip !py-1 ${online ? "!text-[var(--good)]" : "!text-[var(--danger)]"}`}>{online ? "Online" : "Offline"}</span></div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MetricTile label="Headings" value={metrics.headings} tone={metrics.headings ? "good" : "warn"} />
                  <MetricTile label="Links" value={metrics.links} />
                  <MetricTile label="Controls" value={metrics.controls} />
                  <MetricTile label="Forms" value={metrics.forms} />
                  <MetricTile label="Images" value={metrics.images} />
                  <MetricTile label="Missing alt" value={metrics.imagesMissingAlt} tone={metrics.imagesMissingAlt ? "warn" : "good"} />
                </div>
              </section>
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <h3 className="text-sm font-black">Support snapshot</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--text-faint)]">Copies route, connection, viewport and structural counts. It does not include account or form content.</p>
                <button type="button" className="btn mt-3 w-full text-xs" onClick={copyHealth}>{copied === "health" ? "✓ Snapshot copied" : "Copy support snapshot"}</button>
              </section>
            </>
          )}
          {view === "health" && !website.pageHealthAudit && <p className="rounded-xl border border-dashed border-[var(--border)] p-7 text-center text-sm text-[var(--text-faint)]">Page health checks are turned off in Website Settings.</p>}
        </div>
      </SlideOver>
    </>
  );
}
