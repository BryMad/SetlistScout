import { z } from "zod";

/**
 * Spotify client, two halves:
 *
 * 1. App-token track matching (client credentials — no user login). Matches
 *    engine songs to Spotify tracks for album art, links, and playlist URIs.
 * 2. User OAuth helpers (authorization code flow) + playlist creation, used
 *    by the web app's auth/playlist routes.
 *
 * Like the setlist.fm client: injectable fetch/sleep/now, retries on 429
 * honoring Retry-After, Zod validation at the boundary.
 */

const tokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
});

const trackSchema = z.object({
  id: z.string(),
  uri: z.string(),
  name: z.string(),
  artists: z.array(z.object({ name: z.string() })).default([]),
  album: z
    .object({
      images: z
        .array(z.object({ url: z.string(), width: z.number().nullish() }))
        .default([]),
    })
    .optional(),
  external_urls: z.object({ spotify: z.string().optional() }).optional(),
  popularity: z.number().optional(),
});

const searchResponseSchema = z.object({
  tracks: z.object({ items: z.array(trackSchema).default([]) }).optional(),
});

const artistItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  images: z
    .array(z.object({ url: z.string(), width: z.number().nullish() }))
    .default([]),
  popularity: z.number().optional(),
});

const artistSearchSchema = z.object({
  artists: z.object({ items: z.array(artistItemSchema).default([]) }).optional(),
});

const playlistSchema = z.object({
  id: z.string(),
  external_urls: z.object({ spotify: z.string().optional() }).optional(),
});

export interface SpotifyArtistHit {
  id: string;
  name: string;
  /** Smallish artist image (~160-320px) suitable for a 40px thumbnail. */
  imageUrl: string | null;
  popularity: number;
}

export interface MatchedTrack {
  id: string;
  uri: string;
  name: string;
  artist: string;
  albumArt: string | null;
  url: string | null;
}

export interface SongToMatch {
  /** Engine song key — used to key the result map. */
  key: string;
  name: string;
  /** Artist to search under; pass the cover's original artist for covers. */
  artist: string;
}

export class SpotifyError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "SpotifyError";
    this.status = status;
  }
}

export interface SpotifyClientOptions {
  clientId: string;
  clientSecret: string;
  accountsUrl?: string;
  apiUrl?: string;
  maxRetries?: number;
  fetchFn?: typeof fetch;
  sleepFn?: (ms: number) => Promise<void>;
  nowFn?: () => number;
}

