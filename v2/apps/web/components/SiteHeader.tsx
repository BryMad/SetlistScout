"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ArtistSearch from "./ArtistSearch";

/** Always-available top bar: logo home link + artist search on every page. */
export default function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-indigo-500/15 bg-zinc-950/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="shrink-0 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text font-display text-lg font-bold uppercase tracking-[0.15em] text-transparent drop-shadow-[0_0_12px_rgba(99,102,241,0.45)]"
        >
          Setlist Scout
        </Link>
        {!isHome && <ArtistSearch variant="header" />}
      </div>
    </header>
  );
}
