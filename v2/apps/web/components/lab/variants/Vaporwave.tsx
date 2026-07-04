import { LAB, TRACKS, BAND_LABEL } from "../data";

/* 09 · SUNSET GRID — vaporwave: sunset sky, striped sun on the horizon,
   perspective grid floor, chrome-pink title, katakana subtitles.
   Spotify zones canonical. */

export default function Vaporwave() {
  return (
    <div
      className="vw min-h-screen text-[#ffe9f7]"
      style={{
        fontFamily: "var(--font-geist-sans)",
        background: "linear-gradient(180deg, #12042e 0%, #3c1064 34%, #a02c7d 62%, #ff6b97 82%, #ffb367 100%)",
      }}
    >
      <style>{`
        .vw-sun {
          width: 220px; height: 220px; border-radius: 999px; margin: 0 auto;
          background: linear-gradient(180deg, #ffd76e, #ff7b9c 55%, #ff4d6d);
          -webkit-mask-image: linear-gradient(180deg, #000 0 55%, transparent 55.5% 60%, #000 60.5% 68%, transparent 68.5% 74%, #000 74.5% 82%, transparent 82.5% 88%, #000 88.5%);
          mask-image: linear-gradient(180deg, #000 0 55%, transparent 55.5% 60%, #000 60.5% 68%, transparent 68.5% 74%, #000 74.5% 82%, transparent 82.5% 88%, #000 88.5%);
          filter: drop-shadow(0 0 40px rgba(255,120,150,.55));
        }
        .vw-grid {
          height: 130px; margin-top: -60px;
          background:
            repeating-linear-gradient(90deg, rgba(255,110,199,.7) 0 2px, transparent 2px 56px),
            repeating-linear-gradient(0deg, rgba(255,110,199,.7) 0 2px, transparent 2px 26px);
          transform: perspective(220px) rotateX(58deg) scale(1.4);
          transform-origin: top center;
          -webkit-mask-image: linear-gradient(180deg, transparent, #000 25%);
          mask-image: linear-gradient(180deg, transparent, #000 25%);
        }
        .vw-chrome {
          background: linear-gradient(180deg, #b7f4ff 8%, #7cc6ff 38%, #ffffff 50%, #ff9ad5 60%, #ff5fa8 92%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          filter: drop-shadow(0 3px 0 rgba(90,20,90,.85)) drop-shadow(0 0 22px rgba(124,198,255,.4));
        }
        .vw-card {
          background: rgba(24, 6, 56, .72); border: 1px solid rgba(255,110,199,.35);
          backdrop-filter: blur(6px); border-radius: 12px;
          box-shadow: 0 0 24px rgba(255,110,199,.14);
        }
        .vw-row { border-bottom: 1px solid rgba(255,110,199,.16); }
        .vw-row:last-child { border-bottom: 0; }
        .vw-row:hover { background: rgba(124,198,255,.08); }
        .vw-bar { background: linear-gradient(90deg, #7cc6ff, #ff9ad5, #ffd76e); }
        @keyframes vwFloat { from { transform: translateY(0); } 50% { transform: translateY(-8px); } to { transform: translateY(0); } }
        .vw-float { animation: vwFloat 6s ease-in-out infinite; }
      `}</style>

      <div className="overflow-hidden pt-12">
        <div className="vw-sun vw-float" />
        <div className="vw-grid" />
      </div>

      <main className="relative z-10 mx-auto -mt-10 max-w-3xl px-6 pb-16">
        <div className="text-center">
          <h1 className="vw-chrome text-6xl font-black uppercase italic tracking-tight">
            {LAB.artist}
          </h1>
          <p className="mt-2 text-sm tracking-[0.5em] text-[#7cc6ff]">セットリスト・スカウト</p>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-[#ff9ad5]">
            {LAB.tour} · {LAB.shows} nights · {LAB.from} → {LAB.to}
          </p>
        </div>

        <div className="vw-card mt-8 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <p className="text-sm text-[#b7f4ff]">
            ~{LAB.setLength}{" "}
            songs a night — ranked by the odds you&apos;ll hear it
            <span className="ml-3 rounded border border-[#7cc6ff]/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#7cc6ff]">
              conf: high
            </span>
          </p>
          <button className="rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-white hover:brightness-110">
            Save {TRACKS.filter((t) => t.matched).length} songs as Spotify playlist
          </button>
        </div>

        <div className="vw-card mt-6">
          <ol>
            {TRACKS.map((t) => (
              <li key={t.rank} className="vw-row grid grid-cols-[2rem_4rem_1fr_auto] items-center gap-3 px-4 py-2.5">
                <span className="text-right font-mono text-sm text-[#ff9ad5]">{String(t.rank).padStart(2, "0")}</span>
                {/* Spotify zone: canonical art + stacked meta */}
                {t.matched && t.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.cover} alt="" className="h-16 w-16 rounded object-cover" style={{ boxShadow: "0 0 14px rgba(124,198,255,.3)" }} />
                ) : (
                  <div className="h-16 w-16 rounded bg-[#12042e]" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {t.title}
                    {t.coverOf && <span className="ml-2 text-xs font-normal text-[#7cc6ff]">〜 {t.coverOf} cover</span>}
                  </p>
                  {t.matched && (
                    <>
                      <p className="truncate text-sm text-[#ff9ad5]">{t.artist}</p>
                      <p className="truncate text-xs text-[#9b7fd4]">{t.album}</p>
                    </>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-sm font-semibold text-[#b7f4ff]" style={{ textShadow: "0 0 12px rgba(124,198,255,.8)" }}>
                    {t.pct}%
                  </span>
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#12042e]">
                    <div className="vw-bar h-full rounded-full" style={{ width: `${Math.max(t.pct, 3)}%` }} />
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.25em] text-[#9b7fd4]">{BAND_LABEL(t.pct)}</span>
                  {t.matched ? (
                    <a className="rounded-full bg-[#1DB954] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white hover:brightness-110" href="#">
                      OPEN SPOTIFY
                    </a>
                  ) : (
                    <span className="rounded-full border border-[#ff9ad5]/30 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#9b7fd4]">
                      NO MATCH
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-10 text-center text-xs tracking-[0.5em] text-[#ff9ad5]">
          ＳＥＴＬＩＳＴ　ＳＣＯＵＴ　１９８６
        </p>
      </main>
    </div>
  );
}
