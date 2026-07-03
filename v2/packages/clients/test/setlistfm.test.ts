import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SetlistFmClient, SetlistFmError } from "../src/setlistfm.ts";

const FIXTURES = join(import.meta.dirname, "../../engine/__fixtures__");
const fixture = (path: string) =>
  JSON.parse(readFileSync(join(FIXTURES, path), "utf8"));

/** Queue of canned responses; records every request URL. */
function fakeFetch(
  responses: Array<{ status?: number; body?: unknown; headers?: Record<string, string> }>
) {
  const calls: string[] = [];
  const fetchFn: typeof fetch = async (input) => {
    calls.push(String(input));
    const next = responses.shift();
    if (!next) throw new Error("fakeFetch: no responses left");
    return new Response(JSON.stringify(next.body ?? {}), {
      status: next.status ?? 200,
      headers: next.headers,
    });
  };
  return { fetchFn, calls };
}

/** Deterministic clock: sleeping advances time, nothing waits for real. */
function fakeClock() {
  let t = 0;
  const sleeps: number[] = [];
  return {
    nowFn: () => t,
    sleepFn: async (ms: number) => {
      sleeps.push(ms);
      t += ms;
    },
    sleeps,
  };
}

function makeClient(
  responses: Parameters<typeof fakeFetch>[0],
  overrides: Partial<ConstructorParameters<typeof SetlistFmClient>[0]> = {}
) {
  const { fetchFn, calls } = fakeFetch(responses);
  const clock = fakeClock();
  const client = new SetlistFmClient({
    apiKey: "test-key",
    fetchFn,
    ...clock,
    ...overrides,
  });
  return { client, calls, clock };
}

