import type { MatchedTrack } from "@setlistscout/clients";
import type { ScoredSong } from "@setlistscout/engine";

interface SongListProps {
  songs: ScoredSong[];
  matches: Map<string, MatchedTrack | null>;
  /** Hide the likelihood bar/percentage (single-show views are facts, not odds). */
  showLikelihood?: boolean;
}

export default function SongList({ songs, matches, showLikelihood = true }: SongListProps) {
  return (
    <ol className="mt-8 space-y-1">
      {songs.map((song, index) => {
        const pct = Math.round(song.likelihood * 100);
        const match = matches.get(song.key);
        return (
          <li
            key={song.key}
            className={`group grid items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-900 ${
              showLikelihood
                ? "grid-cols-[2rem_2.75rem_1fr_3.5rem]"
                : "grid-cols-[2rem_2.75rem_1fr]"
            }`}
          >
            <span className="text-right text-sm tabular-nums text-zinc-600">
              {index + 1}
            </span>
            {match?.albumArt ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.albumArt}
                alt=""
                loading="lazy"
                className="h-11 w-11 rounded object-cover"
              />
            ) : (
              <div className="h-11 w-11 rounded bg-zinc-900" />
            )}
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                {match?.url ? (
                  <a
                    href={match.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-medium hover:underline"
                  >
                    {song.name}
                  </a>
                ) : (
                  <span className="truncate font-medium">{song.name}</span>
                )}
                {song.isCover && (
                  <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                    {song.coverArtist} cover
                  </span>
                )}
                {showLikelihood && (
                  <span className="ml-auto shrink-0 text-xs text-zinc-600">
                    {song.showsPlayed}/{song.totalShows} shows
                  </span>
                )}
              </div>
              {showLikelihood && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                </div>
              )}
            </div>
            {showLikelihood && (
              <span className="text-right text-sm font-semibold tabular-nums text-zinc-300">
                {pct}%
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
