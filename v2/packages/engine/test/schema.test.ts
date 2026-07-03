import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { artistsSearchSchema, setlistPageSchema } from "../src/schema.ts";
import { FIXTURES_DIR, fixtureArtists, loadRawPages } from "./helpers.ts";

describe("setlist.fm schemas against captured fixtures", () => {
  const artists = fixtureArtists();

  it("has fixture data to test against", () => {
    expect(artists.length).toBeGreaterThanOrEqual(6);
  });

  for (const artist of artists) {
    it(`parses every captured page for ${artist}`, () => {
      for (const raw of loadRawPages(artist)) {
        const page = setlistPageSchema.parse(raw);
        expect(page.setlist.length).toBeGreaterThan(0);
      }
    });

    it(`parses the artist-search response for ${artist}`, () => {
      const raw = JSON.parse(
        readFileSync(join(FIXTURES_DIR, artist, "artist-search.json"), "utf8")
      );
      const search = artistsSearchSchema.parse(raw);
      expect(search.artist.length).toBeGreaterThan(0);
      expect(search.artist[0]!.mbid).toBeTruthy();
    });
  }
});
