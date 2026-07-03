import type { Show } from "./normalize.ts";
import { assessQuality, type QualityOptions, type QualityReport } from "./quality.ts";
import {
  AUTO_DEFAULTS,
  daysBetween,
  selectAuto,
  selectLastNShows,
  selectLatestTour,
  selectNamedTour,
  selectShow,
  type AutoOptions,
  type AutoSignal,
  type Confidence,
  type Selection,
  type StrategyKind,
} from "./select.ts";
import { scoreSongs, type ScoredSong } from "./score.ts";

/**
 * predict(): the engine's front door. One call composes the whole pipeline —
 * quality filter → route selection (auto or a user-chosen mode) → scoring —
 * and explains itself in plain sentences the UI can show verbatim.
 *
 * The default mode is "auto" (the smart route-picker); every other mode is
 * the user optionality: current tour only, last N shows, a historic tour,
 * or one exact show.
 */

export type PredictMode =
  | { kind: "auto" }
  | { kind: "latest-tour" }
  | { kind: "last-n-shows"; n?: number }
  | { kind: "named-tour"; tourName: string }
  | { kind: "single-show"; showId: string };

export type PredictionSignal =
  | AutoSignal
  | { kind: "small-sample"; showCount: number };

export interface PredictOptions {
  /** "Today" as an ISO date. Passed in so the engine stays pure/deterministic. */
  asOf: string;
  /** Defaults to auto. */
  mode?: PredictMode;
  /**
   * Recency half-life override. Default: 180 days when the selection is a
   * multi-tour window (last-n-shows), equal weighting otherwise. Pass null
   * to force equal weighting.
   */
  recencyHalfLifeDays?: number | null;
  quality?: QualityOptions;
  auto?: Partial<Omit<AutoOptions, "asOf">>;
}

export interface Prediction {
  songs: ScoredSong[];
  strategy: StrategyKind;
  tourName: string | null;
  confidence: Confidence;
  signals: PredictionSignal[];
  /** Plain sentences describing what was analyzed and why. */
  explanation: string[];
  showsAnalyzed: number;
  /** Shows dropped by the quality filter across the whole dataset. */
  showsExcluded: number;
  dateRange: { from: string; to: string };
}

const ROTATION_HALF_LIFE_DAYS = 180;

const CONFIDENCE_RANK: Record<Confidence, number> = { high: 2, medium: 1, low: 0 };
const minConfidence = (a: Confidence, b: Confidence): Confidence =>
  CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;

function humanizeDays(days: number): string {
  if (days < 60) return `${days} days`;
  if (days < 700) return `about ${Math.round(days / 30)} months`;
  const years = Math.round(days / 365);
  return `about ${years} year${years === 1 ? "" : "s"}`;
}

/** Sample-size and staleness checks for user-chosen modes (auto does its own). */
function assessManualSelection(
  selection: Selection,
  mode: PredictMode,
  options: PredictOptions
): { signals: PredictionSignal[]; confidence: Confidence } {
  const signals: PredictionSignal[] = [];
  let confidence: Confidence = "high";

  if (mode.kind === "single-show") return { signals, confidence };

  const minSample = options.auto?.minTourSample ?? AUTO_DEFAULTS.minTourSample;
  if (selection.shows.length < minSample) {
    signals.push({ kind: "small-sample", showCount: selection.shows.length });
    confidence = minConfidence(confidence, "medium");
  }

  // Named tours are deliberately historical — staleness only matters for
  // modes that claim to describe what the artist plays *now*.
  if (mode.kind === "latest-tour" || mode.kind === "last-n-shows") {
    const newestShowDate = selection.shows[0]!.date;
    const daysSinceLastShow = daysBetween(newestShowDate, options.asOf);
    const stale = options.auto?.staleAfterDays ?? AUTO_DEFAULTS.staleAfterDays;
    const dormant = options.auto?.dormantAfterDays ?? AUTO_DEFAULTS.dormantAfterDays;
    if (daysSinceLastShow > stale) {
      signals.push({ kind: "stale-data", newestShowDate, daysSinceLastShow });
      confidence = minConfidence(
        confidence,
        daysSinceLastShow > dormant ? "low" : "medium"
      );
    }
  }

  return { signals, confidence };
}

