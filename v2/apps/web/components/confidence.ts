import type { Confidence } from "@setlistscout/engine";

export const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: "bg-emerald-950 text-emerald-300 border-emerald-800",
  medium: "bg-amber-950 text-amber-300 border-amber-800",
  low: "bg-rose-950 text-rose-300 border-rose-800",
};
