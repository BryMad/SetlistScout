/**
 * Dummy data for the design lab (/lab). A fictional band with a likelihood
 * spread that exercises all five bands, one cover song, and one row with no
 * Spotify match — so every variant shows every state. Album art is generated
 * SVG so nothing depends on the network.
 */

export interface LabTrack {
  rank: number;
  title: string;
  artist: string;
  album: string;
  pct: number;
  plays: number;
  cover: string; // data-uri album art
  matched: boolean;
  coverOf?: string; // original artist when it's a cover
}

function svg(body: string, bg: string): string {
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/>${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(doc)}`;
}

const COVERS = {
  voltage: svg(
    `<circle cx="32" cy="32" r="18" fill="none" stroke="#f4f1ea" stroke-width="3"/><circle cx="32" cy="32" r="7" fill="#e04f39"/>`,
    "#1f2440"
  ),
  geometry: svg(
    `<polygon points="32,10 56,52 8,52" fill="none" stroke="#0e0e0e" stroke-width="3"/><polygon points="32,24 46,48 18,48" fill="#0e0e0e"/>`,
    "#e8b64c"
  ),
  static: svg(
    `<rect x="8" y="14" width="48" height="5" fill="#dadada"/><rect x="8" y="26" width="34" height="5" fill="#dadada"/><rect x="8" y="38" width="44" height="5" fill="#e04f39"/><rect x="8" y="50" width="24" height="5" fill="#dadada"/>`,
    "#141414"
  ),
  coast: svg(
    `<path d="M0 40 Q16 28 32 40 T64 40 V64 H0 Z" fill="#2b5d8c"/><circle cx="46" cy="18" r="8" fill="#f4d35e"/>`,
    "#a8c8d8"
  ),
  mac: svg(
    `<circle cx="32" cy="32" r="22" fill="none" stroke="#caa8f5" stroke-width="2"/><circle cx="32" cy="32" r="14" fill="none" stroke="#caa8f5" stroke-width="2"/><circle cx="32" cy="32" r="6" fill="#caa8f5"/>`,
    "#241934"
  ),
};

export const LAB = {
  artist: "The Analog Hearts",
  tour: "Night Geometry Tour",
  shows: 40,
  setLength: 14,
  from: "2026-03-02",
  to: "2026-06-27",
  confidence: "high" as const,
  explanation: [
    "Scoring the 40 shows of Night Geometry Tour (2026-03-02 → 2026-06-27).",
    "The setlist barely changes night to night — the top songs are near locks.",
    "We set aside 2 listings from this period that don't look like real setlists.",
  ],
};

const T = (
  rank: number,
  title: string,
  album: string,
  cover: string,
  pct: number,
  extra?: Partial<LabTrack>
): LabTrack => ({
  rank,
  title,
  artist: extra?.coverOf ?? LAB.artist,
  album,
  pct,
  plays: Math.round((pct / 100) * LAB.shows),
  cover,
  matched: true,
  ...extra,
});

export const TRACKS: LabTrack[] = [
  T(1, "Static Prayer", "Voltage & Velvet", COVERS.voltage, 100),
  T(2, "Chrome Wilderness", "Night Geometry", COVERS.geometry, 100),
  T(3, "Midnight Arcade", "Night Geometry", COVERS.geometry, 97),
  T(4, "Glass Divide", "Voltage & Velvet", COVERS.voltage, 92),
  T(5, "Paper Suns", "American Static", COVERS.static, 85),
  T(6, "Runaway Frequency", "Night Geometry", COVERS.geometry, 72),
  T(7, "Hollow Coast", "American Static", COVERS.static, 65),
  T(8, "Dead Mall Summer", "Hollow Coast EP", COVERS.coast, 48),
  T(9, "Vermilion", "Voltage & Velvet", COVERS.voltage, 41),
  T(10, "Teenage Antenna", "American Static", COVERS.static, 30),
  T(11, "Dreams", "Rumours", COVERS.mac, 22, { coverOf: "Fleetwood Mac" }),
  T(12, "Silver Lake, 1974", "unreleased", "", 8, { matched: false }),
];

/** The five likelihood bands (labels are product canon; hues vary per variant). */
export const BAND_LABEL = (pct: number) =>
  pct >= 80 ? "Very likely" : pct >= 60 ? "Likely" : pct >= 40 ? "Possible" : pct >= 20 ? "Rare" : "Very rare";
