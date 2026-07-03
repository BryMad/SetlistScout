import { describe, expect, it } from "vitest";
import {
  daysBetween,
  selectAuto,
  selectLastNShows,
  selectLatestTour,
  selectNamedTour,
  selectShow,
  peakShowShare,
} from "../src/select.ts";
import { assessQuality } from "../src/quality.ts";
import { loadShows, makeShow } from "./helpers.ts";

const TODAY = "2026-07-02";
const kept = (artist: string) => assessQuality(loadShows(artist)).kept;

describe("daysBetween", () => {
  it("computes whole days across month and year boundaries", () => {
    expect(daysBetween("2026-01-01", "2026-01-31")).toBe(30);
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(0);
  });
});

describe("selectors (synthetic)", () => {
  it("selectLatestTour anchors on the newest toured show", () => {
    const shows = [
      makeShow(20, { date: "2026-06-01", tourName: null }), // newer but untoured
      makeShow(20, { date: "2026-05-01", tourName: "New Tour" }),
      makeShow(20, { date: "2026-04-01", tourName: "New Tour" }),
      makeShow(20, { date: "2025-01-01", tourName: "Old Tour" }),
    ];
    const selection = selectLatestTour(shows)!;
    expect(selection.tourName).toBe("New Tour");
    expect(selection.shows).toHaveLength(2);
  });

  it("selectLatestTour returns null when nothing has tour attribution", () => {
    expect(selectLatestTour([makeShow(20, { tourName: null })])).toBeNull();
  });

  it("selectLastNShows returns the n newest, newest first", () => {
    const shows = [
      makeShow(20, { date: "2026-01-01" }),
      makeShow(20, { date: "2026-03-01" }),
      makeShow(20, { date: "2026-02-01" }),
    ];
    const selection = selectLastNShows(shows, 2);
    expect(selection.shows.map((s) => s.date)).toEqual(["2026-03-01", "2026-02-01"]);
  });

  it("selectShow finds one show by id", () => {
    const target = makeShow(20, { date: "2026-02-01" });
    const selection = selectShow([makeShow(20), target], target.id)!;
    expect(selection.shows).toEqual([target]);
    expect(selectShow([target], "nope")).toBeNull();
  });
});

