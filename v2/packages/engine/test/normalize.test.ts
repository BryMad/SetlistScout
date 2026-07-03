import { describe, expect, it } from "vitest";
import { toIsoDate } from "../src/normalize.ts";
import { fixtureArtists, loadShows } from "./helpers.ts";

describe("toIsoDate", () => {
  it("converts setlist.fm DD-MM-YYYY to ISO", () => {
    expect(toIsoDate("12-05-2026")).toBe("2026-05-12");
    expect(toIsoDate("01-01-1999")).toBe("1999-01-01");
  });
});

describe("toShow against captured fixtures", () => {
  it("normalizes every fixture show without loss", () => {
    for (const artist of fixtureArtists()) {
      for (const show of loadShows(artist)) {
        expect(show.id).toBeTruthy();
        expect(show.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(show.songCount).toBeLessThanOrEqual(show.songs.length);
      }
    }
  });

  it("captures the U2 promo-appearance case that motivated the quality filter", () => {
    const shows = loadShows("u2");
    const videoShoot = shows.find((show) => show.info?.includes("video shoot"));
    expect(videoShoot).toBeDefined();
    expect(videoShoot!.tourName).toBeNull();
    expect(videoShoot!.songCount).toBeLessThan(5);

    const sphere = shows.filter(
      (show) => show.tourName === "U2:UV Achtung Baby Live at Sphere"
    );
    expect(sphere.length).toBeGreaterThan(30);
  });

  it("keeps tape entries out of songCount", () => {
    const shows = fixtureArtists().flatMap(loadShows);
    const withTape = shows.filter((show) => show.songs.some((song) => song.isTape));
    expect(withTape.length).toBeGreaterThan(0);
    for (const show of withTape) {
      expect(show.songCount).toBeLessThan(show.songs.length);
    }
  });
});
