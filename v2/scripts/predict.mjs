#!/usr/bin/env node
/**
 * Run a live setlist prediction from the command line.
 *
 * Usage (from the v2/ directory or repo root):
 *   node v2/scripts/predict.mjs "Pearl Jam"
 *   node v2/scripts/predict.mjs "Phish" --last 60      # force last-N-shows mode
 *   node v2/scripts/predict.mjs "U2" --tour "The Joshua Tree Tour 2019"
 *   node v2/scripts/predict.mjs "Radiohead" --top 40   # show more songs
 *
 * Reads SETLIST_API_KEY from backend/.env (or the environment).
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SetlistFmClient } from "@setlistscout/clients";
import { predict, toShow } from "@setlistscout/engine";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function loadApiKey() {
  if (process.env.SETLIST_API_KEY) return process.env.SETLIST_API_KEY;
  try {
    const env = readFileSync(join(ROOT, "backend/.env"), "utf8");
    const match = env.match(/^SETLIST_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    /* fall through */
  }
  console.error("No SETLIST_API_KEY in environment or backend/.env");
  process.exit(1);
}

// --- parse args -----------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};
const artistQuery = args.find((a) => !a.startsWith("--") && a !== flag("last") && a !== flag("tour") && a !== flag("top"));

if (!artistQuery) {
  console.error('Usage: predict.mjs "Artist Name" [--last N] [--tour "Name"] [--top N]');
  process.exit(1);
}

const mode = flag("tour")
  ? { kind: "named-tour", tourName: flag("tour") }
  : flag("last")
    ? { kind: "last-n-shows", n: Number(flag("last")) }
    : { kind: "auto" };
const top = Number(flag("top") ?? 25);

// --- run ------------------------------------------------------------------
const client = new SetlistFmClient({ apiKey: loadApiKey() });

const { artists } = await client.searchArtists(artistQuery);
if (!artists.length) {
  console.error(`No setlist.fm artist found for "${artistQuery}"`);
  process.exit(1);
}
const artist = artists[0];
console.log(`\n${artist.name}${artist.disambiguation ? ` (${artist.disambiguation})` : ""}`);

process.stdout.write("fetching shows ");
const setlists = await client.fetchRecentSetlists(artist.mbid, {
  maxShows: 100,
  onProgress: () => process.stdout.write("."),
});
console.log(` ${setlists.length} shows\n`);

const prediction = predict(setlists.map(toShow), {
  asOf: new Date().toISOString().slice(0, 10),
  mode,
});

if (!prediction) {
  console.log("Not enough usable data to make a prediction.");
  process.exit(0);
}

const CONF = { high: "HIGH", medium: "MEDIUM", low: "LOW" };
console.log(
  `${prediction.strategy}${prediction.tourName ? ` — ${prediction.tourName}` : ""}` +
    ` | ${prediction.showsAnalyzed} shows (${prediction.dateRange.from} → ${prediction.dateRange.to})` +
    ` | confidence: ${CONF[prediction.confidence]}`
);
for (const line of prediction.explanation) console.log(`  ${line}`);
console.log();

for (const song of prediction.songs.slice(0, top)) {
  const pct = Math.round(song.likelihood * 100);
  const bar = "█".repeat(Math.max(1, Math.round(pct / 4)));
  console.log(
    `${String(pct).padStart(3)}% ${bar.padEnd(25)} ${song.name}` +
      (song.isCover ? `  (${song.coverArtist} cover)` : "")
  );
}
const remaining = prediction.songs.length - top;
if (remaining > 0) console.log(`\n…and ${remaining} more songs (--top ${prediction.songs.length} to see all)`);
