import {
  SetlistFmClient,
  SpotifyClient,
  type MatchedTrack,
} from "@setlistscout/clients";
import {
  predict,
  toShow,
  type PredictMode,
  type ScoredSong,
  type Show,
} from "@setlistscout/engine";

/**
 * Server-side data layer. Only import from server components / route handlers —
 * this is where the API keys live.
 */

// elevated setlist.fm tier: 16 req/sec, 7 concurrent (matches the old backend)
const client = new SetlistFmClient({
  apiKey: process.env.SETLIST_API_KEY!,
  minRequestGapMs: 63,
  maxConcurrent: 7,
});

export const spotify = new SpotifyClient({
  clientId: process.env.SPOTIFY_CLIENT_ID!,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
});

// Naive in-process cache so switching modes doesn't refetch 100 shows.
// Redis takes this job in production.
const showCache = new Map<string, { at: number; shows: Show[] }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function searchArtists(query: string) {
  return client.searchArtists(query);
}

export async function getShows(mbid: string): Promise<Show[]> {
  const cached = showCache.get(mbid);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.shows;
  const setlists = await client.fetchRecentSetlists(mbid, { maxShows: 100 });
  const shows = setlists.map(toShow);
  showCache.set(mbid, { at: Date.now(), shows });
  return shows;
}

// Full-history crawl for the "Relive a set" half. Heavier, cached harder.
const allShowsCache = new Map<string, { at: number; shows: Show[] }>();
const ALL_SHOWS_TTL_MS = 24 * 60 * 60 * 1000;

export async function getAllShows(mbid: string): Promise<Show[]> {
  const cached = allShowsCache.get(mbid);
  if (cached && Date.now() - cached.at < ALL_SHOWS_TTL_MS) return cached.shows;
  const setlists = await client.fetchAllSetlists(mbid, { maxShows: 3000 });
  const shows = setlists.map(toShow);
  allShowsCache.set(mbid, { at: Date.now(), shows });
  // the recent-shows cache is a strict subset — keep it coherent for free
  showCache.set(mbid, { at: Date.now(), shows: shows.slice(0, 100) });
  return shows;
}

export async function getSetlistById(setlistId: string): Promise<Show | null> {
  const setlist = await client.getSetlist(setlistId);
  return setlist ? toShow(setlist) : null;
}

export function runPrediction(shows: Show[], mode: PredictMode) {
  return predict(shows, {
    asOf: new Date().toISOString().slice(0, 10),
    mode,
  });
}

// Spotify match cache: song identity rarely changes, so cache hard.
// (The state-management plan gives this job to Redis with a 90-day TTL.)
const trackCache = new Map<string, MatchedTrack | null>();

type MatchableSong = Pick<ScoredSong, "key" | "name" | "coverArtist">;

/** Match songs to Spotify tracks; covers are searched under their original artist. */
export async function matchTracks(
  artistName: string,
  songs: MatchableSong[]
): Promise<Map<string, MatchedTrack | null>> {
  const cacheKey = (song: MatchableSong) =>
    `${(song.coverArtist ?? artistName).toLowerCase()}::${song.key}`;

  const results = new Map<string, MatchedTrack | null>();
  const misses = [];
  for (const song of songs) {
    const hit = trackCache.get(cacheKey(song));
    if (hit !== undefined) results.set(song.key, hit);
    else
      misses.push({
        key: song.key,
        name: song.name,
        artist: song.coverArtist ?? artistName,
      });
  }

  if (misses.length > 0) {
    const fresh = await spotify.matchSongs(misses, { concurrency: 8 });
    for (const song of songs) {
      if (results.has(song.key)) continue;
      const match = fresh.get(song.key) ?? null;
      results.set(song.key, match);
      trackCache.set(cacheKey(song), match);
    }
  }
  return results;
}
