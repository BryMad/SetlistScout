import {
  artistsSearchSchema,
  setlistPageSchema,
  setlistSchema,
  type Artist,
  type Setlist,
  type SetlistPage,
} from "@setlistscout/engine";

/**
 * Typed setlist.fm client.
 *
 * - Requests are serialized with a minimum gap (setlist.fm allows ~2 req/sec).
 * - 429/5xx responses retry with backoff, honoring Retry-After when present.
 * - Every response is validated with the engine's Zod schemas at the boundary,
 *   so malformed API data fails loudly here instead of deep in the pipeline.
 * - 404s become nulls/empties: setlist.fm uses 404 for "no results".
 *
 * Time and I/O (fetch/sleep/now) are injectable so tests run instantly.
 */

export class SetlistFmError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "SetlistFmError";
    this.status = status;
  }
}

export interface SetlistFmClientOptions {
  apiKey: string;
  baseUrl?: string;
  /**
   * Gap between request STARTS. Default 600ms suits the basic 2 req/sec tier;
   * keys with the elevated setlist.fm limit can run 63ms + maxConcurrent 7
   * (the profile the old backend's Bottleneck config used).
   */
  minRequestGapMs?: number;
  /** How many requests may be in flight at once. Default 1 (serial). */
  maxConcurrent?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  fetchFn?: typeof fetch;
  sleepFn?: (ms: number) => Promise<void>;
  nowFn?: () => number;
}

const DEFAULTS = {
  baseUrl: "https://api.setlist.fm/rest/1.0",
  minRequestGapMs: 600,
  maxConcurrent: 1,
  maxRetries: 3,
  retryBaseDelayMs: 1500,
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class SetlistFmClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly minRequestGapMs: number;
  private readonly maxConcurrent: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly sleepFn: (ms: number) => Promise<void>;
  private readonly nowFn: () => number;

  private active = 0;
  private waiting: Array<() => void> = [];
  private nextStartAt = Number.NEGATIVE_INFINITY;

  constructor(options: SetlistFmClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULTS.baseUrl;
    this.minRequestGapMs = options.minRequestGapMs ?? DEFAULTS.minRequestGapMs;
    this.maxConcurrent = options.maxConcurrent ?? DEFAULTS.maxConcurrent;
    this.maxRetries = options.maxRetries ?? DEFAULTS.maxRetries;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? DEFAULTS.retryBaseDelayMs;
    this.fetchFn = options.fetchFn ?? fetch;
    this.sleepFn = options.sleepFn ?? defaultSleep;
    this.nowFn = options.nowFn ?? Date.now;
  }

  async searchArtists(name: string): Promise<{ artists: Artist[]; total: number }> {
    const data = await this.request(
      `/search/artists?artistName=${encodeURIComponent(name)}&sort=relevance`
    );
    if (data === null) return { artists: [], total: 0 };
    const parsed = artistsSearchSchema.parse(data);
    return { artists: parsed.artist, total: parsed.total };
  }

  /** One page (20 shows) of an artist's setlists, newest first. Null past the end. */
  async getArtistSetlistsPage(mbid: string, page = 1): Promise<SetlistPage | null> {
    const data = await this.request(`/artist/${mbid}/setlists?p=${page}`);
    return data === null ? null : setlistPageSchema.parse(data);
  }

  /** One setlist by its setlist.fm id — the pick-a-show lookup. */
  async getSetlist(setlistId: string): Promise<Setlist | null> {
    const data = await this.request(`/setlist/${setlistId}`);
    return data === null ? null : setlistSchema.parse(data);
  }

  /**
   * Paginate an artist's history, newest first, until maxShows or the end.
   * onProgress fires after each page — the hook the app's live progress UI uses.
   */
  async fetchRecentSetlists(
    mbid: string,
    options: {
      maxShows?: number;
      onProgress?: (fetched: number, target: number) => void;
    } = {}
  ): Promise<Setlist[]> {
    const maxShows = options.maxShows ?? 100;
    const setlists: Setlist[] = [];
    for (let page = 1; setlists.length < maxShows; page++) {
      const parsed = await this.getArtistSetlistsPage(mbid, page);
      if (!parsed || parsed.setlist.length === 0) break;
      setlists.push(...parsed.setlist);
      const target = Math.min(parsed.total, maxShows);
      options.onProgress?.(Math.min(setlists.length, target), target);
      if (setlists.length >= parsed.total) break;
    }
    return setlists.slice(0, maxShows);
  }

  /**
   * Crawl an artist's ENTIRE history (the tour-discovery data source).
   * Page 1 reveals the total; remaining pages fetch concurrently under the
   * rate limiter. With the elevated setlist.fm tier this takes seconds even
   * for legacy acts with thousands of shows.
   */
  async fetchAllSetlists(
    mbid: string,
    options: {
      maxShows?: number;
      onProgress?: (fetchedPages: number, totalPages: number) => void;
    } = {}
  ): Promise<Setlist[]> {
    const maxShows = options.maxShows ?? 3000;
    const first = await this.getArtistSetlistsPage(mbid, 1);
    if (!first || first.setlist.length === 0) return [];

    const total = Math.min(first.total, maxShows);
    const totalPages = Math.max(1, Math.ceil(total / first.itemsPerPage));
    let done = 1;
    options.onProgress?.(done, totalPages);

    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        this.getArtistSetlistsPage(mbid, i + 2).then((page) => {
          options.onProgress?.(++done, totalPages);
          return page;
        })
      )
    );

    return [first, ...rest]
      .filter((page): page is SetlistPage => page !== null)
      .flatMap((page) => page.setlist)
      .slice(0, total);
  }

  /**
   * Rate limiter: at most maxConcurrent requests in flight, and request
   * STARTS spaced at least minRequestGapMs apart.
   */
  private async throttled<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.active++;
    try {
      // reserve the next start slot atomically (single-threaded), then wait for it
      const now = this.nowFn();
      const startAt = Math.max(now, this.nextStartAt);
      this.nextStartAt = startAt + this.minRequestGapMs;
      if (startAt > now) await this.sleepFn(startAt - now);
      return await task();
    } finally {
      this.active--;
      this.waiting.shift()?.();
    }
  }

  private request(path: string): Promise<unknown | null> {
    return this.throttled(async () => {
      for (let attempt = 0; ; attempt++) {
        const response = await this.fetchFn(`${this.baseUrl}${path}`, {
          headers: { "x-api-key": this.apiKey, Accept: "application/json" },
        });

        if (response.status === 404) return null;

        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < this.maxRetries) {
          const retryAfterSec = Number(response.headers.get("retry-after"));
          const delay =
            Number.isFinite(retryAfterSec) && retryAfterSec > 0
              ? retryAfterSec * 1000
              : this.retryBaseDelayMs * 2 ** attempt;
          await this.sleepFn(delay);
          continue;
        }

        if (!response.ok) {
          throw new SetlistFmError(
            `setlist.fm responded ${response.status} for ${path}`,
            response.status
          );
        }
        return response.json();
      }
    });
  }
}
