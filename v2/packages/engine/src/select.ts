import type { Show } from "./normalize.ts";

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
  | { kind: "stale-data"; newestShowDate: string; daysSinceLastShow: number };

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
}

const AUTO_DEFAULTS = {
  minTourSample: 8,
  widenTo: 60,
  staleAfterDays: 540, // ~18 months
  dormantAfterDays: 1095, // ~3 years
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
    selection = latestTour;
    signals.push({
      kind: "healthy-latest-tour",
      tourName: latestTour.tourName!,
      showCount: latestTour.shows.length,
    });
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
