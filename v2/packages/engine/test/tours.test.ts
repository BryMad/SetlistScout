import { describe, expect, it } from "vitest";
import { summarizeTours } from "../src/tours.ts";
import { loadShows, makeShow } from "./helpers.ts";

describe("summarizeTours", () => {
  it("aggregates U2's fixture history into tours, newest first", () => {
    const tours = summarizeTours(loadShows("u2"));
    expect(tours.map((t) => t.name)).toEqual([
      "U2:UV Achtung Baby Live at Sphere",
      "The Joshua Tree Tour 2019",
      "eXPERIENCE + iNNOCENCE Tour",
    ]);
    const sphere = tours[0]!;
    expect(sphere.showCount).toBe(40);
    expect(sphere.years).toBe("2023–2024");
  });

  it("multi-year tours collapse into one entry with a year range", () => {
    const tours = summarizeTours(loadShows("metallica"));
    const m72 = tours.find((t) => t.name === "M72 World Tour")!;
    expect(m72.years).toMatch(/^2023–202[56]$/);
    expect(m72.showCount).toBeGreaterThan(90);
  });

  it("drops junk tour names and songless shows", () => {
    const shows = [
      makeShow(20, { tourName: "Real Tour", date: "2026-01-01" }),
      makeShow(20, { tourName: "No Tour Info", date: "2026-01-02" }),
      makeShow(20, { tourName: "unknown", date: "2026-01-03" }),
      makeShow(0, { tourName: "Real Tour", date: "2026-01-04" }), // empty setlist
      makeShow(20, { tourName: null, date: "2026-01-05" }),
    ];
    const tours = summarizeTours(shows);
    expect(tours).toEqual([
      {
        name: "Real Tour",
        showCount: 1,
        firstDate: "2026-01-01",
        lastDate: "2026-01-01",
        years: "2026",
      },
    ]);
  });
});
