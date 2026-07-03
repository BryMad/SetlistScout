import Link from "next/link";
import { getShows, runPrediction } from "@/lib/data";
import type { Confidence, PredictMode } from "@setlistscout/engine";

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: "bg-emerald-950 text-emerald-300 border-emerald-800",
  medium: "bg-amber-950 text-amber-300 border-amber-800",
  low: "bg-rose-950 text-rose-300 border-rose-800",
};

interface PageProps {
  params: Promise<{ mbid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ArtistPage({ params, searchParams }: PageProps) {
  const { mbid } = await params;
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);

  const name = str(sp.name) ?? "Artist";
  const modeParam = str(sp.mode) ?? "auto";
  const tourParam = str(sp.tour);

  const shows = await getShows(mbid);

  const mode: PredictMode =
    modeParam === "tour" && tourParam
      ? { kind: "named-tour", tourName: tourParam }
      : modeParam === "latest"
        ? { kind: "latest-tour" }
        : modeParam === "last60"
          ? { kind: "last-n-shows", n: 60 }
          : { kind: "auto" };

  const prediction = runPrediction(shows, mode);

  // distinct tours, newest first, for the past-tours picker
  const tourCounts = new Map<string, number>();
  for (const show of shows) {
    if (show.tourName) {
      tourCounts.set(show.tourName, (tourCounts.get(show.tourName) ?? 0) + 1);
    }
  }

  const base = `/artist/${mbid}?name=${encodeURIComponent(name)}`;
  const tabs = [
    { key: "auto", label: "Auto", href: base },
    { key: "latest", label: "Latest tour", href: `${base}&mode=latest` },
    { key: "last60", label: "Last 60 shows", href: `${base}&mode=last60` },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← New search
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{name}</h1>

      <nav className="mt-6 flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              modeParam === tab.key
                ? "border-indigo-500 bg-indigo-950 text-indigo-200"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}

        {tourCounts.size > 0 && (
          <details className="relative">
            <summary
              className={`cursor-pointer list-none rounded-full border px-4 py-1.5 text-sm ${
                modeParam === "tour"
                  ? "border-indigo-500 bg-indigo-950 text-indigo-200"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              Past tours ▾
            </summary>
            <ul className="absolute z-10 mt-2 max-h-72 w-72 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 py-1 shadow-2xl">
              {[...tourCounts].map(([tour, count]) => (
                <li key={tour}>
                  <Link
                    href={`${base}&mode=tour&tour=${encodeURIComponent(tour)}`}
                    className={`block px-4 py-2 text-sm hover:bg-zinc-800 ${
                      tourParam === tour ? "text-indigo-300" : "text-zinc-300"
                    }`}
                  >
                    {tour}
                    <span className="ml-2 text-zinc-500">
                      {count} show{count === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </nav>

      {!prediction ? (
        <p className="mt-10 text-zinc-400">
          Not enough usable setlist data for this view. Try another mode.
        </p>
      ) : (
        <>
          <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${CONFIDENCE_STYLE[prediction.confidence]}`}
              >
                {prediction.confidence} confidence
              </span>
              <span className="text-sm text-zinc-500">
                {prediction.showsAnalyzed} shows · {prediction.dateRange.from} →{" "}
                {prediction.dateRange.to}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-zinc-300">
              {prediction.explanation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <ol className="mt-8 space-y-1">
            {prediction.songs.map((song, index) => {
              const pct = Math.round(song.likelihood * 100);
              return (
                <li
                  key={song.key}
                  className="group grid grid-cols-[2rem_1fr_3.5rem] items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-900"
                >
                  <span className="text-right text-sm tabular-nums text-zinc-600">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate font-medium">{song.name}</span>
                      {song.isCover && (
                        <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                          {song.coverArtist} cover
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-xs text-zinc-600">
                        {song.showsPlayed}/{song.totalShows} shows
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-right text-sm font-semibold tabular-nums text-zinc-300">
                    {pct}%
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </main>
  );
}
