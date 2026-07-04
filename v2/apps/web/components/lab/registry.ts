/** Server-safe lab metadata. The skins themselves (client-only, with JSX and
 *  functions) live in skins.tsx and are resolved inside LabScreen by slug. */

export interface LabVariantMeta {
  slug: string;
  name: string;
  vibe: string;
  swatch: string[]; // colors for the index-page preview strip
}

export const VARIANTS: LabVariantMeta[] = [
  { slug: "cyberpunk", name: "Night City", vibe: "matrix glitches, scanlines, phosphor terminal", swatch: ["#000000", "#00ff9f", "#00e5ff", "#ff2965"] },
  { slug: "hifi", name: "Silver Face", vibe: "70s Japanese receiver, VU needles, lit displays", swatch: ["#c9c9c5", "#6b4423", "#6ff7c0", "#f7efd8"] },
  { slug: "winamp", name: "Llama", vibe: "late-90s skin, beveled chrome, green playlist", swatch: ["#3f3f52", "#000000", "#00ff00", "#ffcc00"] },
  { slug: "minimal", name: "Whitespace", vibe: "white, hairlines, nothing extra", swatch: ["#ffffff", "#f0f0f0", "#111111", "#999999"] },
  { slug: "motion", name: "Motion", vibe: "shadcn-style animation everywhere", swatch: ["#09090b", "#18181b", "#8b5cf6", "#a1a1aa"] },
  { slug: "hud", name: "Telemetry", vibe: "mission-control data HUD, gauges, brackets", swatch: ["#04070d", "#67e8f9", "#4b7f96", "#ffffff"] },
  { slug: "editorial", name: "The Review", vibe: "print magazine, serif masthead, drop cap", swatch: ["#faf7f0", "#1c1a16", "#b91c1c", "#8a8378"] },
  { slug: "brutalist", name: "Concrete", vibe: "4px borders, hard shadows, taxi yellow", swatch: ["#f4f4f0", "#000000", "#ffe600", "#ffffff"] },
  { slug: "vaporwave", name: "Sunset Grid", vibe: "striped sun, perspective grid, chrome text", swatch: ["#12042e", "#a02c7d", "#ff6b97", "#7cc6ff"] },
  { slug: "aurora", name: "Aurora Glass", vibe: "frosted cards over drifting color fields", swatch: ["#08080d", "#7c3aed", "#06b6d4", "#10b981"] },
];
