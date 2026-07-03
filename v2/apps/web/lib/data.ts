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
import { cacheGet, cacheGetMany, cacheSet } from "./cache";

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

const RECENT_TTL_S = 24 * 60 * 60; // predictions want fresh-ish data
const HISTORY_TTL_S = 7 * 24 * 60 * 60; // full back catalogs move slowly
const SHOW_TTL_S = 7 * 24 * 60 * 60; // a single past show is near-immutable
const TRACK_TTL_S = 90 * 24 * 60 * 60; // song→track mappings basically never change

export interface ArtistSuggestion {
  name: string;
  image: string | null;
  disambiguation: string | null;
  /** Known for setlist.fm-fallback results; Spotify results resolve on selection. */
  mbid: string | null;
}

const normName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/**
 * Spotify drives the suggestion list — its partial-query ranking is what made
 * the old site's dropdown good ("david b" → Bowie, Byrne), and every result
 * has artwork. setlist.fm search only backs it up when Spotify has nothing
 * (tiny/legacy acts). Identity (mbid) is resolved at selection time.
 */
export async function suggestArtists(query: string): Promise<ArtistSuggestion[]> {
  const cacheKey = `v2:suggest:${normName(query)}`;
  const cached = await cacheGet<ArtistSuggestion[]>(cacheKey);
  if (cached) return cached;

  const spotifyHits = await spotify.searchArtists(query, 8).catch(() => []);
  let suggestions: ArtistSuggestion[];
  if (spotifyHits.length > 0) {
    suggestions = spotifyHits.map((hit) => ({
      name: hit.name,
      image: hit.imageUrl,
      disambiguation: null,
      mbid: null,
    }));
  } else {
    const fallback = await client
      .searchArtists(query)
      .catch(() => ({ artists: [], total: 0 }));
    suggestions = fallback.artists.slice(0, 8).map((artist) => ({
      name: artist.name,
      image: null,
      disambiguation: artist.disambiguation ?? null,
      mbid: artist.mbid,
    }));
  }

  await cacheSet(cacheKey, suggestions, 7 * 24 * 60 * 60);
  return suggestions;
}

/**
 * Name → setlist.fm mbid, at selection time. setlist.fm is good at
 * exact-name search even though its partial-query ranking is poor.
 */
export async function resolveArtistMbid(name: string): Promise<string | null> {
  const cacheKey = `v2:resolve:${normName(name)}`;
  const cached = await cacheGet<string | null>(cacheKey);
  if (cached !== undefined) return cached;

  const { artists } = await client.searchArtists(name);
  const target = normName(name);
  const best =
    artists.find((artist) => normName(artist.name) === target) ??
    artists.find((artist) => {
      const candidate = normName(artist.name);
      return candidate.includes(target) || target.includes(candidate);
    }) ??
    artists[0] ??
    null;

  const mbid = best?.mbid ?? null;
  await cacheSet(cacheKey, mbid, 30 * 24 * 60 * 60);
  return mbid;
}

/** Last ~100 shows — the Predict half's data. */
export async function getShows(mbid: string): Promise<Show[]> {
  const cached = await cacheGet<Show[]>(`v2:recent:${mbid}`);
  if (cached) return cached;

  // a cached full history is a superset — serve the slice for free
  const history = await cacheGet<Show[]>(`v2:history:${mbid}`);
  if (history) {
    const recent = history.slice(0, 100);
    await cacheSet(`v2:recent:${mbid}`, recent, RECENT_TTL_S);
    return recent;
  }

  const setlists = await client.fetchRecentSetlists(mbid, { maxShows: 100 });
  const shows = setlists.map(toShow);
  await cacheSet(`v2:recent:${mbid}`, shows, RECENT_TTL_S);
  return shows;
}

/** Full-history crawl — the Relive half's data. */
export async function getAllShows(mbid: string): Promise<Show[]> {
  const cached = await cacheGet<Show[]>(`v2:history:${mbid}`);
  if (cached) return cached;

  const setlists = await client.fetchAllSetlists(mbid, { maxShows: 3000 });
  const shows = setlists.map(toShow);
  await cacheSet(`v2:history:${mbid}`, shows, HISTORY_TTL_S);
  await cacheSet(`v2:recent:${mbid}`, shows.slice(0, 100), RECENT_TTL_S);
  return shows;
}

export async function getSetlistById(setlistId: string): Promise<Show | null> {
  const cached = await cacheGet<Show | null>(`v2:show:${setlistId}`);
  if (cached !== undefined) return cached;
  const setlist = await client.getSetlist(setlistId);
  const show = setlist ? toShow(setlist) : null;
  await cacheSet(`v2:show:${setlistId}`, show, SHOW_TTL_S);
  return show;
}

export function runPrediction(shows: Show[], mode: PredictMode) {
  return predict(shows, {
    asOf: new Date().toISOString().slice(0, 10),
    mode,
  });
}

type MatchableSong = Pick<ScoredSong, "key" | "name" | "coverArtist">;
// wrapper object so a cached "no match" (null) is distinguishable from a cache miss
type CachedMatch = { m: MatchedTrack | null };

/** Match songs to Spotify tracks; covers are searched under their original artist. */
export async function matchTracks(
  artistName: string,
  songs: MatchableSong[]
): Promise<Map<string, MatchedTrack | null>> {
  const keyFor = (song: MatchableSong) =>
    `v2:track:${(song.coverArtist ?? artistName).toLowerCase()}::${song.key}`;

  const cached = await cacheGetMany<CachedMatch>(songs.map(keyFor));

  const results = new Map<string, MatchedTrack | null>();
  const misses: Array<{ key: string; name: string; artist: string }> = [];
  songs.forEach((song, i) => {
    const hit = cached[i];
    if (hit !== undefined) results.set(song.key, hit.m);
    else
      misses.push({
        key: song.key,
        name: song.name,
        artist: song.coverArtist ?? artistName,
      });
  });

  if (misses.length > 0) {
    const fresh = await spotify.matchSongs(misses, { concurrency: 8 });
    await Promise.all(
      songs
        .filter((song) => !results.has(song.key))
        .map(async (song) => {
          const match = fresh.get(song.key) ?? null;
          results.set(song.key, match);
          await cacheSet(keyFor(song), { m: match }, TRACK_TTL_S);
        })
    );
  }
  return results;
}
