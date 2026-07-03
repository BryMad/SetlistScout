import SavePlaylist from "@/components/SavePlaylist";
import SongList from "@/components/SongList";
import { getSetlistById, matchTracks } from "@/lib/data";
import { scoreSongs, songKey } from "@setlistscout/engine";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ShowPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const show = await getSetlistById(id);
  if (!show) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="mt-10 text-zinc-400">Show not found on setlist.fm.</p>
      </main>
    );
  }

  const name = typeof sp.name === "string" ? sp.name : "Artist";

  // scoreSongs on a single show gives us the same keyed shape SongList and
  // matching expect (all 100%)...
  const songs = scoreSongs([show]);
  // ...then restore the actual running order of the night
  const orderIndex = new Map(
    show.songs.filter((s) => !s.isTape).map((s, i) => [songKey(s.name), i])
  );
  songs.sort(
    (a, b) => (orderIndex.get(a.key) ?? 999) - (orderIndex.get(b.key) ?? 999)
  );

  const matches = await matchTracks(name, songs);
  const uris = songs
    .map((song) => matches.get(song.key)?.uri)
    .filter((uri): uri is string => Boolean(uri));

  const place = [show.venue, show.city].filter(Boolean).join(", ");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">{name}</h1>
      <p className="mt-1 text-lg text-zinc-400">
        {place || "Unknown venue"} · {show.date}
      </p>
      {show.tourName && (
        <p className="mt-1 text-sm text-zinc-500">{show.tourName}</p>
      )}
      {show.info && <p className="mt-3 text-sm italic text-zinc-500">{show.info}</p>}

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <p className="text-sm text-zinc-300">
          The exact setlist from this night — {songs.length} songs as played.
        </p>
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <SavePlaylist
            playlistName={`${name} — ${place || "live"} ${show.date}`}
            description={`The setlist from ${place || "this show"} on ${show.date}. Made with SetlistScout.`}
            uris={uris}
          />
        </div>
      </section>

      <SongList songs={songs} matches={matches} showLikelihood={false} />
    </main>
  );
}
