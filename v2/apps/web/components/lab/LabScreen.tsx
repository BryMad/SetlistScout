"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { LAB, TRACKS, TOURS, type LabTrack } from "./data";
import { SKINS } from "./skins";

/**
 * The design lab renders the REAL site structure — header search, artist
 * title, the Predict/Relive section nav, the Auto/Latest tour/Last 60 shows
 * mode pills, confidence panel, save button, legend, track list — with dummy
 * data, and lets each skin restyle everything EXCEPT the Spotify elements.
 *
 * Spotify branding is hardcoded here and identical in every skin: untouched
 * 64px artwork, track/artist/album stacked and centered on the art in the
 * platform sans, and the green #1DB954 / white-text controls. Decorative
 * overlays sit below z-30 so nothing tints them.
 */

export interface LabSkin {
  css?: string;
  page: string;
  pageStyle?: CSSProperties;
  decor?: ReactNode;
  shell?: string;
  shellInner?: string;
  header: string;
  brand: string;
  brandText?: string;
  search: string;
  h1: string;
  h1Style?: CSSProperties;
  glitchTitle?: boolean;
  nav: string;
  navActive: string;
  navIdle: string;
  pills: string;
  pillActive: string;
  pillIdle: string;
  subtitle: string;
  panel: string;
  chip: string;
  metaLine: string;
  explain: string;
  saveDivider: string;
  legend: string;
  legendSwatch: (band: number) => CSSProperties;
  legendLabel: string;
  list: string;
  row: string;
  rowStyle?: (index: number) => CSSProperties;
  index: string;
  title: string;
  artistText: string;
  albumText: string;
  coverBadge: string;
  gauge: (t: LabTrack) => ReactNode;
  noMatch: string;
  tourIntro: string;
  tourCard: string;
  tourName: string;
  tourMeta: string;
}

/** Platform sans for all Spotify zones, whatever the skin's display face is. */
const SANS: CSSProperties = { fontFamily: "var(--font-geist-sans)" };

const BAND_NAMES = ["Very likely", "Likely", "Possible", "Rare", "Very rare"];

const MODES = [
  { key: "auto", label: "Auto" },
  { key: "latest", label: "Latest tour" },
  { key: "last60", label: "Last 60 shows" },
] as const;

type ModeKey = (typeof MODES)[number]["key"];

