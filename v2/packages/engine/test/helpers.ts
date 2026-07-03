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