function buildExplanation(
  selection: Selection,
  signals: PredictionSignal[],
  quality: QualityReport
): string[] {
  const lines: string[] = [];
  const count = selection.shows.length;

  switch (selection.strategy) {
    case "latest-tour":
    case "named-tour":
      lines.push(`Based on ${count} shows from "${selection.tourName}".`);
      break;
    case "last-n-shows":
      lines.push(`Based on the artist's last ${count} shows.`);
      break;
    case "single-show": {
      const show = selection.shows[0]!;
      const place = [show.venue, show.city].filter(Boolean).join(", ");
      lines.push(`The setlist from ${place || "this show"} on ${show.date}.`);
      break;
    }
  }

  for (const signal of signals) {
    switch (signal.kind) {
      case "healthy-latest-tour":
        break; // the base line already says it
      case "thin-latest-tour":
        lines.push(
          `The latest tour ("${signal.tourName}") only has ${signal.showCount} usable shows, ` +
            `so we analyzed the last ${signal.widenedTo} shows instead.`
        );
        break;
      case "no-tour-attribution":
        lines.push(
          `Recent shows aren't grouped into a tour, so we analyzed the last ${signal.widenedTo} shows.`
        );
        break;
      case "high-rotation": {
        const peak = Math.round(signal.peakShowShare * 100);
        lines.push(
          signal.widenedTo === null
            ? `Setlists on "${signal.tourName}" rotate heavily from night to night ` +
                `(no song appeared in more than ${peak}% of shows) — individual song odds run low for this artist.`
            : `Setlists on "${signal.tourName}" rotate heavily from night to night ` +
                `(no song appeared in more than ${peak}% of shows), so we analyzed the last ${signal.widenedTo} shows for a broader picture.`
        );
        break;
      }
      case "stale-data":
        lines.push(
          `Heads up: the most recent real show was ${humanizeDays(signal.daysSinceLastShow)} ago ` +
            `(${signal.newestShowDate}) — the next tour may look different.`
        );
        break;
      case "small-sample":
        lines.push(
          `Only ${signal.showCount} shows were available to analyze, so treat these odds as rough.`
        );
        break;
    }
  }

  if (selection.strategy !== "single-show" && quality.excluded.length > 0) {
    const n = quality.excluded.length;
    lines.push(
      `We set aside ${n} listing${n === 1 ? "" : "s"} that don't look like real setlists (promo spots or empty entries).`
    );
  }

  return lines;
}

export function predict(shows: Show[], options: PredictOptions): Prediction | null {
  const mode = options.mode ?? { kind: "auto" as const };
  const quality = assessQuality(shows, options.quality);

  let selection: Selection | null;
  let signals: PredictionSignal[] = [];
  let confidence: Confidence = "high";

  if (mode.kind === "auto") {
    const decision = selectAuto(quality.kept, { asOf: options.asOf, ...options.auto });
    if (!decision) return null;
    ({ selection, signals, confidence } = decision);
  } else {
    switch (mode.kind) {
      case "latest-tour":
        selection = selectLatestTour(quality.kept);
        break;
      case "last-n-shows":
        selection = selectLastNShows(quality.kept, mode.n ?? AUTO_DEFAULTS.widenTo);
        break;
      case "named-tour":
        selection = selectNamedTour(quality.kept, mode.tourName);
        break;
      case "single-show":
        // deliberately unfiltered: if the user asks for an exact show,
        // they get it even when it's a short promo set
        selection = selectShow(shows, mode.showId);
        break;
    }
    if (selection && selection.shows.length > 0) {
      ({ signals, confidence } = assessManualSelection(selection, mode, options));
    }
  }

  if (!selection || selection.shows.length === 0) return null;

  const recencyHalfLifeDays =
    options.recencyHalfLifeDays !== undefined
      ? options.recencyHalfLifeDays
      : selection.strategy === "last-n-shows"
        ? ROTATION_HALF_LIFE_DAYS
        : null;

  const songs = scoreSongs(selection.shows, {
    recencyHalfLifeDays,
    asOf: options.asOf,
  });

  return {
    songs,
    strategy: selection.strategy,
    tourName: selection.tourName,
    confidence,
    signals,
    explanation: buildExplanation(selection, signals, quality),
    showsAnalyzed: selection.shows.length,
    showsExcluded: quality.excluded.length,
    dateRange: {
      from: selection.shows[selection.shows.length - 1]!.date,
      to: selection.shows[0]!.date,
    },
  };
}
