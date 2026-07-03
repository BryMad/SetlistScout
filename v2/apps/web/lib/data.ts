import {
  SetlistFmClient,
  SpotifyClient,
  type MatchedTrack,
} from "@setlistscout/clients";
import {
  predict,
  toIsoDate,
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

export interface ArtistIncarnation {
  mbid: string;
  name: string;
  disambiguation: string | null;
  /** ISO date of their most recent show on setlist.fm. */
  lastShow: string | null;
  /** Career show count in the setlist.fm database. */
  totalShows: number;
}

const isTribute = (disambiguation: string | null | undefined) =>
  /tribute|cover band/i.test(disambiguation ?? "");

/** "neil young & crazy horse" is an incarnation of "neil young"; "pearl jam uk" is not. */
const INCARNATION_SEPARATOR = /^\s*(?:&|and|\+|with|y|feat\.?|featuring)\s+/i;

/**
 * Name → setlist.fm identity, at selection time. Spotify groups an artist's
 * every lineup under one name, but setlist.fm splits them ("Neil Young",
 * "Neil Young & Crazy Horse", "Neil Young + Promise of the Real") — and the
 * touring incarnation is usually the setlist you actually want. So we return
 * ALL plausible incarnations, probed for activity (last show, career show
 * count) so the UI can offer an informed choice when it's genuinely ambiguous.
 */
export async function resolveArtistIncarnations(
  name: string
): Promise<ArtistIncarnation[]> {
  // "2": pruning logic changed with the same-name-duplicate handling
  const cacheKey = `v2:incarnations2:${normName(name)}`;
  const cached = await cacheGet<ArtistIncarnation[]>(cacheKey);
  if (cached) return cached;

  const { artists } = await client.searchArtists(name);
  const target = normName(name);

  const candidates = artists
    .filter((artist) => {
      if (isTribute(artist.disambiguation)) return false;
      const candidate = normName(artist.name);
      if (candidate === target) return true;
      return (
        candidate.startsWith(target) &&
        INCARNATION_SEPARATOR.test(candidate.slice(target.length))
      );
    })
    .slice(0, 8);

  const probed = await Promise.all(
    candidates.map(async (artist): Promise<ArtistIncarnation> => {
      const page = await client.getArtistSetlistsPage(artist.mbid, 1).catch(() => null);
      const newest = page?.setlist[0]?.eventDate ?? null;
      return {
        mbid: artist.mbid,
        name: artist.name,
        disambiguation: artist.disambiguation ?? null,
        lastShow: newest ? toIsoDate(newest) : null,
        totalShows: page?.total ?? 0,
      };
    })
  );

  let incarnations = probed
    .filter((candidate) => candidate.totalShows > 0)
    .sort((a, b) => ((a.lastShow ?? "") > (b.lastShow ?? "") ? -1 : 1))
    .slice(0, 6);

  // Same-name duplicates are DIFFERENT artists (setlist.fm has a 70s band
  // also called "Oasis"). When the evidence is overwhelming — a minnow with
  // <10% of the leader's shows, dormant 10+ years longer — drop it rather
  // than asking the user to tell two identical labels apart. Two genuinely
  // active same-name artists still both surface.
  const exactDupes = incarnations.filter((c) => normName(c.name) === normName(name));
  if (exactDupes.length > 1) {
    const leader = exactDupes.reduce((a, b) => (b.totalShows > a.totalShows ? b : a));
    const year = (iso: string | null) => Number(iso?.slice(0, 4) ?? 0);
    incarnations = incarnations.filter((candidate) => {
      if (candidate === leader || normName(candidate.name) !== normName(name)) return true;
      const minnow = candidate.totalShows < leader.totalShows * 0.1;
      const longDormant = year(leader.lastShow) - year(candidate.lastShow) >= 10;
      return !(minnow && longDormant);
    });
  }

  await cacheSet(cacheKey, incarnations, 7 * 24 * 60 * 60);
  return incarnations;
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
  // "track2": entries carry album names since the canonical-display change
  const keyFor = (song: MatchableSong) =>
    `v2:track2:${(song.coverArtist ?? artistName).toLowerCase()}::${song.key}`;

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
          if (!fresh.has(song.key)) {
            // lookup errored (rate limit, network) — show nothing this render
            // but do NOT cache it as "no match" for 90 days
            results.set(song.key, null);
            return;
          }
          const match = fresh.get(song.key)!;
          results.set(song.key, match);
          await cacheSet(keyFor(song), { m: match }, TRACK_TTL_S);
        })
    );
  }
  return results;
}
