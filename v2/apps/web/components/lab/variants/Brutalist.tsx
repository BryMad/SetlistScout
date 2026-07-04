import { LAB, TRACKS, BAND_LABEL } from "../data";

/* 08 · CONCRETE — neo-brutalism: 4px black borders, hard offset shadows,
   taxi yellow, huge type, a scrolling marquee, zero subtlety.
   Spotify zones canonical. */

export default function Brutalist() {
  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <style>{`
        .br-marquee { overflow: hidden; white-space: nowrap; }
        .br-marquee > span { display: inline-block; animation: brScroll 16s linear infinite; }
        @keyframes brScroll { to { transform: translateX(-50%); } }
        .br-card { border: 4px solid #000; box-shadow: 8px 8px 0 #000; background: #fff; }
        .br-row { border-bottom: 4px solid #000; }
        .br-row:last-child { border-bottom: 0; }
        .br-row:hover { background: #ffe600; }
      `}</style>

      {/* marquee */}
      <div className="br-marquee border-b-4 border-black bg-black py-2 text-sm font-black uppercase tracking-widest text-[#ffe600]">
        <span>
          {Array.from({ length: 4 })
            .map(() => ` ★ ${LAB.tour} ★ ${LAB.shows} shows analyzed ★ ~${LAB.setLength} songs a night ★ high confidence `)
            .join("")}
        </span>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="br-card inline-block -rotate-1 bg-[#ffe600] px-6 py-4">
          <h1 className="text-5xl font-black uppercase leading-none tracking-tight">{LAB.artist}</h1>
        </div>
        <p className="mt-6 max-w-xl text-lg font-bold uppercase leading-snug">
          Every song they might play. Ranked by the odds you&apos;ll hear it. No mercy.
        </p>

        <div className="br-card mt-8 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <p className="font-black uppercase">
            {LAB.from} → {LAB.to}
            <span className="ml-3 inline-block bg-black px-2 py-0.5 text-[#ffe600]">40 SHOWS</span>
          </p>
          <button className="rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-white hover:brightness-110">
            Save {TRACKS.filter((t) => t.matched).length} songs as Spotify playlist
          </button>
        </div>

        <div className="br-card mt-8">
          <ol>
            {TRACKS.map((t) => (
              <li key={t.rank} className="br-row grid grid-cols-[4.5rem_4rem_1fr_auto] items-center gap-4 px-4 py-3">
                <span className="text-right text-5xl font-black tabular-nums leading-none">{t.pct}</span>
                {/* Spotify zone: canonical art + stacked meta */}
                {t.matched && t.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.cover} alt="" className="h-16 w-16 border-2 border-black object-cover" />
                ) : (
                  <div className="h-16 w-16 border-2 border-black bg-[#f4f4f0]" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {t.title}
                    {t.coverOf && (
                      <span className="ml-2 bg-black px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                        {t.coverOf} cover
                      </span>
                    )}
                  </p>
                  {t.matched && (
                    <>
                      <p className="truncate text-sm">{t.artist}</p>
                      <p className="truncate text-xs opacity-60">{t.album}</p>
                    </>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${t.pct >= 60 ? "bg-black text-white" : "border-2 border-black"}`}>
                    {BAND_LABEL(t.pct)}
                  </span>
                  <span className="text-xs font-bold tabular-nums">{t.plays}/{LAB.shows} SHOWS</span>
                  {t.matched ? (
                    <a className="rounded-full bg-[#1DB954] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white hover:brightness-110" href="#">
                      OPEN SPOTIFY
                    </a>
                  ) : (
                    <span className="rounded-full border-2 border-black px-2.5 py-1 text-[10px] font-black tracking-wide opacity-50">
                      NO MATCH
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-10 -rotate-1 text-center text-2xl font-black uppercase">
          Setlist Scout<span className="text-[#1DB954]">.</span> Know the set. Skip the guessing.
        </p>
      </main>
    </div>
  );
}