export default function LabScreen({ slug }: { slug: string }) {
  const skin = SKINS[slug]!;
  const [section, setSection] = useState<"predict" | "relive">("predict");
  const [mode, setMode] = useState<ModeKey>("auto");

  const shows = mode === "last60" ? 60 : LAB.shows;
  const from = mode === "last60" ? "2025-11-04" : LAB.from;
  const explanation = [
    mode === "auto"
      ? `Scoring the ${LAB.shows} shows of ${LAB.tour} (${LAB.from} → ${LAB.to}).`
      : mode === "latest"
        ? `Latest tour: ${LAB.tour} — ${LAB.shows} shows, no widening needed.`
        : `Scoring their last 60 shows, spanning 2 tours (2025-11-04 → ${LAB.to}).`,
    LAB.explanation[1]!,
    LAB.explanation[2]!,
  ];
  const matchedCount = TRACKS.filter((t) => t.matched).length;

  const savePill = (
    <button
      className="relative z-30 rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-white hover:brightness-110"
      style={SANS}
    >
      Save {matchedCount} songs as Spotify playlist
    </button>
  );

  return (
    <div className={skin.page} style={{ ...SANS, ...skin.pageStyle }}>
      {skin.css && <style>{skin.css}</style>}
      {skin.decor}

      <div className={skin.shell ?? ""}>
        <div className={skin.shellInner ?? ""}>
          {/* ── site header: brand + always-available search ── */}
          <header className={skin.header}>
            <span className={skin.brand}>{skin.brandText ?? "Setlist Scout"}</span>
            <input className={skin.search} placeholder="Search for an artist…" />
          </header>

          {/* no z-index here: it would trap the z-30 Spotify controls below
              full-screen decor overlays (scanlines etc.) */}
          <main className="relative mx-auto max-w-3xl px-6 py-10">
            <h1 className={skin.h1} style={skin.h1Style}>
              {skin.glitchTitle ? (
                <span className="cp-glitch" data-text={LAB.artist.toUpperCase()}>
                  {LAB.artist.toUpperCase()}
                </span>
              ) : (
                LAB.artist
              )}
            </h1>

            {/* ── the two halves ── */}
            <nav className={skin.nav}>
              {(
                [
                  { key: "predict", label: "Predict my set" },
                  { key: "relive", label: "Relive a set" },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  className={section === s.key ? skin.navActive : skin.navIdle}
                >
                  {s.label}
                </button>
              ))}
            </nav>

            {section === "relive" ? (
              /* ── RELIVE: tours list, real structure ── */
              <>
                <p className={skin.tourIntro}>
                  {TOURS.length} tours across 142 recorded shows. Pick a tour to see what got
                  played — or drill into a single night.
                </p>
                <ul className="mt-6 space-y-2">
                  {TOURS.map((tour) => (
                    <li key={tour.name}>
                      <button className={`${skin.tourCard} w-full text-left`}>
                        <span className="flex items-baseline justify-between gap-4">
                          <span className={skin.tourName}>{tour.name}</span>
                          <span className={skin.tourMeta}>{tour.shows} shows</span>
                        </span>
                        <span className={skin.tourMeta}>{tour.years}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              /* ── PREDICT: mode pills → panel → legend → tracks ── */
              <>
                <nav className={skin.pills}>
                  {MODES.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setMode(m.key)}
                      className={mode === m.key ? skin.pillActive : skin.pillIdle}
                    >
                      {m.label}
                    </button>
                  ))}
                </nav>

                <p className={skin.subtitle}>
                  They play about {LAB.setLength}{" "}
                  songs a night — below is every song they might pull out, ranked by the odds
                  you&apos;ll hear it.
                </p>

                <section className={skin.panel}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={skin.chip}>high confidence</span>
                    <span className={skin.metaLine}>
                      {shows} shows · {from} → {LAB.to}
                    </span>
                  </div>
                  <ul className={skin.explain}>
                    {explanation.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <div className={skin.saveDivider}>{savePill}</div>
                </section>

                <div className={skin.legend}>
                  {BAND_NAMES.map((name, i) => (
                    <span key={name} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={skin.legendSwatch(i)} />
                      <span className={skin.legendLabel}>{name}</span>
                    </span>
                  ))}
                </div>

                <ol className={skin.list}>
                  {TRACKS.map((t, i) => (
                    <li
                      key={t.rank}
                      className={`${skin.row} grid grid-cols-[2rem_4rem_1fr_auto] items-center gap-3`}
                      style={skin.rowStyle?.(i)}
                    >
                      <span className={skin.index}>{String(t.rank).padStart(2, "0")}</span>

                      {/* ── Spotify zone: canonical, identical in every skin ── */}
                      {t.matched && t.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.cover} alt="" className="h-16 w-16 rounded object-cover" />
                      ) : (
                        <div className="h-16 w-16 rounded bg-black/20" />
                      )}
                      <div className="min-w-0" style={SANS}>
                        <p className={`truncate text-sm font-bold ${skin.title}`}>
                          {t.title}
                          {t.coverOf && <span className={skin.coverBadge}>{t.coverOf} cover</span>}
                        </p>
                        {t.matched && (
                          <>
                            <p className={`truncate text-sm ${skin.artistText}`}>{t.artist}</p>
                            <p className={`truncate text-xs ${skin.albumText}`}>{t.album}</p>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {skin.gauge(t)}
                        {t.matched ? (
                          <a
                            href="#"
                            className="relative z-30 rounded-full bg-[#1DB954] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white hover:brightness-110"
                            style={SANS}
                          >
                            OPEN SPOTIFY
                          </a>
                        ) : (
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${skin.noMatch}`}
                            style={SANS}
                          >
                            NO MATCH
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
