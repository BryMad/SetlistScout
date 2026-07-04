import type { LabSkin } from "./LabScreen";
import { BAND_LABEL, type LabTrack } from "./data";

/* Ten skins over the one real site structure. Only presentation lives here —
   structure, interactivity, and every Spotify element are fixed in LabScreen. */

/* ── shared band palettes ─────────────────────────────────────────── */

const bandIndex = (pct: number) => (pct >= 80 ? 0 : pct >= 60 ? 1 : pct >= 40 ? 2 : pct >= 20 ? 3 : 4);
const V1 = ["#8b5cf6", "#0ea5e9", "#eab308", "#f97316", "#e11d48"]; // production spectrum
const CP = ["#00ff9f", "#00e5ff", "#ffe600", "#ff9e00", "#ff2965"];
const at = (palette: string[], pct: number) => palette[bandIndex(pct)]!;

const blocks = (pct: number) => "▮".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));

/* ── 01 · NIGHT CITY ──────────────────────────────────────────────── */

const cyberpunk: LabSkin = {
  css: `
    .cp-scan { position: fixed; inset: 0; pointer-events: none; z-index: 20;
      background: repeating-linear-gradient(0deg, rgba(0,0,0,.26) 0 1px, transparent 1px 3px); }
    .cp-glitch { position: relative; display: inline-block; }
    .cp-glitch::before, .cp-glitch::after { content: attr(data-text); position: absolute; inset: 0; overflow: hidden; }
    .cp-glitch::before { color: #ff2965; animation: cpA 3.1s infinite linear alternate; }
    .cp-glitch::after { color: #00e5ff; animation: cpB 2.3s infinite linear alternate; }
    @keyframes cpA { 0%,88%,100% { clip-path: inset(0 0 100% 0); transform:none; }
      90% { clip-path: inset(12% 0 60% 0); transform: translate(-3px,-1px); }
      94% { clip-path: inset(60% 0 8% 0); transform: translate(3px,1px); }
      97% { clip-path: inset(30% 0 45% 0); transform: translate(-2px,0); } }
    @keyframes cpB { 0%,84%,100% { clip-path: inset(0 0 100% 0); transform:none; }
      86% { clip-path: inset(70% 0 5% 0); transform: translate(3px,1px); }
      91% { clip-path: inset(8% 0 75% 0); transform: translate(-3px,-1px); }
      95% { clip-path: inset(40% 0 40% 0); transform: translate(2px,0); } }
    .cp-row-hover:hover { background: rgba(0,255,159,.08); border-color: rgba(0,255,159,.55) !important;
      box-shadow: 0 0 16px rgba(0,255,159,.14); }
  `,
  page: "cp min-h-screen bg-black text-[#9dffce]",
  pageStyle: { fontFamily: "var(--font-geist-mono)" },
  decor: <div className="cp-scan" />,
  header: "relative z-10 flex items-center justify-between gap-4 border-b border-[#00ff9f]/25 px-6 py-3",
  brand: "text-sm tracking-[0.3em] text-[#00e5ff]",
  brandText: "SETLIST://SCOUT",
  search:
    "w-56 border border-[#00ff9f]/30 bg-[#001a10]/70 px-3 py-1.5 text-sm text-[#9dffce] placeholder-[#2e7d5b] outline-none focus:border-[#00ff9f]",
  h1: "text-4xl font-bold tracking-widest text-[#eafff4]",
  h1Style: { fontFamily: "var(--font-vt323), monospace", fontSize: "3rem" },
  glitchTitle: true,
  nav: "mt-5 inline-flex border border-[#00ff9f]/30 p-1",
  navActive: "bg-[#00ff9f]/15 px-4 py-1.5 text-sm font-medium text-[#00ff9f]",
  navIdle: "px-4 py-1.5 text-sm font-medium text-[#2e7d5b] hover:text-[#9dffce]",
  pills: "mt-6 flex flex-wrap gap-2",
  pillActive: "border border-[#00e5ff] bg-[#00e5ff]/10 px-3 py-1.5 text-sm text-[#00e5ff]",
  pillIdle: "border border-[#00ff9f]/25 px-3 py-1.5 text-sm text-[#2e7d5b] hover:border-[#00ff9f]/60 hover:text-[#9dffce]",
  subtitle: "mt-6 text-sm leading-relaxed text-[#5cd6a3]",
  panel: "mt-4 border border-[#00ff9f]/30 bg-[#001a10]/60 p-5",
  chip: "border border-[#00e5ff]/50 px-2.5 py-0.5 text-xs uppercase tracking-widest text-[#00e5ff]",
  metaLine: "text-xs text-[#2e7d5b]",
  explain: "mt-3 space-y-1.5 text-sm leading-relaxed text-[#5cd6a3]",
  saveDivider: "mt-4 border-t border-[#00ff9f]/20 pt-4",
  legend: "mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs",
  legendSwatch: (band) => ({ background: CP[band] }),
  legendLabel: "text-[#2e7d5b]",
  list: "mt-3 space-y-2",
  row: "cp-row-hover border border-[#00ff9f]/20 bg-[#00ff9f]/[0.03] px-3 py-2",
  index: "text-right text-sm text-[#2e7d5b]",
  title: "text-[#eafff4]",
  artistText: "text-[#7de0b4]",
  albumText: "text-[#3f9d74]",
  coverBadge: "ml-2 text-xs font-normal text-[#5cd6a3]",
  gauge: (t: LabTrack) => (
    <>
      <span className="text-xs" style={{ color: at(CP, t.pct), fontFamily: "var(--font-geist-mono)" }}>
        [{blocks(t.pct)}] {t.pct}%
      </span>
      <span className="text-[10px] uppercase tracking-widest text-[#2e7d5b]">{BAND_LABEL(t.pct)}</span>
    </>
  ),
  noMatch: "border-[#00ff9f]/25 text-[#2e7d5b]",
  tourIntro: "mt-6 text-sm text-[#5cd6a3]",
  tourCard: "cp-row-hover block border border-[#00ff9f]/20 bg-[#00ff9f]/[0.03] px-5 py-4",
  tourName: "font-bold text-[#eafff4]",
  tourMeta: "text-xs text-[#2e7d5b]",
};

/* ── 02 · SILVER FACE ─────────────────────────────────────────────── */

