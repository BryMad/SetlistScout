import type { Show } from "./normalize";

/**
 * Quality filter: separates real setlists from data that would skew predictions.
 *
 * Two failure modes observed in real setlist.fm data:
 *  - "empty-setlist": the show exists but nobody logged any songs (Metallica and
 *    Talking Heads fixtures both contain these).
 *  - "short-set": promo appearances, TV spots, award-show cameos — U2's recent
 *    history is 2-7 song one-offs ("Played three times for a video shoot") while
 *    their real shows run ~26 songs. Detected relative to the artist's own median
 *    set length, so a jam band's 8-song marathon and a pop act's 30-song night
 *    are both treated as normal for that artist.
 *
 * Deliberately NOT keyed on tour attribution: untoured shows can be real, full
 * sets (Phish festival nights), and toured shows can be empty.
 */

export type ExclusionReason = "empty-setlist" | "short-set";

export interface ExcludedShow {
  show: Show;
  reason: ExclusionReason;
}

export interface QualityReport {
  kept: Show[];
  excluded: ExcludedShow[];
  /** Median performed-song count across non-empty shows in the sample. */
  medianSongCount: number;
  /** Shows below this song count were excluded as short sets. */
  shortSetThreshold: number;
}

export interface QualityOptions {
  /**
   * A show is a "short set" when songCount < shortSetRatio * median.
   * 0.4 cleanly splits every fixture case: U2 promos (2-7 vs median 26),
   * Oasis/Billie Eilish promo one-offs, while keeping Phish's shortest
   * real nights (15 vs median 18).
   */
  shortSetRatio?: number;
}

const DEFAULT_SHORT_SET_RATIO = 0.4;

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function assessQuality(
  shows: Show[],
  options: QualityOptions = {}
): QualityReport {
  const shortSetRatio = options.shortSetRatio ?? DEFAULT_SHORT_SET_RATIO;

  const nonEmpty = shows.filter((show) => show.songCount > 0);
  const medianSongCount = median(nonEmpty.map((show) => show.songCount));
  const shortSetThreshold = medianSongCount * shortSetRatio;

  const kept: Show[] = [];
  const excluded: ExcludedShow[] = [];

  for (const show of shows) {
    if (show.songCount === 0) {
      excluded.push({ show, reason: "empty-setlist" });
    } else if (show.songCount < shortSetThreshold) {
      excluded.push({ show, reason: "short-set" });
    } else {
      kept.push(show);
    }
  }

  return { kept, excluded, medianSongCount, shortSetThreshold };
}