const DEFAULTS = {
  accountsUrl: "https://accounts.spotify.com",
  apiUrl: "https://api.spotify.com/v1",
  maxRetries: 3,
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Simple concurrency limiter so batch matching stays polite but parallel. */
function pLimit(concurrency: number) {
  let active = 0;
  const waiting: Array<() => void> = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= concurrency) {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    active++;
    try {
      return await task();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
}

export class SpotifyClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly accountsUrl: string;
  private readonly apiUrl: string;
  private readonly maxRetries: number;
  private readonly fetchFn: typeof fetch;
  private readonly sleepFn: (ms: number) => Promise<void>;
  private readonly nowFn: () => number;

  private appToken: { value: string; expiresAt: number } | null = null;

  constructor(options: SpotifyClientOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.accountsUrl = options.accountsUrl ?? DEFAULTS.accountsUrl;
    this.apiUrl = options.apiUrl ?? DEFAULTS.apiUrl;
    this.maxRetries = options.maxRetries ?? DEFAULTS.maxRetries;
    this.fetchFn = options.fetchFn ?? fetch;
    this.sleepFn = options.sleepFn ?? defaultSleep;
    this.nowFn = options.nowFn ?? Date.now;
  }

  // --- artist search (app token) ------------------------------------------

  /** Artist search — used to decorate suggestions with artist images. */
  async searchArtists(name: string, limit = 10): Promise<SpotifyArtistHit[]> {
    const data = await this.apiRequest(
      `/search?type=artist&limit=${limit}&q=${encodeURIComponent(name)}`
    );
    const items = artistSearchSchema.parse(data).artists?.items ?? [];
    return items.map((artist) => {
      const images = artist.images;
      const image =
        images.find((img) => (img.width ?? 0) <= 320 && (img.width ?? 0) >= 64) ??
        images[images.length - 1];
      return {
        id: artist.id,
        name: artist.name,
        imageUrl: image?.url ?? null,
        popularity: artist.popularity ?? 0,
      };
    });
  }

  // --- track matching (app token) ----------------------------------------

  async matchSong(song: SongToMatch): Promise<MatchedTrack | null> {
    const clean = (value: string) => value.replace(/"/g, "");
    const fielded = `track:"${clean(song.name)}" artist:"${clean(song.artist)}"`;
    let best = this.pickBest(await this.searchTracks(fielded), song);
    if (!best) {
      // fielded search misses loose spellings; plain text is more forgiving
      best = this.pickBest(await this.searchTracks(`${song.name} ${song.artist}`), song);
    }
    return best;
  }

  /** Match many songs with bounded concurrency. Result map is keyed by song.key. */
  async matchSongs(
    songs: SongToMatch[],
    options: { concurrency?: number } = {}
  ): Promise<Map<string, MatchedTrack | null>> {
    const limit = pLimit(options.concurrency ?? 6);
    const entries = await Promise.all(
      songs.map((song) =>
        limit(async (): Promise<[string, MatchedTrack | null]> => {
          try {
            return [song.key, await this.matchSong(song)];
          } catch {
            return [song.key, null]; // one bad lookup never breaks the batch
          }
        })
      )
    );
    return new Map(entries);
  }

  private async searchTracks(query: string) {
    const data = await this.apiRequest(
      `/search?type=track&limit=5&q=${encodeURIComponent(query)}`
    );
    return searchResponseSchema.parse(data).tracks?.items ?? [];
  }

  private pickBest(
    items: z.infer<typeof trackSchema>[],
    song: SongToMatch
  ): MatchedTrack | null {
    const songName = normalize(song.name);
    const artistName = normalize(song.artist);

    let best: { track: z.infer<typeof trackSchema>; score: number } | null = null;
    for (const track of items) {
      const trackName = normalize(track.name);
      const artists = track.artists.map((a) => normalize(a.name));
      let score = 0;
      if (trackName === songName) score += 4;
      else if (trackName.startsWith(songName) || songName.startsWith(trackName)) score += 2;
      else if (trackName.includes(songName)) score += 1;
      if (artists.includes(artistName)) score += 3;
      else if (artists.some((a) => a.includes(artistName) || artistName.includes(a)))
        score += 1;
      score += (track.popularity ?? 0) / 1000; // tiebreaker only
      if (!best || score > best.score) best = { track, score };
    }

    if (!best || best.score < 2) return null;
    const images = best.track.album?.images ?? [];
    // prefer the ~300px image; fall back to whatever exists
    const art =
      images.find((img) => (img.width ?? 0) <= 300 && (img.width ?? 0) >= 64) ??
      images[images.length - 1] ??
      images[0];
    return {
      id: best.track.id,
      uri: best.track.uri,
      name: best.track.name,
      artist: best.track.artists[0]?.name ?? song.artist,
      albumArt: art?.url ?? null,
      url: best.track.external_urls?.spotify ?? null,
    };
  }

  // --- plumbing -----------------------------------------------------------

  private async getAppToken(): Promise<string> {
    if (this.appToken && this.appToken.expiresAt > this.nowFn() + 60_000) {
      return this.appToken.value;
    }
    const data = await this.tokenRequest({ grant_type: "client_credentials" });
    this.appToken = {
      value: data.access_token,
      expiresAt: this.nowFn() + data.expires_in * 1000,
    };
    return this.appToken.value;
  }

  private async tokenRequest(params: Record<string, string>) {
    const response = await this.fetchFn(`${this.accountsUrl}/api/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });
    if (!response.ok) {
      throw new SpotifyError(`spotify token request failed: ${response.status}`, response.status);
    }
    return tokenSchema.parse(await response.json());
  }

  private async apiRequest(path: string): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      const token = await this.getAppToken();
      const response = await this.fetchFn(`${this.apiUrl}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < this.maxRetries) {
        const retryAfterSec = Number(response.headers.get("retry-after"));
        const delay =
          Number.isFinite(retryAfterSec) && retryAfterSec > 0
            ? retryAfterSec * 1000
            : 1000 * 2 ** attempt;
        await this.sleepFn(delay);
        continue;
      }
      if (!response.ok) {
        throw new SpotifyError(`spotify responded ${response.status} for ${path}`, response.status);
      }
      return response.json();
    }
  }

  // --- user OAuth + playlists (authorization code flow) --------------------

  buildAuthorizeUrl(options: { redirectUri: string; state: string; scopes?: string[] }): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: options.redirectUri,
      state: options.state,
      // the registered Spotify app is only authorized for the public scope
      scope: (options.scopes ?? ["playlist-modify-public"]).join(" "),
    });
    return `${this.accountsUrl}/authorize?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string) {
    return this.tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });
  }

  async refreshAccessToken(refreshToken: string) {
    return this.tokenRequest({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
  }

  /** Create a playlist and fill it. Returns the playlist URL. */
  async createPlaylist(
    accessToken: string,
    options: { name: string; description?: string; uris: string[] }
  ): Promise<{ id: string; url: string | null }> {
    const created = playlistSchema.parse(
      await this.userRequest(accessToken, "/me/playlists", {
        name: options.name,
        description: options.description ?? "",
        public: true, // playlist-modify-public is the app's only granted scope
      })
    );
    for (let i = 0; i < options.uris.length; i += 100) {
      await this.userRequest(accessToken, `/playlists/${created.id}/tracks`, {
        uris: options.uris.slice(i, i + 100),
      });
    }
    return { id: created.id, url: created.external_urls?.spotify ?? null };
  }

  private async userRequest(
    accessToken: string,
    path: string,
    body: unknown
  ): Promise<unknown> {
    const response = await this.fetchFn(`${this.apiUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new SpotifyError(`spotify responded ${response.status} for ${path}`, response.status);
    }
    return response.json();
  }
}