const hifi: LabSkin = {
  css: `
    .hf-face { background:
        repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 3px),
        linear-gradient(180deg, #d9d9d6, #bcbcb8 45%, #cacac6 55%, #a9a9a5);
      border-radius: 6px; box-shadow: inset 0 1px 0 rgba(255,255,255,.9), inset 0 -2px 4px rgba(0,0,0,.35); }
    .hf-display { background: linear-gradient(180deg, #030c09, #08170f); border-radius: 4px;
      box-shadow: inset 0 2px 8px rgba(0,0,0,.9), inset 0 0 30px rgba(0,255,170,.06), 0 1px 0 rgba(255,255,255,.7); }
    .hf-phosphor { color: #6ff7c0; text-shadow: 0 0 6px rgba(111,247,192,.8), 0 0 18px rgba(111,247,192,.35); }
    .hf-engraved { color: #3a3a38; text-shadow: 0 1px 0 rgba(255,255,255,.7); }
    .hf-btn3d { background: linear-gradient(180deg, #efefec, #c9c9c5 48%, #b3b3af 52%, #d4d4d0);
      border: 1px solid #8e8e8a; border-radius: 4px;
      box-shadow: 0 3px 0 #7e7e7a, 0 4px 6px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.9); }
    .hf-btn3d:active { transform: translateY(2px); box-shadow: 0 1px 0 #7e7e7a; }
    .hf-pressed { background: linear-gradient(180deg, #a9a9a5, #c2c2be); border: 1px solid #7e7e7a;
      border-radius: 4px; box-shadow: inset 0 2px 4px rgba(0,0,0,.35); transform: translateY(1px); }
    .hf-vu { width: 72px; height: 42px; border-radius: 4px 4px 2px 2px; position: relative; overflow: hidden;
      background: linear-gradient(180deg, #f7efd8, #ecdfbc);
      box-shadow: inset 0 1px 4px rgba(0,0,0,.45), 0 1px 0 rgba(255,255,255,.6); }
    .hf-vu::before { content: ""; position: absolute; inset: 6px 6px 13px;
      border-top: 2px solid #6b5c39; border-radius: 50% 50% 0 0 / 100% 100% 0 0; }
    .hf-vu-red { position: absolute; top: 4px; right: 8px; width: 16px; height: 8px;
      border-top: 3px solid #c23b22; border-radius: 0 60% 0 0; }
    .hf-needle { position: absolute; left: 50%; bottom: 7px; width: 2px; height: 28px; background: #1e1c18;
      transform-origin: bottom center; border-radius: 1px; }
    .hf-module { box-shadow: inset 0 1px 0 rgba(255,255,255,.6), 0 1px 2px rgba(0,0,0,.15); }
  `,
  page: "min-h-screen bg-[#17120d] px-2 py-8 sm:px-4",
  shell:
    "mx-auto max-w-4xl rounded-[10px] p-3.5 shadow-2xl " +
    "bg-[linear-gradient(90deg,#4a2f1b,#6b4423_8%,#59371d_12%,#6b4423_88%,#4a2f1b)]",
  shellInner: "hf-face",
  header: "flex items-center justify-between gap-4 px-6 pt-5",
  brand: "hf-engraved text-[11px] font-semibold uppercase tracking-[0.3em]",
  brandText: "Setlist Scout · Model SS-2600",
  search:
    "hf-display hf-phosphor w-56 px-3 py-1.5 text-sm placeholder-[#2e7d5b] outline-none",
  h1: "hf-display hf-phosphor inline-block px-4 py-2 text-2xl font-semibold tracking-wide",
  h1Style: { fontFamily: "var(--font-geist-mono)" },
  nav: "mt-5 inline-flex gap-1.5",
  navActive: "hf-pressed hf-engraved px-4 py-1.5 text-sm font-bold",
  navIdle: "hf-btn3d hf-engraved px-4 py-1.5 text-sm font-bold",
  pills: "mt-6 flex flex-wrap gap-1.5",
  pillActive: "hf-pressed hf-engraved px-3 py-1.5 text-xs font-bold uppercase tracking-wider",
  pillIdle: "hf-btn3d hf-engraved px-3 py-1.5 text-xs font-bold uppercase tracking-wider",
  subtitle: "hf-engraved mt-6 text-sm leading-relaxed",
  panel: "hf-display mt-4 p-5",
  chip: "hf-phosphor border border-[#6ff7c0]/40 px-2.5 py-0.5 text-xs uppercase tracking-widest",
  metaLine: "hf-phosphor text-xs opacity-80",
  explain: "hf-phosphor mt-3 space-y-1.5 text-sm leading-relaxed opacity-90",
  saveDivider: "mt-4 border-t border-[#6ff7c0]/20 pt-4",
  legend: "mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs",
  legendSwatch: (band) => ({ background: at(V1, band === 0 ? 100 : band === 1 ? 70 : band === 2 ? 50 : band === 3 ? 30 : 10) }),
  legendLabel: "hf-engraved",
  list: "mt-3 space-y-2 pb-6",
  row: "hf-module rounded-md border border-[#98989425] bg-[#ffffff2e] px-3 py-2",
  index: "hf-engraved text-right font-mono text-sm opacity-60",
  title: "hf-engraved",
  artistText: "hf-engraved opacity-80",
  albumText: "hf-engraved opacity-60",
  coverBadge: "hf-engraved ml-2 text-xs font-normal opacity-70",
  gauge: (t: LabTrack) => (
    <div className="flex items-center gap-2">
      <div className="hf-vu hidden sm:block">
        <div className="hf-vu-red" />
        <div className="hf-needle" style={{ transform: `rotate(${-50 + t.pct}deg)` }} />
      </div>
      <span className="hf-display hf-phosphor px-2 py-0.5 font-mono text-sm">
        {String(t.pct).padStart(3, "0")}%
      </span>
    </div>
  ),
  noMatch: "border-[#8f8f8b] text-[#6d6d69]",
  tourIntro: "hf-engraved mt-6 text-sm",
  tourCard: "hf-module rounded-md border border-[#98989425] bg-[#ffffff2e] px-5 py-4",
  tourName: "hf-engraved font-bold",
  tourMeta: "hf-engraved text-xs opacity-60",
};

/* ── 03 · LLAMA ───────────────────────────────────────────────────── */

