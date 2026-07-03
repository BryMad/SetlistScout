import Link from "next/link";
import SavePlaylist from "@/components/SavePlaylist";
import SectionNav from "@/components/SectionNav";
import SongList from "@/components/SongList";
import { CONFIDENCE_STYLE } from "@/components/confidence";
import { getShows, matchTracks, runPrediction } from "@/lib/data";
import type { MatchedTrack } from "@setlistscout/clients";
import type { PredictMode } from "@setlistscout/engine";

/** How many top songs get Spotify matching and go into the playlist. */
const PLAYLIST_SIZE = 30;

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

  const shows = await getShows(mbid);

  const mode: PredictMode =
    modeParam === "latest"
      ? { kind: "latest-tour" }
      : modeParam === "last60"
        ? { kind: "last-n-shows", n: 60 }
        : { kind: "auto" };

  const prediction = runPrediction(shows, mode);

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

  const base = `/artist/${mbid}?name=${encodeURIComponent(name)}`;
  const tabs = [
    { key: "auto", label: "Auto", href: base },
    { key: "latest", label: "Latest tour", href: `${base}&mode=latest` },
    { key: "last60", label: "Last 60 shows", href: `${base}&mode=last60` },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
      <SectionNav mbid={mbid} name={name} active="predict" />

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
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <SavePlaylist
                playlistName={`${name} — predicted setlist`}
                description={`Made with SetlistScout from ${prediction.showsAnalyzed} shows (${prediction.dateRange.from} to ${prediction.dateRange.to}).`}
                uris={playlistUris}
              />
            </div>
          </section>

          <SongList songs={prediction.songs} matches={matches} />
        </>
      )}
    </main>
  );
}