describe("SetlistFmClient", () => {
  it("searchArtists validates and returns real fixture data", async () => {
    const { client, calls } = makeClient([{ body: fixture("u2/artist-search.json") }]);
    const result = await client.searchArtists("U2");
    expect(result.artists[0]!.name).toBe("U2");
    expect(result.artists[0]!.mbid).toBe("a3cb23fc-acd3-4ce0-8f36-1e5aa6a18432");
    expect(calls[0]).toContain("/search/artists?artistName=U2");
  });

  it("searchArtists treats 404 as no results", async () => {
    const { client } = makeClient([{ status: 404 }]);
    expect(await client.searchArtists("zzzz no such artist")).toEqual({
      artists: [],
      total: 0,
    });
  });

  it("getArtistSetlistsPage parses a captured page", async () => {
    const { client } = makeClient([{ body: fixture("oasis/setlists-page-1.json") }]);
    const page = await client.getArtistSetlistsPage("mbid", 1);
    expect(page!.setlist).toHaveLength(20);
  });

  it("retries 429 honoring Retry-After, then succeeds", async () => {
    const { client, calls, clock } = makeClient([
      { status: 429, headers: { "retry-after": "2" } },
      { body: fixture("oasis/setlists-page-1.json") },
    ]);
    const page = await client.getArtistSetlistsPage("mbid");
    expect(page!.setlist.length).toBeGreaterThan(0);
    expect(calls).toHaveLength(2);
    expect(clock.sleeps).toContain(2000);
  });

  it("retries 5xx with exponential backoff and gives up after maxRetries", async () => {
    const { client, calls, clock } = makeClient(
      [{ status: 503 }, { status: 503 }, { status: 503 }],
      { maxRetries: 2, retryBaseDelayMs: 100 }
    );
    await expect(client.getArtistSetlistsPage("mbid")).rejects.toThrow(SetlistFmError);
    expect(calls).toHaveLength(3); // initial + 2 retries
    expect(clock.sleeps).toEqual([100, 200]);
  });

  it("does not retry client errors like 400", async () => {
    const { client, calls } = makeClient([{ status: 400 }]);
    await expect(client.searchArtists("x")).rejects.toMatchObject({ status: 400 });
    expect(calls).toHaveLength(1);
  });

  it("rejects malformed payloads at the boundary", async () => {
    const { client } = makeClient([{ body: { totally: "wrong shape" } }]);
    await expect(client.getArtistSetlistsPage("mbid")).rejects.toThrow();
  });

  it("spaces consecutive requests by the minimum gap", async () => {
    const page = fixture("oasis/setlists-page-1.json");
    const { client, clock } = makeClient([{ body: page }, { body: page }]);
    await client.getArtistSetlistsPage("mbid", 1);
    await client.getArtistSetlistsPage("mbid", 2);
    expect(clock.sleeps).toEqual([600]); // second request waited out the gap
  });

  it("a failed request does not poison the queue", async () => {
    const { client } = makeClient([
      { status: 400 },
      { body: fixture("oasis/setlists-page-1.json") },
    ]);
    await expect(client.getArtistSetlistsPage("mbid")).rejects.toThrow();
    expect((await client.getArtistSetlistsPage("mbid"))!.setlist.length).toBe(20);
  });

  it("fetchRecentSetlists paginates to the end and reports progress", async () => {
    const pages = [1, 2, 3, 4, 5].map((p) => ({
      body: fixture(`phish/setlists-page-${p}.json`),
    }));
    const { client, calls } = makeClient(pages);
    const progress: Array<[number, number]> = [];
    const setlists = await client.fetchRecentSetlists("mbid", {
      maxShows: 100,
      onProgress: (fetched, target) => progress.push([fetched, target]),
    });
    expect(setlists).toHaveLength(100);
    expect(calls).toHaveLength(5);
    expect(progress[0]).toEqual([20, 100]);
    expect(progress.at(-1)).toEqual([100, 100]);
  });

  it("fetchRecentSetlists truncates at maxShows without extra requests", async () => {
    const pages = [1, 2].map((p) => ({
      body: fixture(`phish/setlists-page-${p}.json`),
    }));
    const { client, calls } = makeClient(pages);
    const setlists = await client.fetchRecentSetlists("mbid", { maxShows: 30 });
    expect(setlists).toHaveLength(30);
    expect(calls).toHaveLength(2);
  });

  it("paces request starts by the gap even when running concurrently", async () => {
    const page = fixture("oasis/setlists-page-1.json");
    const { client, clock } = makeClient(
      [{ body: page }, { body: page }, { body: page }],
      { maxConcurrent: 3, minRequestGapMs: 100 }
    );
    await Promise.all([
      client.getArtistSetlistsPage("mbid", 1),
      client.getArtistSetlistsPage("mbid", 2),
      client.getArtistSetlistsPage("mbid", 3),
    ]);
    // start slots are t=0, 100, 200; each later request sleeps from "now"
    // to its slot (the fake clock advances as earlier sleeps run)
    expect(clock.sleeps).toEqual([100, 100]);
  });

  it("fetchAllSetlists crawls every page of a full history", async () => {
    // doctor the fixture totals so 5 pages == the whole history
    const pages = [1, 2, 3, 4, 5].map((p) => ({
      body: { ...fixture(`phish/setlists-page-${p}.json`), total: 100 },
    }));
    const { client, calls } = makeClient(pages, { maxConcurrent: 4, minRequestGapMs: 10 });
    const progress: Array<[number, number]> = [];
    const setlists = await client.fetchAllSetlists("mbid", {
      onProgress: (donePages, totalPages) => progress.push([donePages, totalPages]),
    });
    expect(setlists).toHaveLength(100);
    expect(calls).toHaveLength(5);
    // page 1 fetched first (to learn the total), rest concurrently, order preserved
    expect(setlists[0]!.id).toBe(fixture("phish/setlists-page-1.json").setlist[0].id);
    expect(progress[0]).toEqual([1, 5]);
    expect(progress.at(-1)).toEqual([5, 5]);
  });

  it("fetchAllSetlists respects maxShows without fetching extra pages", async () => {
    const pages = [1, 2].map((p) => ({
      body: { ...fixture(`phish/setlists-page-${p}.json`), total: 2000 },
    }));
    const { client, calls } = makeClient(pages);
    const setlists = await client.fetchAllSetlists("mbid", { maxShows: 40 });
    expect(setlists).toHaveLength(40);
    expect(calls).toHaveLength(2);
  });

  it("fetchRecentSetlists stops cleanly when history runs out (404)", async () => {
    const { client } = makeClient([
      { body: fixture("talking-heads/setlists-page-1.json") },
      { status: 404 },
    ]);
    const setlists = await client.fetchRecentSetlists("mbid", { maxShows: 100 });
    expect(setlists).toHaveLength(20);
  });
});
