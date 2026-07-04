import { LAB, TRACKS, BAND_LABEL } from "../data";

/* 01 · NIGHT CITY — matrix glitches, scanlines, phosphor green, rgb-split
   title, terminal readouts. Spotify zones stay canonical. */

const HUE = (pct: number) =>
  pct >= 80 ? "#00ff9f" : pct >= 60 ? "#00e5ff" : pct >= 40 ? "#ffe600" : pct >= 20 ? "#ff9e00" : "#ff2965";

const blocks = (pct: number) => {
  const on = Math.round(pct / 10);
  return "▮".repeat(on) + "░".repeat(10 - on);
};

export default function Cyberpunk() {
  return (
    <div className="cp min-h-screen bg-black font-mono text-[#9dffce]">
      <style>{`
        .cp { position: relative; }
        .cp::after {
          content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 30;
          background: repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 1px, transparent 1px 3px);
          mix-blend-mode: multiply;
        }
        .cp-flicker { animation: cpFlicker 7s infinite steps(1); }
        @keyframes cpFlicker {
          0%, 93%, 100% { opacity: 1; }
          94% { opacity: .82; } 94.4% { opacity: 1; }
          97% { opacity: .9; } 97.2% { opacity: 1; }
        }
        .cp-glitch { position: relative; display: inline-block; }
        .cp-glitch::before, .cp-glitch::after {
          content: attr(data-text); position: absolute; inset: 0; overflow: hidden;
        }
        .cp-glitch::before { color: #ff2965; animation: cpSliceA 3.1s infinite linear alternate; }
        .cp-glitch::after { color: #00e5ff; animation: cpSliceB 2.3s infinite linear alternate; }
        @keyframes cpSliceA {
          0%, 88%, 100% { clip-path: inset(0 0 100% 0); transform: none; }
          90% { clip-path: inset(12% 0 60% 0); transform: translate(-3px, -1px); }
          94% { clip-path: inset(60% 0 8% 0); transform: translate(3px, 1px); }
          97% { clip-path: inset(30% 0 45% 0); transform: translate(-2px, 0); }
        }
        @keyframes cpSliceB {
          0%, 84%, 100% { clip-path: inset(0 0 100% 0); transform: none; }
          86% { clip-path: inset(70% 0 5% 0); transform: translate(3px, 1px); }
          91% { clip-path: inset(8% 0 75% 0); transform: translate(-3px, -1px); }
          95% { clip-path: inset(40% 0 40% 0); transform: translate(2px, 0); }
        }
        .cp-row { border: 1px solid rgba(0,255,159,.22); background: rgba(0,255,159,.03); transition: background .1s, border-color .1s; }
        .cp-row:hover { background: rgba(0,255,159,.09); border-color: rgba(0,255,159,.6); box-shadow: 0 0 18px rgba(0,255,159,.15); }
        .cp-cursor::after { content: "▊"; animation: cpBlink 1s steps(1) infinite; }
        @keyframes cpBlink { 50% { opacity: 0; } }
      `}</style>

      <main className="cp-flicker relative z-10 mx-auto max-w-3xl px-6 py-12">
        <p className="text-xs tracking-[0.3em] text-[#00e5ff]">SETLIST://SCOUT — DESIGN LAB 01/10</p>
        <h1
          data-text="THE ANALOG HEARTS"
          className="cp-glitch mt-3 text-4xl font-bold tracking-widest text-[#eafff4]"
          style={{ fontFamily: "var(--font-vt323), monospace", fontSize: "3.2rem" }}
        >
          THE ANALOG HEARTS
        </h1>
        <p className="cp-cursor mt-1 text-sm text-[#5cd6a3]">
          &gt; scanning {LAB.tour.toLowerCase()} … {LAB.shows} shows decrypted
        </p>

        <section className="mt-8 border border-[#00ff9f]/30 bg-[#001a10]/60 p-4 text-xs leading-relaxed">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[#00e5ff]">
            <span>CONF: ██ HIGH</span>
            <span>WINDOW: {LAB.from} → {LAB.to}</span>
            <span>SET_LEN: ~{LAB.setLength}</span>
          </div>
          <p className="mt-2 text-[#5cd6a3]">{LAB.explanation[1]}</p>
          <button className="mt-4 rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-white hover:brightness-110" style={{ fontFamily: "var(--font-geist-sans)" }}>
            Save {TRACKS.filter((t) => t.matched).length} songs as Spotify playlist
          </button>
        </section>

        <ol className="mt-8 space-y-2">
          {TRACKS.map((t) => (
            <li key={t.rank} className="cp-row grid grid-cols-[2rem_4rem_1fr_auto] items-center gap-3 px-3 py-2">
              <span className="text-right text-sm text-[#2e7d5b]">{String(t.rank).padStart(2, "0")}</span>
              {/* Spotify zone: canonical art + stacked meta, platform sans */}
              {t.matched && t.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.cover} alt="" className="h-16 w-16 rounded object-cover" />
              ) : (
                <div className="h-16 w-16 rounded border border-[#00ff9f]/20 bg-black" />
              )}
              <div className="min-w-0" style={{ fontFamily: "var(--font-geist-sans)" }}>
                <p className="truncate text-sm font-bold text-[#eafff4]">
                  {t.title}
                  {t.coverOf && <span className="ml-2 text-xs font-normal text-[#5cd6a3]">[{t.coverOf} cover]</span>}
                </p>
                {t.matched && (
                  <>
                    <p className="truncate text-sm text-[#7de0b4]">{t.artist}</p>
                    <p className="truncate text-xs text-[#3f9d74]">{t.album}</p>
                  </>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs" style={{ color: HUE(t.pct) }}>
                  [{blocks(t.pct)}] {String(t.pct).padStart(3, " ")}%
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#2e7d5b]">{BAND_LABEL(t.pct)}</span>
                {t.matched ? (
                  <a className="rounded-full bg-[#1DB954] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white hover:brightness-110" style={{ fontFamily: "var(--font-geist-sans)" }} href="#">
                    OPEN SPOTIFY
                  </a>
                ) : (
                  <span className="rounded-full border border-[#00ff9f]/25 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#2e7d5b]" style={{ fontFamily: "var(--font-geist-sans)" }}>
                    NO MATCH
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-xs text-[#2e7d5b]">&gt; end of transmission_</p>
      </main>
    </div>
  );
}
