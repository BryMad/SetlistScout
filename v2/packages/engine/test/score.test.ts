import { describe, expect, it } from "vitest";
import { scoreSongs, songKey } from "../src/score.ts";
import { assessQuality } from "../src/quality.ts";
import { selectLastNShows, selectLatestTour } from "../src/select.ts";
import type { Show } from "../src/normalize.ts";
import { loadShows, makeShow } from "./helpers.ts";

const kept = (artist: string) => assessQuality(loadShows(artist)).kept;

describe("scoreSongs (synthetic)", () => {
  it("likelihood is share of shows featuring the song", () => {
    const shows = [
      makeShow(["Anthem", "Deep Cut"]),
      makeShow(["Anthem"]),
      makeShow(["Anthem"]),
      makeShow(["Anthem"]),
    ];
    const [anthem, deepCut] = scoreSongs(shows);
    expect(anthem).toMatchObject({ name: "Anthem", likelihood: 1, showsPlayed: 4 });
    expect(deepCut).toMatchObject({ name: "Deep Cut", likelihood: 0.25, showsPlayed: 1 });
  });

  it("a song repeated within one show counts once", () => {
    const shows = [makeShow(["Encore Song", "Encore Song"]), makeShow(["Other"])];
    const encore = scoreSongs(shows).find((s) => s.name === "Encore Song")!;
    expect(encore.showsPlayed).toBe(1);
    expect(encore.likelihood).toBe(0.5);
  });

  it("groups name variants and displays the most common one", () => {
    const shows = [
      makeShow(["Won't Get Fooled  Again"]),
      makeShow(["Won't Get Fooled Again"]),
      makeShow(["won't get fooled again"]),
      makeShow(["Won't Get Fooled Again"]),
    ];
    const scored = scoreSongs(shows);
    expect(scored).toHaveLength(1);
    expect(scored[0]!.name).toBe("Won't Get Fooled Again");
    expect(scored[0]!.likelihood).toBe(1);
  });

  it("excludes tape entries entirely", () => {
    const withTape: Show = makeShow(["Real Song"]);
    withTape.songs.push({
      name: "Walk-on Music",
      isTape: true,
      isCover: false,
      coverArtist: null,
    });
    const scored = scoreSongs([withTape]);
    expect(scored.map((s) => s.name)).toEqual(["Real Song"]);
  });

  it("flags covers with their original artist", () => {
    const show = makeShow([]);
    show.songs.push({
      name: "War Pigs",
      isTape: false,
      isCover: true,
      coverArtist: "Black Sabbath",
    });
    const scored = scoreSongs([show]);
    expect(scored[0]).toMatchObject({ isCover: true, coverArtist: "Black Sabbath" });
  });

  it("recency weighting favors what the artist plays now", () => {
    const shows = [
      // "New Favorite" in the 2 recent shows, "Retired Song" in the 2 old ones
      makeShow(["New Favorite"], { date: "2026-06-01" }),
      makeShow(["New Favorite"], { date: "2026-05-01" }),
      makeShow(["Retired Song"], { date: "2024-06-01" }),
      makeShow(["Retired Song"], { date: "2024-05-01" }),
    ];
    const equal = scoreSongs(shows);
    expect(equal.find((s) => s.name === "New Favorite")!.likelihood).toBeCloseTo(
      equal.find((s) => s.name === "Retired Song")!.likelihood
    );

    const weighted = scoreSongs(shows, { recencyHalfLifeDays: 180 });
    const newFav = weighted.find((s) => s.name === "New Favorite")!;
    const retired = weighted.find((s) => s.name === "Retired Song")!;
    expect(newFav.likelihood).toBeGreaterThan(0.8);
    expect(retired.likelihood).toBeLessThan(0.2);
  });

  it("tracks tour spread across a multi-tour window", () => {
    const shows = [
      makeShow(["Staple", "New Single"], { tourName: "Tour B", date: "2026-06-01" }),
      makeShow(["Staple"], { tourName: "Tour A", date: "2025-06-01" }),
    ];
    const staple = scoreSongs(shows).find((s) => s.name === "Staple")!;
    expect(staple.tourSpread).toBe(2);
    expect(scoreSongs(shows).find((s) => s.name === "New Single")!.tourSpread).toBe(1);
  });

  it("normalizes keys but preserves display names", () => {
    expect(songKey("  With Or Without  You ")).toBe("with or without you");
  });
});

describe("scoreSongs against captured fixtures", () => {
  it("Oasis: a stable reunion setlist scores near-certain for most of the set", () => {
    const selection = selectLatestTour(kept("oasis"))!;
    const scored = scoreSongs(selection.shows);
    const nearCertain = scored.filter((s) => s.likelihood >= 0.9);
    expect(nearCertain.length).toBeGreaterThanOrEqual(15);
    expect(scored[0]!.likelihood).toBe(1);
  });

  it("U2 at the Sphere: album-show consistency, top songs played every night", () => {
    const selection = selectLatestTour(kept("u2"))!;
    const scored = scoreSongs(selection.shows);
    expect(scored.filter((s) => s.likelihood === 1).length).toBeGreaterThan(10);
  });

  it("Phish: rotation means no song is close to guaranteed", () => {
    const phish = scoreSongs(selectLastNShows(kept("phish"), 60).shows);
    const oasis = scoreSongs(selectLatestTour(kept("oasis"))!.shows);
    expect(phish[0]!.likelihood).toBeLessThan(oasis[14]!.likelihood);
    // deep catalog: far more unique songs than a stable-setlist act
    expect(phish.length).toBeGreaterThan(150);
  });

  it("covers in real data carry their original artist", () => {
    const scored = scoreSongs(selectLastNShows(kept("metallica"), 100).shows);
    const covers = scored.filter((s) => s.isCover);
    for (const cover of covers) {
      expect(cover.coverArtist).toBeTruthy();
    }
  });
});
