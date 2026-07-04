import { LAB, TRACKS, BAND_LABEL } from "../data";

/* 05 · MOTION — the current zinc/indigo language, but everything moves:
   staggered entrances, bars that grow in, pulsing rings, hover lifts,
   shimmer accents, springy micro-interactions. Spotify zones canonical. */

const BAND_COLOR = (pct: number) =>
  pct >= 80 ? "#8b5cf6" : pct >= 60 ? "#0ea5e9" : pct >= 40 ? "#eab308" : pct >= 20 ? "#f97316" : "#e11d48";

export default function Motion() {
  return (
    <div className="mo min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <style>{`
        @keyframes moUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes moBlur { from { opacity: 0; filter: blur(8px); transform: scale(.98); } to { opacity: 1; filter: blur(0); transform: none; } }
        @keyframes moGrow { from { width: 0; } }
        @keyframes moPing { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(2.1); opacity: 0; } }
        @keyframes moShimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
        @keyframes moSpin { to { transform: rotate(1turn); } }
        .mo-up { animation: moUp .55s cubic-bezier(.21,1.02,.73,1) both; }
        .mo-blur { animation: moBlur .7s cubic-bezier(.21,1.02,.73,1) both; }
        .mo-row { transition: transform .18s cubic-bezier(.34,1.56,.64,1), background .18s, box-shadow .18s; }
        .mo-row:hover { transform: translateY(-2px) scale(1.005); background: #18181b; box-shadow: 0 8px 30px rgba(0,0,0,.45); }
        .mo-row:hover img { transform: scale(1.06) rotate(-1deg); }
        .mo-row img { transition: transform .25s cubic-bezier(.34,1.56,.64,1); }
        .mo-bar { animation: moGrow 1s cubic-bezier(.22,1,.36,1) both; }
        .mo-shimmer {
          background: linear-gradient(100deg, #a1a1aa 40%, #fafafa 50%, #a1a1aa 60%);
          background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: moShimmer 3.2s linear infinite;
        }
        .mo-ring { position: relative; }
        .mo-ring::after {
          content: ""; position: absolute; inset: -3px; border-radius: 999px;
          border: 1.5px solid #8b5cf6; animation: moPing 1.8s cubic-bezier(0,0,.2,1) infinite;
        }
        .mo-save { position: relative; overflow: hidden; }
        .mo-save::before {
          content: ""; position: absolute; inset: -60%; z-index: 0;
          background: conic-gradient(from 0deg, transparent 0 70%, rgba(255,255,255,.5) 82%, transparent 95%);
          animation: moSpin 2.8s linear infinite;
        }
        .mo-save > span { position: relative; z-index: 1; }
      `}</style>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="mo-up text-xs font-medium uppercase tracking-[0.2em] text-indigo-400" style={{ animationDelay: "0ms" }}>
          Design lab 05 — motion
        </p>
        <h1 className="mo-blur mt-2 text-4xl font-semibold tracking-tight" style={{ animationDelay: "80ms" }}>
          {LAB.artist}
        </h1>
        <p className="mo-up mt-2 text-sm text-zinc-400" style={{ animationDelay: "160ms" }}>
          {LAB.tour} · they play about {LAB.setLength}{" "}
          songs a night — ranked by the odds you&apos;ll hear it.
        </p>

        <section
          className="mo-blur mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5"
          style={{ animationDelay: "240ms" }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="mo-ring rounded-full border border-violet-500/50 bg-violet-500/10 px-2.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wide text-violet-300">
              high confidence
            </span>
            <span className="mo-shimmer font-mono text-xs">
              {LAB.shows} shows · {LAB.from} → {LAB.to}
            </span>
          </div>
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <button className="mo-save rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-white hover:brightness-110">
              <span>Save {TRACKS.filter((t) => t.matched).length} songs as Spotify playlist</span>
            </button>
          </div>
        </section>

        <ol className="mt-8 space-y-1.5">
          {TRACKS.map((t, i) => (
            <li
              key={t.rank}
              className="mo-row mo-up grid grid-cols-[2rem_4rem_1fr_auto] items-center gap-3 rounded-xl px-3 py-2"
              style={{ animationDelay: `${320 + i * 70}ms` }}
            >
              <span className="text-right font-mono text-sm text-zinc-600">{t.rank}</span>
              {/* Spotify zone: canonical art + stacked meta */}
              {t.matched && t.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.cover} alt="" className="h-16 w-16 rounded object-cover shadow-md" />
              ) : (
                <div className="h-16 w-16 rounded bg-zinc-900" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {t.title}
                  {t.coverOf && (
                    <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-normal text-zinc-400">
                      {t.coverOf} cover
                    </span>
                  )}
                </p>
                {t.matched && (
                  <>
                    <p className="truncate text-sm text-zinc-400">{t.artist}</p>
                    <p className="truncate text-xs text-zinc-500">{t.album}</p>
                  </>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-mono text-sm font-semibold" style={{ color: BAND_COLOR(t.pct) }}>
                  {t.pct}%
                </span>
                <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="mo-bar h-full rounded-full"
                    style={{
                      width: `${Math.max(t.pct, 2)}%`,
                      background: BAND_COLOR(t.pct),
                      animationDelay: `${500 + i * 70}ms`,
                    }}
                  />
                </div>
                <span className="font-mono text-[10px] text-zinc-600">{BAND_LABEL(t.pct)}</span>
                {t.matched ? (
                  <a className="rounded-full bg-[#1DB954] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white hover:brightness-110" href="#">
                    OPEN SPOTIFY
                  </a>
                ) : (
                  <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-zinc-600">
                    NO MATCH
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
