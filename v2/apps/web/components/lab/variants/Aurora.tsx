import { LAB, TRACKS, BAND_LABEL } from "../data";

/* 10 · AURORA GLASS — frosted glassmorphism over slow-drifting color fields:
   translucent cards, backdrop blur, soft glows, hairline white borders.
   Spotify zones canonical. */

const GLOW = (pct: number) =>
  pct >= 80 ? "#a78bfa" : pct >= 60 ? "#38bdf8" : pct >= 40 ? "#fde047" : pct >= 20 ? "#fb923c" : "#fb7185";

export default function Aurora() {
  return (
    <div className="au relative min-h-screen overflow-hidden bg-[#08080d] text-zinc-100" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <style>{`
        .au-blob { position: fixed; border-radius: 999px; filter: blur(90px); opacity: .5; z-index: 0; }
        @keyframes auDrift1 { from { transform: translate(0,0); } 50% { transform: translate(90px, 60px); } to { transform: translate(0,0); } }
        @keyframes auDrift2 { from { transform: translate(0,0); } 50% { transform: translate(-70px, -50px); } to { transform: translate(0,0); } }
        @keyframes auDrift3 { from { transform: translate(0,0); } 50% { transform: translate(50px, -80px); } to { transform: translate(0,0); } }
        .au-glass {
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(255,255,255,.12);
          backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.14);
        }
        .au-row { border-bottom: 1px solid rgba(255,255,255,.07); }
        .au-row:last-child { border-bottom: 0; }
        .au-row:hover { background: rgba(255,255,255,.05); }
      `}</style>

      <div className="au-blob h-[480px] w-[480px] bg-violet-600" style={{ top: "-8%", left: "-10%", animation: "auDrift1 18s ease-in-out infinite" }} />
      <div className="au-blob h-[420px] w-[420px] bg-cyan-500" style={{ top: "30%", right: "-12%", animation: "auDrift2 22s ease-in-out infinite" }} />
      <div className="au-blob h-[380px] w-[380px] bg-emerald-500" style={{ bottom: "-10%", left: "22%", animation: "auDrift3 26s ease-in-out infinite", opacity: 0.35 }} />

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-14">
        <div className="au-glass px-7 py-6">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/50">Predicted setlist</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">{LAB.artist}</h1>
          <p className="mt-2 text-sm text-white/60">
            {LAB.tour} · {LAB.shows} shows · they play about {LAB.setLength} songs a night
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs text-white/70">
              high confidence · {LAB.from} → {LAB.to}
            </span>
            <button className="rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-white hover:brightness-110">
              Save {TRACKS.filter((t) => t.matched).length} songs as Spotify playlist
            </button>
          </div>
        </div>

        <div className="au-glass mt-6">
          <ol>
            {TRACKS.map((t) => (
              <li key={t.rank} className="au-row grid grid-cols-[2rem_4rem_1fr_auto] items-center gap-3 px-5 py-2.5">
                <span className="text-right font-mono text-sm text-white/30">{t.rank}</span>
                {/* Spotify zone: canonical art + stacked meta */}
                {t.matched && t.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.cover} alt="" className="h-16 w-16 rounded-lg object-cover shadow-lg" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-white/5" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {t.title}
                    {t.coverOf && (
                      <span className="ml-2 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-normal text-white/60">
                        {t.coverOf} cover
                      </span>
                    )}
                  </p>
                  {t.matched && (
                    <>
                      <p className="truncate text-sm text-white/60">{t.artist}</p>
                      <p className="truncate text-xs text-white/40">{t.album}</p>
                    </>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="flex items-center gap-2 font-mono text-sm font-semibold text-white">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: GLOW(t.pct), boxShadow: `0 0 10px ${GLOW(t.pct)}` }}
                    />
                    {t.pct}%
                  </span>
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-white/70" style={{ width: `${Math.max(t.pct, 2)}%` }} />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">{BAND_LABEL(t.pct)}</span>
                  {t.matched ? (
                    <a className="rounded-full bg-[#1DB954] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white hover:brightness-110" href="#">
                      OPEN SPOTIFY
                    </a>
                  ) : (
                    <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white/40">
                      NO MATCH
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-8 text-center text-xs text-white/30">Setlist Scout — design lab 10/10</p>
      </main>
    </div>
  );
}
