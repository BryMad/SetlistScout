import { describe, expect, it } from "vitest";
import { assessQuality, median } from "../src/quality";
import type { Show } from "../src/normalize";
import { loadShows } from "./helpers";

function makeShow(songCount: number, overrides: Partial<Show> = {}): Show {
  return {
    id: `show-${Math.abs(songCount)}-${JSON.stringify(overrides).length}`,
    date: "2026-01-01",
    tourName: "Test Tour",
    venue: null,
    city: null,
    countryCode: null,
    info: null,
    songs: Array.from({ length: songCount }, (_, i) => ({
      name: `Song ${i}`,
      isTape: false,
      isCover: false,
      coverArtist: null,
    })),
    songCount,
    ...overrides,
  };
}

describe("median", () => {
  it("handles odd, even, and empty inputs", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe("assessQuality (synthetic)", () => {
  it("excludes empty setlists and ignores them when computing the median", () => {
    const shows = [makeShow(0), makeShow(20), makeShow(20), makeShow(22)];
    const report = assessQuality(shows);
    expect(report.medianSongCount).toBe(20);
    expect(report.excluded).toEqual([{ show: shows[0], reason: "empty-setlist" }]);
    expect(report.kept).toHaveLength(3);
  });

  it("excludes short sets relative to the artist's own median", () => {
    const promo = makeShow(3);
    const shows = [promo, makeShow(20), makeShow(24), makeShow(26)];
    const report = assessQuality(shows);
    expect(report.excluded).toEqual([{ show: promo, reason: "short-set" }]);
  });

  it("treats short sets as normal for artists who always play short sets", () => {
    const shows = [makeShow(5), makeShow(6), makeShow(5), makeShow(6)];
    const report = assessQuality(shows);
    expect(report.excluded).toHaveLength(0);
  });

  it("keeps shows exactly at the threshold", () => {
    // median 20, ratio 0.4 → threshold 8; a 8-song show is kept, 7 excluded
    const atThreshold = makeShow(8);
    const below = makeShow(7);
    const report = assessQuality([atThreshold, below, makeShow(20), makeShow(20), makeShow(20)]);
    expect(report.kept).toContain(atThreshold);
    expect(report.excluded.map((e) => e.show)).toContain(below);
  });

  it("respects a custom shortSetRatio", () => {
    const shows = [makeShow(12), makeShow(20), makeShow(20), makeShow(20)];
    expect(assessQuality(shows).excluded).toHaveLength(0);
    expect(assessQuality(shows, { shortSetRatio: 0.7 }).excluded).toHaveLength(1);
  });
});

describe("assessQuality against captured fixtures", () => {
  it("U2: excludes all promo-era one-offs, keeps every real tour show", () => {
    const report = assessQuality(loadShows("u2"));
    // the five most recent untoured appearances (2-7 songs) all go
    const excludedTours = report.excluded.map((e) => e.show.tourName);
    expect(excludedTours.filter((t) => t === null).length).toBeGreaterThanOrEqual(5);
    // every Sphere and Joshua Tree show survives
    for (const show of report.kept.filter((s) => s.tourName?.includes("Sphere"))) {
      expect(show.songCount).toBeGreaterThan(20);
    }
    const sphereKept = report.kept.filter((s) => s.tourName?.includes("Sphere"));
    expect(sphereKept).toHaveLength(40);
  });

  it("Phish: keeps real untoured shows (festivals), tiny tours intact", () => {
    const report = assessQuality(loadShows("phish"));
    // untoured Phish shows include real full sets — those must survive
    const keptUntoured = report.kept.filter((s) => s.tourName === null);
    expect(keptUntoured.length).toBeGreaterThan(0);
    // nothing from a named tour gets excluded (all real shows)
    const excludedNamed = report.excluded.filter((e) => e.show.tourName !== null);
    expect(excludedNamed).toHaveLength(0);
  });

  it("Oasis: keeps all 41 reunion-tour shows, drops the promo one-offs", () => {
    const report = assessQuality(loadShows("oasis"));
    const reunion = report.kept.filter((s) => s.tourName?.includes("25"));
    expect(reunion).toHaveLength(41);
    for (const { show } of report.excluded) {
      expect(show.songCount).toBeLessThan(5);
    }
  });

  it("Metallica: drops empty setlists even when they belong to a real tour", () => {
    const report = assessQuality(loadShows("metallica"));
    const emptyExcluded = report.excluded.filter((e) => e.reason === "empty-setlist");
    expect(emptyExcluded.length).toBeGreaterThan(0);
    // M72 proper shows all kept
    const m72 = report.kept.filter((s) => s.tourName === "M72 World Tour");
    expect(m72.every((s) => s.songCount >= 10)).toBe(true);
  });

  it("Billie Eilish: keeps all 94 tour shows, drops the 6 promo appearances", () => {
    const report = assessQuality(loadShows("billie-eilish"));
    expect(report.kept.filter((s) => s.tourName !== null)).toHaveLength(94);
    expect(report.excluded).toHaveLength(6);
  });
});