const winamp: LabSkin = {
  css: `
    .wa-window { background: #292939; border: 2px solid; border-color: #7c7c94 #14141c #14141c #7c7c94;
      box-shadow: 4px 4px 0 rgba(0,0,0,.35); }
    .wa-titlebar { background: linear-gradient(180deg, #58587a, #34344c); border-bottom: 2px solid #14141c; }
    .wa-btn { background: #4a4a61; border: 2px solid; border-color: #8a8aa5 #1a1a26 #1a1a26 #8a8aa5; color: #d6d6e4; }
    .wa-btn:active, .wa-btn-on { border-color: #1a1a26 #8a8aa5 #8a8aa5 #1a1a26 !important; background: #3a3a4e; color: #ffcc00; }
    .wa-display { background: #000; border: 2px solid; border-color: #14141c #7c7c94 #7c7c94 #14141c; }
    .wa-green { color: #00ff00; }
    .wa-dim { color: #00aa00; }
    .wa-eq { display: flex; align-items: flex-end; gap: 2px; height: 26px; }
    .wa-eq i { width: 5px; border-radius: 1px 1px 0 0;
      background: linear-gradient(180deg, #ff3b30 0%, #ffcc00 45%, #00ff00 70%); background-size: 100% 26px;
      background-position: bottom; transform-origin: bottom; animation: waBounce 1.1s ease-in-out infinite alternate; }
    @keyframes waBounce { from { transform: scaleY(.55); } to { transform: scaleY(1); } }
    .wa-row-h:hover { background: #0000c6; }
  `,
  page: "min-h-screen bg-[#3f3f52] px-2 py-8 sm:px-4",
  pageStyle: { fontFamily: "Tahoma, 'MS Sans Serif', var(--font-geist-sans)" },
  shell: "wa-window mx-auto max-w-4xl",
  header: "wa-titlebar flex items-center justify-between gap-4 px-3 py-1.5",
  brand: "text-[10px] font-bold tracking-wider text-[#e8e8f4]",
  brandText: "SETLIST SCOUT v2.91",
  search:
    "wa-display wa-green w-56 px-2 py-1 font-mono text-xs placeholder-[#00aa00] outline-none",
  h1: "wa-display wa-green mx-6 mt-5 inline-block px-3 py-1.5 font-mono text-xl font-bold tracking-wide",
  nav: "mx-6 mt-4 inline-flex gap-1",
  navActive: "wa-btn wa-btn-on px-4 py-1.5 text-[11px] font-bold",
  navIdle: "wa-btn px-4 py-1.5 text-[11px] font-bold",
  pills: "mx-6 mt-4 flex flex-wrap gap-1",
  pillActive: "wa-btn wa-btn-on px-3 py-1 text-[10px] font-bold",
  pillIdle: "wa-btn px-3 py-1 text-[10px] font-bold",
  subtitle: "wa-dim mx-6 mt-4 text-[11px] leading-relaxed",
  panel: "wa-display mx-6 mt-3 p-4",
  chip: "wa-green border border-[#00aa00] px-2 py-0.5 font-mono text-[10px] uppercase",
  metaLine: "wa-dim font-mono text-[10px]",
  explain: "wa-green mt-3 space-y-1 font-mono text-[11px] leading-relaxed",
  saveDivider: "mt-3 border-t border-[#0a3a0a] pt-3",
  legend: "mx-6 mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px]",
  legendSwatch: (band) => ({ background: ["#00ff00", "#8aff00", "#ffcc00", "#ff8800", "#ff3b30"][band] }),
  legendLabel: "wa-dim",
  list: "wa-display mx-6 mb-6 mt-2",
  row: "wa-row-h border-b border-[#0a2a0a] px-2 py-1.5",
  index: "wa-dim text-right font-mono text-[11px]",
  title: "text-[#e8e8f4]",
  artistText: "text-[#b9b9cf]",
  albumText: "text-[#8a8aa5]",
  coverBadge: "wa-dim ml-2 text-[10px] font-normal",
  gauge: (t: LabTrack) => (
    <div className="flex items-center gap-2">
      <div className="wa-eq hidden sm:flex">
        {[0.7, 1, 0.5, 0.85, 0.6].map((h, i) => (
          <i key={i} style={{ height: `${Math.max(4, h * t.pct * 0.26)}px`, animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <span className="wa-green font-mono text-[11px]">
        {t.pct}% · {t.plays}/40
      </span>
    </div>
  ),
  noMatch: "border-[#0a3a0a] text-[#00aa00]",
  tourIntro: "wa-dim mx-6 mt-4 text-[11px]",
  tourCard: "wa-display wa-row-h mx-6 block px-4 py-3",
  tourName: "wa-green font-mono text-sm font-bold",
  tourMeta: "wa-dim font-mono text-[10px]",
};

/* ── 04 · WHITESPACE ──────────────────────────────────────────────── */

const minimal: LabSkin = {
  page: "min-h-screen bg-white text-[#111]",
  header: "mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 pt-8",
  brand: "text-sm font-medium tracking-tight",
  search:
    "w-56 border-b border-[#e5e5e5] px-1 py-1.5 text-sm placeholder-[#bbb] outline-none focus:border-[#111]",
  h1: "mt-6 text-4xl font-light tracking-tight",
  nav: "mt-6 flex gap-6",
  navActive: "border-b-2 border-[#111] pb-1 text-sm font-medium",
  navIdle: "pb-1 text-sm text-[#999] hover:text-[#111]",
  pills: "mt-8 flex gap-5",
  pillActive: "text-sm font-medium underline underline-offset-4",
  pillIdle: "text-sm text-[#999] hover:text-[#111]",
  subtitle: "mt-6 max-w-lg text-sm leading-relaxed text-[#666]",
  panel: "mt-8 border-t border-[#eee] pt-5",
  chip: "text-[11px] uppercase tracking-[0.25em] text-[#999]",
  metaLine: "text-[11px] uppercase tracking-[0.25em] text-[#ccc]",
  explain: "mt-3 space-y-1.5 text-sm leading-relaxed text-[#666]",
  saveDivider: "mt-5",
  legend: "mt-10 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs",
  legendSwatch: () => ({ background: "#d4d4d4" }),
  legendLabel: "text-[#bbb]",
  list: "mt-4",
  row: "border-b border-[#f0f0f0] py-3",
  index: "text-right text-sm tabular-nums text-[#ccc]",
  title: "text-[#111]",
  artistText: "text-[#777]",
  albumText: "text-[#aaa]",
  coverBadge: "ml-2 text-xs font-normal text-[#999]",
  gauge: (t: LabTrack) => (
    <>
      <span className="text-sm tabular-nums">{t.pct}%</span>
      <span className="text-[10px] uppercase tracking-[0.2em] text-[#bbb]">{BAND_LABEL(t.pct)}</span>
    </>
  ),
  noMatch: "border-[#e5e5e5] text-[#bbb]",
  tourIntro: "mt-8 max-w-lg text-sm text-[#666]",
  tourCard: "border-b border-[#f0f0f0] py-4 hover:bg-[#fafafa]",
  tourName: "text-sm font-medium",
  tourMeta: "text-xs text-[#aaa]",
};

/* ── 05 · MOTION (the winner) — five personalities on one chassis ─── */

const motionSpring: LabSkin = {
  css: `
    @keyframes moUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
    @keyframes moGrow { from { width: 0; } }
    @keyframes moPing { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(2.1); opacity: 0; } }
    .mo-up { animation: moUp .55s cubic-bezier(.21,1.02,.73,1) both; }
    .mo-row { transition: transform .18s cubic-bezier(.34,1.56,.64,1), background .18s, box-shadow .18s; }
    .mo-row:hover { transform: translateY(-2px); background: #18181b; box-shadow: 0 8px 30px rgba(0,0,0,.45); }
    .mo-bar { animation: moGrow 1s cubic-bezier(.22,1,.36,1) both; }
    .mo-ring { position: relative; }
    .mo-ring::after { content: ""; position: absolute; inset: -3px; border-radius: 999px;
      border: 1.5px solid #8b5cf6; animation: moPing 1.8s cubic-bezier(0,0,.2,1) infinite; }
  `,
  page: "min-h-screen bg-zinc-950 text-zinc-100",
  header:
    "sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950/85 px-6 py-3 backdrop-blur",
  brand: "text-base font-semibold tracking-tight",
  search:
    "w-56 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm placeholder-zinc-600 outline-none transition focus:border-indigo-500",
  h1: "mo-up text-3xl font-semibold tracking-tight",
  nav: "mo-up mt-5 inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-1 [animation-delay:60ms]",
  navActive: "rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition",
  navIdle: "rounded-md px-4 py-1.5 text-sm font-medium text-zinc-400 transition hover:text-zinc-100",
  pills: "mo-up mt-6 flex flex-wrap gap-2 [animation-delay:120ms]",
  pillActive:
    "rounded-md border border-indigo-500/60 bg-indigo-500/10 px-3 py-1.5 text-sm font-medium text-indigo-300 transition",
  pillIdle:
    "rounded-md border border-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200",
  subtitle: "mo-up mt-6 text-sm leading-relaxed text-zinc-400 [animation-delay:180ms]",
  panel: "mo-up mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 [animation-delay:240ms]",
  chip: "mo-ring rounded-full border border-violet-500/50 bg-violet-500/10 px-2.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wide text-violet-300",
  metaLine: "font-mono text-xs text-zinc-500",
  explain: "mt-3 space-y-1.5 text-sm leading-relaxed text-zinc-300",
  saveDivider: "mt-4 border-t border-zinc-800 pt-4",
  legend: "mo-up mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs [animation-delay:300ms]",
  legendSwatch: (band) => ({ background: V1[band] }),
  legendLabel: "text-zinc-500",
  list: "mt-3 space-y-1.5",
  row: "mo-row mo-up rounded-xl px-3 py-2",
  rowStyle: (i) => ({ animationDelay: `${360 + i * 60}ms` }),
  index: "text-right font-mono text-sm text-zinc-600",
  title: "text-zinc-100",
  artistText: "text-zinc-400",
  albumText: "text-zinc-500",
  coverBadge: "ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-normal text-zinc-400",
  gauge: (t: LabTrack) => (
    <>
      <span className="font-mono text-sm font-semibold" style={{ color: at(V1, t.pct) }}>
        {t.pct}%
      </span>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="mo-bar h-full rounded-full"
          style={{ width: `${Math.max(t.pct, 2)}%`, background: at(V1, t.pct), animationDelay: `${600 + t.rank * 60}ms` }}
        />
      </div>
      <span className="font-mono text-[10px] text-zinc-600">{t.plays}/40</span>
    </>
  ),
  noMatch: "border-zinc-800 text-zinc-600",
  tourIntro: "mo-up mt-6 text-sm text-zinc-500",
  tourCard:
    "mo-row block rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4 hover:border-indigo-600 hover:bg-zinc-900",
  tourName: "font-semibold",
  tourMeta: "font-mono text-xs text-zinc-500",
};

/* 05b · CASCADE — everything enters from the left; edge-lit hover; segmented bars */

const motionCascade: LabSkin = {
  ...motionSpring,
  css: `
    @keyframes moUp { from { opacity: 0; transform: translateX(-18px); filter: blur(4px); }
      to { opacity: 1; transform: none; filter: none; } }
    @keyframes moGrow { from { width: 0; } }
    .mo-up { animation: moUp .6s cubic-bezier(.22,1,.36,1) both; }
    .mo-row { border-left: 2px solid transparent; transition: border-color .18s, background .18s, padding-left .18s; }
    .mo-row:hover { border-left-color: #6366f1; background: #18181b; padding-left: 16px; }
    .mo-bar { animation: moGrow 1.1s cubic-bezier(.22,1,.36,1) both;
      -webkit-mask-image: repeating-linear-gradient(90deg, #000 0 5px, transparent 5px 7px);
      mask-image: repeating-linear-gradient(90deg, #000 0 5px, transparent 5px 7px); }
  `,
  chip: "rounded-full border border-indigo-500/50 bg-indigo-500/10 px-2.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wide text-indigo-300",
  row: "mo-row mo-up rounded-r-xl px-3 py-2",
  rowStyle: (i) => ({ animationDelay: `${360 + i * 80}ms` }),
  gauge: (t: LabTrack) => (
    <>
      <span className="font-mono text-sm font-semibold" style={{ color: at(V1, t.pct) }}>
        {t.pct}%
      </span>
      <div className="h-1.5 w-16 overflow-hidden rounded-sm bg-zinc-800/60">
        <div
          className="mo-bar h-full"
          style={{ width: `${Math.max(t.pct, 4)}%`, background: at(V1, t.pct), animationDelay: `${640 + t.rank * 80}ms` }}
        />
      </div>
      <span className="font-mono text-[10px] text-zinc-600">{t.plays}/40</span>
    </>
  ),
};

/* 05c · POP — bouncy scale-ins and percentages that count up from zero */

const motionPop: LabSkin = {
  ...motionSpring,
  css: `
    @property --n { syntax: "<integer>"; initial-value: 0; inherits: false; }
    @keyframes moUp { 0% { opacity: 0; transform: scale(.92); } 70% { transform: scale(1.015); } 100% { opacity: 1; transform: none; } }
    @keyframes moGrow { from { width: 0; } }
    @keyframes moCount { from { --n: 0; } }
    .mo-up { animation: moUp .5s cubic-bezier(.34,1.56,.64,1) both; }
    .mo-row { transition: transform .18s cubic-bezier(.34,1.56,.64,1), background .18s, box-shadow .18s; }
    .mo-row:hover { transform: scale(1.012); background: #18181b; box-shadow: 0 8px 30px rgba(0,0,0,.45); }
    .mo-row:hover img { transform: scale(1.08) rotate(-2deg); }
    .mo-row img { transition: transform .25s cubic-bezier(.34,1.56,.64,1); }
    .mo-bar { animation: moGrow 1.2s cubic-bezier(.34,1.56,.64,1) both; }
    .mo-count { animation: moCount 1.4s cubic-bezier(.22,1,.36,1) both; counter-reset: cnt var(--n); }
    .mo-count::after { content: counter(cnt) "%"; }
  `,
  gauge: (t: LabTrack) => (
    <>
      <span
        className="mo-count font-mono text-sm font-semibold"
        style={{ color: at(V1, t.pct), animationDelay: `${500 + t.rank * 70}ms`, ["--n" as string]: t.pct } as React.CSSProperties}
      />
      <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="mo-bar h-full rounded-full"
          style={{ width: `${Math.max(t.pct, 2)}%`, background: at(V1, t.pct), animationDelay: `${500 + t.rank * 70}ms` }}
        />
      </div>
      <span className="font-mono text-[10px] text-zinc-600">{t.plays}/40</span>
    </>
  ),
  rowStyle: (i) => ({ animationDelay: `${340 + i * 70}ms` }),
};

/* 05d · CALM — nothing translates; long soft fades, gentle hovers */

const motionCalm: LabSkin = {
  ...motionSpring,
  css: `
    @keyframes moUp { from { opacity: 0; } to { opacity: 1; } }
    @keyframes moGrow { from { width: 0; } }
    .mo-up { animation: moUp 1.1s ease both; }
    .mo-row { transition: background .35s ease; }
    .mo-row:hover { background: #18181b; }
    .mo-bar { animation: moGrow 1.8s ease both; }
  `,
  panel: "mo-up mt-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-6 [animation-delay:240ms]",
  chip: "rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wide text-zinc-300",
  row: "mo-row mo-up rounded-2xl px-3 py-2.5",
  rowStyle: (i) => ({ animationDelay: `${400 + i * 110}ms` }),
  gauge: (t: LabTrack) => (
    <>
      <span className="font-mono text-sm font-semibold" style={{ color: at(V1, t.pct) }}>
        {t.pct}%
      </span>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="mo-bar h-full rounded-full"
          style={{ width: `${Math.max(t.pct, 2)}%`, background: at(V1, t.pct), animationDelay: `${700 + t.rank * 110}ms` }}
        />
      </div>
      <span className="font-mono text-[10px] text-zinc-600">{t.plays}/40</span>
    </>
  ),
  tourCard:
    "mo-row block rounded-2xl border border-zinc-800/70 bg-zinc-900/40 px-5 py-4 hover:border-zinc-700 hover:bg-zinc-900",
};

/* 05e · KINETIC — 3D flip-ins and five-cell meters that light up in sequence */

const motionKinetic: LabSkin = {
  ...motionSpring,
  css: `
    @keyframes moUp { from { opacity: 0; transform: perspective(600px) rotateX(-14deg) translateY(10px); }
      to { opacity: 1; transform: none; } }
    @keyframes moCell { from { opacity: 0; transform: scaleY(.2); } to { opacity: 1; transform: none; } }
    .mo-up { animation: moUp .6s cubic-bezier(.22,1,.36,1) both; transform-origin: top center; }
    .mo-row { transition: transform .18s cubic-bezier(.34,1.56,.64,1), background .18s, box-shadow .18s; }
    .mo-row:hover { transform: translateX(5px); background: #18181b; box-shadow: -4px 0 0 #6366f1, 0 8px 30px rgba(0,0,0,.45); }
    .mo-cell { transform-origin: bottom; animation: moCell .3s cubic-bezier(.34,1.56,.64,1) both; }
  `,
  rowStyle: (i) => ({ animationDelay: `${360 + i * 65}ms` }),
  gauge: (t: LabTrack) => {
    const filled = Math.max(1, Math.round(t.pct / 20));
    return (
      <>
        <span className="font-mono text-sm font-semibold" style={{ color: at(V1, t.pct) }}>
          {t.pct}%
        </span>
        <div className="flex gap-[3px]">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={i < filled ? "mo-cell h-2 w-3 rounded-[2px]" : "h-2 w-3 rounded-[2px] bg-zinc-800"}
              style={
                i < filled
                  ? { background: at(V1, t.pct), animationDelay: `${600 + t.rank * 65 + i * 80}ms` }
                  : undefined
              }
            />
          ))}
        </div>
        <span className="font-mono text-[10px] text-zinc-600">{t.plays}/40</span>
      </>
    );
  },
};

/* 05f · NIGHT CITY FUSION — cascade's motion in night-city atmosphere:
   scanlines, a glitching title, terminal accents, cyan edge light. The
   spectrum shifts to cyber hues (cyan→magenta) but stays cool→hot. */

const NC = ["#22d3ee", "#818cf8", "#ffe600", "#ff9e00", "#ff2965"];

const motionNightCity: LabSkin = {
  ...motionSpring,
  css: `
    .nc-scan { position: fixed; inset: 0; pointer-events: none; z-index: 20;
      background: repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0 1px, transparent 1px 3px); }
    @keyframes moUp { from { opacity: 0; transform: translateX(-18px); filter: blur(4px); }
      to { opacity: 1; transform: none; filter: none; } }
    @keyframes moGrow { from { width: 0; } }
    /* fill backwards, not both: a filled animation keeps a stacking context
       forever, which would trap the z-30 Spotify pills under the scanlines */
    .mo-up { animation: moUp .6s cubic-bezier(.22,1,.36,1) backwards; }
    .mo-row { border-left: 2px solid transparent; transition: border-color .18s, background .18s, padding-left .18s; }
    .mo-row:hover { border-left-color: #22d3ee; background: #0d1319; padding-left: 16px; }
    .mo-bar { animation: moGrow 1.1s cubic-bezier(.22,1,.36,1) both;
      -webkit-mask-image: repeating-linear-gradient(90deg, #000 0 5px, transparent 5px 7px);
      mask-image: repeating-linear-gradient(90deg, #000 0 5px, transparent 5px 7px); }
    .cp-glitch { position: relative; display: inline-block; }
    .cp-glitch::before, .cp-glitch::after { content: attr(data-text); position: absolute; inset: 0; overflow: hidden; }
    .cp-glitch::before { color: #ff2965; animation: ncA 7s infinite linear; }
    .cp-glitch::after { color: #22d3ee; animation: ncB 7s infinite linear; }
    @keyframes ncA { 0%, 94%, 100% { clip-path: inset(0 0 100% 0); transform: none; }
      95% { clip-path: inset(12% 0 60% 0); transform: translate(-3px, -1px); }
      97% { clip-path: inset(60% 0 8% 0); transform: translate(3px, 1px); } }
    @keyframes ncB { 0%, 93%, 100% { clip-path: inset(0 0 100% 0); transform: none; }
      94% { clip-path: inset(70% 0 5% 0); transform: translate(3px, 1px); }
      96.5% { clip-path: inset(8% 0 70% 0); transform: translate(-3px, 0); } }
    @keyframes ncBlink { 50% { opacity: 0; } }
    .nc-cursor::after { content: "▊"; margin-left: 4px; color: #22d3ee; animation: ncBlink 1.1s steps(1) infinite; }
  `,
  page: "min-h-screen bg-[#050507] text-zinc-100",
  decor: <div className="nc-scan" />,
  header:
    "sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-[#22d3ee]/15 bg-[#050507]/85 px-6 py-3 backdrop-blur",
  brand: "font-mono text-sm tracking-[0.25em] text-[#22d3ee]",
  brandText: "SETLIST://SCOUT",
  search:
    "w-56 rounded-md border border-zinc-800 bg-[#0a0d12] px-3 py-1.5 font-mono text-sm placeholder-zinc-600 outline-none transition focus:border-[#22d3ee]",
  h1: "mo-up text-3xl font-semibold tracking-widest",
  glitchTitle: true,
  navActive: "rounded-md bg-[#22d3ee]/15 px-4 py-1.5 text-sm font-medium text-[#22d3ee] transition",
  navIdle: "rounded-md px-4 py-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-200",
  pillActive:
    "rounded-md border border-[#22d3ee]/60 bg-[#22d3ee]/10 px-3 py-1.5 text-sm font-medium text-[#22d3ee] transition",
  pillIdle:
    "rounded-md border border-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200",
  panel: "mo-up mt-4 rounded-xl border border-[#22d3ee]/20 bg-[#0a0d12]/80 p-5 [animation-delay:240ms]",
  chip: "rounded-md border border-[#22d3ee]/50 bg-[#22d3ee]/10 px-2.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wide text-[#22d3ee]",
  metaLine: "nc-cursor font-mono text-xs text-zinc-500",
  legendSwatch: (band) => ({ background: NC[band] }),
  row: "mo-row mo-up rounded-r-xl px-3 py-2",
  rowStyle: (i) => ({ animationDelay: `${360 + i * 80}ms` }),
  coverBadge: "ml-2 rounded border border-zinc-800 px-1.5 py-0.5 text-xs font-normal text-zinc-500",
  gauge: (t: LabTrack) => (
    <>
      <span className="font-mono text-sm font-semibold" style={{ color: at(NC, t.pct) }}>
        {t.pct}%
      </span>
      <div className="h-1.5 w-16 overflow-hidden rounded-sm bg-zinc-800/60">
        <div
          className="mo-bar h-full"
          style={{ width: `${Math.max(t.pct, 4)}%`, background: at(NC, t.pct), animationDelay: `${640 + t.rank * 80}ms` }}
        />
      </div>
      <span className="font-mono text-[10px] text-zinc-600">{t.plays}/40</span>
    </>
  ),
  tourCard:
    "mo-row block rounded-r-xl border border-zinc-800 bg-[#0a0d12]/60 px-5 py-4",
  tourName: "font-semibold",
  tourMeta: "font-mono text-xs text-zinc-500",
};

/* ── 06 · TELEMETRY ───────────────────────────────────────────────── */

const hud: LabSkin = {
  css: `
    .hud-panel { position: relative; border: 1px solid rgba(103,232,249,.18); background: rgba(6,14,24,.82); }
    .hud-corner::before, .hud-corner::after { content: ""; position: absolute; width: 10px; height: 10px;
      border-color: #67e8f9; border-style: solid; }
    .hud-corner::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
    .hud-corner::after { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
    .hud-gauge { position: relative; width: 44px; height: 44px; border-radius: 999px; }
    .hud-gauge > span { position: absolute; inset: 5px; border-radius: 999px; background: #060e18;
      display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; }
    @keyframes hudPulse { 50% { opacity: .35; } }
    .hud-live { animation: hudPulse 2s ease-in-out infinite; }
    .hud-row:hover { background: rgba(103,232,249,.05); }
  `,
  page: "min-h-screen bg-[#04070d] text-[#c7e8f5]",
  pageStyle: {
    backgroundImage:
      "linear-gradient(rgba(103,232,249,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,.045) 1px, transparent 1px)",
    backgroundSize: "28px 28px",
  },
  header: "relative z-10 flex items-center justify-between gap-4 border-b border-[#67e8f9]/15 px-6 py-3",
  brand: "text-[11px] uppercase tracking-[0.3em] text-[#67e8f9]",
  brandText: "◉ Setlist Scout · Telemetry",
  search:
    "w-56 border border-[#67e8f9]/25 bg-[#060e18] px-3 py-1.5 font-mono text-xs text-[#c7e8f5] placeholder-[#2d5468] outline-none focus:border-[#67e8f9]",
  h1: "text-3xl font-semibold tracking-[0.08em] text-white",
  h1Style: { fontFamily: "var(--font-orbitron), var(--font-geist-sans)" },
  nav: "mt-5 inline-flex gap-1.5",
  navActive:
    "hud-panel hud-corner px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#67e8f9]",
  navIdle:
    "border border-[#67e8f9]/15 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[#4b7f96] hover:text-[#c7e8f5]",
  pills: "mt-6 flex flex-wrap gap-1.5",
  pillActive: "border border-[#67e8f9] bg-[#67e8f9]/10 px-3 py-1.5 font-mono text-xs text-[#67e8f9]",
  pillIdle: "border border-[#67e8f9]/15 px-3 py-1.5 font-mono text-xs text-[#4b7f96] hover:text-[#c7e8f5]",
  subtitle: "mt-6 text-sm leading-relaxed text-[#8fb8c9]",
  panel: "hud-panel hud-corner mt-4 p-5",
  chip: "hud-live border border-[#67e8f9]/50 px-2.5 py-0.5 font-mono text-xs uppercase tracking-[0.2em] text-[#67e8f9]",
  metaLine: "font-mono text-xs text-[#4b7f96]",
  explain: "mt-3 space-y-1.5 text-sm leading-relaxed text-[#8fb8c9]",
  saveDivider: "mt-4 border-t border-[#67e8f9]/15 pt-4",
  legend: "mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs",
  legendSwatch: () => ({ background: "#67e8f9" }),
  legendLabel: "uppercase tracking-[0.15em] text-[#4b7f96]",
  list: "hud-panel hud-corner mt-3",
  row: "hud-row border-b border-[#67e8f9]/10 px-3 py-2 last:border-b-0",
  index: "text-right font-mono text-xs text-[#2d5468]",
  title: "text-white",
  artistText: "text-[#8fb8c9]",
  albumText: "text-[#4b7f96]",
  coverBadge: "ml-2 font-mono text-[10px] font-normal text-[#4b7f96]",
  gauge: (t: LabTrack) => (
    <div className="flex items-center gap-2">
      <span className="hidden text-[9px] uppercase tracking-[0.2em] text-[#4b7f96] sm:block">
        {BAND_LABEL(t.pct)}
      </span>
      <div className="hud-gauge" style={{ background: `conic-gradient(#67e8f9 ${t.pct * 3.6}deg, rgba(103,232,249,.12) 0)` }}>
        <span className="font-mono text-[#67e8f9]">{t.pct}</span>
      </div>
    </div>
  ),
  noMatch: "border-[#67e8f9]/20 text-[#2d5468]",
  tourIntro: "mt-6 font-mono text-xs text-[#4b7f96]",
  tourCard: "hud-panel hud-corner hud-row block px-5 py-4",
  tourName: "font-semibold text-white",
  tourMeta: "font-mono text-xs text-[#4b7f96]",
};

/* ── 07 · THE REVIEW ──────────────────────────────────────────────── */

const SERIF: React.CSSProperties = { fontFamily: "var(--font-playfair), Georgia, serif" };

const editorial: LabSkin = {
  page: "min-h-screen bg-[#faf7f0] text-[#1c1a16]",
  header: "mx-auto flex max-w-3xl items-baseline justify-between gap-4 border-b-4 border-double border-[#1c1a16] px-6 py-5",
  brand: "text-2xl font-medium italic tracking-tight",
  brandText: "The Setlist Review",
  search:
    "w-56 border-b border-[#d9d2c3] bg-transparent px-1 py-1 text-sm italic placeholder-[#b3ab9b] outline-none focus:border-[#1c1a16]",
  h1: "mt-8 text-4xl font-semibold leading-tight",
  h1Style: SERIF,
  nav: "mt-5 flex gap-6 border-b border-[#1c1a16]/20 pb-2",
  navActive: "border-b-2 border-[#b91c1c] pb-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#b91c1c]",
  navIdle: "pb-1 text-[12px] uppercase tracking-[0.2em] text-[#8a8378] hover:text-[#1c1a16]",
  pills: "mt-6 flex gap-5",
  pillActive: "text-sm font-bold underline decoration-[#b91c1c] decoration-2 underline-offset-4",
  pillIdle: "text-sm italic text-[#8a8378] hover:text-[#1c1a16]",
  subtitle: "mt-6 max-w-xl text-[15px] leading-relaxed",
  panel: "mt-6 border-y border-[#1c1a16]/20 py-5",
  chip: "text-[11px] font-semibold uppercase tracking-[0.25em] text-[#b91c1c]",
  metaLine: "text-[11px] uppercase tracking-[0.25em] text-[#8a8378]",
  explain: "mt-3 max-w-xl space-y-1.5 text-sm italic leading-relaxed text-[#5f594e]",
  saveDivider: "mt-5",
  legend: "mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs",
  legendSwatch: (band) => ({ background: band === 0 ? "#b91c1c" : "#1c1a16", opacity: 1 - band * 0.18 }),
  legendLabel: "uppercase tracking-[0.15em] text-[#8a8378]",
  list: "mt-4",
  row: "border-b border-[#e4ddcf] py-3",
  index: "text-right text-2xl text-[#1c1a16]",
  title: "text-[#1c1a16]",
  artistText: "text-[#5f594e]",
  albumText: "text-[#8a8378]",
  coverBadge: "ml-2 text-xs font-normal italic text-[#8a8378]",
  gauge: (t: LabTrack) => (
    <>
      <span className="text-lg" style={SERIF}>
        {t.pct}
        <span className="text-xs">%</span>
      </span>
      <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a8378]">
        {BAND_LABEL(t.pct)} · {t.plays} of 40
      </span>
    </>
  ),
  noMatch: "border-[#d8d0bf] text-[#8a8378]",
  tourIntro: "mt-6 max-w-xl text-[15px] italic leading-relaxed text-[#5f594e]",
  tourCard: "border-b border-[#e4ddcf] py-4 hover:bg-[#f3eee2]",
  tourName: "text-lg font-semibold",
  tourMeta: "text-xs uppercase tracking-[0.15em] text-[#8a8378]",
};

/* ── 08 · CONCRETE ────────────────────────────────────────────────── */

const brutalist: LabSkin = {
  css: `
    .br-card { border: 4px solid #000; box-shadow: 8px 8px 0 #000; background: #fff; }
    .br-row-h:hover { background: #ffe600; }
  `,
  page: "min-h-screen bg-[#f4f4f0] text-black",
  header: "flex items-center justify-between gap-4 border-b-4 border-black bg-[#ffe600] px-6 py-3",
  brand: "text-lg font-black uppercase tracking-tight",
  search:
    "w-56 border-4 border-black bg-white px-3 py-1.5 text-sm font-bold placeholder-[#999] outline-none",
  h1: "br-card mt-2 inline-block -rotate-1 bg-[#ffe600] px-5 py-3 text-4xl font-black uppercase leading-none tracking-tight",
  nav: "mt-8 flex gap-2",
  navActive: "border-4 border-black bg-black px-4 py-1.5 text-sm font-black uppercase text-white",
  navIdle: "border-4 border-black bg-white px-4 py-1.5 text-sm font-black uppercase hover:bg-[#ffe600]",
  pills: "mt-6 flex flex-wrap gap-2",
  pillActive: "border-4 border-black bg-black px-3 py-1 text-xs font-black uppercase text-white",
  pillIdle: "border-4 border-black bg-white px-3 py-1 text-xs font-black uppercase hover:bg-[#ffe600]",
  subtitle: "mt-6 max-w-xl text-base font-bold uppercase leading-snug",
  panel: "br-card mt-4 p-5",
  chip: "bg-black px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#ffe600]",
  metaLine: "text-xs font-bold uppercase",
  explain: "mt-3 space-y-1.5 text-sm font-bold leading-relaxed",
  saveDivider: "mt-4 border-t-4 border-black pt-4",
  legend: "mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs",
  legendSwatch: (band) => ({ background: "#000", opacity: 1 - band * 0.18 }),
  legendLabel: "font-black uppercase",
  list: "br-card mt-3",
  row: "br-row-h border-b-4 border-black px-3 py-3 last:border-b-0",
  index: "text-right text-3xl font-black tabular-nums leading-none",
  title: "text-black",
  artistText: "text-black",
  albumText: "text-black opacity-60",
  coverBadge: "ml-2 bg-black px-1.5 py-0.5 text-[10px] font-black uppercase text-white",
  gauge: (t: LabTrack) => (
    <>
      <span className="text-2xl font-black tabular-nums leading-none">{t.pct}%</span>
      <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${t.pct >= 60 ? "bg-black text-white" : "border-2 border-black"}`}>
        {BAND_LABEL(t.pct)}
      </span>
    </>
  ),
  noMatch: "border-2 border-black font-black opacity-50",
  tourIntro: "mt-6 max-w-xl text-base font-bold uppercase",
  tourCard: "br-card br-row-h block px-5 py-4",
  tourName: "text-lg font-black uppercase",
  tourMeta: "text-xs font-bold uppercase",
};

/* ── 09 · SUNSET GRID ─────────────────────────────────────────────── */

const vaporwave: LabSkin = {
  css: `
    .vw-sun { position: absolute; top: 40px; left: 50%; transform: translateX(-50%);
      width: 190px; height: 190px; border-radius: 999px;
      background: linear-gradient(180deg, #ffd76e, #ff7b9c 55%, #ff4d6d);
      -webkit-mask-image: linear-gradient(180deg, #000 0 55%, transparent 55.5% 60%, #000 60.5% 68%, transparent 68.5% 74%, #000 74.5% 82%, transparent 82.5% 88%, #000 88.5%);
      mask-image: linear-gradient(180deg, #000 0 55%, transparent 55.5% 60%, #000 60.5% 68%, transparent 68.5% 74%, #000 74.5% 82%, transparent 82.5% 88%, #000 88.5%);
      filter: drop-shadow(0 0 40px rgba(255,120,150,.5)); }
    .vw-gridfloor { position: absolute; top: 150px; left: -20%; right: -20%; height: 130px;
      background: repeating-linear-gradient(90deg, rgba(255,110,199,.55) 0 2px, transparent 2px 56px),
        repeating-linear-gradient(0deg, rgba(255,110,199,.55) 0 2px, transparent 2px 26px);
      transform: perspective(220px) rotateX(58deg); transform-origin: top center;
      -webkit-mask-image: linear-gradient(180deg, transparent, #000 25%);
      mask-image: linear-gradient(180deg, transparent, #000 25%); }
    .vw-chrome { background: linear-gradient(180deg, #b7f4ff 8%, #7cc6ff 38%, #ffffff 50%, #ff9ad5 60%, #ff5fa8 92%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 3px 0 rgba(90,20,90,.85)); }
    .vw-card { background: rgba(24,6,56,.72); border: 1px solid rgba(255,110,199,.35);
      backdrop-filter: blur(6px); border-radius: 12px; }
    .vw-row-h:hover { background: rgba(124,198,255,.08); }
  `,
  page: "relative min-h-screen overflow-hidden text-[#ffe9f7]",
  pageStyle: {
    background: "linear-gradient(180deg, #12042e 0%, #3c1064 34%, #a02c7d 62%, #ff6b97 86%, #ffb367 100%)",
  },
  decor: (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-72">
      <div className="vw-sun" />
      <div className="vw-gridfloor" />
    </div>
  ),
  header: "relative z-10 flex items-center justify-between gap-4 px-6 py-3",
  brand: "text-sm font-bold uppercase italic tracking-[0.3em] text-[#7cc6ff]",
  search:
    "vw-card w-56 px-3 py-1.5 text-sm text-[#ffe9f7] placeholder-[#9b7fd4] outline-none focus:border-[#7cc6ff]",
  h1: "vw-chrome mt-24 text-5xl font-black uppercase italic tracking-tight",
  nav: "relative z-10 mt-6 inline-flex gap-1.5",
  navActive: "vw-card border-[#7cc6ff] px-4 py-1.5 text-sm font-bold text-[#b7f4ff]",
  navIdle: "vw-card px-4 py-1.5 text-sm text-[#9b7fd4] hover:text-[#ffe9f7]",
  pills: "mt-6 flex flex-wrap gap-1.5",
  pillActive: "vw-card border-[#ff9ad5] px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-[#ff9ad5]",
  pillIdle: "vw-card px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-[#9b7fd4] hover:text-[#ffe9f7]",
  subtitle: "mt-6 text-sm leading-relaxed text-[#b7f4ff]",
  panel: "vw-card mt-4 p-5",
  chip: "border border-[#7cc6ff]/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#7cc6ff]",
  metaLine: "font-mono text-xs text-[#9b7fd4]",
  explain: "mt-3 space-y-1.5 text-sm leading-relaxed text-[#e2c6f5]",
  saveDivider: "mt-4 border-t border-[#ff9ad5]/25 pt-4",
  legend: "mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs",
  legendSwatch: (band) => ({ background: ["#b7f4ff", "#7cc6ff", "#ff9ad5", "#ff6b97", "#ffd76e"][band] }),
  legendLabel: "uppercase tracking-[0.15em] text-[#9b7fd4]",
  list: "vw-card mt-3",
  row: "vw-row-h border-b border-[#ff9ad5]/15 px-3 py-2.5 last:border-b-0",
  index: "text-right font-mono text-sm text-[#ff9ad5]",
  title: "text-white",
  artistText: "text-[#ff9ad5]",
  albumText: "text-[#9b7fd4]",
  coverBadge: "ml-2 text-xs font-normal text-[#7cc6ff]",
  gauge: (t: LabTrack) => (
    <>
      <span className="font-mono text-sm font-semibold text-[#b7f4ff]" style={{ textShadow: "0 0 12px rgba(124,198,255,.8)" }}>
        {t.pct}%
      </span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#12042e]">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(t.pct, 3)}%`, background: "linear-gradient(90deg, #7cc6ff, #ff9ad5, #ffd76e)" }}
        />
      </div>
    </>
  ),
  noMatch: "border-[#ff9ad5]/30 text-[#9b7fd4]",
  tourIntro: "mt-6 text-sm text-[#b7f4ff]",
  tourCard: "vw-card vw-row-h block px-5 py-4",
  tourName: "font-bold text-white",
  tourMeta: "font-mono text-xs text-[#9b7fd4]",
};

/* ── 10 · AURORA GLASS ────────────────────────────────────────────── */

const aurora: LabSkin = {
  css: `
    .au-blob { position: fixed; border-radius: 999px; filter: blur(90px); opacity: .5; z-index: 0; }
    @keyframes auD1 { 50% { transform: translate(90px, 60px); } }
    @keyframes auD2 { 50% { transform: translate(-70px, -50px); } }
    @keyframes auD3 { 50% { transform: translate(50px, -80px); } }
    .au-glass { background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.12);
      backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.14); }
    .au-row-h:hover { background: rgba(255,255,255,.05); }
  `,
  page: "relative min-h-screen overflow-hidden bg-[#08080d] text-zinc-100",
  decor: (
    <>
      <div className="au-blob h-[480px] w-[480px] bg-violet-600" style={{ top: "-8%", left: "-10%", animation: "auD1 18s ease-in-out infinite" }} />
      <div className="au-blob h-[420px] w-[420px] bg-cyan-500" style={{ top: "30%", right: "-12%", animation: "auD2 22s ease-in-out infinite" }} />
      <div className="au-blob h-[380px] w-[380px] bg-emerald-500" style={{ bottom: "-10%", left: "22%", animation: "auD3 26s ease-in-out infinite", opacity: 0.35 }} />
    </>
  ),
  header: "au-glass relative z-10 mx-4 mt-4 flex items-center justify-between gap-4 px-5 py-3",
  brand: "text-base font-semibold tracking-tight text-white",
  search:
    "w-56 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white placeholder-white/40 outline-none focus:border-white/40",
  h1: "mt-8 text-4xl font-semibold tracking-tight text-white",
  nav: "au-glass mt-5 inline-flex p-1",
  navActive: "rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white",
  navIdle: "rounded-full px-4 py-1.5 text-sm font-medium text-white/50 hover:text-white",
  pills: "mt-6 flex flex-wrap gap-2",
  pillActive: "rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-sm text-white",
  pillIdle: "rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/50 hover:text-white",
  subtitle: "mt-6 text-sm leading-relaxed text-white/60",
  panel: "au-glass mt-4 p-5",
  chip: "rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs text-white/70",
  metaLine: "font-mono text-xs text-white/45",
  explain: "mt-3 space-y-1.5 text-sm leading-relaxed text-white/70",
  saveDivider: "mt-4 border-t border-white/10 pt-4",
  legend: "mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs",
  legendSwatch: (band) => ({ background: V1[band], boxShadow: `0 0 10px ${V1[band]}` }),
  legendLabel: "text-white/40",
  list: "au-glass mt-3",
  row: "au-row-h border-b border-white/[0.07] px-4 py-2.5 last:border-b-0",
  index: "text-right font-mono text-sm text-white/30",
  title: "text-white",
  artistText: "text-white/60",
  albumText: "text-white/40",
  coverBadge: "ml-2 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-normal text-white/60",
  gauge: (t: LabTrack) => (
    <>
      <span className="flex items-center gap-2 font-mono text-sm font-semibold text-white">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: at(V1, t.pct), boxShadow: `0 0 10px ${at(V1, t.pct)}` }} />
        {t.pct}%
      </span>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-white/70" style={{ width: `${Math.max(t.pct, 2)}%` }} />
      </div>
    </>
  ),
  noMatch: "border-white/15 text-white/40",
  tourIntro: "mt-6 text-sm text-white/60",
  tourCard: "au-glass au-row-h block px-5 py-4",
  tourName: "font-semibold text-white",
  tourMeta: "font-mono text-xs text-white/45",
};

export const SKINS: Record<string, LabSkin> = {
  cyberpunk,
  hifi,
  winamp,
  minimal,
  "motion-spring": motionSpring,
  "motion-cascade": motionCascade,
  "motion-pop": motionPop,
  "motion-calm": motionCalm,
  "motion-kinetic": motionKinetic,
  "motion-nightcity": motionNightCity,
  hud,
  editorial,
  brutalist,
  vaporwave,
  aurora,
};
