import { describe, expect, it } from "vitest";
import { predict } from "../src/predict.ts";
import { loadShows, makeShow } from "./helpers.ts";

const TODAY = "2026-07-02";

describe("predict — auto mode", () => {
  it("Oasis: healthy fresh tour, high confidence, self-explaining", () => {
    const prediction = predict(loadShows("oasis"), { asOf: TODAY })!;
    expect(prediction.strategy).toBe("latest-tour");
    expect(prediction.tourName).toBe("Oasis Live ’25");
    expect(prediction.confidence).toBe("high");
    expect(prediction.showsAnalyzed).toBe(41);
    // the 4 junk listings in the dataset are 2009 promos — irrelevant to a
    // 2025 tour window, so they must NOT be mentioned here
    expect(prediction.showsExcluded).toBe(0);
    expect(prediction.songs[0]!.likelihood).toBe(1);
    expect(prediction.explanation[0]).toBe('Based on 41 shows from "Oasis Live ’25".');
    expect(prediction.explanation.some((l) => l.includes("set aside"))).toBe(false);
    expect(prediction.dateRange.from < prediction.dateRange.to).toBe(true);
  });

  it("U2: dormant since the Sphere → stale warning in plain english", () => {
    const prediction = predict(loadShows("u2"), { asOf: TODAY })!;
    expect(prediction.confidence).toBe("medium");
    const stale = prediction.explanation.find((l) => l.includes("most recent real show"));
    expect(stale).toContain("about 2 years ago");
    expect(stale).toContain("2024-03-02");
    // the 2025-26 promo one-offs NEWER than the Sphere window still count
    // here — they're the reason the data isn't fresher. (The 2018 short sets
    // and the pre-tour video shoot fall outside and don't.)
    expect(prediction.showsExcluded).toBe(3);
    expect(prediction.explanation.some((l) => l.includes("set aside 3"))).toBe(true);
  });

  it("historical tour views ignore junk from outside their window entirely", () => {
    const prediction = predict(loadShows("u2"), {
      asOf: TODAY,
      mode: { kind: "named-tour", tourName: "The Joshua Tree Tour 2019" },
    })!;
    // U2's excluded listings are 2024-26 promos and a short 2018 set —
    // none inside the 2019 tour window
    expect(prediction.showsExcluded).toBe(0);
    expect(prediction.explanation.some((l) => l.includes("set aside"))).toBe(false);
  });

  it("Phish: rotation widens the window and the recency weighting kicks in", () => {
    const prediction = predict(loadShows("phish"), { asOf: TODAY })!;
    expect(prediction.strategy).toBe("last-n-shows");
    expect(prediction.showsAnalyzed).toBe(60);
    expect(prediction.confidence).toBe("medium");
    // deterministic fixture → this exact ranking is a regression lock
    expect(prediction.songs[0]!.name).toBe("Harry Hood");
    expect(
      prediction.explanation.some((l) => l.includes("rotate heavily"))
    ).toBe(true);
  });

  it("returns null when there is nothing to analyze", () => {
    expect(predict([], { asOf: TODAY })).toBeNull();
  });
});

describe("predict — user-chosen modes", () => {
  it("last-n-shows override", () => {
    const prediction = predict(loadShows("oasis"), {
      asOf: TODAY,
      mode: { kind: "last-n-shows", n: 20 },
    })!;
    expect(prediction.strategy).toBe("last-n-shows");
    expect(prediction.showsAnalyzed).toBe(20);
    expect(prediction.explanation[0]).toBe("Based on the artist's last 20 shows.");
  });

  it("named historic tour: no staleness penalty for deliberately looking back", () => {
    const prediction = predict(loadShows("phish"), {
      asOf: TODAY,
      mode: { kind: "named-tour", tourName: "Summer Tour 2025" },
    })!;
    expect(prediction.showsAnalyzed).toBe(31);
    expect(prediction.tourName).toBe("Summer Tour 2025");
    expect(prediction.signals.some((s) => s.kind === "stale-data")).toBe(false);
    expect(prediction.confidence).toBe("high");
  });

  it("named tour that doesn't exist → null", () => {
    expect(
      predict(loadShows("phish"), {
        asOf: TODAY,
        mode: { kind: "named-tour", tourName: "Imaginary Tour" },
      })
    ).toBeNull();
  });

  it("single show works even for a quality-excluded promo appearance", () => {
    // U2's 2-song video shoot — dropped by the filter, but pick-a-show must find it
    const prediction = predict(loadShows("u2"), {
      asOf: TODAY,
      mode: { kind: "single-show", showId: "7b74e2d0" },
    })!;
    expect(prediction.strategy).toBe("single-show");
    expect(prediction.showsAnalyzed).toBe(1);
    expect(prediction.songs.every((s) => s.likelihood === 1)).toBe(true);
    expect(prediction.explanation[0]).toContain("Plaza de Santo Domingo");
    expect(prediction.explanation[0]).toContain("2026-05-12");
    // no "we set aside N listings" chatter when showing one exact setlist
    expect(prediction.explanation.some((l) => l.includes("set aside"))).toBe(false);
  });

  it("manual latest-tour on a thin tour flags the small sample", () => {
    const shows = [
      makeShow(20, { date: "2026-06-01", tourName: "Tiny Tour" }),
      makeShow(20, { date: "2026-06-02", tourName: "Tiny Tour" }),
      makeShow(20, { date: "2026-06-03", tourName: "Tiny Tour" }),
    ];
    const prediction = predict(shows, { asOf: TODAY, mode: { kind: "latest-tour" } })!;
    expect(prediction.confidence).toBe("medium");
    expect(prediction.signals[0]).toMatchObject({ kind: "small-sample", showCount: 3 });
    expect(
      prediction.explanation.some((l) => l.includes("treat these odds as rough"))
    ).toBe(true);
  });

  it("recencyHalfLifeDays: null forces equal weighting on a widened window", () => {
    const weighted = predict(loadShows("phish"), { asOf: TODAY })!;
    const equal = predict(loadShows("phish"), {
      asOf: TODAY,
      recencyHalfLifeDays: null,
    })!;
    const song = (p: typeof weighted, name: string) =>
      p.songs.find((s) => s.name === name)!;
    // equal weighting = plain share of shows; weighted differs from it
    const hood = song(equal, "Harry Hood");
    expect(hood.likelihood).toBeCloseTo(hood.showsPlayed / hood.totalShows);
    expect(song(weighted, "Harry Hood").likelihood).not.toBeCloseTo(
      hood.likelihood,
      5
    );
  });
});
