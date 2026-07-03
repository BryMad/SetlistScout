import { songKey, type Show } from "./normalize.ts";

/**
 * Selectors: given quality-filtered shows, pick the subset a prediction is based on.
 * Every user-facing mode is one of these strategies; the auto route-picker
 * (selectAuto) chooses among them based on what the data supports.
 */

export type StrategyKind =
  | "latest-tour"
  | "last-n-shows"
  | "named-tour"
  | "single-show";

export interface Selection {
  strategy: StrategyKind;
  /** Newest first. */
  shows: Show[];
  /** Set for tour-based strategies. */
  tourName: string | null;
}

export function sortByDateDesc(shows: Show[]): Show[] {
  return [...shows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Whole days from one ISO date to another (positive when toIso is later). */
export function daysBetween(fromIso: string, toIso: string): number {
  const ms =
    new Date(`${toIso}T00:00:00Z`).getTime() -
    new Date(`${fromIso}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

/** All shows from the most recent tour that has any attribution. Null if nothing is toured. */
export function selectLatestTour(shows: Show[]): Selection | null {
  const sorted = sortByDateDesc(shows);
  const anchor = sorted.find((show) => show.tourName !== null);
  if (!anchor) return null;
  return {
    strategy: "latest-tour",
    tourName: anchor.tourName,
    shows: sorted.filter((show) => show.tourName === anchor.tourName),
  };
}

export function selectLastNShows(shows: Show[], n: number): Selection {
  return {
    strategy: "last-n-shows",
    tourName: null,
    shows: sortByDateDesc(shows).slice(0, n),
  };
}

export function selectNamedTour(shows: Show[], tourName: string): Selection | null {
  const matched = sortByDateDesc(shows).filter((show) => show.tourName === tourName);
  if (matched.length === 0) return null;
  return { strategy: "named-tour", tourName, shows: matched };
}

export function selectShow(shows: Show[], id: string): Selection | null {
  const show = shows.find((candidate) => candidate.id === id);
  if (!show) return null;
  return { strategy: "single-show", tourName: show.tourName, shows: [show] };
}

/**
 * Share of shows containing the single most-played song (tapes excluded).
 * Rotation gauge: 1.0 means some song plays every night; Phish's no-repeat
 * Sphere run measures 0.11 while every stable-setlist fixture artist —
 * including Metallica's "no repeat weekend" format — sits at 0.94+.
 */
export function peakShowShare(shows: Show[]): number {
  if (shows.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const show of shows) {
    const seenThisShow = new Set<string>();
    for (const song of show.songs) {
      if (song.isTape) continue;
      const key = songKey(song.name);
      if (key.length === 0 || seenThisShow.has(key)) continue;
      seenThisShow.add(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let max = 0;
  for (const count of counts.values()) if (count > max) max = count;
  return max / shows.length;
}

// --- auto route-picker ---------------------------------------------------

export type Confidence = "high" | "medium" | "low";

/**
 * Machine-readable notes about why auto chose what it chose.
 * The UI turns these into the "here's how we calculated this" explanation.
 */
export type AutoSignal =
  | { kind: "healthy-latest-tour"; tourName: string; showCount: number }
  | { kind: "thin-latest-tour"; tourName: string; showCount: number; widenedTo: number }
  | { kind: "no-tour-attribution"; widenedTo: number }
  | { kind: "stale-data"; newestShowDate: string; daysSinceLastShow: number }
  /** Healthy tour, but songs rotate so heavily no per-song prediction holds.
   *  widenedTo is null when the tour already covers the whole widened window. */
  | {
      kind: "high-rotation";
      tourName: string;
      peakShowShare: number;
      widenedTo: number | null;
    };

export interface AutoDecision {
  selection: Selection;
  signals: AutoSignal[];
  confidence: Confidence;
}

export interface AutoOptions {
  /** "Today" as an ISO date. Passed in so the engine stays pure/deterministic. */
  asOf: string;
  /** A latest tour with fewer kept shows than this is too thin to trust alone. */
  minTourSample?: number;
  /** How many shows to widen to when the latest tour is thin or absent. */
  widenTo?: number;
  /** Newest show older than this caps confidence at medium. */
  staleAfterDays?: number;
  /** Newest show older than this drops confidence to low. */
  dormantAfterDays?: number;
  /**
   * A tour whose most reliable song still plays in fewer than this share of
   * shows is a rotation artist; widen the window instead of trusting the tour.
   */
  rotationPeakShare?: number;
}

export const AUTO_DEFAULTS = {
  minTourSample: 8,
  widenTo: 60,
  staleAfterDays: 540, // ~18 months
  dormantAfterDays: 1095, // ~3 years
  rotationPeakShare: 0.5,
};

const CONFIDENCE_RANK: Record<Confidence, number> = { high: 2, medium: 1, low: 0 };

export function selectAuto(shows: Show[], options: AutoOptions): AutoDecision | null {
  const opts = { ...AUTO_DEFAULTS, ...options };
  if (shows.length === 0) return null;

  const signals: AutoSignal[] = [];
  let confidence: Confidence = "high";
  const cap = (max: Confidence) => {
    if (CONFIDENCE_RANK[max] < CONFIDENCE_RANK[confidence]) confidence = max;
  };

  const latestTour = selectLatestTour(shows);
  let selection: Selection;

  if (latestTour && latestTour.shows.length >= opts.minTourSample) {
    const peak = peakShowShare(latestTour.shows);
    if (peak < opts.rotationPeakShare) {
      // Rotation artist: the tour is healthy but per-song certainty is low.
      // Widen for more signal — unless the widened window wouldn't reach
      // beyond this tour anyway (a long tour IS the whole recent history).
      const widened = selectLastNShows(shows, opts.widenTo);
      const addsOtherShows = widened.shows.some(
        (show) => show.tourName !== latestTour.tourName
      );
      selection = addsOtherShows ? widened : latestTour;
      signals.push({
        kind: "high-rotation",
        tourName: latestTour.tourName!,
        peakShowShare: peak,
        widenedTo: addsOtherShows ? selection.shows.length : null,
      });
      cap("medium");
    } else {
      selection = latestTour;
      signals.push({
        kind: "healthy-latest-tour",
        tourName: latestTour.tourName!,
        showCount: latestTour.shows.length,
      });
    }
  } else {
    selection = selectLastNShows(shows, opts.widenTo);
    if (latestTour) {
      signals.push({
        kind: "thin-latest-tour",
        tourName: latestTour.tourName!,
        showCount: latestTour.shows.length,
        widenedTo: selection.shows.length,
      });
    } else {
      signals.push({ kind: "no-tour-attribution", widenedTo: selection.shows.length });
    }
    cap("medium");
  }

  const newestShowDate = sortByDateDesc(shows)[0]!.date;
  const daysSinceLastShow = daysBetween(newestShowDate, opts.asOf);
  if (daysSinceLastShow > opts.dormantAfterDays) {
    signals.push({ kind: "stale-data", newestShowDate, daysSinceLastShow });
    cap("low");
  } else if (daysSinceLastShow > opts.staleAfterDays) {
    signals.push({ kind: "stale-data", newestShowDate, daysSinceLastShow });
    cap("medium");
  }

  return { selection, signals, confidence };
}
