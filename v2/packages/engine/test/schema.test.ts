import { describe, expect, it } from "vitest";
import { setlistPageSchema } from "../src/schema.ts";
import { fixtureArtists, loadRawPages } from "./helpers.ts";

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
  }
});
