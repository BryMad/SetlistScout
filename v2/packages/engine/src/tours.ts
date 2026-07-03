import type { Show } from "./normalize.ts";

/**
 * Tour discovery: aggregate a full show history into a browsable tour list.
 * Ports the old tourExtractor behavior — only shows with actual song data
 * count, junk tour names are dropped, newest tours first.
 */

export interface TourSummary {
  name: string;
  /** Shows with at least one performed song. */
  showCount: number;
  firstDate: string;
  lastDate: string;
  /** "2023" or "2023–2024", for display. */
  years: string;
}

const JUNK_TOUR_NAME = /^(no tour info|unknown|miscellaneous|various|n\/a)$/i;

export function summarizeTours(shows: Show[]): TourSummary[] {
  const tours = new Map<
    string,
    { name: string; showCount: number; firstDate: string; lastDate: string }
  >();

  for (const show of shows) {
    const name = show.tourName?.trim();
    if (!name || JUNK_TOUR_NAME.test(name) || show.songCount === 0) continue;

    const existing = tours.get(name);
    if (!existing) {
      tours.set(name, {
        name,
        showCount: 1,
        firstDate: show.date,
        lastDate: show.date,
      });
    } else {
      existing.showCount += 1;
      if (show.date < existing.firstDate) existing.firstDate = show.date;
      if (show.date > existing.lastDate) existing.lastDate = show.date;
    }
  }

  return [...tours.values()]
    .map((tour) => {
      const firstYear = tour.firstDate.slice(0, 4);
      const lastYear = tour.lastDate.slice(0, 4);
      return {
        ...tour,
        years: firstYear === lastYear ? firstYear : `${firstYear}–${lastYear}`,
      };
    })
    .sort(
      (a, b) =>
        (a.lastDate < b.lastDate ? 1 : a.lastDate > b.lastDate ? -1 : 0) ||
        b.showCount - a.showCount
    );
}
