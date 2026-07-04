import { LAB, TRACKS, BAND_LABEL } from "../data";

/* 04 · WHITESPACE — radical minimalism. White, hairlines, tabular numerals,
   no decoration at all; the only color on the page is the mandated Spotify
   green. Spotify zones canonical. */

export default function Minimal() {
  return (
    <div className="min-h-screen bg-white text-[#111]" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <main className="mx-auto max-w-2xl px-6 py-24">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#999]">Predicted setlist</p>
        <h1 className="mt-4 text-4xl font-light tracking-tight">{LAB.artist}</h1>
        <p className="mt-2 text-sm text-[#666]">
          {LAB.tour} — {LAB.shows} shows, {LAB.from} to {LAB.to}. They play about{" "}
          {LAB.setLength}{" "}
          songs a night; below is every song they might pull out, ranked by the
          odds you&apos;ll hear it.
        </p>

        <div className="mt-10 flex items-baseline justify-between border-t border-[#eee] pt-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#999]">High confidence</p>
          <button className="rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-white hover:brightness-110">
            Save {TRACKS.filter((t) => t.matched).length} songs as Spotify playlist
          </button>
        </div>

        <ol className="mt-10">
          {TRACKS.map((t) => (
            <li
              key={t.rank}
              className="grid grid-cols-[2rem_4rem_1fr_auto] items-center gap-4 border-b border-[#f0f0f0] py-3"
            >
              <span className="text-right text-sm text-[#ccc] tabular-nums">{t.rank}</span>
              {/* Spotify zone: canonical art + stacked meta */}
              {t.matched && t.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.cover} alt="" className="h-16 w-16 rounded object-cover" />
              ) : (
                <div className="h-16 w-16 rounded bg-[#f5f5f5]" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {t.title}
                  {t.coverOf && <span className="ml-2 text-xs font-normal text-[#999]">{t.coverOf} cover</span>}
                </p>
                {t.matched && (
                  <>
                    <p className="truncate text-sm text-[#777]">{t.artist}</p>
                    <p className="truncate text-xs text-[#aaa]">{t.album}</p>
                  </>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm tabular-nums">{t.pct}%</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#bbb]">{BAND_LABEL(t.pct)}</span>
                {t.matched ? (
                  <a className="rounded-full bg-[#1DB954] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white hover:brightness-110" href="#">
                    OPEN SPOTIFY
                  </a>
                ) : (
                  <span className="rounded-full border border-[#e5e5e5] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#bbb]">
                    NO MATCH
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-16 text-center text-[11px] uppercase tracking-[0.25em] text-[#ccc]">
          Setlist Scout
        </p>
      </main>
    </div>
  );
}
