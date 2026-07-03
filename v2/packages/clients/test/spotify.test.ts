import { describe, expect, it } from "vitest";
import { SpotifyClient, SpotifyError } from "../src/spotify.ts";

const TOKEN = { access_token: "app-token", expires_in: 3600 };

const track = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  uri: "spotify:track:t1",
  name: "Even Flow",
  artists: [{ name: "Pearl Jam" }],
  album: { images: [{ url: "https://img/640", width: 640 }, { url: "https://img/300", width: 300 }, { url: "https://img/64", width: 64 }] },
  external_urls: { spotify: "https://open.spotify.com/track/t1" },
  popularity: 70,
  ...over,
});

function fakeFetch(
  responses: Array<{ status?: number; body?: unknown; headers?: Record<string, string> }>
) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchFn: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    const next = responses.shift();
    if (!next) throw new Error("fakeFetch: no responses left");
    return new Response(JSON.stringify(next.body ?? {}), {
      status: next.status ?? 200,
      headers: next.headers,
    });
  };
  return { fetchFn, calls };
}

function makeClient(
  responses: Parameters<typeof fakeFetch>[0],
  overrides: Partial<ConstructorParameters<typeof SpotifyClient>[0]> = {}
) {
  const { fetchFn, calls } = fakeFetch(responses);
  const sleeps: number[] = [];
  let t = 0;
  const client = new SpotifyClient({
    clientId: "id",
    clientSecret: "secret",
    fetchFn,
    nowFn: () => t,
    sleepFn: async (ms) => {
      sleeps.push(ms);
      t += ms;
    },
    ...overrides,
  });
  return { client, calls, sleeps };
}

describe("SpotifyClient matching", () => {
  it("fetches one app token and reuses it across searches", async () => {
    const search = { tracks: { items: [track()] } };
    const { client, calls } = makeClient([
      { body: TOKEN },
      { body: search },
      { body: search },
    ]);
    await client.matchSong({ key: "even flow", name: "Even Flow", artist: "Pearl Jam" });
    await client.matchSong({ key: "even flow", name: "Even Flow", artist: "Pearl Jam" });
    const tokenCalls = calls.filter((c) => c.url.includes("/api/token"));
    expect(tokenCalls).toHaveLength(1);
  });

  it("prefers the exact-name match over a more popular near-miss", async () => {
    const items = [
      track({ id: "live", name: "Even Flow - Live", popularity: 90, uri: "spotify:track:live" }),
      track({ id: "studio", name: "Even Flow", popularity: 60, uri: "spotify:track:studio" }),
    ];
    const { client } = makeClient([{ body: TOKEN }, { body: { tracks: { items } } }]);
    const match = await client.matchSong({ key: "k", name: "Even Flow", artist: "Pearl Jam" });
    expect(match!.id).toBe("studio");
    expect(match!.albumArt).toBe("https://img/300");
  });

  it("falls back to a plain-text query when the fielded search misses", async () => {
    const { client, calls } = makeClient([
      { body: TOKEN },
      { body: { tracks: { items: [] } } },
      { body: { tracks: { items: [track()] } } },
    ]);
    const match = await client.matchSong({ key: "k", name: "Even Flow", artist: "Pearl Jam" });
    expect(match).not.toBeNull();
    const searches = calls.filter((c) => c.url.includes("/search"));
    expect(searches).toHaveLength(2);
    expect(searches[0]!.url).toContain(encodeURIComponent('track:"Even Flow"'));
  });

  it("returns null instead of a wrong-artist grab bag", async () => {
    const items = [track({ name: "Completely Different Song", artists: [{ name: "Someone Else" }] })];
    const { client } = makeClient([
      { body: TOKEN },
      { body: { tracks: { items } } },
      { body: { tracks: { items } } },
    ]);
    const match = await client.matchSong({ key: "k", name: "Even Flow", artist: "Pearl Jam" });
    expect(match).toBeNull();
  });

  it("retries 429 with Retry-After", async () => {
    const { client, sleeps } = makeClient([
      { body: TOKEN },
      { status: 429, headers: { "retry-after": "3" } },
      { body: { tracks: { items: [track()] } } },
    ]);
    const match = await client.matchSong({ key: "k", name: "Even Flow", artist: "Pearl Jam" });
    expect(match).not.toBeNull();
    expect(sleeps).toContain(3000);
  });

  it("matchSongs keys results by song key and survives individual failures", async () => {
    const { client } = makeClient([
      { body: TOKEN },
      { body: { tracks: { items: [track()] } } },
      { status: 400 }, // second song: fielded search fails hard
    ]);
    const result = await client.matchSongs(
      [
        { key: "even flow", name: "Even Flow", artist: "Pearl Jam" },
        { key: "broken", name: "Broken", artist: "Pearl Jam" },
      ],
      { concurrency: 1 }
    );
    expect(result.get("even flow")!.uri).toBe("spotify:track:t1");
    expect(result.get("broken")).toBeNull();
  });
});

describe("SpotifyClient OAuth + playlists", () => {
  it("builds a correct authorize URL", () => {
    const { client } = makeClient([]);
    const url = new URL(
      client.buildAuthorizeUrl({ redirectUri: "http://localhost:3000/auth/callback", state: "xyz" })
    );
    expect(url.origin).toBe("https://accounts.spotify.com");
    expect(url.searchParams.get("client_id")).toBe("id");
    expect(url.searchParams.get("state")).toBe("xyz");
    expect(url.searchParams.get("scope")).toBe("playlist-modify-public");
  });

  it("exchangeCode posts the authorization-code grant", async () => {
    const { client, calls } = makeClient([
      { body: { access_token: "user-token", expires_in: 3600, refresh_token: "refresh" } },
    ]);
    const tokens = await client.exchangeCode("the-code", "http://localhost:3000/auth/callback");
    expect(tokens.refresh_token).toBe("refresh");
    const body = String(calls[0]!.init?.body);
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("code=the-code");
  });

  it("createPlaylist creates then fills in 100-track chunks", async () => {
    const uris = Array.from({ length: 150 }, (_, i) => `spotify:track:${i}`);
    const { client, calls } = makeClient([
      { body: { id: "pl1", external_urls: { spotify: "https://open.spotify.com/playlist/pl1" } } },
      { body: {} },
      { body: {} },
    ]);
    const playlist = await client.createPlaylist("user-token", { name: "Test", uris });
    expect(playlist.url).toContain("/playlist/pl1");
    const addCalls = calls.filter((c) => c.url.includes("/tracks"));
    expect(addCalls).toHaveLength(2);
    const firstChunk = JSON.parse(String(addCalls[0]!.init?.body)) as { uris: string[] };
    expect(firstChunk.uris).toHaveLength(100);
  });

  it("surfaces API errors with status", async () => {
    const { client } = makeClient([{ status: 403 }]);
    await expect(
      client.createPlaylist("bad-token", { name: "x", uris: [] })
    ).rejects.toMatchObject({ status: 403 });
    expect(new SpotifyError("x", 403)).toBeInstanceOf(Error);
  });
});
