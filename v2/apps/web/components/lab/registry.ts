import type { ComponentType } from "react";
import Cyberpunk from "./variants/Cyberpunk";
import HiFi from "./variants/HiFi";
import Winamp from "./variants/Winamp";
import Minimal from "./variants/Minimal";
import Motion from "./variants/Motion";
import Hud from "./variants/Hud";
import Editorial from "./variants/Editorial";
import Brutalist from "./variants/Brutalist";
import Vaporwave from "./variants/Vaporwave";
import Aurora from "./variants/Aurora";

export interface LabVariant {
  slug: string;
  name: string;
  vibe: string;
  swatch: string[]; // colors for the index-page preview strip
  component: ComponentType;
}

export const VARIANTS: LabVariant[] = [
  { slug: "cyberpunk", name: "Night City", vibe: "matrix glitches, scanlines, phosphor terminal", swatch: ["#000000", "#00ff9f", "#00e5ff", "#ff2965"], component: Cyberpunk },
  { slug: "hifi", name: "Silver Face", vibe: "70s Japanese receiver, VU needles, lit displays", swatch: ["#c9c9c5", "#6b4423", "#6ff7c0", "#f7efd8"], component: HiFi },
  { slug: "winamp", name: "Llama", vibe: "late-90s skin, beveled chrome, green playlist", swatch: ["#3f3f52", "#000000", "#00ff00", "#ffcc00"], component: Winamp },
  { slug: "minimal", name: "Whitespace", vibe: "white, hairlines, nothing extra", swatch: ["#ffffff", "#f0f0f0", "#111111", "#999999"], component: Minimal },
  { slug: "motion", name: "Motion", vibe: "shadcn-style animation everywhere", swatch: ["#09090b", "#18181b", "#8b5cf6", "#a1a1aa"], component: Motion },
  { slug: "hud", name: "Telemetry", vibe: "mission-control data HUD, gauges, brackets", swatch: ["#04070d", "#67e8f9", "#4b7f96", "#ffffff"], component: Hud },
  { slug: "editorial", name: "The Review", vibe: "print magazine, serif masthead, drop cap", swatch: ["#faf7f0", "#1c1a16", "#b91c1c", "#8a8378"], component: Editorial },
  { slug: "brutalist", name: "Concrete", vibe: "4px borders, hard shadows, taxi yellow", swatch: ["#f4f4f0", "#000000", "#ffe600", "#ffffff"], component: Brutalist },
  { slug: "vaporwave", name: "Sunset Grid", vibe: "striped sun, perspective grid, chrome text", swatch: ["#12042e", "#a02c7d", "#ff6b97", "#7cc6ff"], component: Vaporwave },
  { slug: "aurora", name: "Aurora Glass", vibe: "frosted cards over drifting color fields", swatch: ["#08080d", "#7c3aed", "#06b6d4", "#10b981"], component: Aurora },
];
