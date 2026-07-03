import { SetlistFmClient } from "@setlistscout/clients";
import { predict, toShow, type PredictMode, type Show } from "@setlistscout/engine";

/**
 * Server-side data layer. Only import from server components / route handlers —
 * this is where the setlist.fm API key lives.
 */

const client = new SetlistFmClient({ apiKey: process.env.SETLIST_API_KEY! });

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

export function runPrediction(shows: Show[], mode: PredictMode) {
  return predict(shows, {
    asOf: new Date().toISOString().slice(0, 10),
    mode,
  });
}
