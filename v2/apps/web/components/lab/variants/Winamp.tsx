import { LAB, TRACKS } from "../data";

/* 03 · LLAMA — late-90s Winamp skin: beveled window chrome, green-on-black
   playlist, bouncing EQ spectrum, tiny Tahoma text. Spotify zones canonical. */

const EQ_BARS = [0.7, 1, 0.5, 0.85, 0.6];

export default function Winamp() {
  return (
    <div className="wa min-h-screen bg-[#3f3f52] px-4 py-10" style={{ fontFamily: "Tahoma, 'MS Sans Serif', var(--font-geist-sans)" }}>
      <style>{`
        .wa-window {
          background: #292939;
          border: 2px solid;
          border-color: #7c7c94 #14141c #14141c #7c7c94;
          box-shadow: 4px 4px 0 rgba(0,0,0,.35);
        }
        .wa-titlebar {
          background: linear-gradient(180deg, #58587a, #34344c);
          border-bottom: 2px solid #14141c;
        }
        .wa-btn {
          background: #4a4a61; border: 2px solid; border-color: #8a8aa5 #1a1a26 #1a1a26 #8a8aa5;
          color: #d6d6e4; font-size: 9px; line-height: 1;
        }
        .wa-btn:active { border-color: #1a1a26 #8a8aa5 #8a8aa5 #1a1a26; }
        .wa-display { background: #000; border: 2px solid; border-color: #14141c #7c7c94 #7c7c94 #14141c; }
        .wa-green { color: #00ff00; }
        .wa-marquee { overflow: hidden; white-space: nowrap; }
        .wa-marquee > span { display: inline-block; padding-right: 4rem; animation: waScroll 14s linear infinite; }
        @keyframes waScroll { to { transform: translateX(-50%); } }
        .wa-eq { display: flex; align-items: flex-end; gap: 2px; height: 28px; }
        .wa-eq i {
          width: 5px; border-radius: 1px 1px 0 0;
          background: linear-gradient(180deg, #ff3b30 0%, #ffcc00 45%, #00ff00 70%);
          background-size: 100% 28px; background-position: bottom;
          transform-origin: bottom; animation: waBounce 1.1s ease-in-out infinite alternate;
        }
        @keyframes waBounce { from { transform: scaleY(.55); } to { transform: scaleY(1); } }
        .wa-row { border-bottom: 1px solid #0a2a0a; }
        .wa-row:hover { background: #0000c6; }
        .wa-row:hover .wa-green, .wa-row:hover .wa-dim { color: #fff; }
        .wa-dim { color: #00aa00; }
      `}</style>

      <main className="mx-auto max-w-3xl">
        <div className="wa-window">
          {/* title bar */}
          <div className="wa-titlebar flex items-center justify-between px-2 py-1">
            <p className="text-[10px] font-bold tracking-wider text-[#e8e8f4]">
              SETLIST SCOUT v2.91 — PREDICTED SETLIST [{TRACKS.length} tracks]
            </p>
            <div className="flex gap-1">
              {["_", "□", "×"].map((c) => (
                <button key={c} className="wa-btn h-4 w-4">{c}</button>
              ))}
            </div>
          </div>

          {/* main display */}
          <div className="grid gap-2 p-3 sm:grid-cols-[1fr_auto]">
            <div className="wa-display px-3 py-2 font-mono">
              <div className="wa-marquee wa-green text-sm font-bold">
                <span>
                  ** {LAB.artist.toUpperCase()} — {LAB.tour.toUpperCase()} *** {LAB.shows} SHOWS ANALYZED *** ~{LAB.setLength} SONGS A NIGHT *** CONFIDENCE: HIGH **
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-[10px] text-[#00aa00]">
                <span>128 kbps</span><span>44 khz</span><span>stereo</span>
                <span className="wa-green">{LAB.from} → {LAB.to}</span>
              </div>
            </div>
            <div className="wa-display wa-eq px-3 py-2" style={{ height: "auto" }}>
              {Array.from({ length: 14 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    height: `${10 + ((i * 7) % 18)}px`,
                    animationDelay: `${i * 0.09}s`,
                    animationDuration: `${0.8 + (i % 5) * 0.14}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* transport */}
          <div className="flex items-center gap-1 px-3 pb-2">
            {["⏮", "▶", "⏸", "⏹", "⏭", "⏏"].map((c) => (
              <button key={c} className="wa-btn h-7 w-9 text-[11px]">{c}</button>
            ))}
            <div className="ml-auto">
              <button className="rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-white hover:brightness-110" style={{ fontFamily: "var(--font-geist-sans)" }}>
                Save {TRACKS.filter((t) => t.matched).length} songs as Spotify playlist
              </button>
            </div>
          </div>

          {/* playlist */}
          <div className="wa-display m-3 mt-0">
            <ol>
              {TRACKS.map((t) => (
                <li key={t.rank} className="wa-row grid grid-cols-[1.5rem_4rem_1fr_auto_auto] items-center gap-3 px-2 py-1.5">
                  <span className="wa-dim text-right font-mono text-[11px]">{t.rank}.</span>
                  {/* Spotify zone: canonical art + stacked meta, platform sans */}
                  {t.matched && t.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.cover} alt="" className="h-16 w-16 object-cover" />
                  ) : (
                    <div className="h-16 w-16 border border-[#0a3a0a] bg-black" />
                  )}
                  <div className="min-w-0" style={{ fontFamily: "var(--font-geist-sans)" }}>
                    <p className="wa-green truncate text-sm font-bold">
                      {t.title}
                      {t.coverOf && <span className="wa-dim ml-2 text-[10px] font-normal">[{t.coverOf} cover]</span>}
                    </p>
                    {t.matched && (
                      <>
                        <p className="wa-dim truncate text-xs">{t.artist}</p>
                        <p className="wa-dim truncate text-[10px] opacity-80">{t.album}</p>
                      </>
                    )}
                  </div>
                  <div className="hidden flex-col items-center sm:flex">
                    <div className="wa-eq">
                      {EQ_BARS.map((h, i) => (
                        <i key={i} style={{ height: `${Math.max(4, h * t.pct * 0.28)}px`, animationDelay: `${i * 0.12}s` }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="wa-green font-mono text-[11px]">{t.pct}% · {t.plays}/{LAB.shows}</span>
                    {t.matched ? (
                      <a className="rounded-full bg-[#1DB954] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white hover:brightness-110" style={{ fontFamily: "var(--font-geist-sans)" }} href="#">
                        OPEN SPOTIFY
                      </a>
                    ) : (
                      <span className="wa-dim rounded-full border border-[#0a3a0a] px-2.5 py-1 text-[10px] font-semibold tracking-wide" style={{ fontFamily: "var(--font-geist-sans)" }}>
                        NO MATCH
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <p className="wa-dim px-3 pb-2 text-right font-mono text-[10px]">it really whips the llama&apos;s ass</p>
        </div>
      </main>
    </div>
  );
}