describe("selectors against captured fixtures", () => {
  it("U2: latest tour is Sphere with all 40 shows (promo one-offs already filtered)", () => {
    const selection = selectLatestTour(kept("u2"))!;
    expect(selection.tourName).toBe("U2:UV Achtung Baby Live at Sphere");
    expect(selection.shows).toHaveLength(40);
  });

  it("Metallica: multi-year M72 tour comes back as one selection", () => {
    const selection = selectLatestTour(kept("metallica"))!;
    expect(selection.tourName).toBe("M72 World Tour");
    expect(selection.shows.length).toBeGreaterThan(90);
  });

  it("Phish: named tour selection returns the full Summer 2025 run", () => {
    const selection = selectNamedTour(kept("phish"), "Summer Tour 2025")!;
    expect(selection.shows).toHaveLength(31);
  });

  it("last-60 slice is newest-first and capped", () => {
    const selection = selectLastNShows(kept("u2"), 60);
    expect(selection.shows).toHaveLength(60);
    const dates = selection.shows.map((s) => s.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe("peakShowShare", () => {
  it("is 1 when a song plays every show, and low for disjoint setlists", () => {
    const stable = [
      makeShow(["Staple", "Filler A"]),
      makeShow(["Staple", "Filler B"]),
    ];
    expect(peakShowShare(stable)).toBe(1);

    const rotating = [makeShow(["A", "B"]), makeShow(["C", "D"]), makeShow(["E", "F"])];
    expect(peakShowShare(rotating)).toBeCloseTo(1 / 3);
    expect(peakShowShare([])).toBe(0);
  });

  it("ignores tape entries", () => {
    const shows = [makeShow(["Real A"]), makeShow(["Real B"])];
    for (const show of shows) {
      show.songs.push({ name: "Intro Tape", isTape: true, isCover: false, coverArtist: null });
    }
    expect(peakShowShare(shows)).toBe(0.5);
  });
});

describe("selectAuto route-picker", () => {
  it("returns null with no data", () => {
    expect(selectAuto([], { asOf: TODAY })).toBeNull();
  });

  it("Oasis: healthy fresh tour → latest-tour, high confidence", () => {
    const decision = selectAuto(kept("oasis"), { asOf: TODAY })!;
    expect(decision.selection.strategy).toBe("latest-tour");
    expect(decision.selection.tourName).toBe("Oasis Live ’25");
    expect(decision.selection.shows).toHaveLength(41);
    expect(decision.confidence).toBe("high");
    expect(decision.signals).toEqual([
      { kind: "healthy-latest-tour", tourName: "Oasis Live ’25", showCount: 41 },
    ]);
  });

  it("Phish: healthy tour but total rotation → widens to last-n, medium confidence", () => {
    const decision = selectAuto(kept("phish"), { asOf: TODAY })!;
    expect(decision.selection.strategy).toBe("last-n-shows");
    expect(decision.selection.shows).toHaveLength(60);
    expect(decision.confidence).toBe("medium");
    const rotation = decision.signals.find((s) => s.kind === "high-rotation")!;
    expect(rotation).toMatchObject({
      tourName: "Sphere Las Vegas 2026",
      widenedTo: 60,
    });
    expect((rotation as { peakShowShare: number }).peakShowShare).toBeLessThan(0.2);
  });

  it("Metallica: no-repeat-weekend format still reads as stable, no widening", () => {
    const decision = selectAuto(kept("metallica"), { asOf: TODAY })!;
    expect(decision.selection.strategy).toBe("latest-tour");
    expect(decision.selection.tourName).toBe("M72 World Tour");
    expect(decision.signals.some((s) => s.kind === "high-rotation")).toBe(false);
    expect(decision.confidence).toBe("high");
  });

  it("U2: healthy tour but 850+ days dormant → stale signal, medium confidence", () => {
    const decision = selectAuto(kept("u2"), { asOf: TODAY })!;
    expect(decision.selection.strategy).toBe("latest-tour");
    const stale = decision.signals.find((s) => s.kind === "stale-data");
    expect(stale).toMatchObject({ newestShowDate: "2024-03-02" });
    expect(decision.confidence).toBe("medium");
  });

  it("Talking Heads: decades dormant → low confidence", () => {
    const decision = selectAuto(kept("talking-heads"), { asOf: TODAY })!;
    expect(decision.confidence).toBe("low");
    expect(decision.signals.some((s) => s.kind === "stale-data")).toBe(true);
  });

  it("thin latest tour → widens to last-n with an explanatory signal", () => {
    const shows = [
      makeShow(20, { date: "2026-06-20", tourName: "Brand New Tour" }),
      makeShow(20, { date: "2026-06-21", tourName: "Brand New Tour" }),
      makeShow(20, { date: "2026-06-22", tourName: "Brand New Tour" }),
      ...Array.from({ length: 30 }, (_, i) =>
        makeShow(20, {
          date: `2025-0${(i % 9) + 1}-1${i % 10}`,
          tourName: "Previous Tour",
        })
      ),
    ];
    const decision = selectAuto(shows, { asOf: TODAY })!;
    expect(decision.selection.strategy).toBe("last-n-shows");
    expect(decision.signals[0]).toMatchObject({
      kind: "thin-latest-tour",
      tourName: "Brand New Tour",
      showCount: 3,
    });
    expect(decision.confidence).toBe("medium");
  });

  it("rotation with nothing to widen into keeps the tour but flags it", () => {
    // one long tour of fully disjoint setlists and no older history
    const shows = Array.from({ length: 10 }, (_, i) =>
      makeShow([`Unique ${i}A`, `Unique ${i}B`], {
        date: `2026-06-${String(i + 1).padStart(2, "0")}`,
        tourName: "Endless Tour",
      })
    );
    const decision = selectAuto(shows, { asOf: TODAY })!;
    expect(decision.selection.strategy).toBe("latest-tour");
    expect(decision.signals[0]).toMatchObject({
      kind: "high-rotation",
      tourName: "Endless Tour",
      widenedTo: null,
    });
    expect(decision.confidence).toBe("medium");
  });

  it("no tour attribution anywhere → last-n with signal", () => {
    const shows = Array.from({ length: 10 }, (_, i) =>
      makeShow(15, { date: `2026-06-0${(i % 9) + 1}`, tourName: null })
    );
    const decision = selectAuto(shows, { asOf: TODAY })!;
    expect(decision.selection.strategy).toBe("last-n-shows");
    expect(decision.signals[0]!.kind).toBe("no-tour-attribution");
  });
});
