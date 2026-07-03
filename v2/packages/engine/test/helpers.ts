import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { setlistPageSchema, type Setlist } from "../src/schema";
import { toShow, type Show } from "../src/normalize";

export const FIXTURES_DIR = join(import.meta.dirname, "../__fixtures__");

export function fixtureArtists(): string[] {
  return readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export function loadRawPages(artistSlug: string): unknown[] {
  const dir = join(FIXTURES_DIR, artistSlug);
  return readdirSync(dir)
    .filter((file) => file.startsWith("setlists-page-"))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(dir, file), "utf8")));
}

export function loadSetlists(artistSlug: string): Setlist[] {
  return loadRawPages(artistSlug).flatMap(
    (page) => setlistPageSchema.parse(page).setlist
  );
}

export function loadShows(artistSlug: string): Show[] {
  return loadSetlists(artistSlug).map(toShow);
}

let showSeq = 0;

/** Synthetic show for unit tests. Pass song names, or a number for that many generic songs. */
export function makeShow(
  songs: number | string[],
  overrides: Partial<Show> = {}
): Show {
  const names =
    typeof songs === "number"
      ? Array.from({ length: songs }, (_, i) => `Song ${i}`)
      : songs;
  const songList = names.map((name) => ({
    name,
    isTape: false,
    isCover: false,
    coverArtist: null,
  }));
  return {
    id: `synthetic-${showSeq++}`,
    date: "2026-01-01",
    tourName: "Test Tour",
    venue: null,
    city: null,
    countryCode: null,
    info: null,
    songs: songList,
    songCount: songList.length,
    ...overrides,
  };
}
