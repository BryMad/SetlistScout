import { LAB, TRACKS, BAND_LABEL } from "../data";

/* 07 · THE REVIEW — print-magazine editorial: cream paper, serif masthead,
   double rules, drop cap, chart-position numerals, one red ink accent.
   Spotify zones canonical (platform sans inside the rows). */

export default function Editorial() {
  return (
    <div className="min-h-screen bg-[#faf7f0] text-[#1c1a16]" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <main className="mx-auto max-w-2xl px-6 py-16">
        {/* masthead */}
        <header className="border-b-4 border-double border-[#1c1a16] pb-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.35em] text-[#8a8378]">Vol. II · No. 7 · July 2026</p>
          <h1
            className="mt-3 text-5xl font-medium italic tracking-tight"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            The Setlist Review
          </h1>
          <p className="mt-3 text-[11px] uppercase tracking-[0.35em] text-[#8a8378]">
            Field notes from the front row
          </p>
        </header>

        <article className="mt-10">
          <h2 className="text-3xl font-semibold leading-tight" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
            What will {LAB.artist} play tonight?
          </h2>
          <p className="mt-2 text-sm italic text-[#8a8378]" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
            An analysis of forty nights on the {LAB.tour} — by the Setlist Scout desk
          </p>

          <p className="mt-6 text-[15px] leading-relaxed">
            <span
              className="float-left mr-2 mt-1 text-6xl font-bold leading-[0.8] text-[#b91c1c]"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              T
            </span>
            hey play about {LAB.setLength} songs a night. Across {LAB.shows} shows this spring — from{" "}
            {LAB.from} to {LAB.to}{" "}
            — the band barely shuffled the deck: the first six songs below appeared
            nearly every single night, while the deep cuts surfaced once a week at best. Our full chart,
            ranked by the odds you&apos;ll hear each song, follows.
          </p>

          <div className="mt-8 flex items-center justify-between border-y border-[#1c1a16]/20 py-3">
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#8a8378]">The chart · high confidence</p>
            <button className="rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-white hover:brightness-110">
              Save {TRACKS.filter((t) => t.matched).length} songs as Spotify playlist
            </button>
          </div>

          <ol className="mt-6">
            {TRACKS.map((t) => (
              <li key={t.rank} className="grid grid-cols-[3rem_4rem_1fr_auto] items-center gap-4 border-b border-[#e4ddcf] py-3">
                <span
                  className={`text-right text-3xl ${t.pct >= 80 ? "text-[#b91c1c]" : "text-[#1c1a16]"}`}
                  style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                >
                  {t.rank}
                </span>
                {/* Spotify zone: canonical art + stacked meta */}
                {t.matched && t.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.cover} alt="" className="h-16 w-16 rounded object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded bg-[#eee7d8]" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {t.title}
                    {t.coverOf && <span className="ml-2 text-xs font-normal italic text-[#8a8378]">a {t.coverOf} cover</span>}
                  </p>
                  {t.matched && (
                    <>
                      <p className="truncate text-sm text-[#5f594e]">{t.artist}</p>
                      <p className="truncate text-xs text-[#8a8378]">{t.album}</p>
                    </>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-lg" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
                    {t.pct}
                    <span className="text-xs">%</span>
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a8378]">
                    {BAND_LABEL(t.pct)} · {t.plays} of {LAB.shows}
                  </p>
                  {t.matched ? (
                    <a className="rounded-full bg-[#1DB954] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white hover:brightness-110" href="#">
                      OPEN SPOTIFY
                    </a>
                  ) : (
                    <span className="rounded-full border border-[#d8d0bf] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#8a8378]">
                      NO MATCH
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-10 border-t-4 border-double border-[#1c1a16] pt-4 text-center text-[11px] uppercase tracking-[0.35em] text-[#8a8378]">
            Setlist Scout · Printed nightly
          </p>
        </article>
      </main>
    </div>
  );
}
