import Link from "next/link";
import SavePlaylist from "@/components/SavePlaylist";
import SectionNav from "@/components/SectionNav";
import SongList from "@/components/SongList";
import { CONFIDENCE_STYLE } from "@/components/confidence";
import { getAllShows, matchTracks, runPrediction } from "@/lib/data";
import type { MatchedTrack } from "@setlistscout/clients";

const PLAYLIST_SIZE = 30;

interface PageProps {
  params: Promise<{ mbid: string; tour: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TourPage({ params, searchParams }: PageProps) {
  const { mbid, tour } = await params;
  const tourName = decodeURIComponent(tour);
  const sp = await searchParams;
  const name = typeof sp.name === "string" ? sp.name : "Artist";
  const query = `?name=${encodeURIComponent(name)}`;

  const shows = await getAllShows(mbid);
  const prediction = runPrediction(shows, { kind: "named-tour", tourName });

  let matches = new Map<string, MatchedTrack | null>();
  if (prediction) {
    matches = await matchTracks(name, prediction.songs.slice(0, PLAYLIST_SIZE));
  }
  const playlistUris = prediction
    ? prediction.songs
        .slice(0, PLAYLIST_SIZE)
        .map((song) => matches.get(song.key)?.uri)
        .filter((uri): uri is string => Boolean(uri))
    : [];

  const tourShows = shows.filter(
    (show) => show.tourName === tourName && show.songCount > 0
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/artist/${mbid}/tours${query}`}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← All tours
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{name}</h1>
      <p className="mt-1 text-lg text-zinc-400">{tourName}</p>
      <SectionNav mbid={mbid} name={name} active="relive" />

      {!prediction ? (
        <p className="mt-10 text-zinc-400">
          No usable setlists recorded for this tour.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm leading-relaxed text-zinc-400">
            They played about {prediction.typicalSetLength} songs a night on this
            tour — below is everything they pulled out, ranked by how often it
            came up.
          </p>

          <section className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
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
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <SavePlaylist
                playlistName={`${name} — ${tourName} setlist`}
                description={`Made with SetlistScout from ${prediction.showsAnalyzed} shows on ${tourName}.`}
                uris={playlistUris}
              />
            </div>
          </section>

          <SongList songs={prediction.songs} matches={matches} />

          <section className="mt-12">
            <h2 className="text-xl font-semibold">Pick a show</h2>
            <p className="mt-1 text-sm text-zinc-500">
              The exact setlist from one night of this tour.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {tourShows.map((show) => (
                <li key={show.id}>
                  <Link
                    href={`/show/${show.id}${query}`}
                    className="block rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 hover:border-indigo-600 hover:bg-zinc-900"
                  >
                    <span className="block text-sm font-medium">{show.date}</span>
                    <span className="block truncate text-sm text-zinc-500">
                      {[show.venue, show.city].filter(Boolean).join(", ") || "Unknown venue"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
