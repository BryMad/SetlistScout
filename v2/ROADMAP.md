# SetlistScout v2 — Roadmap

Ideas parked here so they don't get lost. Not a commitment or an order of work —
the point is that each idea is written down with enough context to pick it up later.

---

## 0. NEXT UP — Vercel deploy (repo is ready; ~10 min of dashboard clicks)

Repo-side prep is done: `maxDuration = 60` on crawl-heavy routes, no SSE, no
server-held sessions, Redis Cloud reachable from anywhere. Steps (owner-only):

1. vercel.com → Add New Project → import `BryMad/SetlistScout` (Hobby tier fine).
2. **Root Directory: `v2/apps/web`** — the one setting that matters; Next.js +
   npm workspace detected automatically.
3. Production branch: `v2` (Settings → Git) — every push becomes a deploy.
4. Env vars (values in `v2/apps/web/.env.local`): `SETLIST_API_KEY`,
   `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `REDIS_URL`, and
   `SPOTIFY_REDIRECT_URI=https://<domain>/auth/callback`.
5. Spotify dashboard: add that HTTPS `/auth/callback` redirect URI.
6. Domain: buy via Vercel Domains (or Cloudflare/Namecheap) — check
   setlistscout.com / .app — then update redirect URI + dashboard to match.

Notes: first visit per artist on prod is a cold crawl (shared Redis means
already-tested artists are instant); Hobby tier is non-commercial; do the
real-device phone pass once live.

---

## 1. True predicted setlist (the big one)

**The tension:** today's "Predict my set" doesn't predict a *set* — it ranks songs
by likelihood. A real predicted setlist has an opener, a body with an arc, and an
epic encore, in order. setlist.fm shows an "average setlist" on their site, but it
is **not exposed in the API** — we'd build our own, and can do better.

**Prerequisite (engine):** the normalizer currently flattens away set structure.
`setlistSchema` already captures `sets.set[].encore` and set names — `toShow()`
drops them. First step is keeping per-song position context: `setIndex`,
`isEncore`, `positionInShow` (0..1 percentile).

**Per-song position stats** (computed across the selected window):
- `openerRate` — how often it's song #1
- `closerRate` — how often it ends the main set
- `encoreRate` — how often it appears in an encore (the "epic encore" signal:
  high encoreRate + high likelihood = the traditional closer)
- `meanPosition` — average position percentile when played
- adjacency (which songs tend to follow which) — stretch goal, enables
  segue-aware ordering for jam bands

**Assembly algorithm (sketch):**
1. Target length = median performed-song count for the window.
2. Slot the opener (highest openerRate among near-lock songs).
3. Slot encore block last (rank by encoreRate × likelihood).
4. Fill the body with the remaining top-likelihood songs, ordered by meanPosition.
5. Confidence per-slot, not just per-song ("the opener is 90% certain; slots 8–12
   are a coin flip").

**Validation (fixture-driven, same as everything else):** backtest — predict show
N from shows 1..N-1, score song overlap + order correlation (Kendall tau) against
what was actually played. Tune weights against the fixtures.

**Product placement:** a view toggle inside the predict tab — "Ranked by
likelihood" (default, today's view) vs "As a setlist (beta)". The ranked list
never goes away; it's the cram tool.

---

## 2. Restore the likelihood spectrum (from v1)

v1 color-coded likelihood and it communicated "this is a ranking of odds" better
than anything else on the page. Old spec (Track.jsx):

| Likelihood | Color  | Label       |
|-----------|--------|-------------|
| ≥ 80%     | purple | Very Likely |
| ≥ 60%     | blue   | Likely      |
| ≥ 40%     | yellow | Possible    |
| ≥ 20%     | orange | Rare        |
| < 20%     | red    | Very Rare   |

v2 version: tint the percentage + bar per band (bars are currently uniform
indigo), keep the text labels so color is never the only signal (a11y), tune hues
against the dark surface. The cool→hot spectrum is the product story: cool colors
= locks, hot colors = deep-cut lottery tickets.

---

## 2b. Spotify-guideline gaps in the track rows

- **"Open Spotify" button per track** — v1 had an explicit per-track Spotify
  button; the guidelines want labeled links ("OPEN SPOTIFY" / "LISTEN ON
  SPOTIFY"), not just a hyperlinked title. Add a small labeled control to each
  matched row.

## 2c. Spectrum palette cleanup

- The v1-inherited five colors (violet/sky/yellow/orange/rose) clash against
  the quiet Geist chrome. Redesign as a cleaner, gradient-coherent ramp once
  the main design settles — fewer hues, ordered lightness, validated against
  the dark surface. Keep the five labels; they're the product story.

## 3. Cram-mode features

- **Gap stat for rotation artists** — "last played 14 shows ago." Jam-band fans
  track song gaps religiously; a "due" indicator makes the Phish/Pearl Jam view
  much smarter than raw frequency.
- **Playlist options** — size choice (top N), and later: order by predicted-set
  order instead of likelihood order.
- **Song-count context** — "they play ~24 songs a night" belongs near the top of
  the ranked list, so "top 24" reads as "the likely show."

---

## 4. UX debt (small, known)

- Auto-resume the playlist save after the OAuth round-trip (currently two clicks).
- Visible error message on auth failure (`/?auth=failed` is silent).
- Show page → back-link to its tour (pass artist mbid through the link).
- Live crawl progress in the UI — the client already emits `onProgress`
  ("page 40 of 94"); the tours loading screen shows a static spinner.
- Thumbnail fade-in to soften late-loading art.
- Mobile layout pass.

---

## 5. Data & engine

- More fixture artists: a festival-circuit act, a DJ/electronic act, an artist
  mid-tour *right now*, an artist with same-name collisions.
- Combined incarnation view — "Neil Young (all lineups)" merged analysis as an
  option alongside the per-incarnation pages.
- Same-name disambiguation, further rungs (dominance pruning + disambiguation
  text shipped 2026-07): cross-check the clicked Spotify artist's
  popularity/genres against setlist.fm candidates; full MusicBrainz linkage
  (Spotify URL → MBID) as the definitive resolver; a "wrong artist?" escape
  hatch on artist pages so pruning can never trap anyone.

---

## 6. Production readiness

- **Vercel deploy** (decided 2026-07 — v2 has no SSE and no server-held
  sessions, so serverless fits): import repo, Root Directory
  `v2/apps/web`, copy env vars, add the prod redirect URI in the Spotify
  dashboard (`https://<domain>/auth/callback`), custom domain. Old site stays
  on Render until cutover; Redis Cloud serves both.
- Serverless hardening: move the setlist.fm rate limiter into Redis (the
  in-process limiter is per-invocation on Vercel — fine at small scale,
  wrong at large).
- Redis quota watch — gzip is in place (~18× smaller); consider an LRU cap if the
  shared instance gets tight.
- Port Privacy / Terms / EUA consent flow from the old site (Spotify integration
  requirement).
- Rewrite README + CLAUDE.md for the v2 architecture.
- Domain cutover; retire old frontend/backend.

---

## Decided against (for now)

- **Frozen `/results/{id}` snapshot permalinks** — v2 URLs are recipes (mbid +
  mode), permanent and always-fresh by design. Revisit only if users demand
  "exactly what I saw" sharing.
- **Scraping setlist.fm HTML** — abandoned in v1 once the elevated API rate limit
  made full-history crawls feasible; v2 stays API-only.
