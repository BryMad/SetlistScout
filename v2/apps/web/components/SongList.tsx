import type { MatchedTrack } from "@setlistscout/clients";
import type { ScoredSong } from "@setlistscout/engine";

/**
 * The likelihood spectrum, carried over from v1: cool colors are locks, hot
 * colors are deep-cut lottery tickets. Percentages stay as text so color is
 * never the only signal.
 */
const BANDS = [
  { min: 80, bar: "bg-violet-500", text: "text-violet-300", label: "Very likely" },
  { min: 60, bar: "bg-sky-500", text: "text-sky-300", label: "Likely" },
  { min: 40, bar: "bg-yellow-500", text: "text-yellow-300", label: "Possible" },
  { min: 20, bar: "bg-orange-500", text: "text-orange-300", label: "Rare" },
  { min: 0, bar: "bg-rose-600", text: "text-rose-300", label: "Very rare" },
];

const bandFor = (pct: number) =>
  BANDS.find((band) => pct >= band.min) ?? BANDS[BANDS.length - 1]!;

interface SongListProps {
  songs: ScoredSong[];
  matches: Map<string, MatchedTrack | null>;
  /** Hide the likelihood bar/percentage (single-show views are facts, not odds). */
  showLikelihood?: boolean;
}

export default function SongList({ songs, matches, showLikelihood = true }: SongListProps) {
  return (
    <>
      {showLikelihood && (
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
          {BANDS.map((band) => (
            <span key={band.label} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${band.bar}`} />
              {band.label}
            </span>
          ))}
        </div>
      )}
      <ol className={`${showLikelihood ? "mt-3" : "mt-8"} space-y-1`}>
        {songs.map((song, index) => {
          const pct = Math.round(song.likelihood * 100);
          const band = bandFor(pct);
          const match = matches.get(song.key);
          return (
            <li
              key={song.key}
              className={`group grid items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-900 ${
                showLikelihood
                  ? "grid-cols-[1.75rem_4rem_1fr_4.5rem]"
                  : "grid-cols-[1.75rem_4rem_1fr]"
              }`}
            >
              <span className="text-right font-mono text-sm text-zinc-600">
                {index + 1}
              </span>

              {/* Spotify content zone: canonical track presentation — artwork
                  unaltered, then track / artist / album stacked, platform
                  sans-serif (mirrors v1's Track component per the guidelines). */}
              {match?.albumArt ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={match.albumArt}
                  alt=""
                  className="h-16 w-16 rounded object-cover shadow-md"
                />
              ) : (
                <div className="h-16 w-16 rounded bg-zinc-900" />
              )}
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  {match?.url ? (
                    <a
                      href={match.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm font-bold hover:underline"
                    >
                      {match.name}
                    </a>
                  ) : (
                    <span className="truncate text-sm font-bold">{song.name}</span>
                  )}
                  {song.isCover && (
                    <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                      {song.coverArtist} cover
                    </span>
                  )}
                </div>
                {match && (
                  <>
                    <p className="truncate text-sm text-zinc-400">{match.artist}</p>
                    {match.album && (
                      <p className="truncate text-xs text-zinc-500">{match.album}</p>
                    )}
                  </>
                )}
                {showLikelihood && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${band.bar}`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                )}
              </div>
              {showLikelihood && (
                <div className="text-right">
                  <span
                    title={band.label}
                    className={`block font-mono text-sm font-semibold ${band.text}`}
                  >
                    {pct}%
                  </span>
                  <span className="block font-mono text-[10px] text-zinc-600">
                    {song.showsPlayed}/{song.totalShows}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
