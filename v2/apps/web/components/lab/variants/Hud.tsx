import { LAB, TRACKS, BAND_LABEL } from "../data";

/* 06 · TELEMETRY — futuristic mission-control data HUD: thin cyan strokes,
   corner brackets, radial gauges, mono numerals, gridline background.
   Spotify zones canonical. */

export default function Hud() {
  const avg = Math.round(TRACKS.reduce((s, t) => s + t.pct, 0) / TRACKS.length);
  return (
    <div
      className="hud min-h-screen bg-[#04070d] text-[#c7e8f5]"
      style={{
        fontFamily: "var(--font-geist-sans)",
        backgroundImage:
          "linear-gradient(rgba(103,232,249,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,.045) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <style>{`
        .hud-panel { position: relative; border: 1px solid rgba(103,232,249,.18); background: rgba(6,14,24,.82); }
        .hud-corner::before, .hud-corner::after,
        .hud-corner > b::before, .hud-corner > b::after {
          content: ""; position: absolute; width: 10px; height: 10px; border-color: #67e8f9; border-style: solid;
        }
        .hud-corner::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
        .hud-corner::after { top: -1px; right: -1px; border-width: 2px 2px 0 0; }
        .hud-corner > b::before { bottom: -1px; left: -1px; border-width: 0 0 2px 2px; }
        .hud-corner > b::after { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
        .hud-label { font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: #4b7f96; }
        .hud-gauge { position: relative; width: 48px; height: 48px; border-radius: 999px; }
        .hud-gauge > span {
          position: absolute; inset: 5px; border-radius: 999px; background: #060e18;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600;
        }
        @keyframes hudSweep { from { opacity: .25; } 50% { opacity: 1; } to { opacity: .25; } }
        .hud-live { animation: hudSweep 2s ease-in-out infinite; }
        .hud-row { border-bottom: 1px solid rgba(103,232,249,.1); }
        .hud-row:hover { background: rgba(103,232,249,.05); }
      `}</style>

      <main className="mx-auto max-w-3xl px-6 py-12 relative z-10">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="hud-label">
              <span className="hud-live mr-2 inline-block h-2 w-2 rounded-full bg-[#67e8f9] align-middle" />
              setlist telemetry · lab 06
            </p>
            <h1
              className="mt-2 text-3xl font-semibold tracking-[0.08em] text-white"
              style={{ fontFamily: "var(--font-orbitron), var(--font-geist-sans)" }}
            >
              {LAB.artist.toUpperCase()}
            </h1>
            <p className="mt-1 font-mono text-xs text-[#4b7f96]">TARGET: {LAB.tour.toUpperCase()}</p>
          </div>
          <div className="hidden text-right font-mono text-xs leading-relaxed text-[#67e8f9] sm:block">
            <p>SHOWS ── {LAB.shows}</p>
            <p>WINDOW ─ 117D</p>
            <p>CONF ─── 0.94</p>
          </div>
        </div>

        {/* signal strip: every track as a column */}
        <div className="hud-panel hud-corner mt-8 p-4"><b />
          <p className="hud-label">likelihood signal · all tracked songs</p>
          <div className="mt-3 flex h-14 items-end gap-1.5">
            {TRACKS.map((t) => (
              <div key={t.rank} className="flex-1 rounded-t-[2px] bg-[#67e8f9]" style={{ height: `${t.pct}%`, opacity: 0.25 + t.pct / 140 }} />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[#67e8f9]/10 pt-3">
            <p className="font-mono text-xs text-[#4b7f96]">
              MEAN {avg}% · SET_LEN ~{LAB.setLength} · {LAB.from} → {LAB.to}
            </p>
            <button className="rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-white hover:brightness-110">
              Save {TRACKS.filter((t) => t.matched).length} songs as Spotify playlist
            </button>
          </div>
        </div>

        <div className="hud-panel hud-corner mt-6"><b />
          <ol>
            {TRACKS.map((t) => (
              <li key={t.rank} className="hud-row grid grid-cols-[2.25rem_4rem_1fr_auto_auto] items-center gap-3 px-3 py-2">
                <span className="text-right font-mono text-xs text-[#2d5468]">{String(t.rank).padStart(2, "0")}</span>
                {/* Spotify zone: canonical art + stacked meta */}
                {t.matched && t.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.cover} alt="" className="h-16 w-16 rounded object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded border border-[#67e8f9]/15 bg-[#060e18]" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {t.title}
                    {t.coverOf && <span className="ml-2 font-mono text-[10px] font-normal text-[#4b7f96]">◈ {t.coverOf} COVER</span>}
                  </p>
                  {t.matched && (
                    <>
                      <p className="truncate text-sm text-[#8fb8c9]">{t.artist}</p>
                      <p className="truncate text-xs text-[#4b7f96]">{t.album}</p>
                    </>
                  )}
                </div>
                <div className="hidden flex-col items-end sm:flex">
                  <span className="hud-label">{BAND_LABEL(t.pct)}</span>
                  <span className="font-mono text-[10px] text-[#2d5468]">{t.plays}/{LAB.shows} SHOWS</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="hud-gauge"
                    style={{ background: `conic-gradient(#67e8f9 ${t.pct * 3.6}deg, rgba(103,232,249,.12) 0)` }}
                  >
                    <span className="font-mono text-[#67e8f9]">{t.pct}</span>
                  </div>
                  {t.matched ? (
                    <a className="rounded-full bg-[#1DB954] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white hover:brightness-110" href="#">
                      OPEN SPOTIFY
                    </a>
                  ) : (
                    <span className="rounded-full border border-[#67e8f9]/20 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#2d5468]">
                      NO MATCH
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-6 text-center font-mono text-[10px] tracking-[0.3em] text-[#2d5468]">
          — SETLIST SCOUT · TELEMETRY MODE · ALL SYSTEMS NOMINAL —
        </p>
      </main>
    </div>
  );
}
