#!/usr/bin/env node
/**
 * Capture real setlist.fm API responses as fixtures for the prediction engine.
 *
 * Usage:
 *   node v2/scripts/capture-fixtures.mjs "Artist Name" [--pages=5]
 *   node v2/scripts/capture-fixtures.mjs --all          # capture the standard test roster
 *
 * Reads SETLIST_API_KEY from backend/.env (or the environment).
 * Writes raw responses to v2/packages/engine/__fixtures__/{slug}/:
 *   artist-search.json      raw /search/artists response
 *   setlists-page-N.json    raw /artist/{mbid}/setlists pages (20 shows each)
 *   meta.json               capture date, mbid, tour/show tallies for a quick sanity check
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURES_DIR = join(ROOT, "v2/packages/engine/__fixtures__");
const API_BASE = "https://api.setlist.fm/rest/1.0";
const REQUEST_GAP_MS = 700; // setlist.fm allows ~2 req/sec; stay well under

// The standard roster: each artist exercises a different engine edge case.
const ROSTER = [
  "U2", // promo-era: one-off appearances that aren't real setlists
  "Phish", // heavy night-to-night rotation, deep catalog
  "Oasis", // reunion tour: recent, healthy sample, stable setlist
  "Metallica", // M72 no-repeat two-night format
  "Billie Eilish", // modern pop, highly consistent setlist
  "Talking Heads", // dormant: little/no recent data
];

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

const API_KEY = loadApiKey();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path, attempt = 1) {
  await sleep(REQUEST_GAP_MS);
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-api-key": API_KEY, Accept: "application/json" },
  });
  if (res.status === 429 && attempt <= 4) {
    const wait = 2000 * attempt;
    console.log(`  429 rate-limited, retrying in ${wait / 1000}s...`);
    await sleep(wait);
    return get(path, attempt + 1);
  }
  if (res.status === 404) return null; // e.g. page past the end
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return res.json();
}

const slugify = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function captureArtist(artistName, pages) {
  const slug = slugify(artistName);
  const dir = join(FIXTURES_DIR, slug);
  mkdirSync(dir, { recursive: true });
  console.log(`\n=== ${artistName} → __fixtures__/${slug}/ ===`);

  const search = await get(
    `/search/artists?artistName=${encodeURIComponent(artistName)}&sort=relevance`
  );
  writeFileSync(join(dir, "artist-search.json"), JSON.stringify(search, null, 2));

  const artist = search?.artist?.[0];
  if (!artist) {
    console.log("  no artist found, skipping");
    return;
  }
  console.log(`  matched: ${artist.name} (mbid ${artist.mbid})`);

  const tourTally = {};
  let showCount = 0;
  let pagesCaptured = 0;
  let newestDate = null;
  let oldestDate = null;

  for (let p = 1; p <= pages; p++) {
    const page = await get(`/artist/${artist.mbid}/setlists?p=${p}`);
    if (!page || !page.setlist?.length) break;
    writeFileSync(join(dir, `setlists-page-${p}.json`), JSON.stringify(page, null, 2));
    pagesCaptured++;
    for (const s of page.setlist) {
      showCount++;
      newestDate ??= s.eventDate;
      oldestDate = s.eventDate;
      const tour = s.tour?.name ?? "(no tour)";
      const songs = (s.sets?.set ?? []).reduce((n, set) => n + (set.song?.length ?? 0), 0);
      tourTally[tour] ??= { shows: 0, songCounts: [] };
      tourTally[tour].shows++;
      tourTally[tour].songCounts.push(songs);
    }
    console.log(`  page ${p}: ${page.setlist.length} shows`);
  }

  const meta = {
    capturedAt: new Date().toISOString(),
    query: artistName,
    matchedName: artist.name,
    mbid: artist.mbid,
    pagesCaptured,
    showCount,
    newestDate,
    oldestDate,
    tours: Object.fromEntries(
      Object.entries(tourTally).map(([name, t]) => [
        name,
        {
          shows: t.shows,
          medianSongs: t.songCounts.sort((a, b) => a - b)[Math.floor(t.songCounts.length / 2)],
          minSongs: Math.min(...t.songCounts),
          maxSongs: Math.max(...t.songCounts),
        },
      ])
    ),
  };
  writeFileSync(join(dir, "meta.json"), JSON.stringify(meta, null, 2));
  console.log(
    `  captured ${showCount} shows (${newestDate} back to ${oldestDate}), ` +
      `${Object.keys(tourTally).length} tour buckets`
  );
}

const args = process.argv.slice(2);
const pagesArg = args.find((a) => a.startsWith("--pages="));
const pages = pagesArg ? Number(pagesArg.split("=")[1]) : 5;
const targets = args.includes("--all") ? ROSTER : args.filter((a) => !a.startsWith("--"));

if (!targets.length) {
  console.error('Usage: capture-fixtures.mjs "Artist Name" [--pages=5] | --all');
  process.exit(1);
}

for (const name of targets) {
  await captureArtist(name, pages);
}
console.log("\nDone.");
